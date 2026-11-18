const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'..'),workspace='C:/Users/23242/Documents/Codex/2026-11-10/carbontwin-carbontwin-v11-v10-3-v10',out=path.join(workspace,'outputs/v122');
 for(const[from,to]of [['v122w-integrity.json','w-integrity.json'],['v122w-exported-rig.json','w-rig-validation.json'],['v122w-student-mesh-contact.json','w-student-mesh-contact.json']])await fs.copyFile(path.join(root,'outputs/v122',from),path.join(out,to));
 const files=[];
 for(const[role,rev]of [['Student','v122w'],['Business','v122t'],['City','v122s']])for(const ext of ['.blend','.glb','-portrait.glb','-lite.glb','.sources.json']){
  const relative=`public/models/characters-v12-candidate/CT_${role}_Explore_${rev}${ext}`,buffer=await fs.readFile(path.join(root,relative));files.push({role,revision:rev,path:relative,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')});
 }
 const read=async p=>{try{return JSON.parse(await fs.readFile(path.join(out,p),'utf8'))}catch{return null}};
 const checks=[];
 for(const name of ['characters-w-contact-registered','w-native-webkit','w-native-firefox','w-contact-firefox-views','w-contact-webkit-views','w-contact-lifecycle','w-chair-contact']){
  const result=await read(name+'/result.json');checks.push({name,result:name+'/result.json',present:!!result,passed:result?.passed===true||result?.functionalPassed===true,at:result?.at,failure:result?.failure,errors:result?.errors,http:result?.http});
 }
 const state={at:new Date().toISOString(),root,buildDirectory:'.next-v122w-contact-review',buildId:(await fs.readFile(path.join(root,'.next-v122w-contact-review/BUILD_ID'),'utf8')).trim(),preview:'http://127.0.0.1:3070/#identities',retainedServices:[3066,3067],files,checks,artAccepted:false,score:null,qualityNote:'Functional evidence and art acceptance are separate. No 98/100 claim.',visibleChanges:['Student shoulder caps and twill normal map; original weighted hands smoothed; old overlapping cuff hems retired','Actual pencil endpoint follows the actual paper surface, measured within 0.3mm','Business palms follow the retained chair armrests; continuous shirt, spread collar and shaped tie knot','City expression-aware lip corners and hair roughness retained with complete bone hierarchy','Mobile card reserves viewer height before chunk load, preventing the exhibit button moving during pointer input'],remaining:['Student hand grip and wrist junction remain visibly imperfect','Adult face, groom and tailoring still fall short of the supplied concepts','Particle, archive, citylight and living-comparison phases have not been newly accepted in this recovery run','No physical mobile device or native Safari test in this run'],transport:{provider:'custom',model:'gpt-6.1-sol',baseUrl:'https://www.ddshub.cc/',configurationChanged:false,paidGenerationCalls:0,newProbeCalls:0,concurrencyState:'Server-side concurrency and balance cannot be queried from the local evidence; no new AI jobs were launched.',diagnostic:'Earlier direct HEAD timed out; a system HTTP client returned 200. That does not validate authenticated long streams.'},backup:{latestRecorded:'D:/CarbonTwin_Recovery_Backups/v122w-character-review-2026-11-11T10-34-40-592Z',scope:'Verified source and selected assets; later pencil-surface correction requires the subsequent final recovery point.'}};
 await fs.writeFile(path.join(out,'recovery-w-state.json'),JSON.stringify(state,null,2));
 const index=path.join(workspace,'outputs/index.html'),original=await fs.readFile(index,'utf8');
 if(!original.includes('recovery-review-w.html')){
  await fs.copyFile(index,path.join(workspace,'outputs/index-v114-retained.html'),1);
  await fs.writeFile(index,original.replace('<main>','<main><p class="notice">2026-11-11 更新：<a href="v122/recovery-review-w.html">打开恢复后的当前三角色、真实录屏与验证结果</a>。下方保留的是历史 V11.4 交付记录，其版本、评分和限制不代表当前候选。</p>'));
 }
 console.log(JSON.stringify({out,assets:files.length,checks,artAccepted:false}));
})().catch(e=>{console.error(e);process.exitCode=1});
