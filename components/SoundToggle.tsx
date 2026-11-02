'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
export default function SoundToggle(){
  const [enabled,setEnabled]=useState(false),audio=useRef<AudioContext|null>(null),last=useRef(0);
  useEffect(()=>{
    if(!enabled)return;
    const play=(event:Event)=>{const now=performance.now();if(now-last.current<85)return;const target=event.target;if(!(target instanceof Element)||!target.closest('button,input[type=range],summary'))return;last.current=now;
      const context=audio.current??new AudioContext();audio.current=context;void context.resume().catch(()=>undefined);const source=context.createOscillator(),gain=context.createGain();source.type='sine';source.frequency.setValueAtTime(event.type==='input'?520:860,context.currentTime);source.frequency.exponentialRampToValueAtTime(180,context.currentTime+.045);gain.gain.setValueAtTime(.018,context.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.065);source.connect(gain);gain.connect(context.destination);source.start();source.stop(context.currentTime+.07);source.onended=()=>{source.disconnect();gain.disconnect();};};
    document.addEventListener('click',play);document.addEventListener('input',play);return()=>{document.removeEventListener('click',play);document.removeEventListener('input',play);};
  },[enabled]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  return <button className="sound-toggle" aria-label={enabled?'关闭交互音效':'开启交互音效'} aria-pressed={enabled} onClick={()=>setEnabled(!enabled)}>{enabled?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>音效{enabled?'开':'关'}</span></button>;
}
