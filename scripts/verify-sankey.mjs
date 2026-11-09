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
elements.gpuLimit.value='5';elements.zoom.value='100';elements.exclude.checked=true;
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
new Function('document','window','DATA','applyZoom','CSS','URL','Blob',sankey)(
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
/* The grouping must be independent per destination, without constructing
   unsupported HMD/content × GPU × destination respondent-level paths. */
function assertDestinationGrouping(type,original,view){
 const stage=type==='perception'?3:2;
 const result=type==='perception'?'perception':'performance';
 assert.deepEqual(view.keys,['gpu_destination',result],'Grouped graph should have only the observed GPU→destination link');
 const observed=new Map();
 for(const row of original.links.filter(r=>r[0]===stage)){
  const group=observed.get(row[2])||[];
  group.push([row[1],row[3]]);
  observed.set(row[2],group);
 }
 const visible=new Map();
 for(const row of view.links){
  assert.equal(row[0],1,'New diagram must have only one link stage');
  const group=visible.get(row[2])||[];
  group.push(row);
  visible.set(row[2],group);
 }
 assert.deepEqual([...visible.keys()].sort(),[...observed.keys()].sort(),'All destinations retained');
 for(const [destination,records] of observed){
  const sorted=[...records].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const chosen=sorted.slice(0,5),other=sorted.slice(5).reduce((s,x)=>s+x[1],0);
  const rows=visible.get(destination);
  assert.equal(rows.length,chosen.length+(other>0?1:0),'Exactly five GPU models (or fewer if unavailable) and the rest at '+destination);
  for(const [gpu,count] of chosen){
   const found=rows.find(row=>row[1]===gpu+' · '+destination);
   assert(found,'Top-five GPU must appear in '+destination+': '+gpu);
   assert.equal(found[3],count,'Individual GPU count must be exact');
  }
  const rest=rows.find(row=>row[1]==='기타 GPU · '+destination);
  assert.equal(rest?.[3]??0,other,'Other GPUs must be grouped separately at '+destination);
  assert.equal(rows.reduce((sum,row)=>sum+row[3],0),records.reduce((sum,row)=>sum+row[1],0),
   'Outcome totals must be unchanged at '+destination);
 }
 assert.equal(view.n,original.n,'Respondent denominator must remain unchanged');
}
assert.equal(window.sankeyState.n,148);
assertDestinationGrouping('perception',DATA.charts.perception.전체,window.sankeyState);
assert(window.sankeyState.links.length<DATA.charts.perception.전체.links.length);

const svg=getSVG();
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

const gpuOption=elements.nodeJump.children.find(o=>o.value.startsWith('0|')&&!o.value.startsWith('0|기타 GPU · '));
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

elements.gpuLimit.value='5';elements.gpuLimit.events.change();
elements.download.onclick();
const csv=await exportedBlob.text();
assert.equal(csv.trim().split(/\r?\n/).length,1+DATA.charts.perception.전체.links.length,
 'CSV must retain original links, not aggregated visual links');

elements.diagram.value='perf';elements.diagram.events.change();
assertDestinationGrouping('perf',DATA.charts.perf.전체,window.sankeyState);
assert(window.sankeyState.nodes[0].length<=36);

// Check every available content filter, including groups with fewer than five GPUs.
for(const type of ['perception','perf']){
 elements.diagram.value=type;
 for(const [group,original] of Object.entries(DATA.charts[type])){
  elements.group.value=group;
  elements.group.events.change();
  assertDestinationGrouping(type,original,window.sankeyState);
 }
}
elements.group.value='전체';

for(const type of ['content','mode']){
 elements.diagram.value=type;elements.diagram.events.change();
 assert.equal(elements.gpuLimitControl.hidden,true,'GPU picker should hide on '+type);
 assert.equal(window.sankeyState.links.length,DATA.charts[type].전체.links.length);
 assertStageTotals(type,window.sankeyState.links);
}
assert(updated>=5);
console.log('Sankey UI QA passed: destination-specific top-five GPU grouping, exact counts, navigation and original CSV.');
