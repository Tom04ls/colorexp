import {CONFIG} from './config.js';
import {validateState} from './core.js';
export const KEY=CONFIG.demoMode?'taste-color-rd-demo-v1':'taste-color-rd-v1';
export function load() {
  const raw=localStorage.getItem(KEY); if(!raw)return null;
  const s=JSON.parse(raw); validateState(s); return s;
}
export function save(state) {
  validateState(state);
  const raw=JSON.stringify(state);
  localStorage.setItem(KEY,raw);
  if(localStorage.getItem(KEY)!==raw)throw Error('Storage verification failed');
}
export function download(name,text,type='application/json') {
  const url=URL.createObjectURL(new Blob([text],{type})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function digest(payload) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));
  return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
