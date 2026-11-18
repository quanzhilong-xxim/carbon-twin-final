import * as THREE from 'three';

export function needsStableDrawingBuffer(): boolean {
  return typeof navigator !== 'undefined' && navigator.platform === 'Win32' &&
    /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent);
}

/**
 * Windows Playwright WebKit 27.2 loses canvas composition after a backing-size
 * assignment, despite valid readPixels. See work/webkit-resize.cjs evidence.
 * Keep this canvas backing store immutable; the owner remounts on size/DPR
 * changes. Native properties/prototypes and other browser renderers are intact.
 */
export function createStableRenderer(canvas: HTMLCanvasElement | OffscreenCanvas, dpr: number, options: Omit<THREE.WebGLRendererParameters,'canvas'> = {}): THREE.WebGLRenderer {
  if (canvas instanceof HTMLCanvasElement && needsStableDrawingBuffer()) {
    const box = canvas.parentElement!.getBoundingClientRect();
    const width = Math.max(1, Math.floor(box.width * dpr));
    const height = Math.max(1, Math.floor(box.height * dpr));
    canvas.width = width;
    canvas.height = height;
    Object.defineProperties(canvas, {
      width: { configurable: true, get: () => width, set: () => { /* Owner remounts instead. */ } },
      height: { configurable: true, get: () => height, set: () => { /* Owner remounts instead. */ } },
    });
    canvas.dataset.compositionPolicy = 'immutable-buffer-remount-on-resize';
  }
  return new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', ...options, canvas });
}
