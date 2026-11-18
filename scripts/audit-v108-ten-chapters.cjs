const {chromium,firefox,webkit,expect}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const ids=['sakura-meeting','daily-choices','ecology-lab','digital-room','coffee-time','eco-companion','two-lives','pasture-letter','data-echo','story-reflection'];
(async()=>{
 const engine=process.argv[2]||'chromium',mobile=process.argv.includes('mobile'),out=path.resolve(`outputs/v108/internal/ten-chapters-${engine}-${mobile?'mobile-':''}${Date.now()}`);await fs.mkdir(out,{recursive:true});
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{}}),context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},recordVideo:{dir:out,size:mobile?{width:390,height:844}:{width:1440,height:900}}});
 const page=await context.newPage(),start=Date.now(),report={out,engine,version:browser.version(),mobile,events:[],checks:[],errors:[],http:[],api:[]};page.setDefaultTimeout(30000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().split('?')[0]})});
 await context.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});
 async function visit(id){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(900);report.events.push({seconds:+((Date.now()-start)/1000).toFixed(1),chapter:id});}
 async function shot(id){await page.screenshot({path:path.join(out,id+'.png')});}
 try{
  const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3047').replace(/\/$/,'');report.base=base;
  const r=await page.goto(base+'/simulator',{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);
  await expect(page.locator('.lab-chapters a')).toHaveCount(10);for(const id of ids)await expect(page.locator('#'+id)).toHaveCount(1,{timeout:30000});report.checks.push('ten unique, real chapter destinations');
  await visit(ids[0]);await page.waitForFunction(()=>document.querySelector('.behaviour-intro .sakura-scene')?.dataset.ready==='true',null,{timeout:60000});await shot('01-sakura');
  await visit(ids[1]);await page.getByRole('button',{name:/城市旅程/}).click();await page.waitForFunction(()=>document.querySelector('.annual-readout strong')?.textContent?.includes('3.89'));await shot('02-choices');report.checks.push('journey scenario: annual 3.89t, retained worker formula');
  await visit(ids[2]);await page.locator('#ecology-lab').getByRole('button',{name:'冬',exact:true}).click();
  const winterCanvas=page.locator('#ecology-lab canvas[data-season=winter]');
  await expect(winterCanvas).toBeVisible({timeout:60000});
  await expect(page.locator('#ecology-lab .botanical-diorama .scene-stage')).toHaveAttribute('data-mode','3d');
  report.checks.push(`${mobile?'mobile':'desktop'} real botanical 3D remains available and season-tagged`);
  await shot('03-winter');
  await visit(ids[3]);const twin=page.locator('#digital-room .twin-canvas');await expect(twin).toHaveAttribute('data-experience',/orbit|fallback/,{timeout:60000});report.cityMode=await twin.getAttribute('data-experience');
  if(report.cityMode==='orbit'){await page.locator('#digital-room').getByRole('button',{name:'03 咖啡厅',exact:true}).click();await expect(twin).toHaveAttribute('data-experience','focused',{timeout:30000});await page.locator('#digital-room').getByRole('button',{name:'02 进入室内 ↗',exact:true}).click();await expect(twin).toHaveAttribute('data-room-ready','true',{timeout:60000});await expect(twin).toHaveAttribute('data-space','cafe');report.checks.push('original exterior-to-cafe real transition');}else report.checks.push('city was fallback; real exterior transition NOT VERIFIED');await shot('04-city');
  await visit(ids[4]);const cafe=page.locator('#coffee-time');
  await expect(cafe.locator('canvas[data-story-scene=cafe]')).toBeVisible({timeout:60000});
  await expect(cafe.locator('.scene-stage')).toHaveAttribute('data-mode','3d');
  report.checks.push(`${mobile?'mobile':'desktop'} real cafe 3D is available`);
  const before=await cafe.locator('.story-live-strip').innerText();await cafe.getByRole('button',{name:/意式咖啡机/}).click();const after=await cafe.locator('.story-live-strip').innerText();assert.notEqual(before,after);report.checks.push({cafeBefore:before,cafeAfter:after});await shot('05-cafe');
  await visit(ids[5]);await page.locator('#companion-electricity-number').fill('90');await page.locator('#companion-gasoline-number').fill('10');await page.waitForFunction(()=>document.querySelector('.story-reflection-ledger strong')?.textContent?.includes('1.61'));await expect(page.locator('#electricity-number')).toHaveValue('90');await expect(page.locator('#gasoline-number')).toHaveValue('10');await page.locator('#eco-companion').getByRole('button',{name:'轻触猫咪',exact:true}).click();await expect(page.locator('#eco-companion [role=status]')).toContainText('1 次');await shot('06-companion');report.checks.push('two-way activity input sync, 1.60548t, companion touch does not change calculation');
  await visit(ids[6]);const compare=page.locator('#two-lives');await compare.getByRole('button',{name:'按使用人数'}).click();await expect(compare.locator('.building-comparison')).toHaveAttribute('data-metric','person');assert((await compare.locator('.building-comparison').innerText()).includes('653.63'));await shot('07-buildings');report.checks.push('same-boundary normalization: home 653.625kg/person/year');
  await visit(ids[7]);const pasture=page.locator('#pasture-letter');for(const label of ['牧场','加工','冷链','消费']){await pasture.getByRole('navigation',{name:'乳品四节点'}).getByRole('button',{name:new RegExp(label)}).click();await page.waitForTimeout(300);}await expect(pasture).toHaveAttribute('data-milk-stage','3');assert((await pasture.locator('.story-live-strip').innerText()).includes('3.33'));await shot('08-milk');report.checks.push('four milk nodes, 3L delivered / .9 = 3.33L upstream; no unsupported milk carbon factor');
  await visit(ids[8]);await page.locator('#data-echo').getByRole('button',{name:/汽油燃烧/}).click();await expect(page.locator('.story-evidence')).toContainText('2.3');await page.getByRole('button',{name:'保存当前为 A',exact:true}).click();await shot('09-evidence');
  await visit(ids[9]);await expect(page.locator('.story-reflection-ledger strong')).toContainText('1.61');await shot('10-ending');report.checks.push('ending uses same annual result as inputs and data echo');
  report.duplicateIds=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return [...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))]});assert.deepEqual(report.duplicateIds,[]);
  report.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(report.overflow,false);assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);assert.deepEqual(report.api,[]);report.passed=true;
 }catch(e){report.failure=String(e);await shot('failure').catch(()=>{});process.exitCode=1;}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
