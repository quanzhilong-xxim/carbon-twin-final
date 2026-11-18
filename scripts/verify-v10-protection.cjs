/* Verify frozen bytes and a real scratch restore. Never restores live files. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const baseline='D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/CP-00';
const increment='D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/CONTINUE-NOV08-2026-11-08T13-15-58-231Z';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const frozen=JSON.parse(fs.readFileSync(path.join(increment,'frozen-integrity.json'),'utf8'));
const changed=[],missing=[];
for(const item of frozen){const file=path.join(root,item.file);if(!fs.existsSync(file))missing.push(item.file);else if(hash(file)!==item.sha256)changed.push(item.file);}
const report={at:new Date().toISOString(),frozenFiles:frozen.length,changed,missing,restore:null,passed:false};
try{
 assert.deepEqual(changed,[]);assert.deepEqual(missing,[]);
 const manifest=JSON.parse(fs.readFileSync(path.join(baseline,'manifest.json'),'utf8'));
 const relative='lib/visuals/cityDust.ts',entry=manifest.find(x=>x.path.replaceAll('\\','/')===relative);
 assert(entry,'baseline source is present in the original backup manifest');
 const scratch=path.join(increment,'restore-drill-'+Date.now());fs.mkdirSync(scratch,{recursive:true});
 const restored=path.join(scratch,'cityDust.ts');fs.copyFileSync(path.join(baseline,'files',relative),restored,fs.constants.COPYFILE_EXCL);
 assert.equal(hash(restored),entry.sha256);
 const js=path.join(scratch,'cityDust.cjs');fs.writeFileSync(js,ts.transpileModule(fs.readFileSync(restored,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const module=require(js);
 assert.equal(module.storyTarget(true,.25,false,.8),.25);assert.equal(module.storyTarget(false,.25,true,.8),1);assert.equal(module.storyTarget(false,.25,false,.8),.8);
 const data=module.createDustData([{id:0,p:[0,0,0],s:[5,12,6],type:0}]);
 assert(data.count>0&&data.target.every(Number.isFinite)&&data.dust.every(Number.isFinite));
 assert.equal(data.target.length,data.count*3);
 assert(data.target.some((x,i)=>x!==data.dust[i]),'restored particle source and destination remain distinct');
 report.restore={scratch,baselineModule:relative,sha256:hash(restored),checks:['hash matches original manifest','restored module compiles and loads','manual/reduced/scroll progress contracts','valid nonempty formation geometry'],liveSourceTouched:false};
 report.passed=true;
}catch(e){report.failure=String(e);process.exitCode=1;}
fs.writeFileSync(path.join(root,'outputs/v10-explore/protection-and-restore.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
