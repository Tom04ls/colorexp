export const VERSION = 'hsl150-original-v1';
export const TASTES = ['Sweet','Sour','Salty','Bitter','Umami','Spicy'];
export function palette() {
  const pairs = [[25,75],[50,75],[75,75],[100,75],[25,50],[50,50],[75,50],[100,50],[100,25],[75,25],[50,25],[25,25]];
  const out = [];
  for(let h=0; h<360; h+=30) for(const [s,l] of pairs) out.push({colorId:out.length+1,h,s,l});
  for(const l of [100,80,60,40,20,0]) out.push({colorId:out.length+1,h:0,s:0,l});
  return out;
}
export const COLORS = palette();
export function shuffled(items, random = Math.random) {
  const a = [...items];
  for(let i=a.length-1;i>0;i--) {const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];}
  return a;
}
export function newSession(subjectId,age,uuid,random=Math.random) {
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(subjectId) || !Number.isInteger(age) || age<1 || age>120) throw Error('Invalid participant');
  return {schemaVersion:1,paletteVersion:VERSION,sessionId:uuid,subjectId,age,createdAt:new Date().toISOString(),
    blocks:shuffled(TASTES,random).map(taste=>({taste,order:shuffled(COLORS.map(c=>c.colorId),random),scores:Array(150).fill(null),startedAt:null,payload:null,ack:null}))};
}
export function payloadFor(state,index,now=new Date().toISOString()) {
  const b=state.blocks[index];
  const p={schemaVersion:1,paletteVersion:VERSION,sessionId:state.sessionId,subjectId:state.subjectId,age:state.age,
    taste:b.taste,method:'RD',tasteOrder:index+1,tasteSequence:state.blocks.map(b=>b.taste),startedAt:b.startedAt,completedAt:now,
    colors:b.order.map((id,i)=>({...COLORS[id-1],presentationOrder:i+1,score:b.scores[id-1]}))};
  validatePayload(p);return p;
}
export function validatePayload(p) {
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
export function validateState(s) {
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
