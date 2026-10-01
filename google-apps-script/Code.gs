// このファイルは Apps Script のエディタだけに配置します。
// Spreadsheet ID等は「プロジェクトの設定 → スクリプト プロパティ」へ。
// SPREADSHEET_ID: 新規SpreadsheetのID（必須）
// ACCEPTING_RESPONSES: true または false（受付制御。初期値は停止）
// ALLOWED_SUBJECT_IDS: 任意。カンマ区切りIDリスト。空なら形式検証のみ。
// 旧プロジェクトのURL・認証情報・DB設定は一切使用しません。
const SHEET_NAME = 'Responses';
const META_HEADERS = ['SchemaVersion','PaletteVersion','SubmissionKey','PayloadSHA256','ReceivedAtUTC','SessionID','SubjectID','Age','Taste','Method','TasteOrder','TasteSequenceJSON','StartedAtUTC','CompletedAtUTC','ColorsJSON'];
function headers_() {
  return META_HEADERS.concat(COLORS.map(c=>'Score'+String(c.colorId).padStart(3,'0')),COLORS.map(c=>'Order'+String(c.colorId).padStart(3,'0')));
}
function spreadsheet_() {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw Error('SPREADSHEET_ID is missing');
  return SpreadsheetApp.openById(id);
}
function sheet_(ss,name,headers) {
  let s=ss.getSheetByName(name);
  if(!s)s=ss.insertSheet(name);
  if(s.getMaxColumns()<headers.length)s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns());
  if(s.getLastRow()===0){s.getRange(1,1,1,headers.length).setValues([headers]);s.setFrozenRows(1);}
  if(JSON.stringify(s.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers))throw Error('Sheet header mismatch');
  return s;
}
// 管理者が最初にエディタから1回実行。既存回答は消しません。
function setup() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const ss=spreadsheet_();sheet_(ss,SHEET_NAME,headers_());
    const p=sheet_(ss,'Palette',['PaletteVersion','ColorID','H','S','L','LegacyMapColorID']);
    p.getRange(2,1,150,6).setValues(COLORS.map(c=>[VERSION,c.colorId,c.h,c.s,c.l,legacyId_(c)]));
    SpreadsheetApp.flush();
  } finally {lock.releaseLock();}
}
function legacyId_(c){
  if(c.colorId>144)return c.colorId;
  const base=Math.floor((c.colorId-1)/12)*12,offset=(c.colorId-1)%12;
  return offset<8?c.colorId:base+21-offset;
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function hash_(text){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(v=>((v+256)%256).toString(16).padStart(2,'0')).join('');}
function doGet(){return json_({ok:true,service:'taste-color-rd',schemaVersion:1});}
function doPost(e) {
  let lock;
  try {
    const raw=e&&e.postData&&e.postData.contents;
    if(typeof raw!=='string'||raw.length>40000)throw Error('Invalid body');
    const p=JSON.parse(raw);validatePayload(p);
    const props=PropertiesService.getScriptProperties();
    if(props.getProperty('ACCEPTING_RESPONSES')!=='true')throw Error('Intake is closed');
    const allow=props.getProperty('ALLOWED_SUBJECT_IDS');
    if(allow&& !allow.split(',').map(s=>s.trim()).filter(Boolean).includes(p.subjectId))throw Error('Subject not allowed');
    const key=p.sessionId+':'+p.taste,hash=hash_(JSON.stringify(p));
    lock=LockService.getScriptLock();lock.waitLock(30000);
    const sheet=sheet_(spreadsheet_(),SHEET_NAME,headers_());
    const count=sheet.getLastRow()-1;
    // Check immutable identity/sequence and deduplicate under a single script-wide lock.
    const metadata=count?sheet.getRange(2,3,count,10).getValues():[];
    for(const row of metadata){
      if(row[0]===key){
        if(row[1]!==hash)throw Error('Conflict: same key with different data');
        return json_({ok:true,key,digest:hash,duplicate:true});
      }
      if(row[3]===p.sessionId && (row[4]!==p.subjectId||Number(row[5])!==p.age||row[9]!==JSON.stringify(p.tasteSequence)))throw Error('Session identity mismatch');
    }
    const canonical=[...p.colors].sort((a,b)=>a.colorId-b.colorId);
    const values=[1,VERSION,key,hash,new Date().toISOString(),p.sessionId,p.subjectId,p.age,p.taste,'RD',p.tasteOrder,JSON.stringify(p.tasteSequence),p.startedAt,p.completedAt,JSON.stringify(p.colors),...canonical.map(c=>c.score),...canonical.map(c=>c.presentationOrder)];
    const row=sheet.getLastRow()+1;
    if(row>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),100);
    // Force IDs/text to remain literal text, including numeric IDs with leading zeros.
    sheet.getRange(row,1,1,values.length).setNumberFormat('@');
    // One canonical row per taste: no partially written long-table batches.
    sheet.getRange(row,1,1,values.length).setValues([values]);
    SpreadsheetApp.flush();
    return json_({ok:true,key,digest:hash,duplicate:false});
  } catch(err) {
    // No Spreadsheet ID, stack trace, or participant data in public error output.
    const known=['Invalid payload','Invalid body','Intake is closed','Subject not allowed','Conflict: same key with different data','Session identity mismatch'];
    return json_({ok:false,error:known.includes(err.message)?err.message:'Server error: contact administrator'});
  } finally {if(lock&&lock.hasLock())lock.releaseLock();}
}

// Shared palette and validation. Keep in sync with js/core.js.
const VERSION = 'hsl150-original-v1';
const TASTES = ['Sweet','Sour','Salty','Bitter','Umami','Spicy'];
function palette() {
  const pairs = [[25,75],[50,75],[75,75],[100,75],[25,50],[50,50],[75,50],[100,50],[100,25],[75,25],[50,25],[25,25]];
  const out = [];
  for(let h=0; h<360; h+=30) for(const [s,l] of pairs) out.push({colorId:out.length+1,h,s,l});
  for(const l of [100,80,60,40,20,0]) out.push({colorId:out.length+1,h:0,s:0,l});
  return out;
}
const COLORS = palette();
function shuffled(items, random = Math.random) {
  const a = [...items];
  for(let i=a.length-1;i>0;i--) {const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function newSession(subjectId,age,uuid,random=Math.random) {
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(subjectId) || !Number.isInteger(age) || age<1 || age>120) throw Error('Invalid participant');
  return {schemaVersion:1,paletteVersion:VERSION,sessionId:uuid,subjectId,age,createdAt:new Date().toISOString(),
    blocks:shuffled(TASTES,random).map(taste=>({taste,order:shuffled(COLORS.map(c=>c.colorId),random),scores:Array(150).fill(null),startedAt:null,payload:null,ack:null}))};
}
function payloadFor(state,index,now=new Date().toISOString()) {
  const b=state.blocks[index];
  const p={schemaVersion:1,paletteVersion:VERSION,sessionId:state.sessionId,subjectId:state.subjectId,age:state.age,
    taste:b.taste,method:'RD',tasteOrder:index+1,tasteSequence:state.blocks.map(b=>b.taste),startedAt:b.startedAt,completedAt:now,
    colors:b.order.map((id,i)=>({...COLORS[id-1],presentationOrder:i+1,score:b.scores[id-1]}))};
  validatePayload(p);return p;
}
function validatePayload(p) {
  const fail=()=>{throw Error('Invalid payload');};
  if(!p || p.schemaVersion!==1 || p.paletteVersion!==VERSION || p.method!=='RD') fail();
  if(typeof p.sessionId!=='string'|| !/^[a-f0-9-]{36}$/.test(p.sessionId)) fail();
  if(typeof p.subjectId!=='string'|| !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(p.subjectId)) fail();
  if(!Number.isInteger(p.age)||p.age<1||p.age>120) fail();
  if(!Array.isArray(p.tasteSequence)||p.tasteSequence.length!==6||new Set(p.tasteSequence).size!==6||p.tasteSequence.some(t=>!TASTES.includes(t))) fail();
  if(!Number.isInteger(p.tasteOrder)||p.tasteOrder<1||p.tasteOrder>6||p.tasteSequence[p.tasteOrder-1]!==p.taste) fail();
  if(typeof p.startedAt!=='string'||typeof p.completedAt!=='string'||!Number.isFinite(Date.parse(p.startedAt))||!Number.isFinite(Date.parse(p.completedAt))||Date.parse(p.completedAt)<Date.parse(p.startedAt)) fail();
  if(!Array.isArray(p.colors)||p.colors.length!==150||new Set(p.colors.map(c=>c.colorId)).size!==150) fail();
  p.colors.forEach((c,i)=>{const base=COLORS[c.colorId-1];if(!base||base.colorId!==c.colorId||base.h!==c.h||base.s!==c.s||base.l!==c.l||c.presentationOrder!==i+1||!Number.isInteger(c.score)||c.score<0||c.score>5) fail();});
  return true;
}
function validateState(s) {
  if(!s||s.schemaVersion!==1||s.paletteVersion!==VERSION||!Array.isArray(s.blocks)||s.blocks.length!==6) throw Error('Invalid state');
  if(s.practiceComplete!==undefined&&typeof s.practiceComplete!=='boolean')throw Error('Invalid practice state');
  if(s.practiceScores!==undefined&&(!Array.isArray(s.practiceScores)||s.practiceScores.length!==10||s.practiceScores.some(v=>v!==null&&(!Number.isInteger(v)||v<0||v>5))))throw Error('Invalid practice score');
  let unfinished=false;
  s.blocks.forEach((b,i)=>{
    if(!Array.isArray(b.order)||b.order.length!==150||new Set(b.order).size!==150||b.order.some(id=>!Number.isInteger(id)||id<1||id>150)) throw Error('Invalid order');
    if(!Array.isArray(b.scores)||b.scores.length!==150||b.scores.some(v=>v!==null&&(!Number.isInteger(v)||v<0||v>5))) throw Error('Invalid score');
    if(unfinished&&(b.payload||b.startedAt||b.scores.some(v=>v!==null))) throw Error('Invalid block sequence');
    if(b.payload){validatePayload(b.payload); const expected=payloadFor(s,i,b.payload.completedAt); if(JSON.stringify(expected)!==JSON.stringify(b.payload)) throw Error('Payload mismatch');}
    if(b.ack && (!b.payload || b.ack.key!==s.sessionId+':'+b.taste || !/^[a-f0-9]{64}$/.test(b.ack.digest))) throw Error('Invalid acknowledgement');
    if(!b.payload) unfinished=true;
  });
  // Validate participant and taste sequence even before the first block is complete.
  const fake=JSON.parse(JSON.stringify(s)); fake.blocks[0].scores.fill(0); fake.blocks[0].startedAt='2026-01-01T00:00:00.000Z';
  payloadFor(fake,0,'2026-01-01T00:00:01.000Z');return true;
}
