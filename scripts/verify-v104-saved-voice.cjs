/* Replay the already authorized, saved genuine Doubao response. This script
 * has no code path that forwards any synthesis request to the provider.
 */
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{chromium,firefox}=require('playwright');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const source='C:/Users/23242/Documents/Codex/2026-11-07/ni/outputs/v7/tts',original=JSON.parse(await fs.readFile(path.join(source,'extra-real-playback.json'),'utf8'));
 const body=await fs.readFile(path.join(source,'doubao-genuine-response.ndjson'));
 assert.equal(hash(body),original.responseSha256);const packets=body.toString().trim().split('\n').map(JSON.parse),pcm=Buffer.concat(packets.filter(p=>p.type==='audio').map(p=>Buffer.from(p.data,'base64')));assert.equal(hash(pcm),original.audioSha256);
 const out=path.resolve('outputs/v10-explore/saved-voice-'+Date.now());await fs.mkdir(out,{recursive:true});
 const report={out,at:new Date().toISOString(),base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3044/',method:'Original saved genuine 14-character response replayed through the current audition page. No new synthesis.',source,sourceResponseSha256:hash(body),sourceAudioSha256:hash(pcm),providerRequests:0,humanListeningConfirmed:false,playback:[],passed:false};
 for(const [engine,type]of [['chromium',chromium],['firefox',firefox]]){
  const browser=await type.launch({headless:true}),ctx=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});let cachedPlays=0;
  const result={engine,version:browser.version(),errors:[],blockedPosts:[],passed:false};const timer=setTimeout(()=>browser.close().catch(()=>{}),75000);
  await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(u.origin!==new URL(report.base).origin)return r.abort();
   if(req.method()==='POST'&&u.pathname==='/api/tts'){
    const p=req.postDataJSON();if(cachedPlays||p.text!==original.text||p.voice!=='zh_female_vv_uranus_bigtts'){result.blockedPosts.push(u.pathname);return r.abort()}
    cachedPlays++;return r.fulfill({status:200,contentType:'application/x-ndjson; charset=utf-8',body});
   }
   if(['GET','HEAD'].includes(req.method()))return r.continue();result.blockedPosts.push(u.pathname);return r.abort();
  });
  await ctx.routeWebSocket('**/*',ws=>ws.close());const page=await ctx.newPage();page.on('pageerror',e=>result.errors.push(String(e)));
  try{
   await page.addInitScript(()=>{window.__playedParts=[];window.__audioEvents=[];const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){const samples=this.buffer.getChannelData(0),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);let energy=0;
     for(let i=0;i<samples.length;i++){view.setInt16(i*2,Math.round(samples[i]*32768),true);energy+=samples[i]*samples[i]}
     window.__playedParts.push(Array.from(bytes));const e={frames:samples.length,rate:this.buffer.sampleRate,state:this.context.state,rms:Math.sqrt(energy/samples.length),ended:false};this.addEventListener('ended',()=>e.ended=true);window.__audioEvents.push(e);return start.apply(this,args)};
   });
   await page.goto(report.base+'tts-audition',{waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'服务端已读取语音凭证'}).waitFor();
   await page.getByLabel('语音方式').selectOption('doubao');await page.getByLabel('豆包音色').selectOption('zh_female_vv_uranus_bigtts');await page.getByLabel('输入想听的内容').fill(original.text);await page.getByRole('button',{name:'试听输入文字',exact:true}).click();
   await page.waitForFunction(()=>window.__audioEvents.length&&window.__audioEvents.every(e=>e.ended),null,{timeout:20000});
   const played=await page.evaluate(()=>({events:window.__audioEvents,parts:window.__playedParts}));result.cachedPlays=cachedPlays;result.events=played.events;result.playedSha256=hash(Buffer.concat(played.parts.map(p=>Buffer.from(p))));
   assert.equal(result.playedSha256,original.audioSha256);assert.equal(cachedPlays,1);assert(played.events.every(e=>e.state==='running'&&e.ended&&e.rate===24000));assert.deepEqual(result.errors,[]);assert.deepEqual(result.blockedPosts,[]);result.passed=true;
   await page.screenshot({path:path.join(out,engine+'-saved-voice.png')});
  }catch(e){result.failure=String(e);process.exitCode=1}finally{clearTimeout(timer);await browser.close();report.playback.push(result)}
 }
 report.passed=report.playback.length===2&&report.playback.every(r=>r.passed);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
