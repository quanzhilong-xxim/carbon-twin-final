/* Consecutive real viewports, retaining raw frames and navigation once.
 * No CSS/state injection. Isolated browser storage and no paid/API requests.
 */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 const route=process.argv[2]||'learn',base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3042/',out=path.resolve('outputs/v10-explore/page-'+route+'-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false}),ctx=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
 const page=await ctx.newPage(),report={at:new Date().toISOString(),base,route,out,method:'Real consecutive viewports; fixed navigation retained once; all originals saved. No page CSS hidden or animation state faked.',errors:[],http:[],api:[],frames:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),150000);await ctx.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().replace(/\?.*$/,'')})});
 try{
  await page.goto(base+(route==='learn'?'learn':'#identities'),{waitUntil:'domcontentloaded'});
  if(route==='learn')await page.waitForFunction(()=>document.querySelector('.library-hero-world canvas')?.dataset.libraryReady==='true',null,{timeout:30000});
  else{
   const card=page.locator('.identity-unit[data-character=student]');await card.getByRole('button',{name:'选择身份：学生',exact:true}).click();await card.locator('canvas').waitFor();
  }
  await page.waitForTimeout(900);await page.mouse.move(-30,-30);
  if(route==='identities'){
   await page.evaluate(()=>{const e=document.querySelector('#identities');scrollTo({top:e.getBoundingClientRect().top+scrollY-120,behavior:'instant'})});await page.waitForTimeout(600);
   await page.screenshot({path:path.join(out,'identities-desktop.png')});
   await page.locator('#identities').screenshot({path:path.join(out,'identities-section.png')});
  }else{
   await page.screenshot({path:path.join(out,'academic-hero.png')});
   const height=await page.evaluate(()=>document.documentElement.scrollHeight),parts=[];let cursor=0;
   while(cursor<height){
    const wanted=cursor===0?0:Math.min(cursor-110,height-960);await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),wanted);await page.waitForTimeout(800);
    const actual=await page.evaluate(()=>Math.round(scrollY)),top=cursor-actual,length=Math.min(960-top,height-cursor);
    if(length<=0)throw Error('Capture coverage stalled');
    const raw=await page.screenshot(),file='viewport-'+report.frames.length+'.png';await fs.writeFile(path.join(out,file),raw);
    const crop=await sharp(raw).extract({left:0,top,width:1440,height:length}).png().toBuffer();parts.push({input:crop,top:cursor,left:0});report.frames.push({file,scroll:actual,documentTop:cursor,height:length});cursor+=length;
   }
   await sharp({create:{width:1440,height,channels:3,background:'#10271d'}}).composite(parts).png().toFile(path.join(out,'academic-visible-page.png'));report.height=height;
  }
  report.passed=report.errors.length===0&&report.http.length===0&&report.api.length===0;
 }catch(e){report.failure=String(e);process.exitCode=1}
 finally{clearTimeout(timer);await ctx.close();report.video=await page.video()?.path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
})().catch(e=>{console.error(e);process.exitCode=1});
