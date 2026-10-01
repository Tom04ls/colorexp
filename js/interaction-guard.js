// Input restrictions only. No changes to colors, geometry, text, or fonts.
export function installInteractionGuard(){
 for(const el of [document.documentElement,document.body]){
  el.style.overflow='hidden';el.style.overscrollBehavior='none';el.style.touchAction='none';
 }
 const cancel=e=>e.preventDefault();
 document.addEventListener('wheel',cancel,{passive:false});
 document.addEventListener('touchmove',cancel,{passive:false});
 document.addEventListener('touchstart',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
 for(const name of ['gesturestart','gesturechange','gestureend'])document.addEventListener(name,cancel,{passive:false});
 document.addEventListener('dblclick',cancel,{passive:false});
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&['+','-','=','0','Add','Subtract'].includes(e.key))e.preventDefault();
  const editing=e.target instanceof Element && !!e.target.closest('input,textarea,select,[contenteditable="true"]');
  if(!editing&&[' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key))e.preventDefault();
 });
}
installInteractionGuard();
