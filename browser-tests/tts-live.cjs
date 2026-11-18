// Real app requests and genuine provider audio only; no fixtures or mocked media.
const fs=require('node:fs'),path=require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH||='D:\\PlaywrightBrowsers';
process.env.PLAYWRIGHT_SKIP_BROWSER_GC='1';
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const base=process.env.BROWSER_REAL_TEST_BASE_URL||'http://localhost:3020';
const host=new URL(base).hostname;
if(!['localhost','127.0.0.1'].includes(host)&&!host.endsWith('--carbontwin-quanzhilong.netlify.app'))throw new Error('Unrecognized deployment');
const dir=process.env.BROWSER_REAL_TEST_OUTPUT||path.join(__dirname,'../work/tts-live',new Date().toISOString().replace(/[:.]/g,'-'));
if(fs.existsSync(dir))throw new Error('Choose a new evidence directory');fs.mkdirSync(dir,{recursive:true});
const report={time:new Date().toISOString(),base,fixtures:false,realHardwareMicrophoneTested:false,humanListeningConfirmed:false,browsers:{}};
const save=()=>fs.writeFileSync(path.join(dir,'live.json'),JSON.stringify(report,null,2));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let lastRequest=0;
async function pace(){const remaining=9000-(Date.now()-lastRequest);if(remaining>0)await pause(remaining);lastRequest=Date.now();}
(async()=>{
  for(const [name,engine]of Object.entries({chromium,firefox,webkit}).filter(([name])=>!process.argv[2]||process.argv[2]===name)){
    const r=report.browsers[name]={checks:[],requests:[],pageErrors:[]};let browser;
    const check=(item,status,detail)=>{r.checks.push({item,status,detail});save();console.log(name,item,status);};
    try{
      browser=await engine.launch({headless:true});r.version=browser.version();check('浏览器启动','pass');
      const context=await browser.newContext({viewport:{width:1365,height:1000},reducedMotion:'reduce'});
      const page=await context.newPage();
      page.on('pageerror',e=>r.pageErrors.push(e.message.slice(0,250)));
      page.on('response',res=>{const u=new URL(res.url());if(u.pathname.startsWith('/api/'))r.requests.push({host:u.hostname,path:u.pathname,method:res.request().method(),status:res.status()});});
      await page.addInitScript(()=>{
        window.__genuineAudio=[];window.__audioPcm=[];window.__realTtsFetches=[];window.__systemSpeechCalls=0;
        if(window.speechSynthesis){const originalSpeak=window.speechSynthesis.speak.bind(window.speechSynthesis);window.speechSynthesis.speak=(...args)=>{window.__systemSpeechCalls++;return originalSpeak(...args);};}
        const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
        const originalFetch=window.fetch;
        window.fetch=async function(input,init){
          const url=new URL(typeof input==='string'?input:input.url,location.href);
          const response=await originalFetch.apply(this,arguments);
          if(url.pathname==='/api/tts'&&init?.method==='POST'){
            const payload=JSON.parse(init.body),entry={url:url.href,method:init.method,voice:payload.voice,text:payload.text,status:response.status,contentType:response.headers.get('content-type'),cacheControl:response.headers.get('cache-control'),done:false};
            window.__realTtsFetches.push(entry);
            response.clone().text().then(async text=>{
              if(!response.ok)return;
              const packets=text.split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l));
              entry.done=packets.some(p=>p.type==='done');entry.error=packets.some(p=>p.type==='error');
              const parts=packets.filter(p=>p.type==='audio').map(p=>Uint8Array.from(atob(p.data),c=>c.charCodeAt(0)));
              const bytes=new Uint8Array(parts.reduce((s,b)=>s+b.length,0));let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
              entry.audioBytes=bytes.length;entry.sha256=await digest(bytes);
            }).catch(()=>{entry.captureError=true;});
          }
          return response;
        };
        if(window.AudioBufferSourceNode){const original=AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start=function(...args){
            let sum=0;const samples=this.buffer?.getChannelData(0);if(samples)for(const s of samples)sum+=s*s;
            const e={frames:this.buffer?.length,rate:this.buffer?.sampleRate,state:this.context.state,rms:samples?Math.sqrt(sum/samples.length):0,ended:false,start:performance.now()};
            const bytes=new Uint8Array((samples?.length||0)*2),view=new DataView(bytes.buffer);if(samples)for(let i=0;i<samples.length;i++)view.setInt16(i*2,Math.round(samples[i]*32768),true);window.__audioPcm.push(bytes);
            this.addEventListener('ended',()=>{e.ended=true;e.endedAt=performance.now();});window.__genuineAudio.push(e);return original.apply(this,args);
          };
        }
      });
      const response=await page.goto(base+'/tts-audition',{waitUntil:'domcontentloaded',timeout:60000});expect(response.status()).toBe(200);
      await expect(page.getByLabel('语音方式')).toHaveValue('doubao',{timeout:30000});check('试听页加载','pass');
      r.capabilities=await page.evaluate(()=>({audioContext:!!(window.AudioContext||window.webkitAudioContext),getUserMedia:!!navigator.mediaDevices?.getUserMedia,recognition:!!(window.SpeechRecognition||window.webkitSpeechRecognition),wav:new Audio().canPlayType('audio/wav')}));
      const c=await context.request.get(base+'/api/tts');r.configStatus=c.status();r.config=await c.json();expect(r.config.configured).toBe(true);check('运行环境读取凭证','pass');
      const status=page.locator('.speech-controls [role=status]');
      const play=async(label,voice)=>{
        await page.getByLabel('豆包音色').selectOption(voice);
        const before=await page.evaluate(()=>window.__genuineAudio.length);
        const fetchIndex=await page.evaluate(()=>window.__realTtsFetches.length);
        await pace();const response=page.waitForResponse(res=>res.url()===base+'/api/tts'&&res.request().method()==='POST');
        await page.getByRole('button',{name:'试听'+label,exact:true}).click();const tts=await response;expect(tts.status()).toBe(200);
        await page.waitForFunction(i=>window.__realTtsFetches[i]?.sha256,fetchIndex,{timeout:30000});
        await expect(status).not.toContainText('正在朗读',{timeout:60000});
        await expect(page.getByRole('button',{name:/停止朗读|取消合成/})).toHaveCount(0);
        const audio=await page.evaluate(n=>window.__genuineAudio.slice(n),before);
        const provenance=await page.evaluate(async({before,fetchIndex})=>{
          const parts=window.__audioPcm.slice(before),pcm=new Uint8Array(parts.reduce((s,b)=>s+b.length,0));let at=0;for(const b of parts){pcm.set(b,at);at+=b.length;}
          const playedSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pcm))).map(b=>b.toString(16).padStart(2,'0')).join('');
          return {network:window.__realTtsFetches[fetchIndex],playedSha256,playedPcmBytes:pcm.length,systemSpeechCalls:window.__systemSpeechCalls};
        },{before,fetchIndex});
        expect(provenance.network.done).toBe(true);expect(provenance.network.error).toBe(false);expect(provenance.network.cacheControl).toContain('no-store');expect(provenance.systemSpeechCalls).toBe(0);expect(provenance.playedSha256).toBe(provenance.network.sha256);expect(provenance.playedPcmBytes).toBe(provenance.network.audioBytes);
        expect(audio.length).toBeGreaterThan(0);expect(audio.every(e=>e.frames>0&&e.state==='running'&&e.ended)).toBe(true);expect(audio.some(e=>e.rms>0.001)).toBe(true);
        r.playbacks||=[];r.playbacks.push({label,voice,httpStatus:tts.status(),chunks:audio.length,frames:audio.reduce((s,e)=>s+e.frames,0),allEnded:audio.every(e=>e.ended),nonSilent:audio.some(e=>e.rms>0.001),provenance});
        check(voice+'/'+label+'真实合成并播放结束','pass','HTTP200, complete stream, running Web Audio, nonzero samples, all chunks ended');
      };
      if(r.capabilities.audioContext){
        await play('温柔问候','zh_female_vv_uranus_bigtts');
        await play('轻柔建议','zh_female_xiaohe_uranus_bigtts');
        const customText='这是从网页新输入的语音验证。今天我们一起选择更舒适自然的穿搭。';
        await page.getByLabel('输入想听的内容').fill(customText);
        await play('输入文字','zh_female_vv_uranus_bigtts');
        expect(r.playbacks[r.playbacks.length-1].provenance.network.text).toBe(customText);
        check('输入新文字实时合成及来源一致','pass','Request body matches textarea; played PCM equals this fresh response');
        await pace();await page.getByRole('button',{name:'试听自然追问',exact:true}).click();
        const stop=page.getByRole('button',{name:'停止朗读',exact:true});await expect(stop).toBeVisible({timeout:30000});await stop.click();await expect(stop).toHaveCount(0);check('真实播放中停止','pass');
        // Two rapid real requests: the first is cancelled and the current one wins.
        await pace();await page.getByRole('button',{name:'试听温柔问候',exact:true}).dblclick();
        await expect(status).toContainText('正在朗读',{timeout:30000});await expect(status).not.toContainText('正在朗读',{timeout:60000});await expect(page.getByRole('button',{name:/停止朗读|取消合成/})).toHaveCount(0);check('快速重复点击及结束状态','pass');
        await context.setOffline(true);try{await page.getByRole('button',{name:'试听温柔问候',exact:true}).click();await expect(status).toContainText('网络连接中断');check('真实断网错误提示','pass');}finally{await context.setOffline(false);}
      }else{
        await page.getByRole('button',{name:'试听温柔问候',exact:true}).click();await expect(status).toContainText('无法播放流式音频');check('缺少WebAudio时的明确提示','pass');check('真实豆包播放','unsupported','This Windows WebKit build has no AudioContext; no success claimed');
      }
      await page.reload({waitUntil:'domcontentloaded'});await expect(page.getByLabel('语音方式')).toHaveValue('doubao',{timeout:30000});
      await expect(page.getByText('服务端已读取语音凭证；合成和听感仍需实际试听确认。',{exact:true})).toBeVisible();check('刷新恢复及配置重读','pass');
      await page.screenshot({path:path.join(dir,name+'-audition.png'),fullPage:true});
      await page.goto(base+'/workspace',{waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForFunction(()=>[...document.querySelectorAll('.voice-switch')].some(el=>Object.keys(el).some(k=>k.startsWith('__reactProps'))),{timeout:30000});
      await page.getByRole('button',{name:'开启穿搭语音',exact:true}).click();const voice=page.locator('.wardrobe-voice');await voice.getByLabel('语音方式').selectOption('doubao');
      if(r.capabilities.audioContext){await pace();await voice.getByRole('button',{name:'听听建议 ↗'}).click();const stop=voice.getByRole('button',{name:'停止朗读',exact:true});await expect(stop).toBeVisible({timeout:30000});await stop.click();check('原听听建议真实播放及停止','pass');}
      else{await voice.getByRole('button',{name:'听听建议 ↗'}).click();await expect(voice.locator('.speech-controls [role=status]')).toContainText('无法播放流式音频');check('原听听建议能力提示','pass');}
      await voice.getByRole('button',{name:'语音选衣',exact:true}).click();await expect(voice.getByRole('status').last()).toContainText(r.capabilities.recognition?/语音输入|麦克风|语音服务/:/不支持语音输入/);r.microphoneNotice=await voice.getByRole('status').last().innerText();check('麦克风与语音输入提示','pass','No physical microphone permission or recognition success inferred');
      await page.getByLabel('衣物拥有件数').fill('2');await expect(page.getByLabel('衣物拥有件数')).toHaveValue('2');check('原衣柜交互','pass');
      await voice.screenshot({path:path.join(dir,name+'-wardrobe.png')});
      const session=await context.request.get(base+'/api/auth/session'),log=await context.request.post(base+'/api/auth/_log',{form:{}});check('原认证路由',session.status()===200&&log.ok()?'pass':'fail',{session:session.status(),log:log.status(),unrelatedToTts:true});
      check('未捕获页面JS异常',r.pageErrors.length?'fail':'pass',r.pageErrors);
    }catch(e){check('回归执行','fail',e.message.slice(0,600));}
    finally{if(browser)await browser.close();save();}
  }
  process.exitCode=Object.values(report.browsers).some(r=>r.checks.some(c=>c.status==='fail'))?1:0;
})().catch(()=>{report.failure='Runner failed; raw error omitted';save();process.exitCode=1;});
