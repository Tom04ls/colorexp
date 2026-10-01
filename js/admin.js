import {CONFIG} from './config.js';import {KEY,load,save,download} from './storage.js';import {send} from './transport.js';
const status=document.getElementById('status'),retry=document.getElementById('retry'),clear=document.getElementById('clear');
let state=null,locked=false;
function render(){
 try{state=load();status.textContent=`Mode: ${CONFIG.demoMode?'DEMO (no server writes)':'PRODUCTION'}\nWeb App URL: ${CONFIG.webAppUrl?'configured':'NOT configured'}\n`+(state?`Subject: ${state.subjectId}\nSession: ${state.sessionId}\n`+state.blocks.map((b,i)=>`${i+1}. ${b.taste}: ${b.ack?'server confirmed':b.payload?'pending':b.scores.filter(v=>v!==null).length+'/150'}`).join('\n'):'No local session.');}
 catch(e){status.textContent='Local data is corrupt or inaccessible. Download the raw backup before recovery.\n'+e.message;}
 try{const error=sessionStorage.getItem('taste-color-error');if(error)status.textContent+='\nLast error: '+error;}catch(_){}
 if(locked)status.textContent+='\nAnother participant/admin tab is open. Close it and reload this page.';
 retry.disabled=locked||!state||CONFIG.demoMode;clear.disabled=locked;
}
document.getElementById('backup').onclick=()=>{try{download(`taste-color-${CONFIG.demoMode?'demo-':''}${state?.sessionId||'recovery'}.json`,localStorage.getItem(KEY)||'null');}catch(e){status.textContent=e.message;}};
retry.onclick=async()=>{retry.disabled=true;clear.disabled=true;try{for(const b of state.blocks){if(b.payload&&!b.ack){b.ack=await send(b.payload,CONFIG);save(state);}}sessionStorage.removeItem('taste-color-error');render();}catch(e){render();status.textContent+='\nRetry failed: '+e.message;}};
clear.onclick=()=>{if(!confirm('Have you downloaded a backup? Clearing removes all local answers and cannot be undone.'))return;if(state?.blocks.some(b=>b.payload&&!b.ack)&&!CONFIG.demoMode){if(!confirm('UNSENT DATA EXISTS. Clear it only after verified external recovery. Delete local data?'))return;}localStorage.removeItem(KEY);sessionStorage.removeItem('taste-color-error');render();};
if(!navigator.locks){locked=true;render();}else navigator.locks.request('taste-color-rd-exclusive',{ifAvailable:true},async lock=>{locked=!lock;render();if(lock)await new Promise(()=>{});});
