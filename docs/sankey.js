const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const cfg={perception:{keys:['content','gpu_vendor','gpu','perception'],titles:['주력 콘텐츠','GPU 제조사','GPU 모델','사양 체감']},content:{keys:['previous_content','content'],titles:['1년 전 콘텐츠','현재 콘텐츠']},perf:{keys:['hmd','gpu','performance'],titles:['주력 HMD','exact GPU','전반적 VR 성능']},mode:{keys:['hmd','mode'],titles:['주력 HMD','사용 비중']}};
const fixed={'VRChat':'#7950b8','리듬게임':'#d48800','FPS·슈팅·액션':'#ca5155','시뮬레이션':'#168b87','VR MOD':'#3779bf','기타 콘텐츠':'#788391','NVIDIA':'#57932b','AMD':'#c7464a','Intel':'#267fcb','상옵':'#17827b','중옵':'#397bb9','하옵':'#cf8a23','겨우':'#c34c58','여유':'#17827b','대체로 유지':'#397bb9','가끔 저하·플레이 가능':'#8c78b8','설정 크게 낮춤':'#c48b26','잦은 저하':'#d46a3a','플레이 어려움':'#b83c55','모름':'#89929c','PCVR 우세':'#3779bf','Standalone 우세':'#168b87','비슷하게 사용':'#9572bb'};
const colorMaps={};
function family(k){return k==='previous_hmd'?'hmd':k==='previous_content'?'content':k;}
for(const [key,values]of Object.entries(DATA.labels)){colorMaps[key]=Object.fromEntries(values.map((v,i)=>[v,fixed[v]||`hsl(${Math.round((i*137.508+23)%360)} 52% ${40+(i%3)*7}%)`]));}
const color=(k,v)=>colorMaps[family(k)]?.[v]||'#89929c';
let currentLinks=[];

const gpuLimit=$('gpuLimit');
const selectionInfo=$('selectionInfo');
const clearSelection=$('clearSelection');
const chart=$('chart');
let currentN=0,rawLinks=[],selectedFocus=null,hoverFocus=null,nodeIndex=[],currentConfig=null;
/* Default to the complete, unmodified flow. Optional top-N modes group
   all smaller GPU models into one node across every stage consistently. */
function displaySubset(original,type){
 const gpuIndex=cfg[type].keys.indexOf('gpu'),count=gpuLimit.value;
 if(gpuIndex<0||count==='all')return original;
 const totals=new Map();
 for(const row of original.links){
  if(row[0]!==gpuIndex)continue;
  totals.set(row[2],(totals.get(row[2])||0)+row[3]);
 }
 const keep=new Set([...totals]
  .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  .slice(0,Number(count)).map(row=>row[0]));
 if(totals.size<=keep.size)return original;
 const merged=new Map();
 for(const row of original.links){
  const stage=row[0];
  const from=stage===gpuIndex+1&&!keep.has(row[1])?'기타 GPU 모델':row[1];
  const to=stage===gpuIndex&&!keep.has(row[2])?'기타 GPU 모델':row[2];
  const key=JSON.stringify([stage,from,to]);
  const existing=merged.get(key);
  if(existing)existing[3]+=row[3];
  else merged.set(key,[stage,from,to,row[3],original.n]);
 }
 return {...original,links:[...merged.values()]};
}

function itemFromTarget(target){
 if(!target||typeof target.closest!=='function')return null;
 const element=target.closest('path.link,[data-node-layer]');
 if(!element||!chart.contains(element))return null;
 if(element.classList.contains('link'))return {
  kind:'link',stage:Number(element.dataset.stage),
  source:element.dataset.source,target:element.dataset.target
 };
 return {kind:'node',layer:Number(element.dataset.nodeLayer),name:element.dataset.nodeName};
}
function sameFocus(a,b){
 if(!a||!b||a.kind!==b.kind)return false;
 return a.kind==='node'?a.layer===b.layer&&a.name===b.name:
 a.stage===b.stage&&a.source===b.source&&a.target===b.target;
}
function highlight(focus){
 const svg=chart.querySelector('svg');
 if(!svg)return;
 const activeNodes=new Set();
 if(focus?.kind==='node')activeNodes.add(focus.layer+'|'+focus.name);
 for(const path of svg.querySelectorAll('path.link')){
  const stage=Number(path.dataset.stage),from=path.dataset.source,to=path.dataset.target;
  const active=!focus?false:focus.kind==='link'?
   (focus.stage===stage&&focus.source===from&&focus.target===to):
   ((stage===focus.layer+1&&from===focus.name)||(stage===focus.layer&&to===focus.name));
  path.classList.toggle('sankey-active',active);
  path.classList.toggle('sankey-dim',Boolean(focus)&&!active);
  if(active){activeNodes.add((stage-1)+'|'+from);activeNodes.add(stage+'|'+to);}
 }
 for(const item of svg.querySelectorAll('[data-node-layer]')){
  const active=activeNodes.has(item.dataset.nodeLayer+'|'+item.dataset.nodeName);
  item.classList.toggle('sankey-active',Boolean(focus)&&active);
  item.classList.toggle('sankey-dim',Boolean(focus)&&!active);
 }
}
function chooseFocus(focus){
 selectedFocus=sameFocus(focus,selectedFocus)?null:focus;
 hoverFocus=null;
 highlight(selectedFocus);
 clearSelection.hidden=!selectedFocus;
 $('nodeJump').value=selectedFocus?.kind==='node'?selectedFocus.layer+'|'+selectedFocus.name:'';
 if(!selectedFocus){
  selectionInfo.textContent='항목이나 연결선을 선택하면 인원과 관련 흐름을 표시합니다.';
  return;
 }
 if(selectedFocus.kind==='link'){
  const row=currentLinks.find(r=>r[0]===selectedFocus.stage&&r[1]===selectedFocus.source&&r[2]===selectedFocus.target);
  const count=row?.[3]??0;
  selectionInfo.textContent=selectedFocus.source+' → '+selectedFocus.target+' : '+count+'명 ('+(currentN?(count/currentN*100).toFixed(1):0)+'%)';
 }else{
  const hit=chart.querySelector('svg [data-node-layer="'+selectedFocus.layer+'"][data-node-name="'+CSS.escape(selectedFocus.name)+'"]');
  const count=Number(hit?.dataset.nodeCount||0);
  const related=currentLinks.filter(r=>
   (r[0]===selectedFocus.layer+1&&r[1]===selectedFocus.name)||
   (r[0]===selectedFocus.layer&&r[2]===selectedFocus.name)
  ).sort((a,b)=>b[3]-a[3]);
  const examples=related.slice(0,3).map(r=>(r[1]===selectedFocus.name?r[2]:r[1])+' '+r[3]+'명').join(' · ');
  selectionInfo.textContent=currentConfig.titles[selectedFocus.layer]+' · '+selectedFocus.name+
   ': '+count+'명 ('+(currentN?(count/currentN*100).toFixed(1):0)+'%)'+
   (examples?' | 주요 연결: '+examples:'');
 }
}
function resetSelection(){
 selectedFocus=null;hoverFocus=null;highlight(null);
 clearSelection.hidden=true;$('nodeJump').value='';
 selectionInfo.textContent='항목이나 연결선을 선택하면 인원과 관련 흐름을 표시합니다.';
}

function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function render(){const type=$('diagram').value;const original=DATA.charts[type][$('group').value+(type==='content'&&!$('exclude').checked?'|all':'')];const selected=displaySubset(original,type);const c=cfg[type];currentConfig=c;const n=selected.n;currentN=n;rawLinks=original.links.map(r=>[r[0],r[1],r[2],r[3],n]);$('gpuLimitControl').hidden=!cfg[type].keys.includes('gpu');$('exclude').parentElement.hidden=type!=='content';
const ordered={perception:['상옵','중옵','하옵','겨우'],performance:['여유','대체로 유지','가끔 저하·플레이 가능','잦은 저하','설정 크게 낮춤','플레이 어려움','모름']};
const compare=(k,a,b)=>k==='gpu'
 ?(DATA.gpuScores[b[0]]??-1)-(DATA.gpuScores[a[0]]??-1)||a[0].localeCompare(b[0])
 :ordered[k]?ordered[k].indexOf(a[0])-ordered[k].indexOf(b[0])
 :b[1]-a[1]||a[0].localeCompare(b[0]);
const layers=c.keys.map((k,i)=>{const m=new Map;for(const l of selected.links.filter(l=>l[0]===(i===0?1:i))){const name=l[i===0?1:2];m.set(name,(m.get(name)||0)+l[3]);}return [...m].sort((a,b)=>compare(k,a,b)).map(([name,value])=>({name,value,layer:i,inOff:0,outOff:0}));});
const maxNodes=Math.max(1,...layers.map(x=>x.length)),H=Math.max(640,maxNodes*38+100),W=1500,top=65,bottom=35,gap=15,scale=n?(H-top-bottom-(maxNodes-1)*gap)/n:1;
const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,width:W,height:H,role:'img','aria-label':c.titles.join(' → ')});const maps=layers.map((layer,i)=>{const total=n*scale+(layer.length-1)*gap;let y=top+(H-top-bottom-total)/2;const x=30+i*(W-390)/(layers.length-1);svg.append(el('text',{x,y:30,'font-size':17,'font-weight':700,fill:'#23364d'},c.titles[i]));const m=new Map;for(const node of layer){node.x=x;node.y=y;node.h=node.value*scale;y+=node.h+gap;m.set(node.name,node);}return m;});nodeIndex=layers.flat();
const picker=$('nodeJump');picker.replaceChildren();
const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='항목 선택…';picker.append(placeholder);
for(const node of nodeIndex){
 const opt=document.createElement('option');opt.value=node.layer+'|'+node.name;
 opt.textContent=c.titles[node.layer]+' · '+node.name+' ('+node.value+'명)';
 picker.append(opt);
}currentLinks=[];
for(let i=0;i<c.keys.length-1;i++){const links=selected.links.filter(l=>l[0]===i+1).map(l=>({names:[l[1],l[2]],value:l[3]})).sort((a,b)=>maps[i].get(a.names[0]).y-maps[i].get(b.names[0]).y||maps[i+1].get(a.names[1]).y-maps[i+1].get(b.names[1]).y);for(const l of links){const a=maps[i].get(l.names[0]),b=maps[i+1].get(l.names[1]),h=l.value*scale,x1=a.x+16,x2=b.x,y1=a.y+a.outOff,y2=b.y+b.inOff,midx=(x1+x2)/2;a.outOff+=h;b.inOff+=h;const path=el('path',{d:`M${x1},${y1} C${midx},${y1} ${midx},${y2} ${x2},${y2} L${x2},${y2+h} C${midx},${y2+h} ${midx},${y1+h} ${x1},${y1+h} Z`,fill:color(c.keys[i],a.name),opacity:.42,class:'link','data-stage':i+1,'data-source':a.name,'data-target':b.name,tabindex:-1});path.append(el('title',{},`${a.name} → ${b.name}: ${l.value}명 (${n?(l.value/n*100).toFixed(1):0}%)`));svg.append(path);currentLinks.push([i+1,a.name,b.name,l.value,n]);}}
for(const layer of layers)for(const node of layer){svg.append(el('rect',{x:node.x,y:node.y,width:16,height:node.h,rx:2,fill:color(c.keys[node.layer],node.name),'data-category':node.name,'data-node-layer':node.layer,'data-node-name':node.name,'data-node-count':node.value,tabindex:0,role:'button','aria-label':`${node.name}, ${node.value}명`}));const label=el('text',{x:node.x+22,y:node.y+node.h/2+4,'font-size':14,fill:'#172b40','data-node-layer':node.layer,'data-node-name':node.name,'data-node-count':node.value});const full=`${node.name} · ${node.value}`;label.textContent=full.length>39?full.slice(0,37)+'…':full;label.append(el('title',{},full));svg.append(label);}
if(!n)svg.append(el('text',{x:40,y:100},'선택 조건에 해당하는 응답이 없습니다.'));$('chart').replaceChildren(svg);applyZoom();resetSelection();$('legend').replaceChildren();for(const layer of layers){const box=document.createElement('div');box.style.margin='10px 0';const title=document.createElement('strong');title.textContent=c.titles[layer[0]?.layer||0]+' ';box.append(title);for(const node of layer){const item=document.createElement('span');item.style.cssText='display:inline-flex;align-items:center;gap:5px;margin:3px 12px 3px 0;font-size:13px';const swatch=document.createElement('i');swatch.style.cssText='display:inline-block;width:12px;height:12px;background:'+color(c.keys[node.layer],node.name);item.append(swatch,document.createTextNode(node.name));box.append(item);}$('legend').append(box);}
const t=document.createElement('table');const tr=document.createElement('tr');for(const h of ['단계','출발','도착','인원','분모']){const th=document.createElement('th');th.textContent=h;tr.append(th);}t.append(tr);for(const r of currentLinks){
 const tr=document.createElement('tr');tr.tabIndex=0;tr.setAttribute('role','button');
 tr.setAttribute('aria-label',r[1]+'에서 '+r[2]+'로 '+r[3]+'명');
 const selectRow=()=>chooseFocus({kind:'link',stage:r[0],source:r[1],target:r[2]});
 tr.addEventListener('click',selectRow);
 tr.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRow();}});
 for(const v of r){const td=document.createElement('td');td.textContent=v;tr.append(td);}
 t.append(tr);
}$('links').replaceChildren(t);window.sankeyState={keys:c.keys,nodes:layers.map(l=>l.map(x=>x.name)),n,links:currentLinks,layers:layers.map(l=>l.reduce((s,x)=>s+x.value,0))};}
for(const id of ['diagram','group','exclude','gpuLimit'])$(id).addEventListener('change',render);
$('nodeJump').addEventListener('change',()=>{
 const value=$('nodeJump').value;
 if(!value){resetSelection();return;}
 const node=nodeIndex.find(n=>n.layer+'|'+n.name===value);
 if(!node)return;
 chooseFocus({kind:'node',layer:node.layer,name:node.name});
 const scale=Number($('zoom').value)/100;
 chart.scrollLeft=Math.max(0,(node.x+8)*scale-chart.clientWidth/2);
 chart.scrollTop=Math.max(0,(node.y+node.h/2)*scale-chart.clientHeight/2);
});
$('download').onclick=()=>{const csv='\uFEFF'+[['stage','source','target','n','base'],...rawLinks].map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='sankey_links.csv';a.click();URL.revokeObjectURL(a.href);};render();


chart.addEventListener('click',event=>{
 if(chart.dataset.dragged==='true'){chart.dataset.dragged='';return;}
 const info=itemFromTarget(event.target);
 if(info)chooseFocus(info);
 else if(selectedFocus)resetSelection();
});
chart.addEventListener('pointerover',event=>{
 if(selectedFocus)return;
 const info=itemFromTarget(event.target);
 if(!sameFocus(info,hoverFocus)){hoverFocus=info;highlight(info);}
});
chart.addEventListener('pointerout',event=>{
 if(selectedFocus)return;
 const related=itemFromTarget(event.relatedTarget);
 if(related){hoverFocus=related;highlight(related);}
 else{hoverFocus=null;highlight(null);}
});
chart.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&selectedFocus){resetSelection();event.preventDefault();return;}
 if(event.key!=='Enter'&&event.key!==' ')return;
 const info=itemFromTarget(event.target);
 if(info){event.preventDefault();chooseFocus(info);}
});
clearSelection.addEventListener('click',resetSelection);
