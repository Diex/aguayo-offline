/* Uncompressed ZIP writer: PNG data is already compressed. No dependencies. */
(function(root){
'use strict';
const table=Array.from({length:256},(_,i)=>{for(let n=0;n<8;n++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
function crc32(bytes){let crc=0xffffffff; for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function header(size,fields){const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);for(const [offset,value,width] of fields)width===2?view.setUint16(offset,value,true):view.setUint32(offset,value,true);return bytes;}
class Zip {
 constructor(){this.parts=[];this.central=[];this.offset=0;this.count=0;}
 add(name,bytes){
  const path=new TextEncoder().encode(name),crc=crc32(bytes),size=bytes.length;
  if(this.offset+size+path.length+30>0xffffffff)throw Error('ZIP exceeds 4 GiB');
  this.parts.push(header(30,[[0,0x04034b50,4],[4,20,2],[10,0,2],[12,33,2],[14,crc,4],[18,size,4],[22,size,4],[26,path.length,2]]),path,bytes);
  this.central.push(header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[14,33,2],[16,crc,4],[20,size,4],[24,size,4],[28,path.length,2],[42,this.offset,4]]),path);
  this.offset+=30+path.length+size;this.count++;
 }
 blob(){const size=this.central.reduce((n,b)=>n+b.length,0);return new Blob([...this.parts,...this.central,header(22,[[0,0x06054b50,4],[8,this.count,2],[10,this.count,2],[12,size,4],[16,this.offset,4]])],{type:'application/zip'});}
}
if(typeof module!=='undefined')module.exports={Zip,crc32};else root.PanelZip=Zip;
})(globalThis);
