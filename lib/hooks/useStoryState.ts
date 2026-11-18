'use client';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
/** Namespaced, validated story controls; never touches earlier learning data. */
export function useStoryState<T>(name: string, initial: T, valid: (value: unknown) => value is T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial), [ready, setReady] = useState(false);
  useEffect(() => {
    try { const stored: unknown = JSON.parse(localStorage.getItem(`carbontwin.behaviour.${name}.v108`) || 'null'); if (valid(stored)) setValue(stored); } catch { /* Use the teaching default. */ }
    setReady(true);
    // The control's schema and initial value are fixed by its calling component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);
  useEffect(() => { if (!ready) return; try { localStorage.setItem(`carbontwin.behaviour.${name}.v108`, JSON.stringify(value)); } catch { /* Optional persistence. */ } }, [name, value, ready]);
  return [value, setValue];
}
