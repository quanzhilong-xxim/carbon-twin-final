'use client';
import { useEffect, useRef, useState } from 'react';
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:{results:{[n:number]:{[n:number]:{transcript:string}}}})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function useWardrobeVoice(onCommand:(text:string)=>void){
 const [enabled,setEnabled]=useState(false),[speaking,setSpeaking]=useState(false),[listening,setListening]=useState(false),[voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[voice,setVoice]=useState(''),[notice,setNotice]=useState('');
 const recognition=useRef<Recognition|null>(null),command=useRef(onCommand);command.current=onCommand;
 useEffect(()=>{if(!('speechSynthesis'in window)){setNotice('当前浏览器不支持语音朗读，文字功能仍可使用。');return;}const refresh=()=>{const all=speechSynthesis.getVoices().filter(v=>/^zh/i.test(v.lang));setVoices(all);setVoice(current=>current||all.find(v=>/Xiaoxiao|晓晓|Xiaoyi|晓伊|Tingting|Huihui|女/i.test(v.name))?.voiceURI||all[0]?.voiceURI||'');};refresh();speechSynthesis.addEventListener('voiceschanged',refresh);return()=>{speechSynthesis.removeEventListener('voiceschanged',refresh);speechSynthesis.cancel();recognition.current?.stop();};},[]);
 const speak=(text:string)=>{if(!enabled||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.voice=voices.find(v=>v.voiceURI===voice)??null;u.rate=1;u.pitch=1.06;u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);u.onerror=()=>setSpeaking(false);speechSynthesis.speak(u);};
 const toggle=()=>{if(enabled&&'speechSynthesis'in window){speechSynthesis.cancel();setSpeaking(false);}setEnabled(!enabled);};
 const listen=()=>{if(listening){recognition.current?.stop();return;}const w=window as SpeechWindow,R=w.SpeechRecognition??w.webkitSpeechRecognition;if(!R){setNotice('此浏览器不支持语音输入，请直接点选衣物。');return;}const r=new R();r.lang='zh-CN';r.continuous=false;r.interimResults=false;r.onresult=e=>{command.current(e.results[0][0].transcript);};r.onerror=e=>{setNotice(e.error==='not-allowed'?'麦克风权限未开放，可继续点选衣物。':'语音输入暂不可用，请点选衣物。');setListening(false);};r.onend=()=>setListening(false);recognition.current=r;setNotice('语音输入可能由浏览器的在线语音服务处理。');try{r.start();setListening(true);}catch{setListening(false);setNotice('语音服务暂不可用，请点选衣物。');}};
 return {enabled,speaking,listening,voices,voice,setVoice,notice,setNotice,speak,toggle,listen};
}
