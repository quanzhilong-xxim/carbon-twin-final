/* Genuine candidate-browser checks. Isolated test storage; all API calls blocked. */
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve('outputs/academic-archive/v104-'+Date.now());await fs.mkdir(out,{recursive:true});
 const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3038/';
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const result={at:new Date().toISOString(),base,out,browser:browser.version(),checks:[],errors:[],http:[],api:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),200000);
 const ctx=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:out,size:{width:1440,height:960}}});
 await ctx.route('**/api/**',r=>{result.api.push(new URL(r.request().url()).pathname);return r.abort()});
 const page=await ctx.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)result.http.push({url:r.url().replace(/\?.*$/,''),status:r.status()})});
 const assets=new Map();page.on('response',r=>{if(/\.(glb|png|jpg|hdr)$/.test(new URL(r.url()).pathname))assets.set(new URL(r.url()).pathname,r.status())});
 async function check(name,fn){const at=Date.now();const detail=await fn();result.checks.push({name,ms:Date.now()-at,detail});console.log('PASS '+name)}
 try{
  await check('actual library assets and Chinese-led hero',async()=>{
   assert.equal((await page.goto(base+'learn',{waitUntil:'domcontentloaded'})).status(),200);
   await expect(page.locator('h1')).toContainText('让每一次选择');
   await page.waitForFunction(()=>document.querySelector('.library-hero-world canvas')?.dataset.libraryReady==='true');
   assert.equal(assets.get('/models/research/CT_LibraryShelf_v104.glb'),200);
   await page.waitForTimeout(600);await page.screenshot({path:path.join(out,'hero-desktop.png')});
   return page.locator('.library-hero-world canvas').evaluate(c=>{const g=c.getContext('webgl2'),e=g?.getExtension('WEBGL_debug_renderer_info');return {data:{...c.dataset},renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):null}});
  });
  await check('book pull-out opens genuine evidence',async()=>{
   await page.getByRole('button',{name:'寻找第一条证据',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.library-hero-world canvas')?.dataset.libraryBook==='human-influence');
   await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('#citation-title')).toContainText('Unequivocal');
   await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  await check('Scope theatre, hover versus actual learning event',async()=>{
   assert.equal(await page.locator('#scope-boundaries').count(),1);
   const progress=page.locator('.learning-progress small'),count=async()=>Number((await progress.innerText()).match(/(\d+) 条持久记录/)?.[1]||0);
   const before=await count();await page.locator('.scope-flip').nth(1).hover();
   await expect(page.locator('.scope-stage')).toHaveAttribute('data-active','scope-2');assert.equal(await count(),before);
   await page.locator('.scope-flip').first().click();await expect(page.locator('.scope-flip').first()).toHaveAttribute('aria-pressed','true');
   await expect.poll(count).toBe(before+1);await page.locator('.scope-theatre').screenshot({path:path.join(out,'scope-theatre.png')});
   return {before,after:await count()};
  });
  await check('archive drawers, normalized search, year, empty state and keyboard',async()=>{
   const cards=page.locator('.archive-grid .archive-entry'),search=page.getByLabel('检索学术档案',{exact:true});
   await expect(cards).toHaveCount(9);await page.locator('.research-paths-v7 button').nth(1).click();await expect(page.locator('.research-paths-v7 button').nth(1)).toHaveAttribute('aria-pressed','true');
   await search.fill('Scope 1');assert(await cards.count()>0);
   await page.getByRole('button',{name:'重置筛选',exact:true}).click();await search.fill('2024');assert(await cards.count()>0);
   await expect.poll(async()=> (await cards.locator('.research-cover-v7>b').allTextContents()).includes('2024')).toBe(true);
   await search.fill('Ｓｃｏｐｅ');assert(await cards.count()>0);
   await search.fill('no-record-xyz-9182');await expect(cards).toHaveCount(0);await expect(page.locator('.research-empty-v7')).toBeVisible();
   await search.press('Escape');await expect(cards).toHaveCount(9);await expect(search).toBeFocused();
   await page.getByRole('button',{name:/继续翻阅/}).click();await expect(cards).toHaveCount(18);
   const illustrations=await cards.locator('[data-illustration]').evaluateAll(els=>[...new Set(els.map(e=>e.dataset.illustration))]);assert(illustrations.length>=4);
   await page.getByLabel('文献排列方式').selectOption('year');const sorted=(await cards.locator('.research-cover-v7>b').allTextContents()).map(Number);assert.deepEqual(sorted,[...sorted].sort((a,b)=>b-a));
   await page.getByLabel('文献排列方式').selectOption('folio');await page.locator('.research-register-v7').screenshot({path:path.join(out,'evidence-drawers.png')});return {illustrations};
  });
  await check('bookmark, related reading, focus and persistent local records',async()=>{
   const first=page.locator('.archive-grid article').first(),title=await first.locator('h2').innerText();await first.locator('.research-save-v7').click();
   await expect(first.locator('.research-save-v7')).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'仅看收藏',exact:true}).click();await expect(page.locator('.archive-grid article')).toHaveCount(1);
   await first.locator('.citation-badge').click();const d=page.getByRole('dialog');await expect(d).toBeVisible();await expect(d.locator('blockquote')).not.toBeEmpty();await expect(d.locator('.citation-limit')).not.toBeEmpty();
   await page.keyboard.press('Shift+Tab');assert(await d.evaluate(e=>e.contains(document.activeElement)));
   const related=d.locator('.citation-related-v7 button').first(),next=await related.locator('strong').innerText();await related.click();await expect(page.locator('#citation-title')).toHaveText(next);await page.keyboard.press('Escape');
   await expect(first.locator('.citation-badge')).toBeFocused();await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'仅看收藏',exact:true}).click();await expect(page.locator('.archive-grid article')).toHaveCount(1);await expect(page.locator('.archive-grid h2')).toHaveText(title);
  });
  await check('real garment three views and all nine lifecycle selections',async()=>{
   const garment=page.locator('.garment-lifecycle');await garment.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('canvas[data-garment-angle]'));
   assert.equal(assets.get('/models/clothing/tshirt.glb'),200);
   for(const [i,label] of ['正面','侧面','背面'].entries()){await garment.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(i=>document.querySelector('canvas[data-garment-angle]')?.dataset.garmentAngle===String(i),i)}
   for(let i=0;i<9;i++){await garment.locator('.lifecycle-path button').nth(i).click();await expect(garment.locator('.lifecycle-path button').nth(i)).toHaveAttribute('aria-pressed','true')}
   await garment.getByRole('button',{name:'展开材料分层',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas[data-material-layers]')?.dataset.materialLayers==='true');
   for(const [id,label] of [['cotton','棉'],['polyester','聚酯'],['wool','羊毛'],['denim','牛仔斜纹']]){await garment.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(id=>document.querySelector('canvas[data-fabric-study]')?.dataset.fabricStudy===id,id)}
   await garment.getByRole('button',{name:'放大织纹',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas[data-garment-angle]')?.dataset.garmentAngle==='3');
   await garment.getByRole('button',{name:'自动转动',exact:true}).click();await page.waitForFunction(()=>document.querySelector('canvas[data-garment-spinning]')?.dataset.garmentSpinning==='true');await garment.getByRole('button',{name:'暂停转动',exact:true}).click();
   await garment.screenshot({path:path.join(out,'garment-study.png')});
  });
  await check('responsive layouts and a genuine mobile reading fallback',async()=>{
   for(const width of [1440,768,390]){await page.setViewportSize({width,height:960});await page.locator('.research-register-v7').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'archive-'+width+'.png')})}
   const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await mobile.route('**/api/**',r=>r.abort());
   const p=await mobile.newPage();p.on('pageerror',e=>result.errors.push(String(e)));await p.goto(base+'learn',{waitUntil:'domcontentloaded'});await expect(p.locator('h1')).toContainText('让每一次选择');await expect(p.locator('.library-reading-fallback')).toBeVisible();
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(out,'hero-mobile-reduced.png')});await p.getByRole('button',{name:'寻找第一条证据',exact:true}).click();await expect(p.getByRole('dialog')).toBeVisible();await p.keyboard.press('Escape');await mobile.close();
  });
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.http,[]);assert.deepEqual(result.api,[]);result.passed=true;
 }catch(e){result.failure=String(e);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})}
 finally{clearTimeout(timer);await ctx.close();result.video=await page.video()?.path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))}
})().catch(e=>{console.error(e);process.exitCode=1});
