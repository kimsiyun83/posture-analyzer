'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { publicTrafficPath } from '@/lib/traffic-date';

export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!publicTrafficPath(pathname) || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    // Delay also cancels React Strict Mode's discarded effect. Never block the UI.
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== 'visible') return;
      void fetch('/api/traffic', { method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: pathname }) }).catch(() => {});
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
