/** A1 contracts. Values at browser/worker/storage boundaries remain unknown until validated. */
export type GlobalState = 'IDLE' | 'EXPANDING' | 'ACTIVE' | 'COLLAPSING' | 'LOCKED';
export type ActionType = 'slide' | 'click' | 'quiz';
export type ThemeTarget = 'neutral' | 'safe' | 'danger';
export type ModelTarget = 'overview' | 'transport' | 'energy' | 'food' | 'beefTendon';

export interface CarbonSnapshot {
  readonly id: string;
  readonly timestamp: number;
  readonly actionType: ActionType;
  readonly rawData: number;
  readonly normalizedState: number;
}
export interface StoredCarbonSnapshot extends CarbonSnapshot {
  readonly quizResult?: { readonly questionId: string; readonly answer: number; readonly correct: boolean };
  readonly isPermanent: boolean;
  readonly schemaVersion: 1;
  readonly sequence: number;
}
export type AIAction =
  | { readonly type: 'RESTORE_ECOSYSTEM'; readonly target: 'forest' }
  | { readonly type: 'CHANGE_THEME'; readonly target: ThemeTarget }
  | { readonly type: 'FOCUS_MODEL'; readonly target: ModelTarget }
  | { readonly type: 'HIGHLIGHT_CHART'; readonly target: 'energy' | 'transport' | 'food' }
  | { readonly type: 'NONE' };
export interface AIResponse {
  readonly speech: string;
  readonly action: AIAction;
  readonly question?: string;
  readonly storyboard?: { readonly scene: 'forest' | 'city' | 'leaf'; readonly intensity: number; readonly caption: string };
}
export interface CalculationPayload {
  readonly activities?: import('@/lib/emissions').Activity;
  readonly rawData: number;
  readonly k: number;
  readonly x0: number;
  readonly actionType: ActionType;
}
export interface RequestIdentity {
  readonly requestId: string;
  readonly generation: number;
}
export type WorkerRequest =
  | { readonly type: 'INITIALIZE'; readonly generation: number }
  | { readonly type: 'PROBE'; readonly generation: number }
  | ({ readonly type: 'CALCULATE'; readonly payload: CalculationPayload } & RequestIdentity);
export type WorkerResponse =
  | { readonly type: 'READY'; readonly generation: number }
  | { readonly type: 'PING'; readonly generation: number }
  | ({ readonly type: 'RESULT'; readonly rawData: number; readonly normalizedState: number; readonly actionType: ActionType; readonly emissions?: import('@/lib/emissions').EmissionResult } & RequestIdentity)
  | ({ readonly type: 'ERROR'; readonly code: 'INVALID_INPUT' | 'CALCULATION_FAILED' } & RequestIdentity);
export type CalculationResult = Extract<WorkerResponse, { type: 'RESULT' }>;

export interface RawDemoValue {
  readonly value: number;
  readonly kind: 'demo-raw';
  readonly unit: 'demo-unit';
}
export interface NormalizedVisualValue {
  readonly value: number;
  readonly kind: 'visual-normalized';
  readonly min: 0;
  readonly max: 1;
}
export interface CarbonDataState {
  readonly emissions: import('@/lib/emissions').EmissionResult | null;
  readonly raw: RawDemoValue;
  readonly normalized: NormalizedVisualValue;
  readonly revision: number;
  readonly provenance: (RequestIdentity & { readonly actionType: ActionType }) | null;
}
export type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export type CancelResource = () => void;
export interface RuntimeClock {
  readonly now: () => number;
  readonly schedule: (callback: () => void, delayMs: number) => CancelResource;
}
export interface MachineSnapshot {
  readonly state: GlobalState;
  readonly operationId: string | null;
  readonly returnState: 'IDLE' | 'ACTIVE';
  readonly revision: number;
  readonly lastReset: 'timeout' | 'cancelled' | 'failure' | null;
}
export type TransitionResult =
  | { readonly accepted: true; readonly operationId: string | null; readonly state: GlobalState }
  | { readonly accepted: false; readonly reason: 'BUSY' | 'INVALID_TRANSITION' | 'STALE_OWNER' | 'DISPOSED' };
export type WorkerStatus = 'STOPPED' | 'STARTING' | 'READY' | 'RECOVERING' | 'SUSPENDED' | 'FAILED';
export interface WorkerStatusSnapshot {
  readonly status: WorkerStatus;
  readonly generation: number;
  readonly recoveryCount: number;
  readonly reason: string | null;
}
export type PublishResult = { readonly accepted: true } | { readonly accepted: false; readonly reason: 'INVALID_RESULT' };
