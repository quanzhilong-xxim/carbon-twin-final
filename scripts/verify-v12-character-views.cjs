const {chromium,webkit,firefox,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v12/character-views'),base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3068',mobile=process.argv.includes('mobile'),engine=process.env.CT_BROWSER||'chromium';await fs.mkdir(out,{recursive:true});
 const viewport=mobile?{width:390,height:844}:{width:1440,height:900};const browser=await({chromium,webkit,firefox}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{}});
 const context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage();page.setDefaultTimeout(60000);await context.route('**/api/**',r=>r.abort());
 const report={base,mobile,engine,version:browser.version(),at:new Date().toISOString(),roles:[],errors:[],http:[]};page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({url:r.url(),status:r.status()});});
 try{
  await page.goto(base+'/#identities',{waitUntil:'domcontentloaded',timeout:90000});
  for(const role of (process.env.CT_VIEW_ROLES||'student,business,city').split(',')){
   const card=page.locator(`.identity-unit[data-character=${role}]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();const dialog=page.getByRole('dialog'),canvas=dialog.locator('canvas'),stage=dialog.locator('.avatar-stage');
   await expect(stage).toHaveAttribute('data-ready','true',{timeout:90000});await dialog.getByRole('button',{name:role==='student'?'记录笔记':'思考',exact:true}).click();await page.waitForTimeout(3200);
   // Software WebGL can advance fewer animation frames per wall second.
   // Check the real settled mesh contact before freezing the clock; retain
   // the same 1mm acceptance limit and a bounded wait, rather than treating
   // a still-blending pose as a finished writing pose.
   if(role==='student')await page.waitForFunction(()=>{const c=JSON.parse(document.querySelector('.character-room canvas')?.dataset.contact||'null');return c&&c.notebookGrip<.001&&c.writingTip<.001;},null,{timeout:15000});
   await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();await page.waitForTimeout(150);
   const initial=await canvas.evaluate(c=>({...c.dataset})),row={role,initial,views:[]};report.roles.push(row);const frame=initial.characterFrame;
   if(process.env.CT_ROLE_REVISIONS)assert.equal(initial.assetVersion,JSON.parse(process.env.CT_ROLE_REVISIONS)[role],'Test the registered candidate revision');
   if(role==='student'){const c=JSON.parse(initial.contact);assert(c.notebookGrip<.001&&c.writingTip<.001);assert.equal(Number(initial.recordingVisible),13);}
   for(const [view,label]of [['front','正面'],['left','左侧'],['right','右侧'],['threequarter','45°'],['back','背面'],['detail','面部'],['eyes','眼部'],['hair','头发'],['outfit','服装'],['hands','手部'],['prop','道具']]){
    await dialog.getByRole('button',{name:label,exact:true}).click();await expect(stage).toHaveAttribute('data-ready','true',{timeout:90000});await expect(canvas).toHaveAttribute('data-avatar-view',view);await page.waitForTimeout(350);const data=await canvas.evaluate(c=>({...c.dataset}));assert.equal(data.characterFrame,frame,'paused LOD switch must retain action clock');assert.equal(data.paused,'true');assert(Number(data.characterTriangles)>0);
    if(initial.nativeRig){const a=JSON.parse(initial.nativeRig),b=JSON.parse(data.nativeRig);for(const key of Object.keys(a.vertices))assert(Math.hypot(...a.vertices[key].map((v,i)=>v-b.vertices[key][i]))<.008,'LOD pose must retain weighted vertex position');}
    if(role==='student'){const c=JSON.parse(data.contact);assert(c.notebookGrip<.001&&c.writingTip<.001);}
    row.views.push({view,quality:data.assetQuality,frame:data.characterFrame});await page.screenshot({path:path.join(out,`${role}-${view}.png`)});
   }
   await dialog.getByRole('button',{name:'继续动作',exact:true}).click();await page.waitForTimeout(700);assert(Number(await canvas.getAttribute('data-character-frame'))>Number(frame));row.resume=true;await page.getByRole('button',{name:'关闭角色展厅'}).click();
  }assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,failure:report.failure,errors:report.errors,http:report.http}));}
})();
