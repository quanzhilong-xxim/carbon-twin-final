const {chromium,webkit,firefox,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:60000});
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3073',engine=process.env.CT_BROWSER||'chromium';
const out=path.resolve(process.env.CT_EVIDENCE_DIR||`outputs/v123/district-${engine}`);
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const report={base,engine,at:new Date().toISOString(),checks:[],performance:[],errors:[],http:[],shaderErrors:[],passed:false};
 const browser=await({chromium,webkit,firefox}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{},...engine==='firefox'&&process.env.CT_FIREFOX_EXECUTABLE?{executablePath:process.env.CT_FIREFOX_EXECUTABLE}:{}});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 await context.route('**/api/**',route=>route.abort());
 const page=await context.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',message=>{if(/THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text()))report.shaderErrors.push(message.text());});
 page.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
 const check=(name,evidence)=>report.checks.push({name,evidence});
 const sample=async(canvas,name)=>{
  const read=()=>canvas.evaluate(c=>({at:performance.now(),frames:Number(c.dataset.sceneFrames),data:{...c.dataset},lost:c.getContext('webgl2').isContextLost()}));
  const a=await read();await page.waitForTimeout(3000);const b=await read();
  assert(Number.isFinite(a.frames)&&Number.isFinite(b.frames)&&b.frames>a.frames);
  const fps=(b.frames-a.frames)*1000/(b.at-a.at);report.performance.push({scene:name,fps:Number(fps.toFixed(2)),minimum:24,passed:fps>=24,frames:b.frames-a.frames,seconds:(b.at-a.at)/1000,triangles:b.data.sceneTriangles,drawCalls:b.data.drawCalls});
  assert.equal(b.lost,false);return b.data;
 };
 try{
  await page.goto(base+'/simulator#two-lives',{waitUntil:'domcontentloaded',timeout:90000});
  const chapter=page.locator('#two-lives'),canvas=chapter.locator('canvas');
  await chapter.locator('.story-wide-scene').scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-story-scene','buildings');
  await page.waitForFunction(()=>Number(document.querySelector('#two-lives canvas')?.dataset.sceneTriangles)>0);
  await page.waitForTimeout(1500);await page.mouse.move(4,4);
  check('real-neighborhood-and-reflective-facade',await sample(canvas,'comparison'));
  await chapter.locator('.story-wide-scene').screenshot({path:path.join(out,'01-comparison-neighborhood.png')});
  for(const [label,view]of [['A / 走近住宅','home'],['B / 走近办公','office'],['全景对照','both']]){
   await chapter.getByRole('button',{name:label,exact:true}).click();
   await expect(canvas).toHaveAttribute('data-building-view',view);await page.waitForTimeout(900);
   await chapter.locator('.story-wide-scene').screenshot({path:path.join(out,`02-${view}.png`)});
  }
  check('three-original-camera-controls',true);
  await chapter.getByRole('button',{name:'按使用人数',exact:true}).click();
  await expect(chapter.locator('.building-comparison')).toContainText('653.63');
  await page.locator('#building-0-intensity').fill('90');
  await expect(chapter.locator('.building-comparison')).toContainText('1307.25');
  check('context-does-not-change-AB-calculation',{formula:'100 m² × 90 kWh/m²/year × 0.581 / 4 = 1307.25 kg/person/year'});
  await page.locator('#building-0-intensity').fill('45');
  const city=page.locator('#digital-room'),cityCanvas=city.locator('canvas');
  await city.locator('.twin-stage-wrap').scrollIntoViewIfNeeded();
  await expect(city.locator('.twin-canvas')).toHaveAttribute('data-experience','orbit',{timeout:90000});
  await city.getByRole('button',{name:'清晨',exact:true}).click();
  await expect(cityCanvas).toHaveAttribute('data-story-time','morning');await page.waitForTimeout(2000);
  await expect(cityCanvas).toHaveAttribute('data-district-architecture','retained-coastal');
  const districtData=await sample(cityCanvas,'city');
  assert.equal(districtData.districtBuildings,'25');assert.equal(districtData.courtyardTrees,'30');assert.equal(districtData.pedestrians,'8');assert.equal(districtData.skylineBuildings,'38');
  check('25-buildings-30-trees-8-pedestrians-and-reflected-waterfront',districtData);
  if(process.env.CT_FINANCIAL_REVIEW==='1'){
   await expect(cityCanvas).toHaveAttribute('data-skyline-revision','v123-financial');
   if(process.env.CT_SKYLINE_CRAFT==='1')await expect(cityCanvas).toHaveAttribute('data-skyline-design','light-court-materials-five-forms');
   await expect(cityCanvas).toHaveAttribute('data-district-reflection','live-cube-128');
   const before=await cityCanvas.getAttribute('data-reflection-captures');await page.waitForTimeout(800);
   assert.equal(await cityCanvas.getAttribute('data-reflection-captures'),before,'Stationary lighting must reuse its real cube capture');
   check('articulated-skyline-and-cached-real-district-reflection',{captures:before});
  }
  await city.locator('.twin-stage-wrap').screenshot({path:path.join(out,'03-city-morning.png')});
  await city.getByRole('button',{name:'夜晚',exact:true}).click();
  await expect(cityCanvas).toHaveAttribute('data-story-time','night');await page.waitForTimeout(1800);
  if(process.env.CT_FINANCIAL_REVIEW==='1')await expect.poll(()=>cityCanvas.getAttribute('data-reflection-captures')).not.toBe(districtData.reflectionCaptures);
  await city.locator('.twin-stage-wrap').screenshot({path:path.join(out,'04-city-night.png')});
  check('day-night-retains-live-context',await cityCanvas.evaluate(c=>({time:c.dataset.storyTime,lost:c.getContext('webgl2').isContextLost()})));
  await page.setViewportSize({width:390,height:844});
  await city.locator('.twin-stage-wrap').scrollIntoViewIfNeeded();await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const navigationBounds=await city.locator('.twin-director').boundingBox(),surfaceBounds=await city.locator('.twin-canvas').boundingBox();
  assert(navigationBounds&&surfaceBounds&&navigationBounds.y+navigationBounds.height<=surfaceBounds.y+1,'Mobile navigation must occupy its own row above the canvas');
  for(const button of await city.locator('.twin-director nav button').all()){
   const bounds=await button.boundingBox();assert(bounds&&bounds.height>=44,'Mobile navigation needs 44px touch targets');
  }
  assert.equal(await city.locator('.landmark-label:visible').count(),0,'The same mobile entrances are in navigation, without overlapping projected labels');
  check('mobile-navigation-above-canvas-with-44px-targets',true);
  await city.locator('.twin-stage-wrap').screenshot({path:path.join(out,'05-city-mobile.png')});
  check('mobile-no-horizontal-overflow',true);
  await chapter.locator('.story-wide-scene').scrollIntoViewIfNeeded();await expect(chapter.locator('.scene-stage')).toHaveAttribute('data-mode','3d');
  await expect(canvas).toHaveAttribute('data-story-scene','buildings');
  await page.waitForFunction(()=>Number(document.querySelector('#two-lives canvas')?.dataset.sceneTriangles)>10000,null,{timeout:60000});
  await chapter.locator('.story-wide-scene').screenshot({path:path.join(out,'06-comparison-mobile.png')});
  await page.reload({waitUntil:'domcontentloaded'});await chapter.locator('.building-comparison').scrollIntoViewIfNeeded();
  await expect(chapter.locator('.building-comparison')).toContainText('653.63');
  check('comparison-inputs-survive-refresh',true);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);assert.deepEqual(report.shaderErrors,[]);
  report.functionalPassed=true;report.performancePassed=report.performance.every(p=>p.passed);report.passed=report.functionalPassed&&report.performancePassed;
  if(!report.passed)process.exitCode=1;
 }catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.finished=new Date().toISOString();report.version=browser.version();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,checks:report.checks.length,performance:report.performance,failure:report.failure}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
