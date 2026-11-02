import type { AIAction } from '@/types';
import { focusModel, highlightChart, pulseTheme, recordAIAction, restoreEcosystem } from '@/lib/stores/UIStore';
export function dispatchAIAction(action: AIAction) {
  switch(action.type) {
    case 'RESTORE_ECOSYSTEM': restoreEcosystem(); break;
    case 'CHANGE_THEME': pulseTheme(action.target); break;
    case 'FOCUS_MODEL': focusModel(action.target); break;
    case 'HIGHLIGHT_CHART': highlightChart(action.target); break;
    case 'NONE': break;
  }
  recordAIAction(action.type === 'NONE' ? '仅答疑 · 未改变界面' : `${action.type} / ${action.target}`);
}
