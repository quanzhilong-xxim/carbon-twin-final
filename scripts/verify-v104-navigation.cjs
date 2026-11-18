/* Read-only retained-route smoke and actual identity mobile typography.
 * Isolated browser storage; every API call is blocked and counted.
 */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve('outputs/v10-explore/navigation-'+Date.now());await fs.mkdir(out,{recursive:true});
 const report={out,base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3044/',at:new Date().toISOString(),checks:[],errors:[],http:[],api:[],passed:false};
 const browser=await chromium.launch({channel:'chrome',headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});await ctx.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});
 const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().replace(/\?.*$/,'')})});const timer=setTimeout(()=>browser.close().catch(()=>{}),120000);
 try{
  await page.goto(report.base,{waitUntil:'domcontentloaded'});await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'身份视角'}).click();
  await page.locator('#identities').waitFor();
  for(const width of [1440,768,375]){
   await page.setViewportSize({width,height:960});await page.goto(report.base+'#identities',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
   await page.evaluate(()=>{const e=document.querySelector('#identities');scrollTo({top:e.getBoundingClientRect().top+scrollY-170,behavior:'instant'})});await page.waitForTimeout(600);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const h=await page.locator('#identities h2').boundingBox();report.checks.push({name:'identity navigation, complete heading and no overflow',width,heading:h});assert(h&&h.y>=150&&h.y+h.height<900,'identity heading clears fixed navigation');await page.screenshot({path:path.join(out,'identity-'+width+'.png')});
  }
  await page.setViewportSize({width:1440,height:960});
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'学术档案'}).click();await page.waitForURL('**/learn');await page.getByLabel('检索学术档案',{exact:true}).waitFor();report.checks.push({name:'real navigation to academic archive'});
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'行为沙盘'}).click();await page.waitForURL('**/simulator');await page.waitForTimeout(500);assert((await page.locator('body').innerText()).includes('沙盘'));await page.screenshot({path:path.join(out,'retained-simulator.png')});report.checks.push({name:'retained Behaviour Lab entry and visible content; simulation not rerun'});
  const response=await page.goto(report.base+'citylight/studio',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);await page.waitForTimeout(500);const text=await page.locator('body').innerText();assert(/光庭|CL-T01-V12|光之塔/.test(text));await page.screenshot({path:path.join(out,'retained-citylight.png')});report.checks.push({name:'retained original Light Court workbench route and identity; reduced-motion smoke only'});
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);assert.deepEqual(report.api,[]);report.passed=true;
 }catch(e){report.failure=String(e);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1}
 finally{clearTimeout(timer);await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
})().catch(e=>{console.error(e);process.exitCode=1});
