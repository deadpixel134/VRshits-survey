const zoom=document.getElementById('zoom');
const chartViewport=document.getElementById('chart');
const zoomValue=document.getElementById('zoomValue');
let fitToWidth=false;
function applyZoom(){
 const svg=chartViewport.querySelector('svg');
 if(svg)svg.style.width=(1500*Number(zoom.value)/100)+'px';
 zoomValue.textContent=Math.round(Number(zoom.value))+'%';
}
function setZoom(value,x=chartViewport.clientWidth/2,y=chartViewport.clientHeight/2){
 const old=Number(zoom.value),min=Number(zoom.min),max=Number(zoom.max);
 const next=Math.max(min,Math.min(max,Math.round(value/5)*5));
 if(old===next)return;
 zoom.value=next;applyZoom();
 const ratio=next/old;
 chartViewport.scrollLeft=Math.max(0,(chartViewport.scrollLeft+x)*ratio-x);
 chartViewport.scrollTop=Math.max(0,(chartViewport.scrollTop+y)*ratio-y);
}
function fitGraph(){
 fitToWidth=true;
 setZoom(Math.floor(chartViewport.clientWidth/75)*5);
 chartViewport.scrollLeft=0;
}
zoom.addEventListener('input',()=>{
 fitToWidth=false;
 const next=Number(zoom.value);
 const svg=chartViewport.querySelector('svg');
 const old=svg?parseFloat(svg.style.width)/15:next;
 zoom.value=old||next;
 setZoom(next);
});
document.getElementById('fit').onclick=fitGraph;
document.getElementById('zoomIn').onclick=()=>{fitToWidth=false;setZoom(Number(zoom.value)+10);};
document.getElementById('zoomOut').onclick=()=>{fitToWidth=false;setZoom(Number(zoom.value)-10);};
document.getElementById('resetView').onclick=()=>{fitToWidth=false;setZoom(100);chartViewport.scrollLeft=0;chartViewport.scrollTop=0;};
chartViewport.addEventListener('wheel',event=>{
 if(!event.ctrlKey)return;
 event.preventDefault();fitToWidth=false;
 const r=chartViewport.getBoundingClientRect();
 setZoom(Number(zoom.value)+(event.deltaY<0?5:-5),event.clientX-r.left,event.clientY-r.top);
},{passive:false});
let pan=null;
chartViewport.addEventListener('pointerdown',event=>{
 if(event.pointerType!=='mouse'||event.button!==0)return;
 const background=event.target===chartViewport||event.target.tagName?.toLowerCase()==='svg';
 if(!background&&!event.altKey)return;
 pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:chartViewport.scrollLeft,top:chartViewport.scrollTop,moved:false};
 chartViewport.setPointerCapture(event.pointerId);
});
chartViewport.addEventListener('pointermove',event=>{
 if(!pan||pan.id!==event.pointerId)return;
 const dx=event.clientX-pan.x,dy=event.clientY-pan.y;
 if(!pan.moved&&Math.hypot(dx,dy)>5){pan.moved=true;chartViewport.classList.add('is-panning');}
 if(pan.moved){chartViewport.scrollLeft=Math.max(0,pan.left-dx);chartViewport.scrollTop=Math.max(0,pan.top-dy);}
});
function finishPan(event){
 if(!pan||pan.id!==event.pointerId)return;
 if(pan.moved)chartViewport.dataset.dragged='true';
 pan=null;chartViewport.classList.remove('is-panning');
 if(chartViewport.hasPointerCapture(event.pointerId))chartViewport.releasePointerCapture(event.pointerId);
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])chartViewport.addEventListener(type,finishPan);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(fitToWidth)fitGraph();}).observe(chartViewport);
applyZoom();

const reading=document.getElementById('reading');
if(reading){const panel=document.getElementById('graphPanel'),toggle=document.getElementById('toggleGraph'),mobile=document.getElementById('mobileGraph');let lastTrigger=null;
function setGraph(open){document.body.classList.toggle('graph-closed',!open);document.body.classList.toggle('mobile-open',open);toggle.setAttribute('aria-expanded',String(open));mobile.setAttribute('aria-expanded',String(open));toggle.textContent=open?'그래프 접기':'그래프 열기';mobile.textContent=open?'Sankey 그래프 접기 ↓':'Sankey 그래프 열기 ↑';if(!open&&lastTrigger)lastTrigger.focus({preventScroll:true});}
toggle.onclick=()=>setGraph(document.body.classList.contains('graph-closed'));mobile.onclick=()=>setGraph(!document.body.classList.contains('mobile-open'));document.getElementById('closeGraph').onclick=()=>setGraph(false);document.getElementById('expandGraph').onclick=()=>toggleWideGraph();document.addEventListener('keydown',e=>{if(e.key==='Escape')setGraph(false)});

/* Resizable desktop split pane. On mobile, the existing sheet layout is unchanged. */
const splitBar=document.getElementById('splitter');
const splitLayout=document.querySelector('.layout');
const wideButton=document.getElementById('expandGraph');
const desktopSplit=matchMedia('(min-width:951px)');
const savedSplitKey='xr-survey-split-width-v1';
const defaultSplit=54;
const minPaneWidth=320;
let splitPercent=defaultSplit, dragPointer=null, beforeWide=null;
try{
  const saved=Number(localStorage.getItem(savedSplitKey));
  if(Number.isFinite(saved)&&saved>=1&&saved<=99)splitPercent=saved;
}catch(_error){/* Private-mode storage can be unavailable; resizing still works. */}
function splitLimits(){
  const width=splitLayout.getBoundingClientRect().width;
  if(width<=0)return {min:20,max:80};
  const min=(minPaneWidth+6)/width*100;
  const max=(width-minPaneWidth-6)/width*100;
  return min>max?{min:50,max:50}:{min,max};
}
function applySplit(percent,save=false){
  const {min,max}=splitLimits();
  splitPercent=Math.min(max,Math.max(min,percent));
  splitLayout.style.setProperty('--reading-split',splitPercent+'%');
  splitBar.setAttribute('aria-valuemin',String(Math.floor(min)));
  splitBar.setAttribute('aria-valuemax',String(Math.ceil(max)));
  splitBar.setAttribute('aria-valuenow',String(Math.round(splitPercent)));
  splitBar.setAttribute('aria-valuetext','본문 '+Math.round(splitPercent)+'%, 그래프 '+Math.round(100-splitPercent)+'%');
  if(save)try{localStorage.setItem(savedSplitKey,String(splitPercent));}catch(_error){}
}
function clearWide(){
  beforeWide=null;
  document.body.classList.remove('graph-wide');
  wideButton.textContent='크게 보기';
  wideButton.setAttribute('aria-pressed','false');
}
function toggleWideGraph(){
  const active=document.body.classList.contains('graph-wide');
  if(!desktopSplit.matches){
    document.body.classList.toggle('graph-wide',!active);
    wideButton.textContent=active?'크게 보기':'크기 복원';
    wideButton.setAttribute('aria-pressed',String(!active));
    return;
  }
  if(active){
    document.body.classList.remove('graph-wide');
    applySplit(beforeWide??defaultSplit);
    beforeWide=null;
  }else{
    beforeWide=splitPercent;
    document.body.classList.add('graph-wide');
    applySplit(35);
  }
  wideButton.textContent=active?'크게 보기':'크기 복원';
  wideButton.setAttribute('aria-pressed',String(!active));
}
function splitFromPointer(clientX){
  const rect=splitLayout.getBoundingClientRect();
  if(rect.width>0)applySplit((clientX-rect.left)/rect.width*100);
}
splitBar.addEventListener('pointerdown',event=>{
  if(!desktopSplit.matches||document.body.classList.contains('graph-closed')||
     event.button!==0||dragPointer!==null)return;
  if(document.body.classList.contains('graph-wide'))clearWide();
  dragPointer=event.pointerId;
  splitBar.setPointerCapture(event.pointerId);
  document.body.classList.add('is-resizing');
  splitFromPointer(event.clientX);
  event.preventDefault();
});
splitBar.addEventListener('pointermove',event=>{
  if(dragPointer===event.pointerId)splitFromPointer(event.clientX);
});
function stopDragging(event){
  if(dragPointer!==event.pointerId)return;
  dragPointer=null;
  document.body.classList.remove('is-resizing');
  applySplit(splitPercent,true);
  if(splitBar.hasPointerCapture(event.pointerId))splitBar.releasePointerCapture(event.pointerId);
}
splitBar.addEventListener('pointerup',stopDragging);
splitBar.addEventListener('pointercancel',stopDragging);
splitBar.addEventListener('lostpointercapture',stopDragging);
splitBar.addEventListener('keydown',event=>{
  if(!desktopSplit.matches||document.body.classList.contains('graph-closed'))return;
  const {min,max}=splitLimits();
  let target;
  if(event.key==='ArrowLeft')target=splitPercent-3;
  else if(event.key==='ArrowRight')target=splitPercent+3;
  else if(event.key==='Home')target=min;
  else if(event.key==='End')target=max;
  else return;
  event.preventDefault();
  if(document.body.classList.contains('graph-wide'))clearWide();
  applySplit(target,true);
});
splitBar.addEventListener('dblclick',()=>{
  if(!desktopSplit.matches)return;
  clearWide();
  applySplit(defaultSplit,true);
});
addEventListener('resize',()=>applySplit(splitPercent));
applySplit(splitPercent);

/* Remember the exact scroll position before following an insight link. */
const returnButton=document.getElementById('returnToReading');
let detailReturn=null;
function view(name){
  document.querySelectorAll('article').forEach(a=>a.hidden=a.id!==name);
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const toc=document.getElementById('toc');
  toc.replaceChildren();
  document.querySelectorAll('#'+name+' h2').forEach(h=>{
    const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;toc.append(a);
  });
  returnButton.hidden=!(detailReturn&&name==='detailed');
}
function restoreReading(updateUrl=true){
  if(!detailReturn)return;
  const point=detailReturn;
  detailReturn=null;
  if(updateUrl)history.replaceState(null,'',point.url);
  view('general');
  requestAnimationFrame(()=>{
    window.scrollTo({top:point.scrollY,behavior:'auto'});
    if(point.link?.isConnected)point.link.focus({preventScroll:true});
  });
}
returnButton.addEventListener('click',()=>restoreReading());
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{
  detailReturn=null;
  view(b.dataset.view);
  history.replaceState(null,'','#'+b.dataset.view);
  window.scrollTo({top:0,behavior:'smooth'});
});
function isDetailHash(){return /^#(?:detailed|detail-|hypothesis-)/.test(location.hash);}
function focusDeepLink(smooth=false){
  const id=decodeURIComponent(location.hash.slice(1));
  if(!/^(?:hypothesis-0[1-7]|detail-hypotheses|detail-evidence-map|detail-forecast)$/.test(id))return;
  requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'}));
}
view(isDetailHash()?'detailed':'general');
document.querySelectorAll('a[data-detail-link]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();
  const id=a.getAttribute('data-detail-link');
  if(!/^(?:hypothesis-0[1-7]|detail-hypotheses)$/.test(id))return;
  detailReturn={scrollY:window.scrollY,url:location.pathname+location.search+location.hash,link:a};
  view('detailed');
  history.pushState(null,'','#'+id);
  focusDeepLink(true);
}));
function handleHistoryNavigation(){
  if(detailReturn&&!isDetailHash()){restoreReading(false);return;}
  view(isDetailHash()?'detailed':'general');
  focusDeepLink();
}
window.addEventListener('hashchange',handleHistoryNavigation);
window.addEventListener('popstate',handleHistoryNavigation);
if(isDetailHash())focusDeepLink();

document.querySelectorAll('[data-chart]').forEach(b=>b.onclick=()=>{lastTrigger=b;document.getElementById('diagram').value=b.dataset.chart;document.getElementById('group').value=b.closest('article')?.id==='general'&&b.previousElementSibling?.textContent.includes('VRChat')?'VRChat':'전체';setGraph(true);render();});
if(matchMedia('(max-width:950px)').matches)setGraph(false);else{document.body.classList.remove('graph-closed');document.body.classList.remove('mobile-open');}
}
const initialChart=new URLSearchParams(location.search).get('chart');if(['content','perception','perf','mode'].includes(initialChart))document.getElementById('diagram').value=initialChart;
