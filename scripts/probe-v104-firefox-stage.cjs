/* One bounded reproduction with actual UI actions and failure state. No APIs. */
const {firefox}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const out=path.resolve('outputs/v10-explore/firefox-stage-probe-'+Date.now());await fs.mkdir(out,{recursive:true});
 const report={at:new Date().toISOString(),base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3043/',events:[],errors:[],http:[],api:[],passed:false};
 const browser=await firefox.launch({headless:false}),ctx=await browser.newContext({viewport:{width:1200,height:850}});report.version=browser.version();
 await ctx.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});const page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().replace(/\?.*$/,'')})});
 const state=()=>page.locator('.city-formation').evaluate(e=>({mode:e.querySelector('.scene-stage')?.dataset.mode,canvas:{...e.querySelector('canvas')?.dataset},visibility:document.visibilityState,rect:JSON.stringify(e.getBoundingClientRect())}));
 const timer=setTimeout(()=>browser.close().catch(()=>{}),85000);
 try{
  await page.goto(report.base,{waitUntil:'domcontentloaded',timeout:20000});await page.bringToFront();
  await page.locator('.city-formation canvas[data-rendered=true]').waitFor({timeout:30000});report.events.push({step:'initial render',state:await state()});
  await page.locator('.dust-story-steps button').nth(5).click();report.events.push({step:'real stage six click',state:await state()});
  await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.99,null,{timeout:25000});
  report.events.push({step:'stage six complete',state:await state()});report.passed=true;
 }catch(e){report.failure=String(e);report.failureState=await state().catch(()=>null);process.exitCode=1}
 finally{await page.screenshot({path:path.join(out,'observed-stage.png')}).catch(()=>{});clearTimeout(timer);await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}))}
})().catch(e=>{console.error(e);process.exitCode=1});
