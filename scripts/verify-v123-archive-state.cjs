// Real browser regression for archive URL restoration and the sandbox deep link.
const {chromium,firefox,webkit,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:60000});
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.CT_BROWSER||'chromium',base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3080';
const out=path.resolve(process.env.CT_EVIDENCE_DIR||`outputs/v123/archive-state-${engine}`);
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const report={engine,base,at:new Date().toISOString(),checks:[],errors:[],http:[],passed:false};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{},...engine==='firefox'&&process.env.CT_FIREFOX_EXECUTABLE?{executablePath:process.env.CT_FIREFOX_EXECUTABLE}:{}});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/api/**',route=>route.abort());
 const page=await context.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',error=>report.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)report.http.push({path:new URL(response.url()).pathname,status:response.status()});});
 const check=name=>report.checks.push(name);
 try{
  await page.goto(base+'/learn',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.archive-entry')).toHaveCount(9);
  await page.getByRole('button',{name:/继续翻阅/}).click();await expect(page.locator('.archive-entry')).toHaveCount(18);
  await expect.poll(()=>new URL(page.url()).searchParams.get('count')).toBe('18');
  await page.getByLabel('文献排列方式').selectOption('year');
  await page.getByRole('button',{name:'暂停封面动态',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('motion')).toBe('paused');
  const first=await page.locator('.archive-entry').first().getAttribute('id');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('.archive-entry')).toHaveCount(18);await expect(page.getByLabel('文献排列方式')).toHaveValue('year');
  await expect(page.getByRole('button',{name:'开启封面动态',exact:true})).toHaveAttribute('aria-pressed','true');
  assert.equal(await page.locator('.archive-entry').first().getAttribute('id'),first);check('pagination-sort-and-motion-survive-refresh');
  await page.locator('.archive-entry').first().getByRole('button',{name:/阅读文献/}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect.poll(()=>new URL(page.url()).searchParams.get('reference')).not.toBeNull();
  const title=await page.locator('#citation-title').innerText();
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('#citation-title')).toHaveText(title);
  await page.getByRole('button',{name:'关闭文献',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(()=>new URL(page.url()).searchParams.has('reference')).toBe(false);check('selected-source-reopens-and-close-clears-deep-link');
  await page.locator('#archive-search-input').fill('电力');await expect.poll(()=>new URL(page.url()).searchParams.get('q')).toBe('电力');
  const matches=await page.locator('.archive-entry').count();assert(matches>0);
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('#archive-search-input')).toHaveValue('电力');await expect(page.locator('.archive-entry')).toHaveCount(matches);check('query-and-matching-content-survive-refresh');
  await page.locator('.archive-entry').first().getByRole('button',{name:/^收藏文献/}).click();await page.getByRole('button',{name:'仅看收藏',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('saved')).toBe('1');await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('button',{name:'仅看收藏',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.archive-entry')).toHaveCount(1);check('saved-filter-and-local-bookmark-restored');
  for(const width of[768,375]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(out,`archive-${width}.png`),fullPage:true});}check('375-and-768-without-overflow');
  await page.goto(base+'/learn?topic=invalid&sort=invalid&count=999',{waitUntil:'domcontentloaded'});await expect(page.locator('.archive-entry')).toHaveCount(44);await expect(page.getByLabel('文献排列方式')).toHaveValue('folio');check('invalid-url-values-clamped-to-valid-archive-state');
  await page.goto(base+'/simulator',{waitUntil:'domcontentloaded'});const link=page.getByRole('link',{name:/回看核算边界/});await expect(link).toHaveAttribute('href','/learn?reference=scope-boundaries');await link.click();await expect(page.locator('#citation-title')).toHaveText('Draw the line.');await expect(page.getByRole('dialog')).toContainText('GHG Protocol');check('sandbox-method-link-opens-the-correct-primary-source');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(error){report.failure=error.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.version=browser.version();report.finished=new Date().toISOString();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(error=>{console.error(error);process.exitCode=1;});
