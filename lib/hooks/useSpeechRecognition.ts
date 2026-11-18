'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Browser speech-to-text for the AI coach (free, no server credential).
 *
 * This uses the Web Speech API shipped by the browser. It may rely on the
 * browser vendor's online recognition service, so availability differs by
 * browser/region; the UI must always keep manual typing available and must never
 * claim a transcript was produced when the API is missing or permission is denied.
 */
export type RecognitionSupport = 'unknown' | 'available' | 'unsupported';
export type RecognitionStatus = 'idle' | 'listening' | 'stopped' | 'denied' | 'error';

interface SpeechRecognitionAlternativeLike { transcript: string; confidence?: number }
interface SpeechRecognitionResultLike { isFinal: boolean; length: number; [index: number]: SpeechRecognitionAlternativeLike }
interface SpeechRecognitionEventLike { resultIndex: number; results: { length: number; [index: number]: SpeechRecognitionResultLike } }
interface SpeechRecognitionErrorLike { error?: string; message?: string }
interface SpeechRecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type RecognitionConstructor = new () => SpeechRecognitionLike;

/** Map a SpeechRecognition error code to user-facing Chinese copy (pure, testable). */
export function describeRecognitionError(code: string | undefined): { status: RecognitionStatus; message: string } {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return { status: 'denied', message: '麦克风权限被拒绝。请在浏览器地址栏允许麦克风，或改用键盘输入。' };
    case 'no-speech':
      return { status: 'error', message: '没有听到语音，请靠近麦克风再说一次，或改用键盘输入。' };
    case 'audio-capture':
      return { status: 'error', message: '未检测到可用麦克风，请检查设备，或改用键盘输入。' };
    case 'network':
      return { status: 'error', message: '浏览器的语音识别服务连接失败（可能受网络限制），请改用键盘输入。' };
    case 'aborted':
      return { status: 'stopped', message: '' };
    default:
      return { status: 'error', message: '语音识别暂不可用，请改用键盘输入。' };
  }
}

/** Join final + interim recognition fragments deterministically (pure, testable). */
export function joinRecognitionText(finalParts: string[], interim: string): string {
  const finalText = finalParts.join('').trim();
  const interimText = (interim ?? '').trim();
  if (!interimText) return finalText;
  return finalText ? `${finalText}${/[，。！？,.!?]$/.test(finalText) ? '' : ' '}${interimText}` : interimText;
}

export function useSpeechRecognition(lang = 'zh-CN') {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef<string[]>([]);
  const mountedRef = useRef(true);
  const [support, setSupport] = useState<RecognitionSupport>('unknown');
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [notice, setNotice] = useState('');
  const [transcript, setTranscript] = useState('');

  const constructor = useMemo<RecognitionConstructor | null>(() => {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  useEffect(() => {
    setSupport(constructor ? 'available' : 'unsupported');
    return () => {
      mountedRef.current = false;
      try { recognitionRef.current?.abort(); } catch { /* Already stopped. */ }
      recognitionRef.current = null;
    };
  }, [constructor]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* Not running. */ }
  }, []);
  const cancel = useCallback(() => {
    finalRef.current = [];
    setTranscript('');
    setNotice('');
    try { recognitionRef.current?.abort(); } catch { /* Not running. */ }
    recognitionRef.current = null;
    setStatus('idle');
  }, []);

  const start = useCallback(() => {
    if (!constructor) {
      setSupport('unsupported');
      setStatus('error');
      setNotice('当前浏览器不支持语音识别，请使用键盘输入。');
      return false;
    }
    if (recognitionRef.current) { stop(); return false; }
    finalRef.current = [];
    setTranscript('');
    setNotice('');
    setStatus('listening');
    const recognition = new constructor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { if (mountedRef.current) { setStatus('listening'); setNotice('正在聆听…说完会自动结束。'); } };
    recognition.onresult = (event) => {
      const finalParts = finalRef.current.slice();
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? '';
        if (result?.isFinal) finalParts.push(text); else interim += text;
      }
      finalRef.current = finalParts;
      if (mountedRef.current) setTranscript(joinRecognitionText(finalParts, interim));
    };
    recognition.onerror = (event) => {
      const described = describeRecognitionError(event?.error);
      if (mountedRef.current) { setStatus(described.status); setNotice(described.message); }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (!mountedRef.current) return;
      setStatus((current) => (current === 'listening' ? 'stopped' : current));
      setTranscript((current) => {
        const finalText = joinRecognitionText(finalRef.current, '');
        return finalText || current;
      });
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch {
      recognitionRef.current = null;
      setStatus('error');
      setNotice('无法启动语音识别，请检查浏览器设置或改用键盘输入。');
      return false;
    }
    return true;
  }, [constructor, lang, stop]);

  return { support, status, notice, transcript, start, stop, cancel, listening: status === 'listening' };
}
