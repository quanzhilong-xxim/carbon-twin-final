const {chromium,webkit,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const engine=process.env.CT_BROWSER||'chromium',mobile=process.argv.includes('mobile'),base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3068';
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v12/ending-archive');await fs.mkdir(out,{recursive:true});
 const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
 const browser=await({chromium,webkit}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{}});
 const context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage();page.setDefaultTimeout(60000);
 const report={engine,mobile,base,version:browser.version(),checks:[],errors:[],http:[]};
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({url:r.url(),status:r.status()});});await context.route('**/api/**',r=>r.abort());
 try{
  await page.goto(base+'/simulator',{waitUntil:'domcontentloaded',timeout:90000});
  const ending=page.locator('.forest-reunion');await ending.scrollIntoViewIfNeeded();
  const scene=ending.locator('.sakura-scene'),canvas=scene.locator('canvas');
  await expect(scene).toHaveAttribute('data-ready','true',{timeout:90000});await expect(canvas).toHaveAttribute('data-companion-parts','5');
  await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,'ending-landscape.png')});
  const initial=Number(await canvas.getAttribute('data-companion-time'));
  await page.waitForFunction(t=>Number(document.querySelector('.forest-reunion canvas')?.dataset.companionTime)>t+.05,initial);
  await ending.getByRole('button',{name:'暂停花园动画',exact:true}).click();await page.waitForTimeout(150);
  const read=()=>canvas.evaluate(c=>({time:c.dataset.companionTime,head:c.dataset.companionHead}));const frozen=await read();await page.waitForTimeout(500);assert.deepEqual(await read(),frozen);
  const before=Number(await canvas.getAttribute('data-companion-reaction'));
  await ending.getByRole('button',{name:'和猫咪打招呼',exact:true}).click();await expect(ending.getByRole('status')).toContainText(String(before+1));
  await ending.getByRole('button',{name:'继续花园动画',exact:true}).click();await expect(canvas).not.toHaveAttribute('data-companion-head',frozen.head);
  report.checks.push('ending real animal GLB moves, freezes on pause and responds to keyboard-accessible greeting');
  await page.reload({waitUntil:'domcontentloaded'});await ending.scrollIntoViewIfNeeded();await expect(ending.getByRole('status')).toContainText(String(before+1));report.checks.push('ending greeting survives reload');
  await page.screenshot({path:path.join(out,'ending-saved.png')});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
  await page.goto(base+'/learn?reference=worldbank-carbon-pricing#archive',{waitUntil:'domcontentloaded',timeout:90000});
  const dialog=page.getByRole('dialog');await expect(dialog).toContainText('A price needs a scope.');await expect(dialog).toContainText('非逐字引文');await expect(dialog.locator('.translation')).toHaveCount(0);
  await expect(dialog.getByRole('link',{name:'打开本条档案链接 ↗'})).toHaveAttribute('href',/\#archive$/);assert(await page.locator('#archive').count());
  await dialog.getByRole('button',{name:'复制引文与来源',exact:true}).click();await expect(dialog.getByRole('status')).toContainText(/已复制|手动选择/);
  await dialog.getByText('完整引文',{exact:true}).click();await expect(dialog.locator('details[open]')).toContainText('State and Trends of Carbon Pricing 2024');
  await page.screenshot({path:path.join(out,'citation-note.png')});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);report.checks.push('44-source archive deep link, paraphrase label, expanded citation, copy feedback and Escape close');
  const input=page.getByLabel('检索学术档案',{exact:true});await input.scrollIntoViewIfNeeded();await expect(page.locator('.archive-register')).toContainText('44 PRIMARY READINGS');
  await input.fill('MWh');await expect(page.locator('.archive-entry')).toHaveCount(1);await expect(page.locator('.archive-entry')).toContainText('Capacity is not generation.');
  await input.press('Escape');await expect(input).toHaveValue('');await input.fill('不存在的查找词987');await expect(page.locator('.research-empty-v7')).toBeVisible();
  await page.locator('.research-empty-v7').getByRole('button',{name:/查看全部文献/}).click();await expect(page.locator('.archive-entry')).toHaveCount(9);await page.screenshot({path:path.join(out,'archive-expanded.png')});
  report.checks.push('new knowledge searchable by units, empty result recovery and 9-at-a-time pagination');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})();
