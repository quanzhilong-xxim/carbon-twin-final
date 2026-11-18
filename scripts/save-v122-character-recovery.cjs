// An additive, hash-verified recovery point. Credentials and build caches are excluded.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const destination=path.join('D:/CarbonTwin_Recovery_Backups',(process.env.CT_RECOVERY_LABEL||'v122r-grip')+'-'+new Date().toISOString().replace(/[:.]/g,'-'));
 await fs.mkdir(destination,{recursive:false});const files=[];
 const add=async(relative)=>{
  const source=path.join(root,relative),stat=await fs.stat(source);
  if(stat.isDirectory()){for(const name of await fs.readdir(source))await add(path.join(relative,name));return;}
  const target=path.join(destination,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target,1);
  const digest=async(file)=>crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
  const sha256=await digest(source);if(sha256!==await digest(target))throw Error('Backup mismatch: '+relative);
  files.push({path:relative,bytes:stat.size,modified:stat.mtime.toISOString(),sha256});
 };
 for(const item of ['app','components','lib','scripts','AGENTS.md','next.config.mjs','package.json','package-lock.json','tsconfig.json'])await add(item);
 for(const role of ['Student','Business','City']){
  const rev=JSON.parse(process.env.CT_ROLE_REVISIONS||'{}')[role.toLowerCase()]||(role==='Student'?'v122q':'v122r');
  for(const suffix of ['.blend','.glb','-portrait.glb','-lite.glb','.sources.json'])await add(`public/models/characters-v12-candidate/CT_${role}_Explore_${rev}${suffix}`);
 }
 for(const item of (process.env.CT_RECOVERY_EVIDENCE||'v122r-integrity.json,v122r-exported-rig.json,v122r-final-production-build.log').split(','))await add('outputs/v122/'+item);
 const manifest={at:new Date().toISOString(),root,destination,scope:'Source, selected current role assets, and retained build/integrity evidence. Not an entire-repository or system backup.',roleRevisions:JSON.parse(process.env.CT_ROLE_REVISIONS||'{}'),files,verified:true};
 await fs.writeFile(path.join(destination,'recovery-manifest.json'),JSON.stringify(manifest,null,2));
 console.log(JSON.stringify({destination,verified:true,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)}));
})().catch(e=>{console.error(e);process.exitCode=1});
