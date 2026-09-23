import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'LULU CARE · 자세와 건강 기록', short_name: 'LULU CARE',
    description: '자세 검사, 업무 자세 알림, 인바디 기록을 한곳에서',
    lang: 'ko', start_url: '/', scope: '/', display: 'standalone',
    background_color: '#f6f7f2', theme_color: '#194a38',
    icons: [
      { src: '/app-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '내 몸 검사', url: '/analyze/tests' },
      { name: '업무 자세 알림', url: '/analyze/desk' },
      { name: '인바디 기록', url: '/inbody' },
    ],
  };
}
