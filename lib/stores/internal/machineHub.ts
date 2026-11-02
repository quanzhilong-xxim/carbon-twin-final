import { createStateMachine } from '@/lib/core/StateMachine';

/** A2 can subscribe to reader for Toast rendering; A1 adds no UI. */
export const machineHub = createStateMachine({
  onReset: message => console.warn('[StateMachine Reset]', message),
  onTransition: (from, to, operationId) => console.info('[StateMachine Transition]', { from, to, operationId }),
});
