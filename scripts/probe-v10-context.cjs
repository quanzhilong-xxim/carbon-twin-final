/* One bounded context-loss/restore exercise in a dedicated browser window. */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(__dirname,'../outputs/v10-explore/context-recovery-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false}),page=await browser.newPage({viewport:{width:1200,height:850}});
 const report={at:new Date().toISOString(),version:browser.version(),environment:'Installed Chrome, visible window, development server',errors:[],checks:[],paidCalls:0,passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),70000);page.on('pageerror',e=>report.errors.push(String(e)));
 await page.route('**/api/**',r=>r.abort());
 try{
  await page.goto('http://127.0.0.1:3020',{waitUntil:'domcontentloaded'});
  const canvas=page.locator('.city-formation canvas');await page.locator('.city-formation canvas[data-city-prepared=true]').waitFor({timeout:30000});
  await page.locator('.dust-story-steps button').nth(5).evaluate(e=>e.click());
  await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.995);
  await canvas.evaluate(c=>{c.dataset.recoveryIdentity='original-context';const gl=c.getContext('webgl2');window.__ctRecoveryExtension=gl.getExtension('WEBGL_lose_context');window.__ctRecoveryExtension.loseContext();});
  await page.locator('.city-formation .scene-stage[data-mode=context-lost]').waitFor();report.checks.push('context loss exposes a usable recovery control');
  await page.waitForTimeout(250);await page.evaluate(()=>window.__ctRecoveryExtension.restoreContext());
  await page.locator('.city-formation .scene-stage[data-mode="3d"]').waitFor({timeout:15000});
  assert.equal(await canvas.getAttribute('data-recovery-identity'),'original-context');report.checks.push('automatic restore retains the original canvas');
  await page.waitForTimeout(1500);assert.equal(await page.locator('.city-formation .scene-stage').getAttribute('data-mode'),'3d');
  assert(Number(await canvas.getAttribute('data-city-progress'))>.995);report.checks.push('restored GPU scene retains the chosen stage without remount loop');
  await page.locator('.dust-story-steps button').nth(1).evaluate(e=>e.click());
  await page.waitForFunction(()=>Math.abs(Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)-.22)<.003);report.checks.push('restored frame loop responds to a new chapter');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;}
 finally{clearTimeout(timer);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({out,...report}));}
})().catch(e=>{console.error(String(e));process.exitCode=1;});
