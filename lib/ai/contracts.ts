import type { UIMessage } from 'ai';
import type { Citation } from './retrieval';
import type { Identity } from '@/lib/store';
export type ChatMode = 'evidence' | 'intro';
export interface ChatMetadata { citations?: Citation[]; calculatedAnnual?: number; scenarioYear?: number; requestId?: string; calculationSummary?: string; mode?: ChatMode; role?: Identity }
export type CarbonMessage = UIMessage<ChatMetadata>;
