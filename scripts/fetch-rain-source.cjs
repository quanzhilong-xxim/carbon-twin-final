/* Official CC-BY 4.0 character source. Exact ZIP members, no login, paid API or scripts. */
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const base = 'D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/rain-v2';
const url = 'https://studio.blender.org/download-source/files/10/1033fad76f67bba3e362065d68c85791/1033fad76f67bba3e362065d68c85791.zip';
const size = 199329585, chunk = 1024 * 1024;
const table = new Uint32Array(256);
for (let i=0;i<256;i++){let n=i;for(let b=0;b<8;b++)n=n&1?0xedb88320^(n>>>1):n>>>1;table[i]=n;}
const crc32 = bytes => {let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;};
async function range(start, end) {
  // Reuse complete 4 MiB chunks saved by the earlier bounded attempt.
  const index=Math.floor(start/4194304),last=Math.floor(end/4194304);
  if(index===last){const cached=await fs.readFile(path.join(base,'parts',String(index).padStart(3,'0'))).catch(()=>null);if(cached&&cached.length>end-index*4194304)return cached.subarray(start-index*4194304,end-index*4194304+1);}
  let lastError;
  for(let attempt=0;attempt<2;attempt++){
    try {const r=await fetch(url,{headers:{Range:`bytes=${start}-${end}`},signal:AbortSignal.timeout(30000)});
      if(r.status!==206||!r.headers.get('content-range')?.startsWith(`bytes ${start}-${end}/`))throw Error(`Unexpected range status ${r.status}`);
      const b=Buffer.from(await r.arrayBuffer());if(b.length!==end-start+1)throw Error('Range byte count mismatch');return b;
    }catch(e){lastError=e;}
  }throw lastError;
}
(async()=>{
  const entries=JSON.parse(await fs.readFile(path.join(base,'zip-entries.json'),'utf8'));
  const tail=await range(size-65536,size-1),crc=new Map();
  for(let i=0;i<tail.length-46;i++)if(tail.readUInt32LE(i)===0x02014b50){const len=tail.readUInt16LE(i+28),name=tail.subarray(i+46,i+46+len).toString();crc.set(name,tail.readUInt32LE(i+16));i+=45+len+tail.readUInt16LE(i+30)+tail.readUInt16LE(i+32);}
  const selected=entries.filter(e=>e.file==='rain_rig.blend'||(/^maps\/TEX-/.test(e.file)&&!/jeans|\.100[123]\./.test(e.file)));
  const out=path.resolve(base,'extracted'),manifest=[];
  await fs.mkdir(out,{recursive:true});
  for(const e of selected){
    const dest=path.resolve(out,e.file);if(!dest.startsWith(out+path.sep))throw Error('Unsafe ZIP path');
    const old=await fs.readFile(dest).catch(()=>null);
    let data=old;
    if(!old||old.length!==e.uncompressed||crc32(old)!==crc.get(e.file)){
      const header=await range(e.offset,e.offset+29);if(header.readUInt32LE(0)!==0x04034b50)throw Error('Invalid local header');
      const start=e.offset+30+header.readUInt16LE(26)+header.readUInt16LE(28),parts=[];
      for(let i=0;i<e.compressed;i+=chunk)parts.push(await range(start+i,start+Math.min(e.compressed,i+chunk)-1));
      const packed=Buffer.concat(parts);data=e.method===8?zlib.inflateRawSync(packed):packed;
      if(data.length!==e.uncompressed||crc32(data)!==crc.get(e.file))throw Error('ZIP integrity failure '+e.file);
      await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,data);
    }
    manifest.push({file:e.file,bytes:data.length,crc32:crc.get(e.file),sha256:crypto.createHash('sha256').update(data).digest('hex')});
    await fs.writeFile(path.join(base,'extracted-manifest.json'),JSON.stringify({source:url,license:'CC-BY-4.0',credit:'Rain Rig © Blender Foundation | cloud.blender.org',files:manifest,paidCalls:0},null,2));
    console.log('Verified '+e.file+' '+data.length);
  }
})().catch(e=>{console.error(String(e));process.exitCode=1;});
