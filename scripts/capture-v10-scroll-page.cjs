/* Capture the real visible page in consecutive viewports. Scroll-triggered
 * content is allowed to finish entering; no CSS or application state is faked.
 * The stitched artifact is explicitly labelled as a viewport composite. */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 const out=path.resolve(__dirname,'../outputs/v10-explore/scroll-page-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:850}}),page=await ctx.newPage();
 const report={out,base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3031/',method:'Consecutive actual viewport captures, fixed navigation included once; composited without changing page styles',errors:[],api:[],frames:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),90000);
 await ctx.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});page.on('pageerror',e=>report.errors.push(String(e)));
 try{
  await page.goto(report.base,{waitUntil:'domcontentloaded'});await page.locator('.city-formation canvas[data-city-prepared=true]').waitFor({timeout:30000});
  await page.locator('.dust-story-steps button').nth(5).click();await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.995);await page.waitForTimeout(800);
  // Move the real pointer outside the viewport so a custom hover cursor is
  // not repeated at every seam of the successive viewport composite.
  await page.mouse.move(-40,-40);await page.waitForTimeout(150);
  const first=await page.screenshot();await fs.writeFile(path.join(out,'current-home.png'),first);
  const height=await page.evaluate(()=>document.documentElement.scrollHeight),composite=[{input:first,top:0,left:0}];
  for(let cursor=850;cursor<height;){
   const scroll=Math.min(cursor-110,height-850);await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),scroll);await page.waitForTimeout(850);
   const actual=await page.evaluate(()=>Math.round(scrollY)),start=cursor-actual,length=Math.min(850-start,height-cursor);
   if(length<=0)throw Error('Viewport coverage stalled');
   const buffer=await page.screenshot(),crop=await sharp(buffer).extract({left:0,top:start,width:1440,height:length}).png().toBuffer();
   const file=`viewport-${report.frames.length+1}.png`;await fs.writeFile(path.join(out,file),buffer);composite.push({input:crop,top:cursor,left:0});report.frames.push({file,scroll:actual,capturedDocumentTop:cursor,height:length});cursor+=length;
  }
  await sharp({create:{width:1440,height,channels:3,background:'#081f15'}}).composite(composite).png().toFile(path.join(out,'explore-visible-page.png'));
  const before=await sharp('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild/CP-00/hero-before.png').resize({width:800,height:480,fit:'contain',background:'#0c2119'}).toBuffer();
  const after=await sharp(first).resize({width:800,height:480,fit:'contain',background:'#0c2119'}).toBuffer();
  const labels=Buffer.from('<svg width="1600" height="52"><rect width="1600" height="52" fill="#10261d"/><g font-family="Segoe UI, sans-serif" font-size="20" fill="#e8eddc"><text x="24" y="34">BEFORE · Verified CP-00 browser capture</text><text x="824" y="34">CURRENT · Actual browser capture</text></g></svg>');
  await sharp({create:{width:1600,height:532,channels:3,background:'#10261d'}}).composite([{input:labels,top:0,left:0},{input:before,top:52,left:0},{input:after,top:52,left:800}]).png().toFile(path.join(out,'home-before-current.png'));
  report.height=height;report.passed=report.errors.length===0&&report.api.length===0;
 }catch(e){report.failure=String(e);process.exitCode=1}
 finally{clearTimeout(timer);await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
})().catch(e=>{console.error(String(e));process.exitCode=1});
