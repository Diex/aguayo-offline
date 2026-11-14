'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const E=require('./panel_editor/engine.js'),{Zip,crc32}=require('./panel_editor/zip.js');
async function main(){
 const project=E.defaults();E.validate(project);
 assert.deepEqual(E.parseColors('ff2dd1fdffb84dffbe63c8ff'),['#ff2dd1','#fdffb8','#4dffbe','#63c8ff']);
 assert.deepEqual(E.parseColors(' #FF2DD1 '),['#ff2dd1']);
 for(const input of ['', 'ff2dd', 'xyzxyz', 'ffffff'.repeat(65)])assert.throws(()=>E.parseColors(input));
 const samples=[0,1,255,4096,8192,0x12345678,0x80000000,0xfffffffe,0xffffffff];
 assert.equal(E.compile('0xffffffff * 0xffffffff')(0),1);
 assert.equal(E.compile('~t >> 24')(0),255);
 assert.equal(E.compile('t ? 7 : 1 / 0')(1),7);
 assert.equal(E.compile('0 && (1/0)')(0),0);
 assert.equal(E.compile('1 || (1/0)')(0),1);
 for(const expression of ['t++','alert(1)','t = 3','t >>> 2','', '01'])assert.throws(()=>E.compile(expression));
 for(const expression of ['t / 0','t % 0','t << 32','t >> -1'])assert.throws(()=>E.compile(expression)(1));
 // Independent compiler oracle for the nine original expressions and the emitted C snippet.
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'aguayo-editor-test-'));
 try {
   const cases=project.formulas.map((f,i)=>`case ${i}: return (uint8_t)(${f.expression});`).join('\n');
   const emitted=project.formulas.map((f,i)=>`uint8_t emitted${i}(uint32_t t) { return (uint8_t)(${E.compile(f.expression).cExpression}); }`).join('\n');
   const source=`#include <stdint.h>\n#include <stdio.h>\nuint8_t original(int i, uint32_t t) { switch(i) { ${cases} } return 0; }\n${emitted}\nint main() { uint32_t ts[]={${samples.map(t=>t+'U').join(',')}}; for(int i=0;i<9;i++)for(uint32_t t:ts)printf("%u\\n", original(i,t)); ${project.formulas.map((f,i)=>`for(uint32_t t:ts)printf("%u\\n",emitted${i}(t));`).join('')} }`;
   fs.writeFileSync(path.join(work,'oracle.cpp'),source);
   const flags=['-std=c++11'];
   if(process.platform==='darwin'){
     const sdk=execFileSync('xcrun',['--show-sdk-path'],{encoding:'utf8'}).trim();
     const headers=path.join(sdk,'usr/include/c++/v1');if(fs.existsSync(headers))flags.push('-isystem',headers);
   }
   execFileSync('c++',[...flags,path.join(work,'oracle.cpp'),'-o',path.join(work,'oracle')]);
   const actual=execFileSync(path.join(work,'oracle'),{encoding:'utf8'}).trim().split('\n').map(Number);
   const expected=project.formulas.flatMap(f=>samples.map(E.compile(f.expression)));
   assert.deepEqual(actual,[...expected,...expected]);
   const a=new E.Panel(project),b=new E.Panel(project);
   for(let n=0;n<1000;n++){
     const before=a.rows.map(row=>[...row]);a.step();b.step();
     assert.deepEqual(a.rows.slice(0,63),before.slice(1));assert.deepEqual(a.pixels(),b.pixels());
     const bytes=a.pixels();
     for(let y=0;y<64;y++)for(let x=0;x<8;x++)assert.deepEqual(bytes.slice((y*16+x)*4,(y*16+x+1)*4),bytes.slice((y*16+15-x)*4,(y*16+16-x)*4));
   }
   // Live library changes retain animation history and timing/random state.
   const liveProject=E.defaults(), live=new E.Panel(liveProject);
   for(let i=0;i<70;i++)live.step();
   const history=live.rows.map(row=>[...row]);
   const clock=[live.t,live.frame,live.state,live.lastShuffle];
   liveProject.formulas[liveProject.formula].expression='255';
   live.updateLibraries(liveProject);
   assert.deepEqual([live.t,live.frame,live.state,live.lastShuffle],clock);
   assert.deepEqual(live.rows,history);
   const shuffled=[...live.colors];
   liveProject.palettes[0].name='Renamed';live.updateLibraries(liveProject);
   assert.deepEqual(live.colors,shuffled);
   liveProject.palettes[0].colors=['#123456'];live.updateLibraries(liveProject);
   assert.deepEqual([live.t,live.frame,live.state,live.lastShuffle],clock);
   assert.deepEqual(live.rows,history);assert.equal(live.colorIndex,0);
   live.step();assert.deepEqual(live.rows.at(-1),Array(8).fill('#123456'));
   assert.deepEqual(live.rows.slice(0,63),history.slice(1));
   project.settings.initialT=0xffffffff;const wrap=new E.Panel(project);wrap.step();assert.equal(wrap.t,0);
   project.palettes[0].colors=['#ffffff'];project.formulas[0].expression='255';project.settings.brightness=127;
   const single=new E.Panel(project);single.step();assert.equal(single.colors.length,1);assert.deepEqual([...single.pixels().slice(-4)],[127,127,127,255]);
   const invalid=structuredClone(project);invalid.palettes[0].colors=Array(65).fill('#ffffff');assert.throws(()=>E.validate(invalid));
   assert.match(E.cSource(project),/CRGB lookupTable\[64\]/);assert.match(E.cSource(project),/maxColors = 1/);
   assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
   const zip=new Zip();zip.add('frame_0000000.png',new Uint8Array([1,2,3]));zip.add('project.json',new TextEncoder().encode('{}'));
   fs.writeFileSync(path.join(work,'test.zip'),new Uint8Array(await zip.blob().arrayBuffer()));
   execFileSync('python3',['-c','import sys,zipfile\nz=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.read("frame_0000000.png")==bytes([1,2,3]); assert z.read("project.json")==b"{}"',path.join(work,'test.zip')]);
 } finally {fs.rmSync(work,{recursive:true,force:true});}
 console.log('Passed: C++ formula oracle, uint32 semantics, FIFO, mirroring, seed repeatability, brightness, LUT bounds, ZIP integrity.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
