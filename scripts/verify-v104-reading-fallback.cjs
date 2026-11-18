/* Alternative Firefox path: actual reduced-motion preference, no UA spoof,
 * no forced API success, no hidden CSS. Full GPU failure remains separately.
 */
const {firefox}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve('outputs/v10-explore/firefox-reading-'+Date.now());await fs.mkdir(out,{recursive:true});
 const report={out,at:new Date().toISOString(),base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3043/',mode:'actual prefers-reduced-motion browser context',checks:[],errors:[],http:[],api:[],passed:false};
 const browser=await firefox.launch({headless:process.env.CT_FF_HEADLESS==='1'}),ctx=await browser.newContext({viewport:{width:1200,height:850},reducedMotion:'reduce'});report.browser=browser.version();report.headless=process.env.CT_FF_HEADLESS==='1';
 await ctx.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});const page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().replace(/\?.*$/,'')})});const timer=setTimeout(()=>browser.close().catch(()=>{}),85000);
 try{
  await page.goto(report.base,{waitUntil:'domcontentloaded'});
  await page.locator('.city-formation .scene-stage[data-mode=lite]').waitFor();assert.equal(await page.locator('.city-formation .scene-stage>div>canvas').count(),0);
  for(let i=0;i<6;i++){await page.locator('.dust-story-steps button').nth(i).click();await page.waitForFunction(i=>document.querySelectorAll('.dust-story-steps button')[i]?.getAttribute('aria-current')==='step',i)}
  report.checks.push('six real teaching stages in reduced-motion fallback');await page.screenshot({path:path.join(out,'reduced-city.png')});
  const card=page.locator('.city-atlas-card').first();await card.click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert(await card.evaluate(e=>e===document.activeElement));report.checks.push('journey opens, Escape closes and returns focus');
  await page.goto(report.base+'learn',{waitUntil:'domcontentloaded'});await page.getByLabel('检索学术档案',{exact:true}).fill('Ｓｃｏｐｅ');assert(await page.locator('.archive-grid .archive-entry').count()>0);report.checks.push('normalized academic search usable');
  await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'reading-mobile.png')});report.checks.push('375px reduced-motion reading has no overflow');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);assert.deepEqual(report.api,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1}
 finally{clearTimeout(timer);await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
})().catch(e=>{console.error(e);process.exitCode=1});
