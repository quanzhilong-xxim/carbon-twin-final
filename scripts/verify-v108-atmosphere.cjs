const {chromium,expect}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v108/internal/atmosphere-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage();page.setDefaultTimeout(30000);
 const report={out,version:browser.version(),errors:[],http:[],checks:[],events:[]},start=Date.now();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().split('?')[0]})});await context.route('**/api/**',r=>r.abort());
 const shot=async name=>{report.events.push({seconds:(Date.now()-start)/1000,name});await page.screenshot({path:path.join(out,name+'.png')})};
 try{
  const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3047').replace(/\/$/,'');report.base=base;await page.goto(base+'/simulator',{waitUntil:'domcontentloaded',timeout:60000});const hero=page.locator('.behaviour-intro');await hero.scrollIntoViewIfNeeded();await expect(hero.locator('.sakura-scene')).toHaveAttribute('data-ready','true',{timeout:60000});await page.waitForTimeout(1800);await shot('hero-evening');
  await hero.getByRole('button',{name:'小雨',exact:true}).click();await expect(hero.locator('canvas')).toHaveAttribute('data-story-weather','rain');await page.waitForTimeout(1600);await shot('hero-rain');
  await hero.getByRole('button',{name:'夜晚',exact:true}).click();await expect(hero.locator('canvas')).toHaveAttribute('data-story-time','night');await page.waitForTimeout(1600);await shot('hero-night');
  await hero.getByRole('button',{name:'清晨',exact:true}).click();await hero.getByRole('button',{name:'晴天',exact:true}).click();await page.waitForTimeout(1600);await shot('hero-morning');
  const lab=page.locator('#ecology-lab'),botanical=lab.locator('.botanical-diorama');await botanical.scrollIntoViewIfNeeded();await expect(lab.getByRole('button',{name:'清晨',exact:true})).toHaveAttribute('aria-pressed','true');await expect(lab.getByRole('button',{name:'晴天',exact:true})).toHaveAttribute('aria-pressed','true');report.checks.push('weather/time shared across prologue and ecology; independent rain/night controls');
  for(const [s,label] of [['spring','春'],['summer','夏'],['autumn','秋'],['winter','冬']]){await botanical.getByRole('button',{name:label,exact:true}).click();await expect(botanical.locator('canvas[data-season='+s+']')).toBeVisible({timeout:30000});await page.waitForTimeout(1200);await shot('botanical-'+s);}
  const controls=page.getByRole('navigation',{name:'当前故事章节'});
  // A locator click may scroll the sticky navigation's layout ancestor before
  // clicking, changing the current chapter. Click its actual visible position
  // as a pointer user does; keep the scroll and chapter assertions intact.
  const clickChapter=async name=>{const box=await controls.getByRole('button',{name,exact:true}).boundingBox();assert(box&&box.y>=0&&box.y+box.height<=900);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);};
  await clickChapter('下一章');await page.waitForTimeout(1600);await expect(controls).toHaveAttribute('data-current-chapter','4');await clickChapter('上一章');await page.waitForTimeout(1600);await expect(controls).toHaveAttribute('data-current-chapter','3');report.checks.push('previous/next chapter tracks real pointer click and scroll');
  const pasture=page.locator('#pasture-letter');await pasture.scrollIntoViewIfNeeded();
  for(const [i,label]of ['牧场','加工','冷链','消费'].entries()){await pasture.getByRole('navigation',{name:'乳品四节点'}).getByRole('button',{name:new RegExp(label)}).click();await expect(pasture.locator('canvas')).toHaveAttribute('data-story-state',String(i));await page.waitForTimeout(1400);await shot('milk-'+i);}
  await expect(controls).toHaveAttribute('data-current-chapter','8',{timeout:30000});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('carbontwin.behaviour.reading.v108')||'null')?.chapter==='pasture-letter');
  report.beforeReload=await page.evaluate(()=>({hash:location.hash,reading:localStorage.getItem('carbontwin.behaviour.reading.v108')}));
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'继续阅读',exact:true})).toBeVisible({timeout:30000});await page.getByRole('button',{name:'继续阅读',exact:true}).click();await page.waitForTimeout(1200);await expect(page.locator('.story-progress')).toHaveAttribute('data-current-chapter','8');report.checks.push('reading checkpoint survives reload and explicitly resumes');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;await shot('failure').catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
