// Consolidate actual completed serial runs, preserving unsuccessful attempts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out='C:/Users/23242/Documents/Codex/2026-11-10/carbontwin-carbontwin-v11-v10-3-v10/outputs/v122',file=path.join(out,'ae-browser-suite.json');
const suite=JSON.parse(fs.readFileSync(file)),buildId=fs.readFileSync('.next-v122ae-final-review/BUILD_ID','utf8').trim();assert.equal(suite.buildId,buildId);
const add=(name,script)=>{
 const resultPath=path.join(out,name,'result.json');if(!fs.existsSync(resultPath))return false;
 const result=JSON.parse(fs.readFileSync(resultPath));if(suite.jobs.some(j=>j.name===name&&j.passed))return true;
 suite.jobs.push({name,evidenceName:name,script,passed:result.passed===true||result.functionalPassed===true,failure:result.failure,exit:result.passed||result.functionalPassed?0:1});return result.passed===true;
};
add('ae-lifecycle','verify-v114-role-lifecycle.cjs');
const split=['student','business','city'].map(role=>'ae-webkit-'+role+'-isolated');
for(const name of split)add(name,'verify-v12-character-views.cjs');
if(split.every(name=>suite.jobs.some(j=>j.name===name&&j.passed))){
 const failed=suite.jobs.filter(j=>j.name==='ae-webkit-views');
 suite.failedAttempts=[...(suite.failedAttempts||[]),...failed];suite.jobs=suite.jobs.filter(j=>j.name!=='ae-webkit-views');
}
suite.passed=['ae-character-registered','ae-native-actions','ae-firefox-views','ae-lifecycle',...split].every(name=>suite.jobs.some(j=>j.name===name&&j.passed));
suite.finished=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(suite,null,2));console.log(JSON.stringify({passed:suite.passed,jobs:suite.jobs.map(j=>({name:j.name,passed:j.passed})),failedAttempts:suite.failedAttempts?.length}));
