// Isolated browser review of candidate bytes. Does not change the public
// model registry, stable servers, network APIs, or retained source assets.
const {chromium}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const rev=process.env.CT_ART_REV||'v122b',roles=(process.env.CT_ART_ROLES||'student,business,city').split(','),base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3068';
 const expected=process.env.CT_ROLE_REVISIONS?JSON.parse(process.env.CT_ROLE_REVISIONS):{};
 const roleRevision=role=>expected[role]||(role==='student'&&process.env.CT_STUDENT_ART_REV?process.env.CT_STUDENT_ART_REV:rev);
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||`outputs/v122/${rev}-art-review`);await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),viewport={width:1440,height:900};
 const context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage();page.setDefaultTimeout(90000);
 const report={base,revision:rev,at:new Date().toISOString(),engine:browser.version(),candidateOverrides:[],roles:[],errors:[],http:[]};
 await context.route('**/api/**',r=>r.abort());
 if(process.env.CT_REGISTERED_REVIEW!=='1')await context.route('**/models/characters-v12-candidate/*.glb',async route=>{
  const name=path.basename(new URL(route.request().url()).pathname),m=name.match(/^CT_(Student|Business|City)_Explore_.*?(-portrait|-lite)?\.glb$/);
  if(!m||!roles.includes(m[1].toLowerCase()))return route.continue();
  const file=path.resolve(`public/models/characters-v12-candidate/CT_${m[1]}_Explore_${roleRevision(m[1].toLowerCase())}${m[2]||''}.glb`),body=await fs.readFile(file);
  report.candidateOverrides.push({requested:name,file,bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex')});
  await route.fulfill({status:200,contentType:'model/gltf-binary',body});
 });
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({url:r.url(),status:r.status()});});
 try{
  await page.goto(base+'/#identities',{waitUntil:'domcontentloaded',timeout:90000});
  for(const role of roles){
   const card=page.locator(`.identity-unit[data-character=${role}]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
   const dialog=page.getByRole('dialog'),canvas=dialog.locator('canvas'),stage=dialog.locator('.avatar-stage');
   await page.waitForFunction(()=>document.querySelector('.character-room .avatar-stage')?.dataset.ready==='true'&&Number(document.querySelector('.character-room canvas')?.dataset.characterTriangles)>0,null,{timeout:90000});
   await page.waitForTimeout(1000);await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();
   const row={role,views:[],initial:await canvas.evaluate(c=>({...c.dataset}))};report.roles.push(row);
   if(process.env.CT_REGISTERED_REVIEW==='1')assert.equal(row.initial.assetVersion,roleRevision(role),'Review must load the registered candidate, without request overrides');
   for(const [view,label]of [['front','正面'],['detail','面部'],['hair','头发'],['left','左侧'],['right','右侧'],['back','背面'],['threequarter','45°']].filter(([view])=>!process.env.CT_ART_VIEWS||process.env.CT_ART_VIEWS.split(',').includes(view))){
    await dialog.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(({view,quality})=>{const stage=document.querySelector('.character-room .avatar-stage'),canvas=stage?.querySelector('canvas');return stage?.dataset.ready==='true'&&canvas?.dataset.paused==='true'&&canvas?.dataset.avatarView===view&&canvas?.dataset.assetQuality===quality&&Number(canvas?.dataset.characterTriangles)>0;},{view,quality:['detail','hair','eyes'].includes(view)?'portrait':'standard'},{timeout:90000});
    await page.waitForTimeout(550);row.views.push({view,data:await canvas.evaluate(c=>({...c.dataset})),stageBounds:await stage.boundingBox()});await page.screenshot({path:path.join(out,`${role}-${view}.png`)});
   }
   await dialog.getByRole('button',{name:'继续动作',exact:true}).click();
   for(const label of process.env.CT_ART_SKIP_ACTIONS==='1'?[]:role==='student'?['挥手','记录笔记']:['介绍','思考']){
    await dialog.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(2500);await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();
    await dialog.getByRole('button',{name:'手部',exact:true}).click();await page.waitForTimeout(700);const data=await canvas.evaluate(c=>({...c.dataset}));
    if(process.env.CT_REQUIRE_HAND_FRAMING==='1'&&role!=='student'){
     const frame=JSON.parse(data.handFrame||'null');assert(frame&&frame.joints.length>=6,'Hands view must measure the actual articulated hand');
     assert(frame.min.every(n=>Number.isFinite(n)&&n>-.95)&&frame.max.every(n=>Number.isFinite(n)&&n<.95),'Actual fingertips must remain within the camera frame');
    }
    if(role==='student'&&label==='记录笔记'){const c=JSON.parse(data.contact);assert(c.notebookGrip<.001&&c.writingTip<.001);}
    await page.screenshot({path:path.join(out,`${role}-${label==='记录笔记'?'writing':label==='挥手'?'wave':label==='介绍'?'guide':'thinking'}-hands.png`)});
    await dialog.getByRole('button',{name:'继续动作',exact:true}).click();
   }
   await page.getByRole('button',{name:'关闭角色展厅'}).click();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.functionalPassed=true;report.artAccepted=false;report.artStatus='Requires independent image inspection';
 }catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,functionalPassed:report.functionalPassed,failure:report.failure,errors:report.errors,http:report.http}));}
})();
