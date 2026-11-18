const {webkit}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const out=path.resolve('outputs/v108/internal/webkit-layout-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await webkit.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),report={out,errors:[],samples:[]};
 await context.route('**/api/**',r=>r.abort());
 await page.addInitScript(()=>{window.__resizeEvents=[];const Native=window.ResizeObserver;window.ResizeObserver=class extends Native{constructor(callback){const owner=new Error().stack;super((entries,observer)=>{window.__resizeEvents.push({at:performance.now(),owner,targets:entries.map(e=>({tag:e.target.tagName,cls:e.target.className,rect:[e.contentRect.width,e.contentRect.height]}))});if(window.__resizeEvents.length>200)window.__resizeEvents.shift();callback(entries,observer)})}}});
 page.on('pageerror',async e=>report.errors.push({message:e.message,stack:e.stack,at:Date.now(),events:await page.evaluate(()=>window.__resizeEvents).catch(()=>[])}));
 try{await page.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3053')+'/learn',{waitUntil:'domcontentloaded'});await page.waitForSelector('canvas[data-library-ready=true]',{timeout:60000});
 await page.locator('.garment-lifecycle').scrollIntoViewIfNeeded();for(let i=0;i<12;i++){await page.waitForTimeout(1500);report.samples.push(await page.locator('.garment-exhibit').evaluate(e=>({at:performance.now(),mode:e.querySelector('.scene-stage')?.getAttribute('data-mode'),canvas:{...e.querySelector('canvas')?.dataset},status:e.querySelector('[role=status]')?.textContent,rect:e.getBoundingClientRect().toJSON()})));}
 await page.screenshot({path:path.join(out,'garment.png')});
 }catch(e){report.failure=String(e)}finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
