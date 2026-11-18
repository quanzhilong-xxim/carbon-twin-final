'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { SceneResourceScope, sceneError } from './resource-scope';
import { automaticSceneRetryDelay } from './scene-retry-policy';
import { recordTwinDiagnostic } from '@/lib/experience/diagnostics';

export type ScenePhase = 'initializing' | 'loading' | 'rendering' | 'recovering' | 'rendered' | 'context-lost' | 'error';

export function useSceneRuntime(active: boolean, label: string, timeoutMs = 45000) {
  const [scope] = useState(() => new SceneResourceScope());
  const resourceVersion = useSyncExternalStore(scope.subscribe, scope.snapshot, scope.snapshot);
  const [generation, setGeneration] = useState(0), [renderedVersion, setRenderedVersion] = useState<number | null>(null), [created, setCreated] = useState(false);
  const [error, setError] = useState(''), [lost, setLost] = useState(false), [recovering, setRecovering] = useState(false);
  const elapsed = useRef(0), alive = useRef(true), attempt = useRef(0), automaticRetries = useRef(0), autoRetryTimer = useRef<number | undefined>();
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (autoRetryTimer.current !== undefined) window.clearTimeout(autoRetryTimer.current); }; }, []);
  const fail = useCallback((reason: unknown) => {
    if (!alive.current || attempt.current !== generation) return;
    const message = sceneError(reason); setError(message); setRenderedVersion(null);
    recordTwinDiagnostic({ kind: 'scene-error', detail: `${label}: ${message}` });
  }, [label, generation]);
  // A newly completed resource batch still needs its own displayed frame.
  // An earlier frame must never acknowledge a later model/texture change.
  const ready = renderedVersion === resourceVersion && !error && !lost && scope.pending.length === 0;
  useEffect(() => {
    if (!active || ready || error) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) elapsed.current += now - last;
      last = now;
      if (elapsed.current >= timeoutMs) fail(new Error(`三维加载超时（${timeoutMs / 1000} 秒）。${scope.pending.slice(0, 2).join('；') || '未收到实际渲染帧'}；可重试。`));
    }, 1000);
    return () => clearInterval(timer);
  }, [active, ready, error, fail, scope, timeoutMs, generation]);
  const restart = useCallback((manual: boolean) => {
    if (autoRetryTimer.current !== undefined) { window.clearTimeout(autoRetryTimer.current); autoRetryTimer.current = undefined; }
    if (manual) automaticRetries.current = 0;
    scope.retry(); elapsed.current = 0; attempt.current++; setError(''); setLost(false); setRenderedVersion(null); setCreated(false); setRecovering(true); setGeneration(attempt.current);
    recordTwinDiagnostic({ kind: 'scene-retry', detail: `${label}: ${manual ? 'manual' : `automatic ${automaticRetries.current}/${3}`}` });
  }, [scope, label]);
  useEffect(() => {
    if (!active || !error || !alive.current) return;
    const delay = automaticSceneRetryDelay(error, automaticRetries.current);
    if (delay === null) return;
    autoRetryTimer.current = window.setTimeout(() => {
      autoRetryTimer.current = undefined;
      if (!alive.current || !active) return;
      automaticRetries.current++;
      restart(false);
    }, delay);
    return () => {
      if (autoRetryTimer.current !== undefined) { window.clearTimeout(autoRetryTimer.current); autoRetryTimer.current = undefined; }
    };
  }, [active, error, restart]);
  const onCreated = useCallback(() => { if (attempt.current !== generation) return; setCreated(true); setRenderedVersion(null); setLost(false); }, [generation]);
  const onRendered = useCallback((version = scope.snapshot()) => {
    if (!alive.current || attempt.current !== generation) return;
    elapsed.current = 0; automaticRetries.current = 0; setRenderedVersion(version); setRecovering(false);
    recordTwinDiagnostic({ kind: 'scene-rendered', detail: label });
  }, [label, generation, scope]);
  const onLost = useCallback(() => { if (attempt.current !== generation) return; setLost(true); setRenderedVersion(null); setRecovering(true); recordTwinDiagnostic({ kind: 'context-lost', detail: label }); }, [label, generation]);
  const onRestored = useCallback(() => { if (attempt.current !== generation) return; setLost(false); setRenderedVersion(null); setRecovering(true); recordTwinDiagnostic({ kind: 'context-restored', detail: label }); }, [label, generation]);
  const retry = useCallback(() => restart(true), [restart]);
  const phase: ScenePhase = error ? 'error' : lost ? 'context-lost' : recovering ? 'recovering' : ready ? 'rendered' : !created ? 'initializing' : scope.pending.length ? 'loading' : 'rendering';
  return { scope, resourceVersion, generation, ready, error, lost, phase, progress: scope.progress, fail, retry, onCreated, onRendered, onLost, onRestored };
}

/** Mount inside the outer Suspense. Nested async assets are tracked by scope.
 * Fiber callbacks run BEFORE rendering: acknowledge a later completed frame,
 * and explicitly request that frame even in reduced-motion/demand mode. */
export function SceneFrameReady({ scope, onReady, sceneKey = '' }: { scope: SceneResourceScope; onReady: (version: number) => void; sceneKey?: string }) {
  const { gl, invalidate } = useThree(), gate = useRef({ version: -1, frame: Infinity, reported: false });
  useEffect(() => { gate.current = { version: -1, frame: Infinity, reported: false }; invalidate(); }, [invalidate, sceneKey]);
  useFrame(() => {
    const state = gate.current, version = scope.snapshot();
    if (state.version !== version) { state.version = version; state.frame = gl.info.render.frame; state.reported = false; }
    if (gl.getContext().isContextLost() || scope.pending.length) { invalidate(); return; }
    if (!state.reported && gl.info.render.frame > state.frame && gl.info.render.triangles > 0) { state.reported = true; onReady(version); }
    else if (!state.reported) invalidate();
  });
  useEffect(() => {
    const canvas = gl.domElement;
    const reset = () => { gate.current = { version: -1, frame: Infinity, reported: false }; invalidate(); };
    canvas.addEventListener('webglcontextrestored', reset);
    return () => canvas.removeEventListener('webglcontextrestored', reset);
  }, [gl, invalidate]);
  return null;
}

/** Bind listeners to the exact renderer, never a document-wide canvas query. */
export function SceneLifecycle({ runtime }: { runtime: ReturnType<typeof useSceneRuntime> }) {
  const { gl, invalidate } = useThree();
  const { onCreated, onLost, onRestored } = runtime;
  useEffect(() => {
    onCreated();
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    const restored = () => { onRestored(); invalidate(); };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => { canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); };
  }, [gl, invalidate, onCreated, onLost, onRestored]);
  useFrame(() => {
    Object.assign(gl.domElement.dataset, {
      renderFrame: String(gl.info.render.frame), sceneTriangles: String(gl.info.render.triangles),
      drawCalls: String(gl.info.render.calls), loadState: runtime.phase,
      assetsLoaded: String(runtime.progress.loaded), assetsTotal: String(runtime.progress.total),
    });
  });
  return null;
}
