import type { ActionType, AIAction, CalculationPayload, StoredCarbonSnapshot, WorkerRequest, WorkerResponse } from '@/types';
import { isActivity, isEmissionResult } from '@/lib/emissions';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
export function isNormalizedValue(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}
export function isActionType(value: unknown): value is ActionType {
  return value === 'slide' || value === 'click' || value === 'quiz';
}
export function isAIAction(value: unknown): value is AIAction {
  if (!isRecord(value)) return false;
  if (value.type === 'RESTORE_ECOSYSTEM') return value.target === 'forest';
  if (value.type === 'NONE') return value.target === undefined;
  if (value.type === 'CHANGE_THEME') return value.target === 'neutral' || value.target === 'safe' || value.target === 'danger';
  if (value.type === 'FOCUS_MODEL') return value.target === 'overview' || value.target === 'transport' || value.target === 'energy' || value.target === 'food' || value.target === 'beefTendon';
  if (value.type === 'HIGHLIGHT_CHART') return value.target === 'energy' || value.target === 'transport' || value.target === 'food';
  return false;
}
function isGeneration(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}
export function isCalculationPayload(value: unknown): value is CalculationPayload {
  return isRecord(value) && isFiniteNumber(value.rawData) && isFiniteNumber(value.k)
    && isFiniteNumber(value.x0) && isActionType(value.actionType) && (value.activities === undefined || isActivity(value.activities));
}
export function isWorkerRequest(value: unknown): value is WorkerRequest {
  if (!isRecord(value) || !isGeneration(value.generation)) return false;
  if (value.type === 'INITIALIZE' || value.type === 'PROBE') return true;
  return value.type === 'CALCULATE' && isRequestId(value.requestId) && isCalculationPayload(value.payload);
}
export function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (!isRecord(value) || !isGeneration(value.generation)) return false;
  if (value.type === 'PING' || value.type === 'READY') return true;
  if (!isRequestId(value.requestId)) return false;
  if (value.type === 'ERROR') return value.code === 'INVALID_INPUT' || value.code === 'CALCULATION_FAILED';
  return value.type === 'RESULT' && isFiniteNumber(value.rawData)
    && isNormalizedValue(value.normalizedState) && isActionType(value.actionType) && (value.emissions === undefined || isEmissionResult(value.emissions));
}
export function isStoredCarbonSnapshot(value: unknown): value is StoredCarbonSnapshot {
  return isRecord(value) && isRequestId(value.id) && isFiniteNumber(value.timestamp) && value.timestamp >= 0
    && isActionType(value.actionType) && isFiniteNumber(value.rawData) && isNormalizedValue(value.normalizedState)
    && typeof value.isPermanent === 'boolean' && (value.actionType !== 'quiz' || value.isPermanent)
    && value.schemaVersion === 1 && typeof value.sequence === 'number'
    && Number.isSafeInteger(value.sequence) && value.sequence >= 0
    && (value.quizResult === undefined || (isRecord(value.quizResult) && typeof value.quizResult.questionId === 'string' && typeof value.quizResult.answer === 'number' && Number.isInteger(value.quizResult.answer) && value.quizResult.answer >= 0 && value.quizResult.answer < 3 && typeof value.quizResult.correct === 'boolean'));
}
