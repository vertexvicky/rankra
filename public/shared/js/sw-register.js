import { $ } from "./utils.js";

export async function checkRevision(apiPath) {
  try {
    const res = await fetch(apiPath, { cache: 'no-store' });
    if (!res.ok) return;
    const { app_revision, data_revision } = await res.json();
    const stored = parseInt(localStorage.getItem('rankra-app-revision') || '0', 10);
    if (app_revision !== stored) {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      localStorage.setItem('rankra-app-revision', String(app_revision));
    }
  } catch (e) {
  }
}

export function registerSW(swPath) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(swPath).then(reg => {
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type === 'CACHE_PROGRESS') {
          const pct = Math.round((e.data.loaded / e.data.total) * 100);
          const bar = $('loading-bar');
          const status = $('loading-status');
          if (bar) bar.style.width = pct + '%';
          if (status) status.textContent = `Caching data ${e.data.loaded}/${e.data.total}…`;
        }
      });
    }).catch(e => console.warn('SW:', e));
  }
}
