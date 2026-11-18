// One browser/GPU job at a time. API routes are blocked inside each test.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),evidence='C:/Users/23242/Documents/Codex/2026-11-10/carbontwin-carbontwin-v11-v10-3-v10/outputs/v122';
const jobs=[
 ['ac-character-registered','review-v122b-character-art.cjs',{CT_ART_REV:'v122ac',CT_REGISTERED_REVIEW:'1',CT_REQUIRE_HAND_FRAMING:'1'}],
 ['ac-business-actions','verify-v12-native-actions.cjs',{CT_NATIVE_ROLES:'business'}],
 ['ac-firefox-views','verify-v12-character-views.cjs',{CT_BROWSER:'firefox',CT_VIEW_ROLES:'student,business',PLAYWRIGHT_BROWSERS_PATH:'D:/CarbonTwin_Recovery_Backups/v122-browser-runtime'}],
 ['ac-webkit-views','verify-v12-character-views.cjs',{CT_BROWSER:'webkit',CT_VIEW_ROLES:'student,business'}],
 ['ac-lifecycle','verify-v114-role-lifecycle.cjs',{}],
];
const report={at:new Date().toISOString(),base:'http://127.0.0.1:3070',buildId:fs.readFileSync(path.join(root,'.next-v122ac-review/BUILD_ID'),'utf8').trim(),roles:{student:'v122ac',business:'v122x',city:'v122s'},jobs:[]};
for(const[name,script,extra]of jobs){
 const env={...process.env,CT_PREVIEW_URL:report.base,CT_ROLE_REVISIONS:JSON.stringify(report.roles),CT_EVIDENCE_DIR:path.join(evidence,name)};
 for(const key of ['CT_ART_VIEWS','CT_ART_ROLES','CT_ART_SKIP_ACTIONS','CT_REGISTERED_REVIEW','CT_LIFECYCLE_MOBILE_ONLY','PLAYWRIGHT_BROWSERS_PATH','CT_BROWSER','CT_VIEW_ROLES','CT_NATIVE_ROLES'])delete env[key];Object.assign(env,extra);
 console.log('START '+name);const start=Date.now(),result=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,env,encoding:'utf8',timeout:300000,windowsHide:true});
 fs.writeFileSync(path.join(root,'outputs/v122',name+'-run.log'),(result.stdout||'')+(result.stderr||''));
 let evidenceResult;try{evidenceResult=JSON.parse(fs.readFileSync(path.join(evidence,name,'result.json')))}catch{}
 const row={name,script,exit:result.status,error:result.error?.message,seconds:(Date.now()-start)/1000,passed:result.status===0&&(evidenceResult?.passed===true||evidenceResult?.functionalPassed===true),failure:evidenceResult?.failure};report.jobs.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync(path.join(evidence,'ac-browser-suite.json'),JSON.stringify(report,null,2));
}
report.passed=report.jobs.every(r=>r.passed);report.finished=new Date().toISOString();fs.writeFileSync(path.join(evidence,'ac-browser-suite.json'),JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
