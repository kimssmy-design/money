// 최소한의 서비스워커입니다.
// Firestore 실시간 데이터는 캐싱하면 오히려 헷갈리므로, 오프라인 캐싱 없이
// "설치 가능한 앱"이 되기 위한 조건만 충족시키는 용도로 둡니다.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // 그냥 네트워크로 그대로 전달 (캐싱 없음)
  event.respondWith(fetch(event.request));
});
