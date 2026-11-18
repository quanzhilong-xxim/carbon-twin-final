/* Real scrolling, reading and character evidence; one isolated browser.
 * Never calls a synthesis, chat, generation or paid endpoint.
 */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const video=process.argv[2]==='video';
(async()=>{
 const out=path.resolve(__dirname,'../outputs/v10-explore/experience-'+(video?'video-':'stills-')+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const ctx=await browser.newContext({viewport:{width:1440,height:850},...(video?{recordVideo:{dir:out,size:{width:1440,height:850}}}:{})});
 const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3020/';
 const page=await ctx.newPage(),report={at:new Date().toISOString(),base,browser:browser.version(),environment:'Installed Chrome, visible window, '+base+', 1440x850',kind:video?'video':'stills',checks:[],errors:[],blocked:[],visibility:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),150000);
 await ctx.route('**/api/**',r=>{report.blocked.push(new URL(r.request().url()).pathname);return r.abort();});
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('console',m=>{if(m.text().startsWith('CT_RECORD_VISIBILITY:'))report.visibility.push(m.text());});
 const frame=async(name,locator)=>{if(!video){if(locator)await locator.screenshot({path:path.join(out,name+'.png')});else await page.screenshot({path:path.join(out,name+'.png')});}};
 const travel=async(selector)=>{const y=await page.locator(selector).evaluate(e=>e.getBoundingClientRect().top+window.scrollY-110);await page.evaluate(y=>window.scrollTo({top:y,behavior:'smooth'}),y);await page.waitForTimeout(video?1900:900);};
 try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('.city-formation canvas[data-city-prepared=true]').waitFor({timeout:35000});
  await page.waitForFunction(()=>document.querySelector('.city-formation canvas')?.dataset.architectureVersion==='coastal-v10',null,{timeout:25000});
  await page.bringToFront();
  await page.evaluate(()=>{console.info('CT_RECORD_VISIBILITY:'+document.visibilityState);document.addEventListener('visibilitychange',()=>console.info('CT_RECORD_VISIBILITY:'+document.visibilityState));});
  if(video){
   const started=Date.now();
   await page.locator('.dust-playback button').first().click();
   await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.995,null,{timeout:55000});
   report.playbackWallSeconds=(Date.now()-started)/1000;
   report.playbackState=await page.locator('.city-formation').evaluate(e=>({root:{...e.dataset},canvas:{...e.querySelector('canvas')?.dataset},visibility:document.visibilityState}));
   report.checks.push('real particle-to-city playback recorded; 18-second timeline, measured wall duration retained');
  }else{
   for(const [index,name] of [[0,'01-dust'],[1,'02-tree'],[3,'03-road'],[5,'04-city']]){
    await page.locator('.dust-story-steps button').nth(index).evaluate(e=>e.click());
    await page.waitForFunction(target=>Math.abs(Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)-target)<.003,[0,.22,.42,.58,.88,1][index]);
    await page.waitForTimeout(700);await frame(name);
   }
  }
  await travel('#city-journey');await frame('05-six-journeys',page.locator('#city-journey'));
  for(let i=0;i<6;i++){
   await page.locator('.city-atlas-card').nth(i).click();const dialog=page.locator('#city-chapter');await dialog.waitFor({state:'visible'});
   await page.waitForFunction(()=>{const i=document.querySelector('#city-chapter img');return i?.complete&&i.naturalWidth>0;});
   await page.waitForTimeout(video?850:150);await frame('06-chapter-'+(i+1),dialog);
   if(video){await dialog.locator('.city-chapter-lenses button').nth(1).click();await page.waitForTimeout(700);}
   await page.keyboard.press('Escape');
  }
  report.checks.push('six independent scene readers and observations');
  await travel('.explore-roles');await frame('07-role-entrances',page.locator('.explore-roles'));
  await travel('#knowledge');await frame('08-academic-transition',page.locator('#knowledge'));
  await travel('#identities');
  for(const [id,label] of [['student','学生'],['business','企业主'],['city','城市管理者']]){
   const card=page.locator(`.identity-unit[data-character="${id}"]`);await card.getByRole('button',{name:'选择身份：'+label,exact:true}).click();
   await card.locator(`canvas[data-avatar-identity="${id}"]`).waitFor();
   await card.getByRole('button',{name:id==='student'?'挥手':id==='business'?'致意':'引导',exact:true}).click();await page.waitForTimeout(video?1200:450);await frame('09-character-'+id,card);
   if(video){await card.getByRole('button',{name:'45°',exact:true}).click();await page.waitForTimeout(900);}
  }
  report.checks.push('three real GLBs, identity selection and role-specific articulated greetings');
  if(!video){
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(1000);
   await page.locator('.city-formation canvas[data-city-prepared=true]').waitFor();await page.locator('.dust-story-steps button').nth(5).evaluate(e=>e.click());
   await page.waitForFunction(()=>Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress)>.995);await page.waitForTimeout(700);
   await page.screenshot({path:path.join(out,'explore-complete-page.png'),fullPage:true,timeout:30000});
   report.pageSize=await page.evaluate(()=>({width:innerWidth,height:document.documentElement.scrollHeight}));
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.blocked,[]);report.passed=true;
 }catch(e){report.failure=String(e);report.failureState=await page.locator('.city-formation').evaluate(e=>({root:{...e.dataset},canvas:{...e.querySelector('canvas')?.dataset},visibility:document.visibilityState,bounds:JSON.stringify(e.getBoundingClientRect())})).catch(()=>null);process.exitCode=1;}
 finally{clearTimeout(timer);await ctx.close();if(video)report.video=await page.video()?.path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}
})().catch(e=>{console.error(String(e));process.exitCode=1;});
