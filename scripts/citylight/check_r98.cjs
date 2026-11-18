const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),card=JSON.parse(fs.readFileSync(path.join(root,'docs/citylight/R98_SCORECARD.json')));
const issues=[];const ids=new Set();const groups={};let points=0;
for(const item of card.items){
 if(ids.has(item.id))issues.push('duplicate '+item.id);ids.add(item.id);groups[item.group]=(groups[item.group]||0)+1;
 if(!/^R\d{3}$/.test(item.id)||Number(item.id.slice(1))<1||Number(item.id.slice(1))>100)issues.push('illegal ID '+item.id);
 if(item.status==='PASS'){
  let verified=!!card.candidateHash&&item.candidateHash===card.candidateHash&&!!item.reviewer&&item.evidence.length>0;
  for(const e of item.evidence){const file=path.resolve(root,e.path);if(!fs.existsSync(file)||!e.sha256||e.candidateHash!==card.candidateHash||e.verdict!=='PASS'||!e.executedAt)verified=false;else{const actual=require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(actual!==e.sha256)verified=false;}}
  if(verified)points++;else issues.push('unverified PASS '+item.id);
 }
}
for(let i=1;i<=100;i++)if(!ids.has('R'+String(i).padStart(3,'0')))issues.push('missing R'+i);
for(const g of 'ABCDEFGHIJ')if(groups[g]!==10)issues.push('group '+g+' must contain 10 questions');
const p0=card.items.filter(i=>i.priority==='P0').every(i=>i.status==='PASS');
const groupsPass=[...'ABCDEFGHIJ'].every(g=>card.items.filter(i=>i.group===g&&i.status==='PASS').length>=9);
const d90=Object.values(card.d90).every(n=>typeof n==='number'&&n>=90);
const sweeps=card.rounds.length>=2&&card.rounds.slice(-2).every(r=>r.candidateHash===card.candidateHash&&r.evidenceVerified&&r.score>=98);
const qualified=!issues.length&&points>=98&&p0&&groupsPass&&d90&&sweeps&&!card.openDefects.length&&card.regressionPass;
console.log(JSON.stringify({state:qualified?'INTERNAL_QUALIFIED_AWAITING_USER':'IN_PROGRESS',registered:ids.size,evidenceVerifiedPoints:points,p0,groupsPass,d90,sweeps,issues},null,2));
process.exitCode=qualified?0:1;
