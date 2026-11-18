const {chromium,firefox,webkit}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {strict:assert}=require('node:assert');
const targetBrowser=process.argv[2]||'bundled';
if(!['bundled','chrome','msedge','firefox','webkit'].includes(targetBrowser))throw Error('Unsupported browser');
const channel=['chrome','msedge'].includes(targetBrowser)?targetBrowser:undefined;
const engine=targetBrowser==='firefox'?firefox:targetBrowser==='webkit'?webkit:chromium;
const out=path.resolve(__dirname,'../outputs/v10-explore/formation-stability-'+targetBrowser+'-'+Date.now());
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await engine.launch({channel,headless:process.env.CT_HEADFUL!=='1',args:targetBrowser==='bundled'?['--use-angle=d3d11','--ignore-gpu-blocklist']:[]});
 const context=await browser.newContext({viewport:{width:1200,height:850}});
 const page=await context.newPage(),errors=[],requests=[],checks=[];
 const timer=setTimeout(()=>browser.close().catch(()=>{}),120000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>requests.push({url:r.url().replace(/\?.*$/,''),error:r.failure()?.errorText}));
 const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3020/';
 await context.route('**/api/**',r=>r.abort());
 const report={time:new Date().toISOString(),base,browserVersion:browser.version(),headless:process.env.CT_HEADFUL!=='1',checks,errors,requests,environment:`${targetBrowser}, ${base}, 1200x850; API routes blocked`,passed:false};
 report.console=[];page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push(m.text().slice(0,1000));});
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.bringToFront();
  report.visibility=[];
  page.on('console',m=>{if(m.text().startsWith('CT_VISIBILITY:'))report.visibility.push(m.text())});
  await page.evaluate(()=>{console.info('CT_VISIBILITY:'+document.visibilityState);document.addEventListener('visibilitychange',()=>console.info('CT_VISIBILITY:'+document.visibilityState))});
  await page.locator('.city-formation canvas[data-rendered=true][data-city-prepared=true]').waitFor({timeout:40000});
  const canvas=page.locator('.city-formation canvas');
  const check=async(name,fn)=>{await fn();checks.push({name,passed:true});console.log('PASS '+name);};
  await check('initial scroll begins with particles',async()=>{await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)<.025);});
  const targets=[0,.22,.42,.58,.88,1],keys=['dust','tree','site','street','building','activate'];
  for(let i=0;i<6;i++){
   await page.locator('.dust-story-steps button').nth(i).evaluate(e=>e.click());
   await page.waitForFunction(p=>Math.abs(Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)-p)<.003,targets[i]);
   await check('chapter '+keys[i],async()=>{assert.equal(await page.locator('.city-formation').getAttribute('data-journey-stage'),keys[i]);assert.equal(await page.locator('.city-formation .scene-stage').getAttribute('data-mode'),'3d');});
   // The prior test exhausted the compositor while recording six full-page
   // screenshots and video. Record the real frames in video; capture the final
   // viewport once after functional assertions, without redundant readbacks.
  }
  await check('actual surface samples and citizens',async()=>{assert.equal(await canvas.getAttribute('data-city-surface-samples'),'10500');assert.equal(await canvas.getAttribute('data-road-surface-samples'),'3000');assert.equal(await canvas.getAttribute('data-citizens'),'12');});
  await page.locator('.formation-options summary').evaluate(e=>e.click());
  for(const time of ['morning','day','dusk','night']){
   await page.locator('.city-time-controls button').nth(['morning','day','dusk','night'].indexOf(time)).evaluate(e=>e.click());
   await check('time '+time,async()=>assert.equal(await page.locator('.city-formation').getAttribute('data-time'),time));
  }
  await page.locator('.city-time-controls button').nth(2).evaluate(e=>e.click());
  await check('25 building entries remain usable',async()=>{assert.equal(await page.locator('.formation-building-select option').count(),26);await page.getByLabel('浏览街区建筑').selectOption('6');await page.locator('.city-building-card').waitFor();await page.getByRole('button',{name:'关闭建筑信息'}).evaluate(e=>e.click());assert.equal(await page.locator('.city-building-card').count(),0);});
  await page.locator('.formation-options summary').evaluate(e=>e.click());
  await page.locator('.dust-playback button').nth(0).evaluate(e=>e.click());
  await page.waitForFunction(()=>{const p=Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress);return p>.08&&p<.5;});
  await page.locator('.dust-playback button').nth(0).evaluate(e=>e.click());
  const paused=Number(await canvas.getAttribute('data-city-target'));await page.waitForTimeout(700);
  await check('play and pause',async()=>assert(Math.abs(Number(await canvas.getAttribute('data-city-target'))-paused)<.01));
  await page.locator('.dust-playback button').nth(0).evaluate(e=>e.click());
  await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.995,null,{timeout:26000});
  await check('18 second growth completes in real 3D',async()=>assert.equal(await page.locator('.city-formation .scene-stage').getAttribute('data-mode'),'3d'));
  await check('no shader or graphics errors during normal operation',async()=>assert.deepEqual(report.console.filter(x=>/Shader Error|GL_INVALID|program not valid|Internal D3D11|CONTEXT_LOST/.test(x)),[]));
  await canvas.evaluate(e=>e.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator('.city-formation .scene-stage[data-mode=context-lost]').waitFor();
  await page.locator('.city-formation').getByRole('button',{name:'重试三维视图'}).click();
  await page.locator('.city-formation canvas[data-city-prepared=true]').waitFor({timeout:40000});
  await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.995);
  await check('manual recovery retains the selected formation stage',async()=>assert.equal(await page.locator('.city-formation .scene-stage').getAttribute('data-mode'),'3d'));
  report.renderer=await canvas.evaluate(e=>{const g=e.getContext('webgl2'),x=g?.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'unknown';});
  report.dataset=await canvas.evaluate(e=>({...e.dataset}));
  await page.screenshot({path:path.join(out,'city-complete.png'),timeout:25000});
  assert.deepEqual(errors,[]);report.passed=true;
 }catch(e){report.failure=String(e);report.failureState=await page.locator('.city-formation').evaluate(e=>({mode:e.querySelector('.scene-stage')?.dataset.mode,root:{...e.dataset},canvas:{...e.querySelector('canvas')?.dataset}})).catch(()=>null);console.error(String(e));process.exitCode=1;}
 finally{clearTimeout(timer);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));await context.close();await browser.close();console.log(JSON.stringify(report));}
})().catch(e=>{console.error(String(e));process.exitCode=1;});
