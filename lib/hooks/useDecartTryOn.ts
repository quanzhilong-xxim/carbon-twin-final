'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createDecartClient, models, type RealTimeClient } from '@decartai/sdk';
import type { GarmentId } from '@/lib/wardrobe';
import { tryOnGarment } from '@/lib/tryon/garments';
import { TRY_ON_MODEL, TRY_ON_DEFAULT_SECONDS, TRY_ON_MAX_SECONDS } from '@/lib/tryon/policy';

export type SessionStatus = 'idle' | 'requesting' | 'preview' | 'connecting' | 'connected' | 'generating' | 'reconnecting' | 'stopping' | 'stopped' | 'unavailable';
type StagedGarment = { file: File; prompt: string };

function classifyError(cause: unknown) {
  const name = cause instanceof Error ? cause.name : '';
  if (name === 'NotAllowedError') return '摄像头权限被拒绝，请在网站设置中允许后重试。';
  if (name === 'NotFoundError') return '未找到摄像头，请连接设备后重试。';
  if (name === 'NotReadableError') return '摄像头被占用或无法读取。';
  // Provider errors can contain URLs with credentials: never reflect raw messages.
  return '试穿未能建立或已经中断。连接已清理，不会自动重试；请检查网络、授权和服务端状态。';
}

export function useDecartTryOn(garment: GarmentId, createClient = createDecartClient) {
  const video = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const session = useRef<RealTimeClient | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const runId = useRef(0);
  const selected = useRef(garment);
  selected.current = garment;
  const active = useRef(false);
  const previewPending = useRef(false);
  // Kept locked until connect() settles, even after Stop. SDK 0.2.14 has no connect AbortSignal.
  const dialing = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const staged = useRef<StagedGarment | null>(null);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [remoteReady, setRemoteReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [appliedGarment, setAppliedGarment] = useState<GarmentId | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => { timers.current.delete(timer); fn(); }, ms);
    timers.current.add(timer); return timer;
  }, []);

  const dispose = useCallback(() => {
    ++runId.current;
    active.current = false;
    previewPending.current = false;
    controller.current?.abort(); controller.current = null;
    timers.current.forEach(clearTimeout); timers.current.clear();
    const connection = session.current; session.current = null;
    try { connection?.disconnect(); } catch { /* Continue local cleanup. */ }
    remoteStream.current?.getTracks().forEach(track => track.stop()); remoteStream.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    for (const ref of [video, localVideo]) {
      if (ref.current) { ref.current.onplaying = null; ref.current.pause(); ref.current.srcObject = null; }
    }
  }, []);

  const finish = useCallback((message = '') => {
    dispose(); setRemoteReady(false); setCameraReady(false); setAppliedGarment(null);
    setStatus('stopped'); setNotice(message); setError('');
  }, [dispose]);
  const stop = useCallback(() => finish('试穿已停止，摄像头已关闭。不会自动重新连接。'), [finish]);
  const fail = useCallback((message: string) => {
    dispose(); setRemoteReady(false); setCameraReady(false); setAppliedGarment(null);
    setStatus('unavailable'); setError(message); setNotice('');
  }, [dispose]);

  const preview = useCallback(async () => {
    if (active.current || previewPending.current || dialing.current) return;
    if (stream.current?.getVideoTracks().some(t => t.readyState === 'live')) return;
    previewPending.current = true;
    const run = runId.current;
    setStatus('requesting'); setError(''); setNotice('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('MEDIA_UNAVAILABLE');
      const camera = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 25, max: 30 } } });
      if (run !== runId.current) { camera.getTracks().forEach(t => t.stop()); return; }
      stream.current = camera;
      camera.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (run === runId.current) fail('摄像头已断开，试穿已停止。');
      }, { once: true }));
      if (localVideo.current) { localVideo.current.srcObject = camera; await localVideo.current.play(); }
      if (run !== runId.current) return;
      setCameraReady(true); setStatus('preview');
      setNotice('仅本地摄像头预览；尚未发送视频，也未启动 AI。');
    } catch (cause) { if (run === runId.current) fail(classifyError(cause)); }
    finally { if (run === runId.current) previewPending.current = false; }
  }, [fail]);

  const uploadGarment = useCallback(async (file: File, prompt: string) => {
    if (active.current || dialing.current) { setError('请先停止试穿，再准备下一件衣物。'); return false; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024 || file.size === 0) {
      setError('请选择不超过 8 MB 的 JPEG、PNG 或 WebP 图片。'); return false;
    }
    staged.current = { file, prompt }; setUploaded(true); setError('');
    setNotice('参考图已暂存本地，将用于下一次明确授权的试穿；未调用 AI。'); return true;
  }, []);
  const clearUpload = useCallback(() => { staged.current = null; setUploaded(false); }, []);
  useEffect(() => { clearUpload(); }, [garment, clearUpload]);

  const start = useCallback(async (targetSeconds = TRY_ON_DEFAULT_SECONDS, consent = false) => {
    if (active.current || dialing.current || previewPending.current) return;
    if (!consent) { setError('请先确认收费风险；打开摄像头不等于同意收费。'); return; }
    if (!Number.isInteger(targetSeconds) || targetSeconds < 3 || targetSeconds > TRY_ON_MAX_SECONDS) { setError('目标时长必须为 3～5 秒。'); return; }
    const camera = stream.current;
    if (!camera?.getVideoTracks().some(track => track.readyState === 'live')) { setError('请先打开本地摄像头并确认画面。'); return; }
    if (!navigator.onLine) { setError('网络已断开；未启动连接。'); return; }
    active.current = true; dialing.current = true;
    const run = runId.current, current = () => run === runId.current && active.current;
    const abort = new AbortController(); controller.current = abort;
    setStatus('connecting'); setError(''); setNotice('');
    const initialId = selected.current, upload = staged.current;
    let hardTimer: ReturnType<typeof setTimeout> | undefined;
    let playbackTimerStarted = false;
    try {
      // Prepare reference bytes before obtaining a short-lived token or connecting.
      let image: Blob;
      if (upload) image = upload.file;
      else {
        const response = await fetch(tryOnGarment(initialId).imagePath, { cache: 'no-cache', signal: abort.signal });
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('IMAGE_FAILED');
        image = await response.blob();
      }
      if (!current()) return;
      const tokenTimeout = later(() => { if (current()) fail('授权请求超时，已停止；不会自动重试。'); }, 12000);
      const response = await fetch('/api/decart/token', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent, targetSeconds }), cache: 'no-store', signal: abort.signal });
      clearTimeout(tokenTimeout); timers.current.delete(tokenTimeout);
      const data = await response.json() as { apiKey?: string; model?: string; serverMaxSeconds?: number };
      if (!current()) return;
      if (!response.ok || !data.apiKey || data.model !== TRY_ON_MODEL || data.serverMaxSeconds !== 10) {
        fail(response.status === 403 ? '收费试穿未授权，已阻止连接。' : response.status === 409 ? '本次授权已使用，已阻止重复连接。' : `授权接口不可用（HTTP ${response.status}），未连接 AI。`); return;
      }
      let token: string | undefined = data.apiKey;
      const client = createClient({ telemetry: false, logger: { debug() {}, info() {}, warn() {}, error() {} }, apiKeyProvider: async () => {
        // A reconnect never gets another token, even if SDK asks for one.
        if (!current() || !token) throw new Error('RECONNECT_DISABLED');
        const result = token; token = undefined; return result;
      } });
      // Absolute frontend watchdog begins BEFORE connect, includes initialization.
      // Provider independently enforces 10s; frontend 5s is NOT an absolute billing cap.
      hardTimer = later(() => { if (current()) finish('已达到 5 秒连接目标上限，主动结束；最终费用以服务端账单为准。'); }, TRY_ON_MAX_SECONDS * 1000);
      const connection = await client.realtime.connect(camera, {
        model: models.realtime(TRY_ON_MODEL), mirror: 'auto', retries: 0, capacityRetryBudgetMs: 0,
        initialState: { prompt: { text: upload?.prompt ?? tryOnGarment(initialId).prompt, enhance: false }, image },
        onRemoteStream: remote => {
          if (!current() || !video.current) return;
          const tracks = remote.getVideoTracks();
          const localIds = new Set(camera.getVideoTracks().map(t => t.id));
          if (remote === camera || tracks.some(t => localIds.has(t.id)) || !tracks.some(t => t.readyState === 'live')) {
            fail('返回的视频不是独立的远端视频流，已停止；不会把摄像头预览当作 AI 结果。'); return;
          }
          remoteStream.current = remote;
          tracks.forEach(track => track.addEventListener('ended', () => { if (current()) fail('AI 视频流已结束。'); }, { once: true }));
          const element = video.current;
          element.onplaying = () => {
            if (!current()) return;
            setRemoteReady(true); setStatus('connected'); setAppliedGarment(initialId);
            if (!playbackTimerStarted) {
              playbackTimerStarted = true;
              later(() => { if (current()) finish('本次试穿目标时长结束，已主动断开。'); }, targetSeconds * 1000);
              let previous = -1, unchanged = 0;
              const check = () => {
                if (!current()) return;
                unchanged = element.currentTime === previous ? unchanged + 1 : 0; previous = element.currentTime;
                if (unchanged >= 3) { fail('AI 画面停止更新，已清除画面并断开。'); return; }
                later(check, 500);
              }; later(check, 500);
            }
          };
          element.srcObject = remote;
          void element.play().catch(() => { if (current()) fail('AI 视频播放失败，连接已停止。'); });
        },
        onConnectionChange: state => {
          if (!current()) return;
          if (state === 'reconnecting' || state === 'disconnected') { fail('云端连接中断；已停止，禁止自动重连。'); return; }
          if (state !== 'connected') setStatus(state);
        },
      });
      if (!current()) { connection.disconnect(); return; }
      session.current = connection;
      connection.on('sessionEnded', () => { if (current()) finish('服务端已结束试穿会话。'); });
      connection.on('error', () => { if (current()) fail('云端试穿异常，连接已清理。'); });
    } catch (cause) { if (current()) fail(classifyError(cause)); }
    finally {
      dialing.current = false;
      // The watchdog stays armed for a live session; dispose clears it on every exit.
      if (!current() && hardTimer) clearTimeout(hardTimer);
    }
  }, [createClient, fail, finish, later]);

  useEffect(() => {
    const offline = () => { if (active.current) fail('网络已断开，试穿已结束，不会自动重连。'); };
    const pagehide = () => stop();
    const hidden = () => { if (document.visibilityState === 'hidden') stop(); };
    window.addEventListener('offline', offline); window.addEventListener('pagehide', pagehide);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('pagehide', pagehide); document.removeEventListener('visibilitychange', hidden); dispose(); };
  }, [dispose, fail, stop]);

  // Selection changes are staged ONLY. No connection.set(), automatic calls or retries.
  return { video, localVideo, status, remoteReady, cameraReady, swapPending: false, frozenFrame: '', error, notice,
    setError, start, stop, preview, uploadGarment, clearUpload, uploaded, appliedGarment };
}
