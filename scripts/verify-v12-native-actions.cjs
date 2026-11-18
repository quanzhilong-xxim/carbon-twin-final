const {chromium,webkit,firefox}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v12/native-actions'),base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3068';await fs.mkdir(out,{recursive:true});
 const engine=process.env.CT_BROWSER||'chromium',browser=await({chromium,webkit,firefox}[engine]).launch({headless:true,...engine==='chromium'?{channel:process.env.CT_BROWSER_CHANNEL||'chrome'}:{}});
 const viewport={width:1440,height:900},context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage();
 await context.route('**/api/**',r=>r.abort());const report={base,engine,browser:browser.version(),errors:[],roles:[],at:new Date().toISOString()};page.on('pageerror',e=>report.errors.push(e.message));
 const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 try{
  await page.goto(base+'/#identities',{waitUntil:'domcontentloaded',timeout:90000});
  for(const role of (process.env.CT_NATIVE_ROLES||'business,city').split(',')){
   const card=page.locator(`.identity-unit[data-character=${role}]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
   const dialog=page.getByRole('dialog'),canvas=dialog.locator('canvas');
   await page.waitForFunction(()=>document.querySelector('.character-room .avatar-stage')?.dataset.ready==='true'&&JSON.parse(document.querySelector('.character-room canvas')?.dataset.nativeRig||'null')?.vertices,null,{timeout:90000});
   const read=()=>canvas.evaluate(c=>JSON.parse(c.dataset.nativeRig));
   const initial=await read();assert(initial.joints>=52);assert(initial.fingers>=30);await page.screenshot({path:path.join(out,`${role}-front.png`)});
   const row={role,initial,actions:[]};report.roles.push(row);
   for(const label of [role==='business'?'致意':'引导','介绍',role==='business'?'看数据':'查看平板','思考',role==='business'?'起身站立':'自然站姿','步态检查','轻转身']){
    const before=await read();await dialog.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(label==='步态检查'?4000:2000);const after=await read();
    await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();await page.waitForTimeout(120);const frozen=await read();const frame=await canvas.getAttribute('data-character-frame');await page.waitForTimeout(400);assert.deepEqual(await read(),frozen);assert.equal(await canvas.getAttribute('data-character-frame'),frame);
    const movement=distance(before.vertices.CT_Index2_R,after.vertices.CT_Index2_R);if(label==='介绍'||label==='思考')assert(movement>.001,'actual weighted hand must move');
    row.actions.push({label,before,after,movement,paused:true});await page.screenshot({path:path.join(out,`${role}-${after.action}.png`)});await dialog.getByRole('button',{name:'继续动作',exact:true}).click();
   }
   await dialog.getByRole('button',{name:'面部',exact:true}).click();await page.waitForTimeout(1800);await page.screenshot({path:path.join(out,`${role}-face.png`)});
   await page.getByRole('button',{name:'关闭角色展厅'}).click();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,failure:report.failure,errors:report.errors}));}
})().catch(e=>{console.error(e);process.exitCode=1});
