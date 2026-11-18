/* Serial checks using existing browser binaries and the production preview.
 * All API paths are blocked. A labelled fallback is reported as a fallback.
 */
const {firefox,webkit}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3030/';
(async()=>{
 const out=path.resolve(__dirname,'../outputs/v10-explore/compat-production-'+Date.now());await fs.mkdir(out,{recursive:true});
 const reports=[];
 const selected=process.env.CT_COMPAT_ENGINES?.split(',');
 for(const [name,engine]of [['firefox',firefox],['webkit',webkit]].filter(([name])=>!selected||selected.includes(name))){
  const report={name,at:new Date().toISOString(),base,checks:[],errors:[],api:[],passed:false};let browser;
  try{
   browser=await engine.launch({headless:false,timeout:15000});report.version=browser.version();
   const timer=setTimeout(()=>browser.close().catch(()=>{}),85000);
   try{
    const ctx=await browser.newContext({viewport:{width:1200,height:850}});await ctx.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});
    const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
    await page.goto(base,{waitUntil:'domcontentloaded',timeout:20000});
    await page.locator('.city-formation canvas[data-rendered=true]').waitFor({timeout:30000});
    await page.locator('.dust-story-steps button').nth(5).evaluate(b=>b.click());
    await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.99,null,{timeout:20000});
    await page.waitForFunction(()=>{const d=document.querySelector('.city-formation canvas')?.dataset;return d?.architectureVersion==='coastal-v10'&&Number(d.citySurfaceMeshes)>0},null,{timeout:25000});
    report.formation=await page.locator('.city-formation').evaluate(e=>({mode:e.querySelector('.scene-stage')?.dataset.mode,canvas:{...e.querySelector('canvas')?.dataset}}));
    await page.screenshot({path:path.join(out,name+'-city.png')});report.checks.push('sixth formation stage reachable');
    await page.locator('#city-journey').scrollIntoViewIfNeeded();await page.locator('.city-atlas-card').nth(0).click();await page.getByRole('dialog').waitFor();
    assert(await page.getByRole('dialog').locator('h2').innerText());await page.keyboard.press('Escape');report.checks.push('journey opens and Escape closes');
    await page.locator('#identities').scrollIntoViewIfNeeded();const card=page.locator('.identity-unit[data-character="student"]');await card.getByRole('button',{name:'选择身份：学生',exact:true}).click();
    await page.waitForFunction(version=>document.querySelector('canvas[data-avatar-identity=student]')?.dataset.assetVersion===version,process.env.CT_CHARACTER_VERSION||'v10',{timeout:25000});
    report.character=await card.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info');return {dataset:{...c.dataset},renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable'}});
    await card.getByRole('button',{name:'挥手',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas[data-avatar-identity=student]')?.dataset.motion==='student-greeting');report.checks.push('real character and role gesture');
    await card.screenshot({path:path.join(out,name+'-character.png')});
    await card.getByRole('button',{name:'进入角色展厅',exact:false}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');report.checks.push('character room opens and closes');
    await page.setViewportSize({width:375,height:812});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.checks.push('375px layout has no overflow');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.api,[]);report.passed=true;
   }finally{clearTimeout(timer);await browser.close()}
  }catch(e){report.failure=String(e);if(browser)await browser.close().catch(()=>{})}
  reports.push(report);await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({out,reports,passed:reports.every(r=>r.passed)},null,2));if(reports.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
