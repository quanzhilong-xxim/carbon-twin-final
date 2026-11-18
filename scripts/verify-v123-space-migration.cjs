// Local runtime validation using D-hosted Playwright and D evidence output.
const {chromium,expect:baseExpect}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const expect=baseExpect.configure({timeout:60000});
const out=path.resolve(process.env.CT_EVIDENCE_DIR||'D:/CarbonTwin_Workspace/Test_Evidence/migration-smoke'),base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066';
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={base,at:new Date().toISOString(),browserRoot:process.env.PLAYWRIGHT_BROWSERS_PATH,checks:[],errors:[],http:[],passed:false};
 const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});await context.route('**/api/**',r=>r.abort());
 await context.addInitScript(()=>{const seen=new WeakSet(),get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const gl=get.apply(this,args);if(gl&&/^webgl/.test(args[0])&&!seen.has(gl)){seen.add(gl);for(const method of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=gl[method];if(original)gl[method]=(...values)=>{this.dataset.testDrawCalls=String(Number(this.dataset.testDrawCalls||0)+1);return original.apply(gl,values);};}}return gl;};});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
 try{
  if(process.env.CT_MIGRATION_SCENES_ONLY!=='1'){
  await page.goto(base+'/#identities',{waitUntil:'domcontentloaded'});await expect(page.locator('h1')).toBeVisible();
  const models=[];
  for(const id of ['student','business','city']){
   const unit=page.locator(`.identity-unit[data-character="${id}"]`);await unit.scrollIntoViewIfNeeded();await unit.locator('.identity-card').click();await expect(unit.locator('.avatar-stage')).toHaveAttribute('data-ready','true');
   const data=await unit.locator('canvas').evaluate(c=>({...c.dataset,lost:c.getContext('webgl2').isContextLost()}));assert.equal(data.lost,false);assert(Number(data.characterTriangles)>0);if(process.env.CT_EXPECT_NATIVE_REVISION==='1'){assert.equal(data.assetVersion,{student:'v123b',business:'v123g',city:'v123e'}[id]);assert.equal(data.nativeClip,'Idle');}models.push({id,version:data.assetVersion,model:data.modelSource,triangles:data.characterTriangles});
  }
  report.checks.push({name:'homepage-three-real-GLBs-active-WebGL',models});await page.mouse.move(4,4);await page.screenshot({path:path.join(out,'01-identity.png')});
  await page.goto(base+'/learn',{waitUntil:'domcontentloaded'});await expect(page.locator('.archive-entry')).toHaveCount(9);await page.locator('.archive-entry').first().getByRole('button',{name:/阅读文献/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'关闭文献',exact:true}).click();report.checks.push({name:'archive-covers-and-source-dialog',passed:true});
  }
  await page.goto(base+'/simulator#digital-room',{waitUntil:'domcontentloaded'});const city=page.locator('#digital-room');await city.locator('.twin-stage-wrap').scrollIntoViewIfNeeded();await expect(city.locator('.twin-canvas')).toHaveAttribute('data-experience','orbit');
  await expect.poll(async()=>Number(await city.locator('canvas').getAttribute('data-test-draw-calls'))).toBeGreaterThan(10);
  const cityData=await city.locator('canvas').evaluate(c=>({...c.dataset,lost:c.getContext('webgl2').isContextLost(),buffer:[c.width,c.height]}));assert.equal(cityData.lost,false);assert(cityData.buffer.every(v=>v>0));report.checks.push({name:'sandbox-city-geometry-textures-live-WebGL',data:cityData});await page.screenshot({path:path.join(out,'02-city.png')});
  const comparison=page.locator('#two-lives');await comparison.locator('.building-comparison').scrollIntoViewIfNeeded();await comparison.getByRole('button',{name:'按使用人数',exact:true}).click();await page.locator('#building-0-intensity').fill('90');await expect(comparison.locator('.building-comparison')).toContainText('1307.25');await page.locator('#building-0-intensity').fill('45');report.checks.push({name:'AB-same-factor-calculation',expected:'100 × 90 × 0.581 / 4 = 1307.25'});
  const evidence=await context.request.get('http://127.0.0.1:3067/');assert.equal(evidence.status(),200);assert((await evidence.text()).length>50);report.checks.push({name:'historical-evidence-service-responds',status:evidence.status()});
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(error){report.failure=error.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.finished=new Date().toISOString();report.version=browser.version();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(error=>{console.error(error);process.exitCode=1;});
