const fs = require('fs')
const path = require('path')

const version = process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())

const swSource = `const VERSION = ${JSON.stringify(version)};

self.addEventListener("install", () => {
  // Do nothing automatically — wait for the explicit SKIP_WAITING message.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
`

const outPath = path.join(__dirname, '..', 'public', 'sw.js')
fs.writeFileSync(outPath, swSource)
console.log(`Generated public/sw.js with VERSION=${version}`)
