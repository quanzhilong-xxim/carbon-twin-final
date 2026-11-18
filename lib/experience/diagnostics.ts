'use client';

export type TwinDiagnosticKind =
  | 'scene-error'
  | 'scene-rendered'
  | 'scene-retry'
  | 'session-mount'
  | 'session-unmount'
  | 'canvas-created'
  | 'canvas-cleanup'
  | 'context-lost'
  | 'context-restored'
  | 'stale-event-ignored'
  | 'camera-transition-start'
  | 'camera-transition-end'
  | 'camera-transition-cancel';

export interface TwinDiagnosticEvent {
  at: string;
  kind: TwinDiagnosticKind;
  sessionId?: string;
  canvasId?: string;
  rendererId?: string;
  businessState?: string;
  renderState?: string;
  detail?: string;
}

let sequence = 0;
const events: TwinDiagnosticEvent[] = [];
const maxEvents = 240;

export function createTwinId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export function recordTwinDiagnostic(event: Omit<TwinDiagnosticEvent, 'at'>): TwinDiagnosticEvent {
  const entry: TwinDiagnosticEvent = { at: new Date().toISOString(), ...event };
  events.push(entry);
  if (events.length > maxEvents) events.splice(0, events.length - maxEvents);
  if (typeof window !== 'undefined') {
    window.__carbonTwinDiagnostics = events.slice();
  }
  return entry;
}

export function getTwinDiagnostics(): TwinDiagnosticEvent[] {
  return events.slice();
}

declare global {
  interface Window {
    __carbonTwinDiagnostics?: TwinDiagnosticEvent[];
  }
}
