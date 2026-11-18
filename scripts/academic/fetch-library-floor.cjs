/* Exact public CC0 texture, bounded downloads and verified source checksums. */
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'../..'),meta=JSON.parse(await fs.readFile(path.join(root,'docs/recovery/v10.4/floor-api-source.json'),'utf8'));
 const license=await fetch('https://polyhaven.com/license',{signal:AbortSignal.timeout(20000)}),text=await license.text();if(!license.ok||!/CC0|Creative Commons Zero/i.test(text))throw Error('Exact license not verified');
 const dir=path.join(root,'public/textures/research/library-floor-v104');await fs.mkdir(dir,{recursive:true});const files=[];
 for(const [key,name]of [['Diffuse','color.jpg'],['nor_gl','normal.jpg'],['Rough','roughness.jpg']]){
  const source=meta.files[key]['1k'].jpg,response=await fetch(source.url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error(response.status+' '+key);
  const bytes=Buffer.from(await response.arrayBuffer()),md5=crypto.createHash('md5').update(bytes).digest('hex');if(md5!==source.md5||bytes.length!==source.size)throw Error('Source checksum/size mismatch '+key);
  const file=path.join(dir,name);await fs.writeFile(file,bytes);files.push({file:path.relative(root,file).replaceAll('\\','/'),source:source.url,bytes:bytes.length,md5,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 const report={at:new Date().toISOString(),asset:'https://polyhaven.com/a/wooden_floor_02',authors:meta.info.authors,license:'CC0-1.0',licenseURL:'https://polyhaven.com/license',licenseStatus:license.status,files,paidCalls:0};
 await fs.writeFile(path.join(root,'docs/recovery/v10.4/floor-source-manifest.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
