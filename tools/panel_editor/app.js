'use strict';
const $=id=>document.getElementById(id), E=PanelEngine, storageKey='aguayo-panel-editor-v1';
let project=E.defaults(), simulation, playing=false, lastTime=0, exporting=false, cancelled=false;
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function guard(fn){return async(...args)=>{try{await fn(...args);}catch(error){status(error.message,true);}};}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(project));}catch{status('Browser storage unavailable. Save a project JSON to keep your edits.',true);}}
try{const saved=localStorage.getItem(storageKey);if(saved)project=E.validate(JSON.parse(saved));}catch{status('Saved project could not be loaded. Defaults loaded; use JSON backups to recover.',true);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function jsonBlob(data){return new Blob([JSON.stringify(data,null,2)],{type:'application/json'});}
function draw(sim=simulation,target=$('panel')){target.getContext('2d').putImageData(new ImageData(sim.pixels(),16,64),0,0);}
function stop(){playing=false;$('play').textContent='Play';}
function refresh(){draw();$('frameLabel').textContent=`Frame ${simulation.frame}`;$('telemetry').textContent=`Next t: ${simulation.t} · LUT index: ${simulation.colorIndex}`;}
function reset(){stop();simulation=new E.Panel(project);refresh();}
function commit(message,restart=false){if(restart)reset();else{simulation.updateLibraries(project);refresh();}save();status(message);}
function options(id,items,index){$(id).replaceChildren(...items.map((item,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i} · ${item.name}`;return option;}));$(id).value=index;}
function renderLibraries(){
 options('formulaList',project.formulas,project.formula);options('paletteList',project.palettes,project.palette);
 const formula=project.formulas[project.formula];$('formulaName').value=formula.name;$('expression').value=formula.expression;
 const palette=project.palettes[project.palette];$('paletteName').value=palette.name;$('colorCount').textContent=`${palette.colors.length} / 64 active`;
 $('swatches').replaceChildren(...palette.colors.map((color,i)=>{
   const label=document.createElement('label');label.textContent=i;
   const input=document.createElement('input');input.type='color';input.value=color;input.setAttribute('aria-label',`Color ${i}`);
   input.onchange=()=>{palette.colors[i]=input.value;commit(`Color ${i} saved.`);};label.append(input);return label;
 }));
 $('randomFormula').disabled=project.formulas.length===1;$('randomPalette').disabled=project.palettes.length===1;
 $('deleteFormula').disabled=project.formulas.length===1;$('deletePalette').disabled=project.palettes.length===1;
 $('addColor').disabled=palette.colors.length===64;$('removeColor').disabled=palette.colors.length===1;
}
for(const key of ['initialT','seed','frameMs','brightness','shuffle']){const el=$(key);if(key==='shuffle')el.checked=project.settings[key];else el.value=project.settings[key];}
function name(id){const value=$(id).value.trim();if(!value||value.length>100)throw Error('Enter a name with 1–100 characters');return value;}
$('applyFormula').onclick=guard(()=>{const expression=$('expression').value.trim();if(expression.length>4096)throw Error('Formula exceeds 4096 characters');E.compile(expression);project.formulas[project.formula]={name:name('formulaName'),expression};renderLibraries();commit('Formula applied and saved.');});
$('paletteName').onchange=guard(()=>{project.palettes[project.palette].name=name('paletteName');renderLibraries();commit('Palette renamed.');});
for(const [kind,list] of [['Formula','formulas'],['Palette','palettes']]) {
 const key=kind.toLowerCase();
 $('random'+kind).onclick=()=>{
   const count=project[list].length;
   if(count>1)project[key]=(project[key]+1+Math.floor(Math.random()*(count-1)))%count;
   renderLibraries();commit(`Random ${key} selected.`);
 };
 $(key+'List').onchange=()=>{project[key]=Number($(key+'List').value);renderLibraries();commit(`${kind} selected.`);};
 $('new'+kind).onclick=guard(()=>{
   if(project[list].length>=256)throw Error('Library is limited to 256 entries');
   project[list].push(kind==='Formula'?{name:'New formula',expression:'t'}:{name:'New palette',colors:['#ffffff']});project[key]=project[list].length-1;renderLibraries();commit(`${kind} created.`);
 });
 $('duplicate'+kind).onclick=guard(()=>{
   if(project[list].length>=256)throw Error('Library is limited to 256 entries');
   const copy=structuredClone(project[list][project[key]]);copy.name=(copy.name+' copy').slice(0,100);project[list].push(copy);project[key]=project[list].length-1;renderLibraries();commit(`${kind} duplicated.`);
 });
 $('delete'+kind).onclick=()=>{if(project[list].length===1)return;project[list].splice(project[key],1);project[key]=Math.min(project[key],project[list].length-1);renderLibraries();commit(`${kind} deleted.`);};
}
$('applyColors').onclick=guard(()=>{
 const colors=E.parseColors($('colorsHex').value);
 const palette=project.palettes[project.palette];
 if(palette.colors.length+colors.length>64)throw Error(`Cannot add ${colors.length} colors: ${64-palette.colors.length} slots remain in this palette.`);
 palette.colors.push(...colors);
 renderLibraries();commit(`Added ${colors.length} parsed colors (${palette.colors.length} / 64).`);
});
$('addColor').onclick=()=>{const colors=project.palettes[project.palette].colors;if(colors.length<64)colors.push('#ffffff');renderLibraries();commit('Color added.');};
$('removeColor').onclick=()=>{const colors=project.palettes[project.palette].colors;if(colors.length>1)colors.pop();renderLibraries();commit('Last color removed.');};
$('applySettings').onclick=guard(()=>{
 const settings={};for(const key of ['initialT','seed','frameMs','brightness'])settings[key]=integer(key,0,key==='frameMs'?1000:key==='brightness'?255:4294967295);settings.shuffle=$('shuffle').checked;
 E.validate({...project,settings});project.settings=settings;commit('Settings applied and saved.',true);
});
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';lastTime=performance.now();};
$('step').onclick=guard(()=>{stop();simulation.step();refresh();});$('reset').onclick=reset;
function animate(now){
 if(playing&&now-lastTime>=project.settings.frameMs){try{simulation.step();refresh();lastTime=now;}catch(error){stop();status(`At t=${simulation.t}: ${error.message}`,true);}}
 requestAnimationFrame(animate);
}
$('saveProject').onclick=()=>download(jsonBlob(project),'aguayo-project.json');
$('loadProject').onchange=guard(async()=>{
 const file=$('loadProject').files[0];if(!file)return;
 try{
   if(file.size>2*1024*1024)throw Error('Project JSON is limited to 2 MiB');
   const loaded=E.validate(JSON.parse(await file.text()));project=loaded;
   for(const key of ['initialT','seed','frameMs','brightness'])$(key).value=project.settings[key];$('shuffle').checked=project.settings.shuffle;
   renderLibraries();commit('Project loaded and saved locally.',true);
 }finally{$('loadProject').value='';}
});
$('exportC').onclick=()=>download(new Blob([E.cSource(project)],{type:'text/plain'}),'aguayo-formula-palette.h');
function integer(id,min,max){const value=Number($(id).value);if(!$(id).value||!Number.isInteger(value)||value<min||value>max)throw Error(`${id} must be an integer from ${min} to ${max}`);return value;}
const yieldUI=()=>new Promise(resolve=>setTimeout(resolve,0));
$('cancelExport').onclick=()=>{cancelled=true;};
$('export').onclick=guard(async()=>{
 if(exporting)return;
 const start=integer('startFrame',0,1000000),count=integer('frameCount',1,10000),scale=integer('scale',1,16);
 const snapshot=structuredClone(project),sim=new E.Panel(snapshot),zip=new PanelZip();
 const raw=document.createElement('canvas');raw.width=16;raw.height=64;
 const canvas=document.createElement('canvas');canvas.width=64*scale;canvas.height=16*scale;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 // Rotate the portrait panel clockwise into a landscape PNG, preserving pixels.
 ctx.setTransform(0,scale,-scale,0,canvas.width,0);
 exporting=true;cancelled=false;stop();$('export').disabled=true;$('cancelExport').disabled=false;$('progress').hidden=false;
 try{
   for(let i=0;i<start+count;i++) {
     if(cancelled){status('Export cancelled.');return;}
     sim.step();
     if(i>=start){
       draw(sim,raw);ctx.drawImage(raw,0,0);
       const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Browser could not encode PNG');
       zip.add(`frame_${String(i).padStart(7,'0')}.png`,new Uint8Array(await blob.arrayBuffer()));
     }
     if(i%64===0||i===start+count-1){$('progress').value=(i+1)/(start+count);status(`Export: ${i+1} / ${start+count} simulated frames`);await yieldUI();}
   }
   zip.add('project.json',new TextEncoder().encode(JSON.stringify(snapshot,null,2)));
   zip.add('sequence.json',new TextEncoder().encode(JSON.stringify({startFrame:start,frameCount:count,scale,width:canvas.width,height:canvas.height,rotation:90,frameMs:snapshot.settings.frameMs},null,2)));
   download(zip.blob(),'aguayo-png-sequence.zip');status(`Exported ${count} PNG frames at ${canvas.width} × ${canvas.height}.`);
 }finally{exporting=false;$('export').disabled=false;$('cancelExport').disabled=true;$('progress').hidden=true;}
});
renderLibraries();reset();requestAnimationFrame(animate);
