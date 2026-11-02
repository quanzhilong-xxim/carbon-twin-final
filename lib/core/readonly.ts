import type { DeepReadonly } from '@/types';

/** Clone before freezing: a caller cannot mutate a retained input reference. Plain data only. */
export function protectSnapshot<T extends object>(input: T): DeepReadonly<T> {
  const visited = new WeakMap<object, object>();
  const seal = (value: unknown): unknown => {
    if (typeof value !== 'object' || value === null) return value;
    const existing = visited.get(value);
    if (existing) return existing;
    const target: object = Array.isArray(value) ? [] : {};
    const block = (_target: object, property: string | symbol): false => {
      console.error('[Security Alert] 拦截到非法直接写入！必须通过内部动作修改。', String(property));
      return false;
    };
    const proxy = new Proxy(target, {
      set: block, deleteProperty: block, defineProperty: block,
      setPrototypeOf: () => { console.error('[Security Alert] 禁止修改状态原型'); return false; },
    });
    visited.set(value, proxy);
    for (const [key, entry] of Object.entries(value)) {
      Object.defineProperty(target, key, { value: seal(entry), enumerable: true, writable: false, configurable: false });
    }
    Object.freeze(target);
    return proxy;
  };
  return seal(input) as DeepReadonly<T>;
}
