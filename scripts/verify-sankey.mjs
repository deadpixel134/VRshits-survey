// Headless regression tests for the real Sankey renderer, without browser packages.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dataText=readFileSync('docs/data.js','utf8').trim();
const DATA=JSON.parse(dataText.slice('const DATA='.length,-1));
const sankey=readFileSync('docs/sankey.js','utf8');

class Element{
 constructor(tag){
  this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.events={};
  this.value='';this.hidden=false;this.textContent='';this.style={};this.parentElement={hidden:false};
  this.clientWidth=800;this.clientHeight=500;this.scrollLeft=0;this.scrollTop=0;
  this.classes=new Set();
  this.classList={contains:key=>this.classes.has(key),toggle:(key,force)=>{
   const on=force===undefined?!this.classes.has(key):force;
   if(on)this.classes.add(key);else this.classes.delete(key);return on;
  }};
 }
 setAttribute(key,value){
  this.attrs[key]=String(value);
  if(key==='class')String(value).split(/\s+/).forEach(x=>this.classes.add(x));
  if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_m,c)=>c.toUpperCase())]=String(value);
 }
 getAttribute(key){return this.attrs[key]??null;}
 addEventListener(event,fn){this.events[event]=fn;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 contains(element){return this===element||this.children.some(child=>child.contains?.(element));}
 matches(selector){
  if(selector==='path.link')return this.tagName==='path'&&this.classes.has('link');
  if(selector==='[data-node-layer]')return this.dataset.nodeLayer!==undefined;
  return selector==='svg'&&this.tagName==='svg';
 }
 querySelectorAll(selector){
  const result=[];
  const visit=node=>{for(const child of node.children){if(child.matches?.(selector))result.push(child);if(child.children)visit(child);}};
  visit(this);return result;
 }
 querySelector(selector){
  if(selector==='svg')return this.querySelectorAll('svg')[0]??null;
  if(selector.includes('data-node-layer')){
   const layer=selector.match(/data-node-layer="(\d+)"/)?.[1];
   const name=selector.match(/data-node-name="([^"]+)"/)?.[1];
   return this.querySelectorAll('[data-node-layer]').find(e=>e.dataset.nodeLayer===layer&&e.dataset.nodeName===name)??null;
  }
  return null;
 }
 closest(selector){
  return selector==='path.link,[data-node-layer]'&&(this.matches('path.link')||this.matches('[data-node-layer]'))?this:null;
 }
 click(){this.events.click?.({target:this});}
}

const elements={};
for(const id of ['diagram','group','exclude','scope','gpuLimitControl','gpuLimit','nodeJump','zoom','chart','legend','links','download','selectionInfo','clearSelection'])elements[id]=new Element(id);
elements.diagram.value='perception';elements.group.value='전체';
elements.gpuLimit.value='all';elements.zoom.value='100';elements.exclude.checked=true;
const document={
 getElementById:id=>elements[id],
 createElement:tag=>new Element(tag),
 createElementNS:(_ns,tag)=>new Element(tag),
 createTextNode:text=>({tagName:'#text',textContent:text,children:[]})
};
const window={};let updated=0;let exportedBlob;
const blobURL={
 createObjectURL(blob){exportedBlob=blob;return 'blob:mock';},
 revokeObjectURL(){}
};
new Function('document','window','DATA','updateChartZoom','CSS','URL','Blob',sankey)(
 document,window,DATA,()=>{updated++;},{escape:s=>s},blobURL,Blob
);
const chart=elements.chart;
const getSVG=()=>chart.querySelector('svg');
const byStage=links=>{
 const sums=new Map();
 for(const link of links)sums.set(link[0],(sums.get(link[0])||0)+link[3]);
 return sums;
};
function assertStageTotals(type,links){
 const original=byStage(DATA.charts[type].전체.links),shown=byStage(links);
 for(const [step,total] of original)assert.equal(shown.get(step),total,type+' stage '+step+' changed respondent totals');
}
// The original full flow is always the default view. Check every edge.
const chartKeys={
 perception:['content','gpu_vendor','gpu','perception'],
 perf:['hmd','gpu','performance'],
 content:['previous_content','content'],
 mode:['hmd','mode']
};
const sortedRows=rows=>rows.map(row=>row.slice(0,4)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
function assertOriginalView(type,group,view){
 const original=DATA.charts[type][group];
 assert.deepEqual(view.keys,chartKeys[type],'Every original Sankey stage must remain visible');
 assert.equal(view.n,original.n,'Original denominator must remain unchanged');
 assert.deepEqual(sortedRows(view.links),sortedRows(original.links),
  'All GPU models and all source/target links must be kept in default view');
}
function assertCompactView(type,group,limit,view){
 const original=DATA.charts[type][group];
 const gpuIndex=chartKeys[type].indexOf('gpu');
 assert(gpuIndex>=0,'Compact view only applies to charts with a GPU layer');
 assert.deepEqual(view.keys,chartKeys[type],'Compact view must retain the original layout');
 assert.equal(view.n,original.n);
 const totals=new Map();
 for(const row of original.links){
  if(row[0]===gpuIndex)totals.set(row[2],(totals.get(row[2])||0)+row[3]);
 }
 const keep=new Set([...totals]
  .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  .slice(0,limit).map(row=>row[0]));
 const expectedMap=new Map();
 for(const row of original.links){
  const [stage,source,target,count]=row;
  const from=stage===gpuIndex+1&&!keep.has(source)?'기타 GPU 모델':source;
  const to=stage===gpuIndex&&!keep.has(target)?'기타 GPU 모델':target;
  const key=JSON.stringify([stage,from,to]);
  const old=expectedMap.get(key);
  if(old)old[3]+=count;
  else expectedMap.set(key,[stage,from,to,count]);
 }
 assert.deepEqual(sortedRows(view.links),sortedRows([...expectedMap.values()]),
  'Collapsed GPU edges must retain the exact stage and counts');
 const gpuNodes=view.nodes[gpuIndex];
 assert(gpuNodes.length<=limit+1,'Compact GPU layer has too many nodes');
}
assert.equal(window.sankeyState.n,148);
assertOriginalView('perception','전체',window.sankeyState);
assert.equal(window.sankeyState.nodes[2].length,44,'Default view must show all 44 GPUs');

const svg=getSVG();
const rightmostRect=svg.querySelectorAll('[data-node-layer]').find(el=>
 el.tagName==='rect'&&el.dataset.nodeLayer==='3');
assert(rightmostRect,'Expected nodes in last Sankey column');
assert(Number(rightmostRect.getAttribute('x'))>1250,
 'Rightmost column must no longer sit at the old 1140px with a 360px gutter');

const path=svg.querySelectorAll('path.link')[0];
chart.events.click({target:path});
assert.equal(svg.querySelectorAll('path.link').filter(p=>p.classes.has('sankey-active')).length,1);
assert.equal(elements.clearSelection.hidden,false);
assert(elements.selectionInfo.textContent.includes('명'));

const node=svg.querySelectorAll('[data-node-layer]')[0];
chart.events.click({target:node});
assert(svg.querySelectorAll('path.link').some(p=>p.classes.has('sankey-active')));
assert(elements.nodeJump.value.includes('|'),'node selection should synchronize the jump picker');

elements.clearSelection.events.click();
assert.equal(elements.clearSelection.hidden,true);
assert.equal(svg.querySelectorAll('path.link').filter(p=>p.classes.has('sankey-dim')).length,0);

const gpuOption=elements.nodeJump.children.find(o=>o.value.startsWith('2|')&&o.value!=='2|기타 GPU 모델');
assert(gpuOption,'expected at least one GPU in the jump menu');
elements.nodeJump.value=gpuOption.value;
elements.nodeJump.events.change();
assert(elements.selectionInfo.textContent.includes('GPU'));
assert(Number.isFinite(chart.scrollLeft)&&Number.isFinite(chart.scrollTop));

const table=elements.links.children[0];
const firstLinkRow=table.children[1];
assert(firstLinkRow.events.click&&firstLinkRow.events.keydown,'flow table rows must be selectable');
firstLinkRow.events.click();
assert(elements.selectionInfo.textContent.includes('→'));

elements.gpuLimit.value='all';elements.gpuLimit.events.change();
assert.equal(window.sankeyState.nodes[2].length,44);
assert.equal(window.sankeyState.links.length,DATA.charts.perception.전체.links.length);

elements.gpuLimit.value='12';elements.gpuLimit.events.change();
assertCompactView('perception','전체',12,window.sankeyState);
elements.download.onclick();
const csv=await exportedBlob.text();
assert.equal(csv.trim().split(/\r?\n/).length,1+DATA.charts.perception.전체.links.length,
 'CSV must retain original links, not aggregated visual links');

elements.diagram.value='perf';elements.diagram.events.change();
assertCompactView('perf','전체',12,window.sankeyState);

// All content filters must retain the complete graph by default and still
// permit optional top-12 or top-20 grouping without changing any totals.
for(const type of ['perception','perf']){
 elements.diagram.value=type;
 for(const group of Object.keys(DATA.charts[type])){
  elements.group.value=group;
  elements.gpuLimit.value='all';elements.group.events.change();
  assertOriginalView(type,group,window.sankeyState);
  for(const limit of [12,20]){
   elements.gpuLimit.value=String(limit);elements.gpuLimit.events.change();
   assertCompactView(type,group,limit,window.sankeyState);
  }
 }
}
elements.group.value='전체';elements.gpuLimit.value='all';

for(const type of ['content','mode']){
 elements.diagram.value=type;elements.diagram.events.change();
 assert.equal(elements.gpuLimitControl.hidden,true,'GPU picker should hide on '+type);
 assert.equal(window.sankeyState.links.length,DATA.charts[type].전체.links.length);
 assertStageTotals(type,window.sankeyState.links);
}
// All chart configurations keep the last column toward the right boundary.
for(const type of ['content','perception','perf','mode']){
 elements.diagram.value=type;elements.diagram.events.change();
 const svg=getSVG();
 const last=window.sankeyState.keys.length-1;
 const rect=svg.querySelectorAll('[data-node-layer]').find(node=>
  node.tagName==='rect'&&node.dataset.nodeLayer===String(last));
 assert(rect,'Expected a rightmost node in '+type);
 const endX=Number(rect.getAttribute('x'));
 assert(endX>=1190&&endX<=1410,'Last column should leave only label-dependent padding in '+type+' (got '+endX+')');
}

// Exercise real site.js zoom controller in a standalone-like DOM.
const siteJS=readFileSync('docs/site.js','utf8');
const controls=Object.fromEntries(['zoom','chart','zoomValue','zoomIn','zoomOut','fit','resetView','diagram']
 .map(id=>[id,new Element(id)]));
const [slider,viewport]=[controls.zoom,controls.chart];
slider.value='100';slider.min='20';slider.max='200';slider.step='1';
viewport.clientWidth=550;viewport.clientHeight=500;
const chartSVG={style:{width:'1500px'}};
viewport.querySelector=selector=>selector==='svg'?chartSVG:null;
viewport.getBoundingClientRect=()=>({left:0,top:0});
const zoomDoc={getElementById:id=>id==='reading'?null:controls[id],
 querySelector:selector=>selector==='#chart svg'?chartSVG:null};
const fitAPI=new Function('document','location','URLSearchParams','ResizeObserver',
 siteJS+';return {updateChartZoom,fitGraph};')(
 zoomDoc,{search:''},URLSearchParams,undefined);
fitAPI.updateChartZoom();
assert.equal(Number(slider.value),36,'Initial chart should fit a 550px viewport');
assert.equal(chartSVG.style.width,'540px','SVG width should be close to viewport');
const redrawSVG={style:{width:'1500px'}};
viewport.querySelector=selector=>selector==='svg'?redrawSVG:null;
fitAPI.updateChartZoom();
assert.equal(Number(slider.value),36,'Rerender at unchanged viewport keeps fit percentage');
assert.equal(redrawSVG.style.width,'540px','New SVG must be fitted even if the percentage is unchanged');
controls.zoomIn.onclick();
assert.equal(Number(slider.value),46,'User should be able to zoom manually');
viewport.clientWidth=850;
fitAPI.updateChartZoom();
assert.equal(Number(slider.value),46,'Changing chart should preserve manual zoom');
controls.fit.onclick();
assert.equal(Number(slider.value),56,'Fit action should adapt to an 850px viewport');
viewport.clientWidth=700;
fitAPI.updateChartZoom();
assert.equal(Number(slider.value),46,'Later chart renders should automatically refit after explicit Fit');

assert(updated>=5);
console.log('Sankey UI QA passed: all GPU models by default, optional top 12/20 grouping, original links and CSV.');
