const zoom=document.getElementById('zoom');
const chartViewport=document.getElementById('chart');
const zoomValue=document.getElementById('zoomValue');
let fitToWidth=true;
function applyZoom(){
 const svg=chartViewport.querySelector('svg');
 if(svg)svg.style.width=(1500*Number(zoom.value)/100)+'px';
 zoomValue.textContent=Math.round(Number(zoom.value))+'%';
}
function setZoom(value,x=chartViewport.clientWidth/2,y=chartViewport.clientHeight/2){
 const old=Number(zoom.value),min=Number(zoom.min),max=Number(zoom.max);
 const next=Math.max(min,Math.min(max,Math.round(value)));
 if(old===next)return;
 zoom.value=next;applyZoom();
 const ratio=next/old;
 chartViewport.scrollLeft=Math.max(0,(chartViewport.scrollLeft+x)*ratio-x);
 chartViewport.scrollTop=Math.max(0,(chartViewport.scrollTop+y)*ratio-y);
}
function fitGraph(){
 fitToWidth=true;
 // Leave a small inset so the SVG does not require horizontal scrolling.
 const width=chartViewport.clientWidth;
 if(width<=0)return; // Hidden mobile sheet: fit when it becomes visible.
 const percentage=Math.floor((width-8)/1500*100);
 setZoom(percentage);
 // A newly rendered SVG needs this width even when the fit percentage is unchanged.
 applyZoom();
 chartViewport.scrollLeft=0;
}
function updateChartZoom(){
 if(fitToWidth)fitGraph();
 else applyZoom();
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
if (reading) {
const toggle = document.getElementById('toggleGraph');
const mobile = document.getElementById('mobileGraph');
let lastTrigger = null;
const desktopSplit=matchMedia('(min-width:951px)');
const masthead = document.querySelector('.top');

function syncReadingAccess(open) {
  const sheetOpen = open && !desktopSplit.matches;
  reading.inert = sheetOpen;
  masthead.inert = sheetOpen;
  document.body.classList.toggle('sheet-open', sheetOpen);
}

function setGraph(open, trigger) {
  if (trigger) lastTrigger = trigger;
  document.body.classList.toggle('graph-closed', !open);
  document.body.classList.toggle('mobile-open', open);
  syncReadingAccess(open);
  for (const control of [toggle, mobile]) {
    control.setAttribute('aria-expanded', String(open));
    control.textContent = open ? '응답 흐름도 닫기' : '응답 흐름도 열기';
  }
  if (open) {
    requestAnimationFrame(() => {
      updateChartZoom();
      if (trigger) document.getElementById('diagram').focus();
    });
  } else if (lastTrigger) {
    const focusTarget = lastTrigger.getClientRects().length
      ? lastTrigger : desktopSplit.matches ? toggle : mobile;
    focusTarget.focus({preventScroll:true});
    lastTrigger = null;
  }
}
const isGraphOpen = () => !document.body.classList.contains('graph-closed');
toggle.onclick = () => setGraph(!isGraphOpen(), isGraphOpen() ? null : toggle);
mobile.onclick = () => setGraph(!isGraphOpen(), isGraphOpen() ? null : mobile);
document.getElementById('closeGraph').onclick = () => setGraph(false, lastTrigger || (desktopSplit.matches ? toggle : mobile));
document.getElementById('expandGraph').onclick = () => toggleWideGraph();
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.defaultPrevented && isGraphOpen()) {
    setGraph(false, lastTrigger || (desktopSplit.matches ? toggle : mobile));
  }
});

/* Resizable desktop split pane. On mobile, the existing sheet layout is unchanged. */
const splitBar=document.getElementById('splitter');
const splitLayout=document.querySelector('.layout');
const wideButton=document.getElementById('expandGraph');
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
let sectionHeadings = [];
let activeTocLink;
let pendingSectionUpdate = false;
function updateReadingSection() {
  pendingSectionUpdate = false;
  const top = masthead.getBoundingClientRect().bottom + 35;
  let current;
  for (const heading of sectionHeadings) {
    if (heading.getBoundingClientRect().top > top) break;
    current = heading;
  }
  const link = current && document.querySelector('#toc a[href="#' + current.id + '"]');
  if (link === activeTocLink) return;
  activeTocLink?.removeAttribute('aria-current');
  link?.setAttribute('aria-current', 'location');
  activeTocLink = link;
}
function scheduleSectionUpdate() {
  if (!pendingSectionUpdate) {
    pendingSectionUpdate = true;
    requestAnimationFrame(updateReadingSection);
  }
}
window.addEventListener('scroll', scheduleSectionUpdate, {passive: true});
window.addEventListener('resize', scheduleSectionUpdate);
function view(name){
  document.getElementById('overviewIntro').hidden = name !== 'general';
  document.getElementById('detailIntro').hidden = name !== 'detailed';
  document.querySelectorAll('article').forEach(a=>a.hidden=a.id!==name);
  document.querySelectorAll('[data-view]').forEach(button=>{
    const selected=button.dataset.view===name;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  const toc=document.getElementById('toc');
  toc.replaceChildren();
  sectionHeadings = document.querySelectorAll('#'+name+' :is(h2,h3)[id]');
  scheduleSectionUpdate();
  sectionHeadings.forEach(h=>{
    const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;a.className=h.tagName==='H3'?'subtopic':'topic';toc.append(a);
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
  window.scrollTo({top:0,behavior:'auto'});
});
function isDetailHash(){return /^#(?:detailed|detail-|hypothesis-)/.test(location.hash);}
function focusDeepLink(smooth=false){
  const id = location.hash.slice(1);
  if (!/^(?:general-|detail-|hypothesis-)[a-z0-9-]+$/.test(id)) return;
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target || target.closest('[hidden]')) return;
    target.tabIndex = -1;
    target.focus({preventScroll:true});
    target.scrollIntoView({behavior:smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',block:'start'});
  });
}
view(isDetailHash()?'detailed':'general');
document.querySelectorAll('a[data-detail-link], .question-jump a[href^="#detail-"]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();
  const id = a.dataset.detailLink || a.hash.slice(1);
  if (!document.getElementById(id)) return;
  if (!isDetailHash()) detailReturn={scrollY:window.scrollY,url:location.pathname+location.search+location.hash,link:a};
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
if(location.hash==='#general'||location.hash==='#detailed'){
  window.addEventListener('load',()=>requestAnimationFrame(()=>window.scrollTo(0,0)),{once:true});
}else if(location.hash)focusDeepLink();

document.querySelectorAll('[data-chart]').forEach(b=>b.onclick=()=>{document.getElementById('diagram').value=b.dataset.chart;document.getElementById('group').value=b.closest('article')?.id==='general'&&b.previousElementSibling?.textContent.includes('VRChat')?'VRChat':'전체';setGraph(true,b);render();});
setGraph(new URLSearchParams(location.search).has('chart'));
const contents=document.querySelector('.toc');
contents.open=desktopSplit.matches;
desktopSplit.addEventListener('change', event => {
  contents.open = event.matches;
  if (beforeWide !== null) applySplit(beforeWide);
  clearWide();
  syncReadingAccess(isGraphOpen());
});
contents.addEventListener('click',event=>{
  if(!desktopSplit.matches && event.target.closest('a'))contents.open=false;
});
}
const initialChart=new URLSearchParams(location.search).get('chart');if(['content','perception','perf','mode'].includes(initialChart))document.getElementById('diagram').value=initialChart;
