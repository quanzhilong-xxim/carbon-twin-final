'use client';
import { useEffect, useState } from 'react';
export const offlineMessage = '当前网络连接不稳定，AI 教练暂时失联，但本地碳排计算与图表联动依然可用。';
export function notifyToast(message: string) { window.dispatchEvent(new CustomEvent<string>('carbon-toast', { detail: message })); }
export default function Toast() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = (event: Event) => { if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return; clearTimeout(timer); setMessage(event.detail); timer = setTimeout(() => setMessage(''), 9000); };
    window.addEventListener('carbon-toast', show);
    return () => { window.removeEventListener('carbon-toast', show); clearTimeout(timer); };
  }, []);
  return message ? <div className="toast-message" role="status">{message}</div> : null;
}
