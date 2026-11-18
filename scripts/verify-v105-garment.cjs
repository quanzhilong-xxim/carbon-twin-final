/* Isolated real-browser garment study, including failed and stalled assets.
 * API requests are blocked: this test never synthesizes voice or calls AI.
 */
const {chromium,firefox,webkit}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3045/';
(async()=>{
 const out=path.resolve('outputs/v10-explore/v105-garment-'+Date.now());await fs.mkdir(out,{recursive:true});
 const engine=process.env.CT_BROWSER||'chrome';
 const report={at:new Date().toISOString(),base,out,engine,cases:[],api:[],passed:false};
 const browser=await (engine==='firefox'?firefox:engine==='webkit'?webkit:chromium).launch(engine==='chrome'?{channel:'chrome',headless:true}:{headless:true});
 async function check(name,viewport,options={}){
  const item={name,viewport,errors:[],http:[],checks:[]};report.cases.push(item);
  const ctx=await browser.newContext({viewport,reducedMotion:options.model?'no-preference':'reduce',recordVideo:options.video?{dir:out,size:{width:1440,height:900}}:undefined});
  await ctx.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});
  if(options.noGL)await ctx.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}});
  if(options.failed)await ctx.route('**/models/clothing/tshirt.glb',r=>r.fulfill({status:404,body:'deliberate asset failure'}));
  if(options.stalled)await ctx.route('**/models/clothing/tshirt.glb',()=>new Promise(()=>{}));
  const page=await ctx.newPage();page.on('pageerror',e=>item.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)item.http.push({status:r.status(),url:new URL(r.url()).pathname})});
  try{
   const response=await page.goto(base+'learn',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
   const section=page.locator('.garment-lifecycle');await section.waitFor();await section.scrollIntoViewIfNeeded();
   if(options.stalled){await section.getByRole('status').filter({hasText:'超过 15 秒'}).waitFor({timeout:25000});item.checks.push('stalled download switches to usable structure view after bounded wait');}
   else if(options.failed||options.noGL){await section.locator('.stage-fallback .textile-diagram').waitFor({timeout:20000});item.checks.push('failed asset / unavailable WebGL shows interactive textile fallback');}
   else if(options.model){await section.locator('canvas[data-fabric-study]').waitFor({timeout:25000});item.renderer=await section.locator('canvas').getAttribute('data-renderer');await section.getByRole('status').filter({hasText:'已就绪'}).waitFor();for(const [label,index] of [['侧面',1],['背面',2],['正面',0]]){await section.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(i=>document.querySelector('.garment-lifecycle canvas')?.dataset.garmentAngle===String(i),index);await section.locator('canvas[data-fabric-study]').screenshot({path:path.join(out,`glb-view-${index}.png`)});}item.checks.push('real GLB renders and three camera views update');await section.getByRole('button',{name:'结构观察',exact:true}).click();}
   await section.locator('.textile-diagram').waitFor();
   for(const fabric of ['棉','聚酯','羊毛','牛仔斜纹']){
    await section.getByRole('button',{name:fabric,exact:true}).click();
    for(const scale of ['经纬织物','加捻纱线','纤维束']){await section.getByRole('button',{name:new RegExp(scale)}).click();assert(await section.getByRole('img',{name:new RegExp(fabric+'的'+scale)}).isVisible());}
   }
   item.checks.push('all four materials × three structure scales respond');
   const stages=section.getByRole('group',{name:'服装生命周期阶段'}).getByRole('button');
   for(let i=0;i<9;i++){await stages.nth(i).click();assert.equal(await stages.nth(i).getAttribute('aria-pressed'),'true');assert.equal(await section.locator('.lifecycle-note h3').innerText(),(await stages.nth(i).innerText()).replace(/^\d+\s*/,''));}
   await section.getByRole('button',{name:'展开核算所需数据'}).click();assert.match(await section.locator('.lifecycle-data-needs').innerText(),/去向、回收率/);
   await section.getByRole('button',{name:'上一阶段',exact:true}).click();assert.equal(await section.locator('.lifecycle-note h3').innerText(),'穿着洗护');
   item.checks.push('all nine stages, data requirements and previous/next work');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
   item.layout=await section.locator('.garment-research-grid').evaluate(e=>({width:e.clientWidth,columns:getComputedStyle(e).gridTemplateColumns,children:[...e.children].map(c=>({width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}))}));
   await section.screenshot({path:path.join(out,name+'.png')});
   if(!options.failed&&!options.noGL)assert.deepEqual(item.errors,[]);
   const unexpected=item.http.filter(r=>!options.failed||r.url!=='/models/clothing/tshirt.glb');assert.deepEqual(unexpected,[]);item.passed=true;
  }catch(e){item.failure=String(e);await page.screenshot({path:path.join(out,name+'-failure.png')}).catch(()=>{});throw e;}
  finally{if(options.video){const video=page.video();await page.close();item.video=await video.path();}await ctx.close();}
 }
 try{
  for(const [width,height] of [[1366,768],[1440,900],[1920,1080],[390,844]])await check('reading-'+width,{width,height});
  await check('real-model',{width:1440,height:900},{model:true,video:true});
  await check('webgl-disabled',{width:1440,height:900},{model:true,noGL:true});
  await check('model-404',{width:1440,height:900},{model:true,failed:true});
  await check('model-stalled',{width:1440,height:900},{model:true,stalled:true});
  assert.deepEqual(report.api,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;}
 finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
