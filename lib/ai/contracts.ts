import type { UIMessage } from 'ai';
import type { Citation } from './retrieval';
export interface ChatMetadata { citations?: Citation[]; calculatedAnnual?: number; scenarioYear?: number; requestId?: string; calculationSummary?: string }
export type CarbonMessage = UIMessage<ChatMetadata>;
