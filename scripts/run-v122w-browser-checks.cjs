// Serialize browser/GPU work. All tests abort AI API routes.
const{spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),evidence='C:/Users/23242/Documents/Codex/2026-11-10/carbontwin-carbontwin-v11-v10-3-v10/outputs/v122';
const jobs=[
 ['w-native-firefox','verify-v12-native-actions.cjs',{CT_BROWSER:'firefox',PLAYWRIGHT_BROWSERS_PATH:'D:/CarbonTwin_Recovery_Backups/v122-browser-runtime'}],
 ['w-chair-contact','verify-v122r-chair-contact.cjs',{CT_BUSINESS_ART_REV:'v122t'}],
 ['characters-w-contact-registered','review-v122b-character-art.cjs',{CT_ART_REV:'v122w',CT_REGISTERED_REVIEW:'1',CT_REQUIRE_HAND_FRAMING:'1'}],
 ['w-contact-firefox-views','verify-v12-character-views.cjs',{CT_BROWSER:'firefox',PLAYWRIGHT_BROWSERS_PATH:'D:/CarbonTwin_Recovery_Backups/v122-browser-runtime'}],
 ['w-contact-webkit-views','verify-v12-character-views.cjs',{CT_BROWSER:'webkit'}],
 ['w-contact-lifecycle','verify-v114-role-lifecycle.cjs',{}],
];
const report={at:new Date().toISOString(),buildId:fs.readFileSync(path.join(root,'.next-v122w-contact-review/BUILD_ID'),'utf8').trim(),jobs:[]};
for(const[name,script,extra]of jobs){
 const env={...process.env,CT_PREVIEW_URL:'http://127.0.0.1:3070',CT_ROLE_REVISIONS:JSON.stringify({student:'v122w',business:'v122t',city:'v122s'}),CT_EVIDENCE_DIR:path.join(evidence,name)};
 for(const key of ['CT_ART_VIEWS','CT_ART_ROLES','CT_ART_SKIP_ACTIONS','CT_LIFECYCLE_MOBILE_ONLY','PLAYWRIGHT_BROWSERS_PATH','CT_BROWSER'])delete env[key];Object.assign(env,extra);
 console.log('START '+name);const start=Date.now(),r=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,env,encoding:'utf8',timeout:600000,windowsHide:true});
 fs.writeFileSync(path.join(root,'outputs/v122',name+'-run.log'),(r.stdout||'')+(r.stderr||''));
 const row={name,script,exit:r.status,error:r.error?.message,seconds:(Date.now()-start)/1000};report.jobs.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync(path.join(evidence,'w-browser-suite.json'),JSON.stringify(report,null,2));
}
report.passed=report.jobs.every(r=>r.exit===0);report.finished=new Date().toISOString();fs.writeFileSync(path.join(evidence,'w-browser-suite.json'),JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
