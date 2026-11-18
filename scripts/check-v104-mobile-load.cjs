/* Focused diagnosis after the previous long suite timed out. No API calls. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve('outputs/v10-explore/mobile-load-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const result={base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3037/',version:process.env.CT_CHARACTER_VERSION||'v104b',out,errors:[],http:[],api:[],roles:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),100000);
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await ctx.route('**/api/**',r=>{result.api.push(new URL(r.request().url()).pathname);return r.abort()});
  const page=await ctx.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400)result.http.push({status:r.status(),url:r.url().replace(/\?.*$/,'')})});
  await page.goto(result.base+'#identities',{waitUntil:'domcontentloaded'});
  // Start with the role that failed, then exercise the same-context swap.
  for(const [id,label] of [['city','城市管理者'],['student','学生'],['business','企业主'],['city','城市管理者']]){
   const started=Date.now(),card=page.locator(`.identity-unit[data-character="${id}"]`);
   await card.getByRole('button',{name:'选择身份：'+label,exact:true}).click();
   await page.waitForFunction(({id,version})=>{const c=document.querySelector(`canvas[data-avatar-identity="${id}"]`);return c?.dataset.assetQuality==='lite'&&c?.dataset.assetVersion===version},{id,version:result.version},{timeout:20000});
   const data=await card.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2')||c.getContext('webgl');const ext=g?.getExtension('WEBGL_debug_renderer_info');return {data:{...c.dataset},renderer:ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):null}});
   result.roles.push({id,ms:Date.now()-started,...data});await card.screenshot({path:path.join(out,id+'-lite.png')});
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.identity-unit[data-character="city"]').getByRole('button',{name:'进入角色展厅',exact:false}).click();
  await page.waitForFunction(()=>document.querySelector('.character-room canvas')?.dataset.assetQuality==='lite');
  await page.getByRole('dialog').screenshot({path:path.join(out,'city-room.png')});
  assert.deepEqual(result.http,[]);assert.deepEqual(result.errors,[]);assert.deepEqual(result.api,[]);result.passed=true;await ctx.close();
 }catch(e){result.failure=String(e);process.exitCode=1}
 finally{clearTimeout(timer);await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))}
})().catch(e=>{console.error(e);process.exitCode=1});
