'use client';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { activateSpeech, pauseSpeech, playSpeech, resumeSpeech, setSpeechAutoSpeak, setSpeechMuted, setSpeechVolume, stopSpeech, subscribeSpeech, speechSnapshot, serverSpeechSnapshot } from '@/lib/speech/player';
import type { SpeechMode } from '@/lib/speech/catalog';

export function useSpeech() {
  const owner = useId();
  const playback = useSyncExternalStore(subscribeSpeech, speechSnapshot, serverSpeechSnapshot);
  const [mode, setModeState] = useState<SpeechMode>('auto');
  const [voice, setVoiceState] = useState('');
  const [deviceVoice, setDeviceVoiceState] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const lastText = useRef('');
  const stop = useCallback(() => stopSpeech(owner), [owner]);
  useEffect(() => {
    const refresh = () => setVoices(window.speechSynthesis?.getVoices().filter(v => /^zh/i.test(v.lang)) ?? []);
    refresh(); window.speechSynthesis?.addEventListener('voiceschanged', refresh);
    return () => { window.speechSynthesis?.removeEventListener('voiceschanged', refresh); stopSpeech(owner); };
  }, [owner]);
  const autoSpeak = playback.autoSpeak;
  const setAutoSpeak = useCallback((next: boolean) => setSpeechAutoSpeak(next), []);
  const speak = useCallback((text: string) => { lastText.current = text; void playSpeech(owner, text, { mode, voice, deviceVoice }); }, [owner, mode, voice, deviceVoice]);
  const replay = useCallback(() => { if (lastText.current) void playSpeech(owner, lastText.current, { mode, voice, deviceVoice }); }, [owner, mode, voice, deviceVoice]);
  const activate = useCallback(async () => { const ok = await activateSpeech(owner); if (ok) setAutoSpeak(true); return ok; }, [owner, setAutoSpeak]);
  const pause = useCallback(() => { void pauseSpeech(owner); }, [owner]);
  const resume = useCallback(() => { void resumeSpeech(owner); }, [owner]);
  const setVolume = useCallback((value: number) => setSpeechVolume(value), []);
  const setMuted = useCallback((value: boolean) => setSpeechMuted(value), []);
  const setMode = (next: SpeechMode) => { stop(); setModeState(next); };
  const setVoice = (next: string) => { stop(); setVoiceState(next); };
  const setDeviceVoice = (next: string) => { stop(); setDeviceVoiceState(next); };
  const own = playback.owner === owner;
  return { speak, replay, stop, pause, resume, activate, activated: playback.activated, autoSpeak, setAutoSpeak, volume: playback.volume, setVolume, muted: playback.muted, setMuted, canReplay: !!lastText.current && playback.canReplay, mode, setMode, voice, setVoice, deviceVoice, setDeviceVoice, voices,
    speaking: own && playback.status === 'playing', loading: own && playback.status === 'loading',
    paused: own && playback.status === 'paused', failed: own && playback.status === 'error', notice: own ? playback.notice : '', engine: own ? playback.engine : '',
  };
}
