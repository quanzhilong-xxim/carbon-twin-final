/* Exact Poly Haven asset, CC0 license page checked before download. */
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'../..'),target='D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/source-assets/library-shelf-v104';
 const data=JSON.parse(await fs.readFile(path.join(root,'docs/recovery/v10.4/polyhaven-bookshelf.json'),'utf8'));
 const asset=data.blend['1k'].blend,files=[['wooden_bookshelf_worn_1k.blend',asset],...Object.entries(asset.include)];
 const manifest={asset:'https://polyhaven.com/a/wooden_bookshelf_worn',license:'CC0-1.0',licenseURL:'https://polyhaven.com/license',retrievedAt:new Date().toISOString(),files:[]};
 for(const [file,entry] of files){
  const dest=path.join(target,file);await fs.mkdir(path.dirname(dest),{recursive:true});
  let bytes;try{bytes=await fs.readFile(dest)}catch{const r=await fetch(entry.url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Download HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());await fs.writeFile(dest,bytes)}
  const md5=crypto.createHash('md5').update(bytes).digest('hex');if(md5!==entry.md5)throw Error('Asset checksum differs: '+file);
  manifest.files.push({file,source:entry.url,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),upstreamMD5:md5});
 }
 await fs.writeFile(path.join(root,'docs/recovery/v10.4/bookshelf-source-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({files:manifest.files.length,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0),md5Verified:true,target}));
})().catch(e=>{console.error(String(e));process.exitCode=1});
