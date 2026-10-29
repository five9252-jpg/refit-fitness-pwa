// PWA install/offline support is only available on secure origins (HTTPS/localhost).
// A file:// preview remains usable without a service worker.
if (location.protocol !== 'file:' && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
      console.warn('리핏 오프라인 지원을 등록하지 못했습니다.', error);
    });
  });
}
