/* Local interaction and real GLB evidence; no synthesis/generation/API calls. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const versions={student:'v6',business:'v9',city:'v9'};
const out=path.resolve(__dirname,'../outputs/v10-explore/character-current-'+Date.now());
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
 const page=await ctx.newPage(),errors=[],checks=[],failed=[],cloud=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>failed.push({url:r.url().replace(/\?.*$/,''),reason:r.failure()?.errorText}));
 await page.route('**/api/tts',route=>{cloud.push(route.request().method());route.abort();});
 const timer=setTimeout(()=>browser.close().catch(()=>{}),110000);
 const result={at:new Date().toISOString(),checks,errors,failed,cloud,passed:false,versions,browserVersion:browser.version(),environment:'Installed Chrome, visible window, 1440x1000, existing local dev server'};
 try{
  await page.goto('http://127.0.0.1:3020/#identities',{waitUntil:'domcontentloaded'});
  await page.locator('#identities').scrollIntoViewIfNeeded();
  for(const [id,label] of [['student','学生'],['business','企业主'],['city','城市管理者']]){
   const card=page.locator(`.identity-unit[data-character="${id}"]`),canvas=card.locator('canvas');
   await card.getByRole('button',{name:'选择身份：'+label,exact:true}).click();
   await canvas.waitFor({timeout:20000});
   await page.waitForFunction(({id,version})=>document.querySelector(`canvas[data-avatar-identity="${id}"]`)?.dataset.assetVersion===version,{id,version:versions[id]});
   await page.waitForTimeout(400);
   assert.equal(await card.getByRole('button',{name:'选择身份：'+label,exact:true}).getAttribute('aria-pressed'),'true');
   checks.push({name:id+' uses versioned real GLB and selects identity',passed:true,source:await canvas.getAttribute('data-model-source')});
   for(const [view,name] of [['front','正面'],['left','左侧'],['right','右侧'],['threequarter','45°'],['back','背面'],['detail','面部']]){
    await card.getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(({id,view})=>document.querySelector(`canvas[data-avatar-identity="${id}"]`)?.dataset.avatarView===view,{id,view});
    await card.screenshot({path:path.join(out,`${id}-${view}.png`)});
   }
   await card.getByRole('button',{name:'正面',exact:true}).click();
   for(const [action,name] of [['greeting','挥手'],['blink','眨眼'],['nod','点头'],['listening',id==='student'?'看笔记':'看数据'],['guide','介绍']]){
    await card.getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(({id,action})=>document.querySelector(`canvas[data-avatar-identity="${id}"]`)?.dataset.action===action,{id,action});
    checks.push({name:id+' action '+action,passed:true});
    if(action==='greeting'){
     const before=await canvas.getAttribute('data-elbow');await page.waitForTimeout(350);
     assert.notEqual(await canvas.getAttribute('data-elbow'),before,'elbow transform must change across live frames');
     assert(Number(await canvas.getAttribute('data-elbow')) < -1.6,'greeting must use a bent elbow');
     await card.screenshot({path:path.join(out,`${id}-wave.png`)});
    }
   }
   result[id]=await canvas.evaluate(c=>({...c.dataset}));
  }
  await page.screenshot({path:path.join(out,'identities.png')});
  const selected=await page.locator('.identity-card[aria-pressed=true]').getAttribute('aria-label');
  await page.reload();await page.locator('#identities').scrollIntoViewIfNeeded();
  await page.waitForFunction(selected=>document.querySelector('.identity-card[aria-pressed=true]')?.getAttribute('aria-label')===selected,selected);checks.push({name:'identity survives page reload',passed:true});
  await page.locator('.explore-roles').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'role-entrances.png')});
  assert.equal(await page.locator('.role-preview-portrait').count(),3);
  assert.deepEqual(errors,[]);assert.deepEqual(cloud,[]);result.passed=true;
 }catch(e){result.failure=String(e);process.exitCode=1;}
 finally{clearTimeout(timer);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));await ctx.close();await browser.close();console.log(JSON.stringify(result));}
})().catch(e=>{console.error(String(e));process.exitCode=1;});
