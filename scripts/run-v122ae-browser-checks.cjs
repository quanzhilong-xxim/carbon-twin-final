// One browser/GPU job at a time. All paid API routes are blocked in tests.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),evidence='C:/Users/23242/Documents/Codex/2026-11-10/carbontwin-carbontwin-v11-v10-3-v10/outputs/v122';
const jobs=[
 ['ae-character-registered','review-v122b-character-art.cjs',{CT_ART_REV:'v122ae',CT_REGISTERED_REVIEW:'1',CT_REQUIRE_HAND_FRAMING:'1'}],
 ['ae-native-actions','verify-v12-native-actions.cjs',{CT_NATIVE_ROLES:'business,city'}],
 ['ae-firefox-views','verify-v12-character-views.cjs',{CT_BROWSER:'firefox',CT_VIEW_ROLES:'student,business,city',PLAYWRIGHT_BROWSERS_PATH:'D:/CarbonTwin_Recovery_Backups/v122-browser-runtime'}],
 ['ae-webkit-views','verify-v12-character-views.cjs',{CT_BROWSER:'webkit',CT_VIEW_ROLES:'student,business,city'}],
 ['ae-lifecycle','verify-v114-role-lifecycle.cjs',{}],
];
let report={at:new Date().toISOString(),base:'http://127.0.0.1:3070',buildId:fs.readFileSync(path.join(root,'.next-v122ae-final-review/BUILD_ID'),'utf8').trim(),roles:{student:'v122ae',business:'v122ae',city:'v122ae'},jobs:[]};
if(process.env.CT_RESUME_SUITE==='1'){
 const previous=JSON.parse(fs.readFileSync(path.join(evidence,'ae-browser-suite.json'),'utf8'));
 if(previous.buildId!==report.buildId)throw Error('Do not reuse results from a different build');
 report={...previous,passed:undefined,finished:undefined,failedAttempts:[...(previous.failedAttempts||[]),...previous.jobs.filter(j=>!j.passed)]};
 report.jobs=previous.jobs.filter(j=>j.passed);
}
for(const[name,script,extra]of jobs){
 if(report.jobs.some(j=>j.name===name&&j.passed))continue;
 const evidenceName=process.env.CT_RESUME_SUITE==='1'&&report.failedAttempts?.some(j=>j.name===name)?name+'-settled-contact':name;
 const env={...process.env,CT_PREVIEW_URL:report.base,CT_ROLE_REVISIONS:JSON.stringify(report.roles),CT_EVIDENCE_DIR:path.join(evidence,evidenceName)};
 for(const key of ['CT_ART_VIEWS','CT_ART_ROLES','CT_ART_SKIP_ACTIONS','CT_REGISTERED_REVIEW','CT_LIFECYCLE_MOBILE_ONLY','PLAYWRIGHT_BROWSERS_PATH','CT_BROWSER','CT_VIEW_ROLES','CT_NATIVE_ROLES'])delete env[key];Object.assign(env,extra);
 console.log('START '+name);const start=Date.now(),result=spawnSync(process.execPath,[path.join(root,'scripts',script)],{cwd:root,env,encoding:'utf8',timeout:300000,windowsHide:true});
 fs.writeFileSync(path.join(root,'outputs/v122',name+'-run.log'),(result.stdout||'')+(result.stderr||''));
 let evidenceResult;try{evidenceResult=JSON.parse(fs.readFileSync(path.join(evidence,evidenceName,'result.json')))}catch{}
 const row={name,evidenceName,script,exit:result.status,error:result.error?.message,seconds:(Date.now()-start)/1000,passed:result.status===0&&(evidenceResult?.passed===true||evidenceResult?.functionalPassed===true),failure:evidenceResult?.failure};report.jobs.push(row);console.log(JSON.stringify(row));
 fs.writeFileSync(path.join(evidence,'ae-browser-suite.json'),JSON.stringify(report,null,2));
 if(!row.passed)break;
}
report.passed=report.jobs.length===jobs.length&&report.jobs.every(r=>r.passed);report.finished=new Date().toISOString();fs.writeFileSync(path.join(evidence,'ae-browser-suite.json'),JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
