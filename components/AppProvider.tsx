'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
const AppContext = createContext({ installed: false, available: false, busy: false, message: '', install: async () => {} });

export default function AppProvider({ children }: { children: ReactNode }) {
  const deferred = useRef<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    update();
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as InstallEvent;
      setAvailable(true);
    };
    const onInstalled = () => {
      deferred.current = null; setAvailable(false); setInstalled(true);
      setMessage('설치가 완료됐어요. 홈 화면에서 LULU CARE를 열어 주세요.');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener('change', update);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        // Installation remains available; online functionality is unaffected.
      });
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', update);
    };
  }, []);

  async function install() {
    const event = deferred.current;
    if (!event || busy) return;
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(choice.outcome === 'accepted' ? '설치를 요청했어요. 휴대폰 홈 화면을 확인해 주세요.' : '설치를 취소했어요. 아래 안내로 언제든 다시 설치할 수 있어요.');
    } catch {
      setMessage('설치 창을 열지 못했어요. 아래의 브라우저 메뉴 안내를 이용해 주세요.');
    } finally {
      deferred.current = null; setAvailable(false); setBusy(false);
    }
  }

  return <AppContext.Provider value={{ installed, available, busy, message, install }}>{children}</AppContext.Provider>;
}

export function AppInstallButton() {
  const { installed, available, busy, message, install } = useContext(AppContext);
  return <div>
    {installed ? <p role="status"><strong>앱으로 사용 중이거나 설치가 완료되었어요.</strong></p> :
      available ? <button className="care-primary" disabled={busy} onClick={install}>{busy ? '설치 요청 중…' : 'LULU CARE 설치하기'}</button> :
      <p>아래에서 사용 중인 브라우저의 설치 방법을 확인해 주세요.</p>}
    {message && <p role="status">{message}</p>}
  </div>;
}
