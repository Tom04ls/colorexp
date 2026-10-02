import {bindPointerInput} from './pointer-input.js';
import {mergeResume} from './resume.js';
import './interaction-guard.js';
import {CONFIG} from './config.js';
import {COLORS,newSession,payloadFor} from './core.js';
import {load,save} from './storage.js';
import {send,validEndpoint,beginSession} from './transport.js';
import {colors,customColors,renderPage1,renderPage2,updateColorBoxes,setSelectedRating} from './original-render.js';
const page=location.pathname.split('/').pop()||'index.html';
const labels={Sweet:['Sweetness.','Sweetest'],Sour:['Sourness.','Sourest'],Salty:['Saltiness.','Saltiest'],Bitter:['Bitterness.','Most bitter'],Umami:['Umaminess.','Most umami'],Spicy:['Spiciness.','Spiciest']};
let state=null,frozen=false,busy=false,attempt=0,timer=null;
window.setSelectedRating=setSelectedRating;
const index=()=>state.blocks.findIndex(b=>!b.ack&&!(CONFIG.demoMode&&b.demoDone));
function go(name){location.replace(name);}
function fail(e){
 frozen=true;hideSpinner();document.querySelectorAll('button,input').forEach(el=>el.disabled=true);
 document.querySelectorAll('a').forEach(el=>el.onclick=e=>e.preventDefault());
 // No new text or layout is injected into the participant's stimulus screen.
 console.error('Experiment stopped. Open admin.html for recovery.',e);
 try{sessionStorage.setItem('taste-color-error',String(e.message||e));}catch(_){}
}
function commit(change){
 if(frozen)throw Error('Experiment stopped');const next=structuredClone(state);
 try{change(next);next.serverRegistered=!CONFIG.demoMode;save(next);state=next;}catch(e){fail(e);throw e;}
}
function showSpinner(){
 if(document.getElementById('spinner-overlay'))return;
 const d=document.createElement('div');d.id='spinner-overlay';
 Object.assign(d.style,{position:'fixed',top:'0',left:'0',width:'100%',height:'100%',backgroundColor:'rgba(255, 255, 255, 0.8)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:'9999'});
 const img=document.createElement('img');img.src='Spin@1x-1.0s-200px-200px.gif';img.alt='Loading...';img.style.width='200px';img.style.height='200px';d.append(img);document.body.append(d);
}
function hideSpinner(){document.getElementById('spinner-overlay')?.remove();}
function incomplete(list){
 const host=document.getElementById('not-sour-section');
 if(!document.getElementById('incomplete-warning')){
 const p=document.createElement('p');p.id='incomplete-warning';p.textContent='Please complete all color entries.';p.style.color='red';p.style.fontSize='2vw';p.style.marginTop='1vh';host.append(p);setTimeout(()=>p.remove(),3000);
 }
 list.forEach((c,i)=>{if(c.rating===null)document.getElementById(`color-box-${i}`)?.classList.add('blink');});
 setTimeout(()=>document.querySelectorAll('.blink').forEach(el=>el.classList.remove('blink')),3000);
}
async function flush(){
 if(busy||frozen||!state)return;clearTimeout(timer);
 const i=index();if(i<0){go('thankyou.html');return;}
 const block=state.blocks[i];if(!block.payload)return;
 busy=true;showSpinner();
 try{
   if(CONFIG.demoMode)commit(s=>s.blocks[i].demoDone=true);
   else{const ack=await send(block.payload,CONFIG);commit(s=>s.blocks[i].ack=ack);}
   attempt=0;try{sessionStorage.removeItem('taste-color-error');}catch(_){}go(index()<0?'thankyou.html':'welcome.html');
 }catch(e){
   console.error('Save not confirmed. Local copy retained.',e);
   try{sessionStorage.setItem('taste-color-error',String(e.message||e));}catch(_){}
   if(!frozen)timer=setTimeout(flush,Math.min(300000,5000*2**Math.min(attempt++,6)));
 }finally{busy=false;hideSpinner();}
}
window.checkRatingsAndNavigate3=()=>{
 if(customColors.some(c=>c.rating===null)){incomplete(customColors);return;}
 commit(s=>s.practiceComplete=true);go('welcome.html');
};
window.checkRatingsAndNavigate2=()=>{
 if(frozen||busy)return;
 const i=index();if(i<0){go('thankyou.html');return;}
 if(!state.blocks[i].payload){
   if(colors.some(c=>c.rating===null)){incomplete(colors);return;}
   commit(s=>s.blocks[i].payload=payloadFor(s,i));
 }
 flush();
};
function renderStart(){
 const form=document.querySelector('form');form.removeAttribute('action');
 form.onsubmit=async e=>{
  e.preventDefault();if(frozen||busy)return;
  const subjectId=document.getElementById('member_no').value.trim(),age=Number(document.getElementById('age').value);
  const showError=text=>{let d=document.querySelector('.error-message');if(!d){d=document.createElement('div');d.className='error-message';form.after(d);}d.textContent=text;};
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(subjectId)){showError('Please enter your member ID.');return;}
  if(!Number.isInteger(age)||age<1||age>120){showError('Please enter your age.');return;}
  if(!CONFIG.demoMode&&!validEndpoint(CONFIG.webAppUrl)){fail(Error('Configure the Web App URL in js/config.js before starting.'));return;}
  if(state&&index()>=0&&state.subjectId!==subjectId){showError('Another participant has unfinished answers on this device. Please contact the administrator.');return;}
  busy=true;showSpinner();
  try{
   let next;
   if(CONFIG.demoMode){
    if(state?.subjectId===subjectId){
      if(state.age!==age)throw Error('Age does not match this Subject ID');
      if(index()<0)throw Error('Subject ID has already completed the experiment');
      next=state;
    }else{next=newSession(subjectId,age,crypto.randomUUID());next.practiceComplete=false;next.practiceScores=Array(10).fill(null);}
   }else next=mergeResume(await beginSession(subjectId,age,state,CONFIG),state);
   next.serverRegistered=!CONFIG.demoMode;save(next);state=next;
   go(!state.practiceComplete?'Page2.html':state.blocks[index()].startedAt?'color-1-2.html':'welcome.html');
  }catch(e){showError(e.message==='Age does not match this Subject ID'?'Please enter your age according to your membership information!':e.message);}
  finally{busy=false;hideSpinner();}
 };
}
function init(){
 state=load();
 if(page==='start.html'){renderStart();return;}
 if(!state){go('start.html');return;}
 if(!CONFIG.demoMode&&!state.serverRegistered){go('start.html');return;}
 if(page==='thankyou.html'){if(index()>=0)go('color-1-2.html');return;}
 const i=index();if(i<0){go('thankyou.html');return;}
 if(page==='Page2.html'){
   if(state.practiceComplete){go('welcome.html');return;}
   customColors.forEach((c,j)=>Object.defineProperty(c,'rating',{get:()=>state.practiceScores?.[j]??null,set:value=>commit(s=>{s.practiceScores??=Array(10).fill(null);s.practiceScores[j]=value;})}));
   renderPage1('page-1-container');
   bindPointerInput(document.getElementById('page-1-container'),document.querySelectorAll('.rating-column button'),setSelectedRating,(position,score)=>{
    customColors[position].rating=score;
    document.getElementById('page-1-container').children[position].querySelector('span').textContent=String(score);
   });return;
 }
 if(!state.practiceComplete){go('Page2.html');return;}
 if(page==='welcome.html'){
   if(state.blocks[i].startedAt){go('color-1-2.html');return;}
   document.getElementById('subject-value').textContent=state.subjectId;
   document.getElementById('taste-value').textContent=labels[state.blocks[i].taste][0];return;
 }
 if(page==='color-1-2.html'){
   if(!state.blocks[i].startedAt)commit(s=>s.blocks[i].startedAt=new Date().toISOString());
   document.getElementById('display-taste').textContent=labels[state.blocks[i].taste][1];document.getElementById('taste-name').textContent=labels[state.blocks[i].taste][0];
   state.blocks[i].order.forEach(id=>{
    const c={...COLORS[id-1]};Object.defineProperty(c,'rating',{get:()=>state.blocks[i].scores[id-1],set:value=>{
     if(state.blocks[i].payload||frozen)return;commit(s=>s.blocks[i].scores[id-1]=value);
    }});colors.push(c);
   });
   renderPage2('page-3-container');updateColorBoxes('page-3-container');
   bindPointerInput(document.getElementById('page-3-container'),document.querySelectorAll('.rating-column button'),setSelectedRating,(position,score)=>{
    colors[position].rating=score;updateColorBoxes('page-3-container');
   });if(state.blocks[i].payload)flush();
 }
}
window.addEventListener('online',flush);
window.addEventListener('storage',e=>{if(e.key===null||e.key==='taste-color-rd-v1'||e.key==='taste-color-rd-demo-v1')fail(Error('Local state changed in another tab. Reload before continuing.'));});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
if(page!=='index.html'){
 if(!navigator.locks||!crypto.randomUUID||!crypto.subtle)fail(Error('Use a current browser over HTTPS or localhost.'));
 else navigator.locks.request('taste-color-rd-exclusive',{ifAvailable:true},async lock=>{
  if(!lock){fail(Error('Close the other experiment/admin tab, then reload.'));return;}
  try{init();}catch(e){fail(e);}await new Promise(()=>{});
 });
}
