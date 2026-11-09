function applyZoom(){const svg=document.querySelector('#chart svg');if(svg)svg.style.width=(1500*Number(document.querySelector('#zoom').value)/100)+'px';}
const zoom=document.getElementById('zoom');zoom.addEventListener('input',applyZoom);document.getElementById('fit').onclick=()=>{zoom.value=Math.max(40,Math.min(140,(document.getElementById('chart').clientWidth/1500*100)));applyZoom();};
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

function view(name){document.querySelectorAll('article').forEach(a=>a.hidden=a.id!==name);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));const toc=document.getElementById('toc');toc.replaceChildren();document.querySelectorAll('#'+name+' h2').forEach(h=>{const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;toc.append(a)});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view(b.dataset.view);history.replaceState(null,'','#'+b.dataset.view);window.scrollTo({top:0,behavior:'smooth'});});
function isDetailHash(){return /^#(?:detailed|detail-|hypothesis-)/.test(location.hash);}
function focusDeepLink(smooth=false){const id=decodeURIComponent(location.hash.slice(1));if(!/^(?:hypothesis-0[1-7]|detail-hypotheses|detail-evidence-map|detail-forecast)$/.test(id))return;requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'}));}
view(isDetailHash()?'detailed':'general');
document.querySelectorAll('a[data-detail-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const id=a.getAttribute('data-detail-link');if(!/^hypothesis-0[1-7]$/.test(id))return;view('detailed');history.pushState(null,'','#'+id);focusDeepLink(true);}));
window.addEventListener('hashchange',()=>{view(isDetailHash()?'detailed':'general');focusDeepLink();});
if(isDetailHash())focusDeepLink();
document.querySelectorAll('[data-chart]').forEach(b=>b.onclick=()=>{lastTrigger=b;document.getElementById('diagram').value=b.dataset.chart;document.getElementById('group').value=b.closest('article')?.id==='general'&&b.previousElementSibling?.textContent.includes('VRChat')?'VRChat':'전체';setGraph(true);render();});
if(matchMedia('(max-width:950px)').matches)setGraph(false);else{document.body.classList.remove('graph-closed');document.body.classList.remove('mobile-open');}
}
const initialChart=new URLSearchParams(location.search).get('chart');if(['content','perception','perf','mode'].includes(initialChart))document.getElementById('diagram').value=initialChart;
