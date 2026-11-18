const{chromium}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v122/mobile-room-diagnostic');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await ctx.newPage();
 const result={events:[],errors:[]};page.on('pageerror',e=>result.errors.push(e.message));await ctx.route('**/api/**',r=>r.abort());
 await page.addInitScript(()=>{
  window.__roomEvents=[];for(const name of ['click','pointerdown','pointerup','cancel','close'])document.addEventListener(name,e=>{const unit=document.querySelector('.identity-unit[data-character=student]'),button=unit?.querySelector('.character-open-controls button');window.__roomEvents.push({name,target:e.target.className,text:e.target.textContent?.slice(0,40),y:e.clientY,scroll:scrollY,button:button?.getBoundingClientRect().toJSON(),card:unit?.getBoundingClientRect().toJSON(),parts:[...(unit?.children||[])].map(x=>({name:x.className,height:x.getBoundingClientRect().height,parts:[...x.children].map(y=>({name:y.className,height:y.getBoundingClientRect().height}))})),open:!!document.querySelector('dialog[open]')})},true);
  const show=HTMLDialogElement.prototype.showModal,close=HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal=function(){window.__roomEvents.push({name:'showModal',at:performance.now()});return show.call(this)};
  HTMLDialogElement.prototype.close=function(){window.__roomEvents.push({name:'closeMethod',at:performance.now(),stack:new Error().stack});return close.call(this)};
 });
 try{
  await page.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3070')+'/#identities',{waitUntil:'domcontentloaded'});
  const card=page.locator('.identity-unit[data-character=student]');await card.locator('.identity-card').click();
  await card.getByRole('button',{name:'进入角色展厅'}).click();await page.waitForTimeout(5000);
  result.events=await page.evaluate(()=>window.__roomEvents);result.dialogs=await page.locator('dialog').evaluateAll(n=>n.map(x=>({open:x.open,className:x.className})));
  await page.screenshot({path:path.join(out,'result.png')});
 }finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
})();
