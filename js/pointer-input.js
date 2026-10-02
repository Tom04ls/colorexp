// Pointer Events include Apple Pencil (pointerType=pen), touch and mouse.
// Do not rely on Safari generating a synthetic click after stylus contact.
export function bindPointerInput(container,scoreButtons,selectScore,applyScore,doc=document){
 let activePointer=null,dragScore=null,currentScore=null;
 for(const button of scoreButtons){
  const choose=()=>{currentScore=Number(button.textContent.trim());selectScore(currentScore);};
  button.addEventListener('pointerdown',event=>{
   if(event.isPrimary===false||event.button>0)return;
   event.preventDefault();choose();
  });
  button.addEventListener('click',choose);
 }
 function paint(target){
  const tile=target?.closest?.('.color-box');
  if(tile&&container.contains(tile))applyScore(Array.from(container.children).indexOf(tile),dragScore);
 }
 container.addEventListener('pointerdown',event=>{
  if(currentScore===null||event.isPrimary===false||event.button>0)return;
  const tile=event.target.closest?.('.color-box');if(!tile)return;
  event.preventDefault();activePointer=event.pointerId;dragScore=currentScore;
  container.setPointerCapture?.(event.pointerId);paint(tile);
 });
 container.addEventListener('pointermove',event=>{
  if(event.pointerId!==activePointer)return;event.preventDefault();
  paint(doc.elementFromPoint(event.clientX,event.clientY));
 });
 const end=event=>{if(event.pointerId===activePointer){activePointer=null;dragScore=null;}};
 container.addEventListener('pointerup',end);container.addEventListener('pointercancel',end);container.addEventListener('lostpointercapture',end);
 // Prevent duplicate legacy Touch Events while retaining the original fallback in older browsers.
 if(typeof PointerEvent!=='undefined')for(const name of ['touchstart','touchmove','touchend'])container.addEventListener(name,event=>{event.preventDefault();event.stopImmediatePropagation();},{capture:true,passive:false});
}
