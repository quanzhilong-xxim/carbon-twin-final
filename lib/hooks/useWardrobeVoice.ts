'use client';
import { useEffect, useRef, useState } from 'react';
import { useSpeech } from './useSpeech';
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:{results:{[n:number]:{[n:number]:{transcript:string}}}})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function useWardrobeVoice(onCommand:(text:string)=>void){
 const [enabled,setEnabled]=useState(false),[listening,setListening]=useState(false),[notice,setNotice]=useState('');
 const speech=useSpeech();
 const recognition=useRef<Recognition|null>(null),command=useRef(onCommand);command.current=onCommand;
 useEffect(()=>()=>{recognition.current?.stop();},[]);
 const speak=(text:string)=>{if(enabled)speech.speak(text);};
 const toggle=()=>{if(enabled)speech.stop();setEnabled(!enabled);};
 const listen=()=>{speech.stop();if(listening){recognition.current?.stop();return;}const w=window as SpeechWindow,R=w.SpeechRecognition??w.webkitSpeechRecognition;if(!R){setNotice('此浏览器不支持语音输入，请直接点选衣物。');return;}const r=new R();r.lang='zh-CN';r.continuous=false;r.interimResults=false;r.onresult=e=>{command.current(e.results[0][0].transcript);};r.onerror=e=>{setNotice(e.error==='not-allowed'?'麦克风权限未开放，可继续点选衣物。':'语音输入暂不可用，请点选衣物。');setListening(false);};r.onend=()=>setListening(false);recognition.current=r;setNotice('语音输入可能由浏览器的在线语音服务处理。');try{r.start();setListening(true);}catch{setListening(false);setNotice('语音服务暂不可用，请点选衣物。');}};
 return {...speech,enabled,listening,notice:speech.notice || notice,setNotice,speak,toggle,listen};
}
