'use client';
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Camera, Mic, Volume2, VolumeX, ScanLine, ArrowUpRight, Check, Aperture } from 'lucide-react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { saveARSnapshot } from '@/lib/storage/ARSnapshot';
import { recordLearning } from '@/lib/storage/LearningDB';
import { askEvidence } from '@/lib/visualDynamics';
import { GARMENTS, CLOTHING_PROMPTS, annualGarmentAllocation, garmentSpeech } from '@/lib/wardrobe';
import { useWardrobeVoice } from '@/lib/hooks/useWardrobeVoice';
import { useUIStore } from '@/lib/stores/UIStore';
type Tracking='idle'|'loading'|'searching'|'tracked'|'unavailable';
type Suggestion={index:number;score:number};
type PoseSample={x:number;y:number;width:number;height:number,angle:number;visible:boolean};
const OVERLAY_ASSETS:Record<string,string>={tshirt:'/models/clothing/tshirt.glb',longsleeve:'/models/clothing/sweater.glb',coat:'/models/denim_jacket.glb',trousers:'/models/clothing/trousers.glb',shorts:'/models/clothing/shorts.glb',wool:'/models/clothing/sweater.glb',jeans:'/models/clothing/jeans.glb'};
const GALLERY_GARMENTS=['tshirt','wool','jeans','coat','trousers','shorts'];

function OverlayGarment({ garmentId, pose }: { garmentId:string; pose:MutableRefObject<PoseSample> }) {
 const {scene}=useGLTF(OVERLAY_ASSETS[garmentId],'/models/draco/');
 const root=useMemo(()=>{
  const clone=scene.clone(true);clone.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  clone.position.sub(center);
  clone.traverse(node=>{if(!(node instanceof THREE.Mesh))return;if(garmentId==='shorts'&&/tassel/i.test(node.name)){node.visible=false;return;}node.frustumCulled=false;node.renderOrder=2;node.material=Array.isArray(node.material)?node.material.map(material=>{const copy=(material as THREE.MeshStandardMaterial).clone();return styleMaterial(copy,garmentId);}):styleMaterial((node.material as THREE.MeshStandardMaterial).clone(),garmentId);});
  return {clone,size};
 },[scene,garmentId]);
 const group=useRef<THREE.Group>(null), targetPosition=useMemo(()=>new THREE.Vector3(),[]), targetScale=useMemo(()=>new THREE.Vector3(),[]);
 const viewport=useThree(state=>state.size);
 useFrame((_,dt)=>{
  const g=group.current;if(!g)return;const sample=pose.current,{width,height}=viewport;
  if(!sample.visible||width===0||height===0){targetScale.setScalar(0);}else{
   const lowerBody=['jeans','trousers','shorts'].includes(garmentId);
   targetPosition.set(sample.x*width-width/2,height/2-sample.y*height-(lowerBody?sample.height*height*(garmentId==='shorts'?.45:.78):0),0);
   const desiredWidth=sample.width*width*(lowerBody?.92:1.14),desiredHeight=sample.height*height*(lowerBody?(garmentId==='shorts'?1.1:1.9):1.08);
   targetScale.set(desiredWidth/Math.max(root.size.x,.001),desiredHeight/Math.max(root.size.y,.001),desiredWidth/Math.max(root.size.x,.001));
  }
  const alpha=1-Math.exp(-12*dt);g.position.lerp(targetPosition,alpha);g.scale.lerp(targetScale,alpha);g.rotation.z=THREE.MathUtils.damp(g.rotation.z,sample.visible?sample.angle:0,12,dt);
 });
 return <group ref={group} visible name="tracked-garment-overlay"><primitive object={root.clone} dispose={null}/></group>;
}

function styleMaterial(material:THREE.MeshStandardMaterial,garmentId:string){
 material.color.set(garmentId==='coat'?'#1A2A42':garmentId==='shorts'?'#665d43':'#dddcd5');
 material.metalness=0;material.roughness=garmentId==='wool'?.95:.9;material.side=THREE.DoubleSide;
 if(garmentId==='coat')material.map=null;
 return material;
}
export default function ARGarmentTryOn(){
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),overlayCanvas=useRef<HTMLCanvasElement|null>(null),stream=useRef<MediaStream|null>(null),model=useRef<PoseLandmarker|null>(null),worker=useRef<Worker|null>(null);
 const frame=useRef(0),generation=useRef(0),alive=useRef(true),lastDetect=useRef(0),lastLightSample=useRef(0),classifyTimer=useRef<ReturnType<typeof setTimeout>>(),foregroundCanvas=useRef<HTMLCanvasElement|null>(null),maskCanvas=useRef<HTMLCanvasElement|null>(null),ambient=useRef<THREE.AmbientLight>(null);
 const [garment,setGarment]=useState(0),[quantity,setQuantity]=useState(1),[years,setYears]=useState(3),[active,setActive]=useState(false),[tracking,setTracking]=useState<Tracking>('idle'),[error,setError]=useState(''),[snapshot,setSnapshot]=useState('');
 const [classification,setClassification]=useState(''),[classifying,setClassifying]=useState(false),[suggestions,setSuggestions]=useState<Suggestion[]>([]),[origin,setOrigin]=useState('手动选择');
 const reduced=useUIStore(s=>s.reduced),points=useRef<{x:number;y:number;visibility?:number}[]>([]),trackingRef=useRef<Tracking>('idle');
 const pose=useRef<PoseSample>({x:.5,y:.5,width:0,height:0,angle:0,visible:false});
 const item=GARMENTS[garment],annual=annualGarmentAllocation(item.kg,quantity,years);
 const select=(index:number,source='手动选择')=>{setGarment(index);setOrigin(source);voice.speak(garmentSpeech(index,quantity,years));};
 const voice=useWardrobeVoice(text=>{const i=GARMENTS.findIndex(g=>text.includes(g.name));if(i>=0)select(i,'语音选择');else voice.setNotice('请说“选择短袖”“选择牛仔裤”等衣物名称。');});
 const track=(value:Tracking)=>{if(trackingRef.current===value)return;trackingRef.current=value;if(alive.current)setTracking(value);};
 useEffect(()=>{const onSelect=(event:Event)=>{const target=event.target;if(!(target instanceof Element))return;const nav=target.closest('.clothing-gallery-nav');if(!nav)return;const button=target.closest('button');if(!button)return;const index=Array.from(nav.querySelectorAll('button')).indexOf(button);if(index<0||index>=GALLERY_GARMENTS.length)return;const garmentId=GALLERY_GARMENTS[index],nextIndex=GARMENTS.findIndex(entry=>entry.id===garmentId);if(nextIndex>=0){setGarment(nextIndex);setOrigin('展厅选择');}};document.addEventListener('click',onSelect);return()=>document.removeEventListener('click',onSelect);},[]);
 const halt=()=>{generation.current++;cancelAnimationFrame(frame.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;model.current?.close();model.current=null;if(video.current){video.current.pause();video.current.srcObject=null;}points.current=[];pose.current.visible=false;worker.current?.terminate();worker.current=null;clearTimeout(classifyTimer.current);};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;halt();};},[]);
 const stop=()=>{halt();setActive(false);setClassifying(false);setClassification('');track('idle');};
 const draw=(now:number)=>{
  const v=video.current,c=canvas.current;if(!v||!c||!alive.current)return;const ctx=c.getContext('2d');if(!ctx)return;
  if(v.readyState>=2){const rect=c.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const inputRatio=v.videoWidth/v.videoHeight,outputRatio=w/h;let sx=0,sy=0,sw=v.videoWidth,sh=v.videoHeight;if(inputRatio>outputRatio){sw=v.videoHeight*outputRatio;sx=(v.videoWidth-sw)/2;}else{sh=v.videoWidth/outputRatio;sy=(v.videoHeight-sh)/2;}ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(v,sx,sy,sw,sh,0,0,w,h);ctx.restore();
   const screen=(a:{x:number;y:number})=>({x:1-(a.x*v.videoWidth-sx)/sw,y:(a.y*v.videoHeight-sy)/sh});
   if(model.current&&now-lastDetect.current>=1000/30){lastDetect.current=now;try{const result=model.current.detectForVideo(v,now);points.current=result.landmarks[0]??[];const a=points.current[11],b=points.current[12],l=points.current[23],r=points.current[24];const tracked=!!a&&!!b&&!!l&&!!r&&(a.visibility??0)>.55&&(b.visibility??0)>.55&&(l.visibility??0)>.4&&(r.visibility??0)>.4;track(tracked?'tracked':'searching');if(tracked){const sa=screen(a),sb=screen(b),la=screen(l),rb=screen(r);pose.current={x:(sa.x+sb.x)/2,y:(sa.y+sb.y+la.y+rb.y)/4,width:Math.abs(sa.x-sb.x),height:Math.max(.01,(la.y+rb.y-sa.y-sb.y)/2),angle:-Math.atan2(sb.y-sa.y,sb.x-sa.x),visible:true};}else pose.current.visible=false;
    const foreground=foregroundCanvas.current,mask=result.segmentationMasks?.[0];
    if(foreground&&(foreground.width!==w||foreground.height!==h)){foreground.width=w;foreground.height=h;}
    if(foreground&&tracked&&mask){
     const fw=foreground.width,fh=foreground.height,maskElement=maskCanvas.current??=document.createElement('canvas');
     if(maskElement.width!==mask.width||maskElement.height!==mask.height){maskElement.width=mask.width;maskElement.height=mask.height;}
     const maskContext=maskElement.getContext('2d');
     const values=mask.hasFloat32Array()?mask.getAsFloat32Array():mask.hasUint8Array()?mask.getAsUint8Array():null;
     if(maskContext&&values){
      const image=maskContext.createImageData(mask.width,mask.height);
      for(let i=0;i<values.length;i++){const confidence=values[i]/(mask.hasUint8Array()?255:1),edge=THREE.MathUtils.clamp((confidence-.12)/.76,0,1),alpha=Math.round(edge*edge*(3-2*edge)*255),p=i*4;image.data[p]=image.data[p+1]=image.data[p+2]=255;image.data[p+3]=alpha;}
      maskContext.putImageData(image,0,0);
      const foregroundContext=foreground.getContext('2d');
      if(foregroundContext){
       foregroundContext.clearRect(0,0,fw,fh);foregroundContext.save();foregroundContext.translate(fw,0);foregroundContext.scale(-1,1);foregroundContext.drawImage(v,sx,sy,sw,sh,0,0,fw,fh);foregroundContext.globalCompositeOperation='destination-in';foregroundContext.drawImage(maskElement,sx*mask.width/v.videoWidth,sy*mask.height/v.videoHeight,sw*mask.width/v.videoWidth,sh*mask.height/v.videoHeight,0,0,fw,fh);foregroundContext.restore();
       const pad=Math.max(7*dpr,fw*.025),left=screen(a),right=screen(b),hipR=screen(r),hipL=screen(l);foregroundContext.save();foregroundContext.globalCompositeOperation='destination-out';foregroundContext.beginPath();foregroundContext.moveTo(left.x*fw-pad,left.y*fh-pad);foregroundContext.lineTo(right.x*fw+pad,right.y*fh-pad);foregroundContext.lineTo(hipR.x*fw+pad,hipR.y*fh+pad);foregroundContext.lineTo(hipL.x*fw-pad,hipL.y*fh+pad);foregroundContext.closePath();foregroundContext.fill();foregroundContext.restore();
      }
     }
    }else if(foreground){foreground.getContext('2d')?.clearRect(0,0,foreground.width,foreground.height);}
    result.close();
    if(ambient.current&&now-lastLightSample.current>1000){lastLightSample.current=now;const sample=document.createElement('canvas');sample.width=16;sample.height=16;const sampleContext=sample.getContext('2d',{willReadFrequently:true});if(sampleContext){sampleContext.drawImage(v,0,0,16,16);const pixels=sampleContext.getImageData(0,0,16,16).data;let luminance=0;for(let i=0;i<pixels.length;i+=4)luminance+=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];ambient.current.intensity=THREE.MathUtils.lerp(.55,1.5,luminance/(pixels.length/4*255));}}
   }catch{model.current.close();model.current=null;pose.current.visible=false;track('unavailable');}}
   const p=points.current;if(trackingRef.current==='tracked'){ctx.strokeStyle='#d4e3d0';ctx.lineWidth=2*dpr;ctx.fillStyle='#d4e3d0';for(const i of [11,12,23,24]){const a=p[i];if(!a||(a.visibility??0)<.5)continue;const pos=screen(a);ctx.beginPath();ctx.arc(pos.x*w,pos.y*h,5*dpr,0,Math.PI*2);ctx.stroke();}if(p[11]&&p[12]){const a=screen(p[11]),b=screen(p[12]);ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.lineTo(b.x*w,b.y*h);ctx.stroke();}}
  }frame.current=requestAnimationFrame(draw);
 };
 const start=async()=>{
  halt();const run=generation.current;setError('');setSnapshot('');track('loading');
  try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('请在支持摄像头的 HTTPS 浏览器中打开。');
   const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960},height:{ideal:720}},audio:false});if(run!==generation.current||!alive.current){media.getTracks().forEach(t=>t.stop());return;}
   stream.current=media;const v=video.current;if(!v)throw new Error('预览未就绪');v.srcObject=media;await v.play();if(run!==generation.current)return;setActive(true);frame.current=requestAnimationFrame(draw);
   const {FilesetResolver,PoseLandmarker:Landmarker}=await import('@mediapipe/tasks-vision');const files=await FilesetResolver.forVisionTasks('/mediapipe/wasm');if(run!==generation.current||!alive.current)return;
   const detector=await Landmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'/mediapipe/pose_landmarker_lite.task',delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minTrackingConfidence:.5,outputSegmentationMasks:true});if(run!==generation.current||!alive.current){detector.close();return;}model.current=detector;track('searching');void recordLearning({type:'module',module:'ar-pose-explore'}).catch(()=>undefined);
  }catch(e){if(run!==generation.current||!alive.current)return;track('unavailable');const denied=e instanceof DOMException&&e.name==='NotAllowedError';setError(denied?'摄像头权限未开启。仍可选择衣物、调整情景和收听解说。':`摄像头或姿态模型暂不可用。${e instanceof Error?e.message:''} 仍可使用右侧情景。`);if(!stream.current)setActive(false);}
 };
 const classify=()=>{
  if(classifying){worker.current?.terminate();worker.current=null;clearTimeout(classifyTimer.current);setClassifying(false);setClassification('已取消，手动选择仍可使用。');return;}
  if(!active||!video.current)return;const c=document.createElement('canvas');c.width=384;c.height=384;const ctx=c.getContext('2d');if(!ctx)return;const v=video.current,size=Math.min(v.videoWidth,v.videoHeight);ctx.drawImage(v,(v.videoWidth-size)/2,(v.videoHeight-size)/2,size,size,0,0,384,384);
  setClassifying(true);setSuggestions([]);setClassification('首次下载本地图像模型（约 150 MB），仅传输模型，不上传画面…');
  try{worker.current??=new Worker('/wardrobe-worker.mjs',{type:'module'});const w=worker.current;
   const finish=()=>{clearTimeout(classifyTimer.current);setClassifying(false);};
   w.onmessage=e=>{if(!alive.current)return;const data=e.data;if(data.type==='progress'){if(data.value.status==='progress')setClassification(`下载图像模型 ${Math.round(data.value.progress??0)}% · ${data.value.file??''}`);else if(data.value.status==='ready')setClassification('正在当前设备比较七种衣物类别…');}
    if(data.type==='result'){finish();const result=(data.result as {label:string;score:number}[]).slice(0,3).map(r=>({index:CLOTHING_PROMPTS.indexOf(r.label),score:r.score})).filter(r=>r.index>=0);setSuggestions(result);setClassification(result.length?'图像候选已生成，请确认类别；材质仍需自行核实。':'画面不足以区分类别，请手动选择。');}
    if(data.type==='error'){finish();setClassification('本地模型未能完成加载或识别，请手动选择。相机画面未上传。');w.terminate();worker.current=null;}};
   w.onerror=()=>{finish();setClassification('此设备无法运行本地分类，请手动选择。');w.terminate();worker.current=null;};
   classifyTimer.current=setTimeout(()=>{w.terminate();worker.current=null;setClassifying(false);setClassification('本地模型加载超过三分钟，已停止。请使用手动分类。');},180000);
   w.postMessage({image:c.toDataURL('image/jpeg',.85)});
  }catch{setClassifying(false);setClassification('浏览器不支持本地分类线程，请手动选择。');}
 };
 const capture=async()=>{if(!canvas.current||!active)return;try{const output=document.createElement('canvas'),ctx=output.getContext('2d');if(!ctx)throw new Error('快照画布不可用');output.width=canvas.current.width;output.height=canvas.current.height;ctx.drawImage(canvas.current,0,0);if(overlayCanvas.current)ctx.drawImage(overlayCanvas.current,0,0,output.width,output.height);const image=output.toDataURL('image/jpeg',.85);await saveARSnapshot({image,createdAt:Date.now(),garment:item.name,tracking});setSnapshot(image);}catch{setError('快照保存失败，请检查浏览器存储。');}};
 const grade=item.kg<10?'较低基准':item.kg<30?'中等基准':'较高基准';
 return <section className="ar-lab wardrobe-atelier" data-tracking={tracking} data-speaking={voice.speaking}>
 <header className="interactive-heading"><div><span className="section-kicker">THE FOOTPRINT MIRROR / 03</span><h1>Wear a little.<br/><i>Mean a lot.</i></h1><p className="atelier-subtitle">看见衣橱里的碳。让每一次穿着，更有分量。</p></div><span className="local-record-badge"><span className="live-dot"/> 画面仅本地处理</span></header>
 <div className="ar-layout"><div className="mirror-column"><div className="ar-viewport" data-active-garment={item.id}>
 <video ref={video} playsInline muted className="ar-video-source" aria-hidden="true"/><canvas ref={canvas} aria-label="本地摄像头画面与姿态定位"/>{active&&<><Canvas className="ar-garment-overlay" orthographic camera={{position:[0,0,10]}} gl={{alpha:true,antialias:true,preserveDrawingBuffer:true}} dpr={[1,1.5]} onCreated={({gl})=>{overlayCanvas.current=gl.domElement;}}><ambientLight ref={ambient} intensity={1}/><directionalLight position={[0,2,5]} intensity={1.4}/><Suspense fallback={null}><OverlayGarment garmentId={item.id} pose={pose}/></Suspense></Canvas><canvas ref={foregroundCanvas} className="ar-foreground-mask" aria-hidden="true"/> </>}
 {!active&&<div className="ar-idle"><Aperture size={28} strokeWidth={1}/><svg viewBox="0 0 300 330" aria-hidden="true"><defs><linearGradient id="fabric" x1="0" x2="1" y2="1"><stop stopColor="#66756b"/><stop offset=".5" stopColor="#b9c7b6"/><stop offset="1" stopColor="#48554d"/></linearGradient></defs><path fill="url(#fabric)" d="M104 55 62 73 20 143 72 173 95 140 95 284Q150 300 205 284L205 140 228 173 280 143 238 73 196 55Q150 102 104 55Z"/><path d="M104 55Q150 126 196 55M95 140 101 84M205 140 199 84M115 157Q103 218 118 273M182 139Q201 222 183 274" fill="none" stroke="#e8eee3" opacity=".28" strokeWidth="2"/></svg><div><span>YOUR WARDROBE.<br/>IN PERSPECTIVE.</span><p>开启相机，探索衣物类别。<br/>也可以直接从右侧选择开始。</p></div></div>}
 <div className="mirror-frame" aria-hidden="true"><i/><i/><i/><i/></div>{active&&!reduced&&<div className="mirror-scan" aria-hidden="true"/>}
 <div className="mirror-meta"><span><span className="live-dot"/>{active?'LIVE / LOCAL ONLY':'CAMERA OFF'}</span><span>NO IMAGE UPLOAD</span></div>
 </div><div className="mirror-toolbar"><button className="atelier-button light" onClick={()=>active||tracking==='loading'?stop():void start()}><Camera size={17}/>{tracking==='loading'?'取消加载':active?'关闭相机':'开启相机'}</button><button className="atelier-button" disabled={!active} onClick={classify}><ScanLine size={17}/>{classifying?'取消识别':'识别当前衣物'}</button><button className="atelier-button" disabled={!active} onClick={()=>void capture()}>保存快照 <ArrowUpRight size={16}/></button></div>
 <p className="mirror-status" role="status">{({idle:'镜头尚未开启。你的选择，始终由你确认。',loading:'等待相机权限 / 准备本地姿态模型…',searching:'未捕捉到躯干，请后退一步并让肩膀和髋部进入画面。',tracked:'肩部与躯干已定位 · 姿态定位不代表衣物或材质已识别。',unavailable:'相机或姿态定位不可用 · 保留完整手动体验。'})[tracking]}</p>
 {(classification||suggestions.length>0)&&<div className="classification-result" role="status"><p>{classification}</p><div>{suggestions.map(s=><button key={s.index} onClick={()=>select(s.index,'图像候选 · 已确认')}>{GARMENTS[s.index].name} · {(s.score*100).toFixed(0)}% 匹配</button>)}</div><small>候选分数只表示七类之间的相对匹配，并非准确率；请让一件衣物占满画面。</small></div>}
 {error&&<p className="atelier-notice" role="alert">{error}</p>}
 </div>
 <aside className="ar-sidebar"><div className="wardrobe-section-label"><span>01 / YOUR GARMENT</span><span>{origin}</span></div><div className="garment-options">{GARMENTS.map((g,i)=><button key={g.id} aria-pressed={garment===i} onClick={()=>select(i)}>{g.name}{garment===i&&<Check size={13}/>}</button>)}</div>
 <AnimatePresence mode="wait" initial={false}><motion.div key={item.id} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:reduced?0:.18}} className="wardrobe-result">
 <div className="wardrobe-section-label"><span>02 / ANNUAL ALLOCATION</span><span className={`footprint-grade grade-${item.kg<10?'low':item.kg<30?'mid':'high'}`}>{grade}</span></div>
 <div className="wardrobe-number"><strong>{annual.toFixed(2)}</strong><span>kg CO₂e / 年</span></div><p className="wardrobe-number-caption">{quantity} 件 × {item.kg} kg ÷ {years} 年 · 全生命周期年度分摊</p>
 <div className="wardrobe-inputs"><label>拥有件数<input aria-label="衣物拥有件数" type="number" min="1" max="50" value={quantity} onChange={e=>setQuantity(Math.min(50,Math.max(1,Number(e.target.value)||1)))}/></label><label>使用寿命 / 年<input aria-label="衣物使用寿命" type="number" min="1" max="20" value={years} onChange={e=>setYears(Math.min(20,Math.max(1,Number(e.target.value)||1)))}/></label></div>
 <div className="wardrobe-reference"><span>代表产品 · {item.reference}{item.proxy?' / 代理基准':''}</span><strong>{item.kg}<small> kg CO₂e / 件，全生命周期</small></strong><p>{item.advice}</p><a href={`https://impactco2.fr/outils/habillement/${item.path}`} target="_blank" rel="noreferrer">[1] ADEME / Impact CO₂ · 查看数据与边界 <ArrowUpRight size={13}/></a></div>
 </motion.div></AnimatePresence>
 <div className="wardrobe-voice"><div className="wardrobe-section-label"><span>03 / A GENTLER GUIDE</span><span>{voice.speaking?'正在朗读':voice.enabled?'语音已开启':'默认静音'}</span></div><div className="voice-actions"><button className={`voice-switch ${voice.enabled?'enabled':''}`} aria-pressed={voice.enabled} onClick={voice.toggle} aria-label={voice.enabled?'关闭穿搭语音':'开启穿搭语音'}>{voice.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button className={voice.listening?'mic listening':'mic'} aria-pressed={voice.listening} onClick={voice.listen}><Mic size={17}/>{voice.listening?'正在听…':'语音选衣'}</button><button disabled={!voice.enabled} onClick={()=>voice.speak(garmentSpeech(garment,quantity,years))}>听听建议 ↗</button><div className="voice-wave" aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i*.09}s`}}/>)}</div></div>
 {voice.enabled&&<label className="voice-selector">设备音色<select aria-label="选择朗读音色" value={voice.voice} onChange={e=>voice.setVoice(e.target.value)}><option value="">浏览器默认中文音色</option>{voice.voices.map(v=><option value={v.voiceURI} key={v.voiceURI}>{v.name}</option>)}</select></label>}{voice.notice&&<p role="status">{voice.notice}</p>}</div>
 <button className="wardrobe-ai-link" onClick={()=>askEvidence(`请依据检索文献解释服装生命周期：当前选择${item.name}，页面采用 ADEME Impact CO2 的${item.reference}${item.proxy?'代理':''}参考值${item.kg} kgCO2e/件，${quantity}件使用${years}年。此网页参考值并非用户产品实测，请明确边界，未检索到出处时不要替该数值背书。`)}>向 Carbon-E 追问碳足迹 <ArrowUpRight size={17}/></button>
 </aside></div>
 <div className="wardrobe-method"><span>THE SMALL PRINT / 方法与边界</span><p>公开基准来自法国 ADEME Impact CO₂ / Base Empreinte，查询于 2026-11-03。涵盖代表产品的生命周期，产地、质量、纤维和护理条件会改变数值。年度分摊 = 件数 × 单件全生命周期 ÷ 使用年数，是教学分摊，非当年实际排放清单。代理类不代表所选衣物的真实材质。等级只比较这些参考值，不构成环保认证。图像无法核验纤维成分；本地分类模型只在点击识别后下载。语音音色取决于设备，在线系统音色可能调用浏览器语音服务。</p></div>
 {snapshot&&<div className="ar-snapshot"><Image src={snapshot} alt="保存在当前浏览器的衣物快照" width={960} height={720} unoptimized/><p role="status">已保存至本地，下次白皮书导出将附上这张快照。</p></div>}
 </section>;
}
