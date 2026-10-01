import {digest} from './storage.js';
export function validEndpoint(url) {return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url);}
export async function send(payload,config) {
  if(config.demoMode)throw Error('Demo mode');
  if(!validEndpoint(config.webAppUrl))throw Error('Web App URL is not configured');
  const hash=await digest(payload);const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),config.timeoutMs);
  try {
    // text/plain avoids a CORS preflight; never treat an opaque/no-cors response as success.
    const res=await fetch(config.webAppUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),redirect:'follow',credentials:'omit',signal:controller.signal});
    if(!res.ok)throw Error('HTTP '+res.status);
    const ack=await res.json();
    if(ack.ok!==true||ack.key!==payload.sessionId+':'+payload.taste||ack.digest!==hash)throw Error(ack.error||'Invalid acknowledgement');
    return {key:ack.key,digest:ack.digest};
  } finally {clearTimeout(timer);}
}
