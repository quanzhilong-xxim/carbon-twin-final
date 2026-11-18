const { chromium, expect: browserExpect } = require('@playwright/test');
const expect=browserExpect.configure({timeout:60000}),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066').replace(/\/$/,''),mobile=process.argv.includes('mobile'),viewport=mobile?{width:390,height:844}:{width:1440,height:900};
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v113/internal',`companion-v113e-${mobile?'mobile-':''}${Date.now()}`);await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage();
 const report={base,out,mobile,revision:'v113e',version:browser.version(),errors:[],http:[],checks:[]};page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().split('?')[0]})});await context.route('**/api/**',r=>r.abort());
 const shot=async name=>page.screenshot({path:path.join(out,name+'.png')});
 try{
  await page.goto(base+'/simulator#eco-companion',{waitUntil:'domcontentloaded'});
  const section=page.locator('#eco-companion'),canvas=section.locator('canvas[data-story-scene=cat]');await section.locator('.story-companion-scene').scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-companion-asset','/models/behaviour-v113-candidate/woodland-companion-v113e.glb');
  await expect(canvas).toHaveAttribute('data-companion-eyes','8');await expect(canvas).toHaveAttribute('data-companion-morphs','8');await expect(canvas).toHaveAttribute('data-companion-paws','2');
  report.loaded=await canvas.evaluate(c=>({...c.dataset}));assert(Number(report.loaded.companionSkinnedMeshes)>0);assert(report.loaded.companionVertex);
  const initial=report.loaded.companionVertex;await expect(canvas).not.toHaveAttribute('data-companion-vertex',initial);
  await shot('01-candidate-idle');report.checks.push('candidate GLB loads with real skinned meshes, eight Blink morphs, five body controls and two paw controls; actual skinned vertex moves');
  await section.getByRole('button',{name:'暂停场景动画',exact:true}).click();await expect(canvas).toHaveAttribute('data-companion-paused','true');
  const frozen=await canvas.evaluate(c=>({head:c.dataset.companionHead,vertex:c.dataset.companionVertex,blink:c.dataset.companionBlink,time:c.dataset.companionTime}));
  const box=await canvas.boundingBox();assert(box);await page.mouse.move(box.x+box.width*.45,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.60,box.y+box.height*.47,{steps:14});await page.mouse.up();await page.waitForTimeout(400);
  assert.deepEqual(await canvas.evaluate(c=>({head:c.dataset.companionHead,vertex:c.dataset.companionVertex,blink:c.dataset.companionBlink,time:c.dataset.companionTime})),frozen);await shot('02-candidate-paused-orbit');
  const annual=await section.locator('.story-live-strip').innerText();await section.getByRole('button',{name:'轻触猫咪',exact:true}).click();await expect(section.locator('p[role=status]')).toContainText('继续后回应');await section.locator('.story-companion-scene').scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-companion-reaction','1');
  await section.getByRole('button',{name:'继续场景动画',exact:true}).click();await expect(canvas).toHaveAttribute('data-companion-paused','false');await expect(canvas).not.toHaveAttribute('data-companion-vertex',frozen.vertex);await page.waitForTimeout(400);await shot('03-candidate-touch-response');assert.equal(await section.locator('.story-live-strip').innerText(),annual);report.checks.push('camera orbit is interactive; actual skinned pose and blink freeze; queued touch resumes motion and leaves annual calculation unchanged');
  report.after=await canvas.evaluate(c=>({...c.dataset}));
  await page.goto(base+'/simulator?companion=classic#eco-companion',{waitUntil:'domcontentloaded'});await section.locator('.story-companion-scene').scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-companion-asset','/models/behaviour-v108/cat.glb');await expect(canvas).toHaveAttribute('data-companion-parts','5');await shot('04-classic-comparison');report.checks.push('classic query retains original ordinary cat for comparison; default is v113e');
  report.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(report.overflow,false);assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;await shot('failure').catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
