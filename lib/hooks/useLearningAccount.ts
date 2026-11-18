'use client';
import { useSyncExternalStore } from 'react';
import { learningAccount } from '@/lib/storage/LearningDB';

function subscribe(listener: () => void) {
  window.addEventListener('carbon-learning-updated', listener);
  return () => window.removeEventListener('carbon-learning-updated', listener);
}

// Learning records currently live in IndexedDB. No server sign-in is implemented.
export function useLearningAccount() {
  return useSyncExternalStore(subscribe, learningAccount, () => 'guest');
}
