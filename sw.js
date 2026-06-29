const CACHE_NAME = "material-search-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./sql-wasm.js",
    "./sql-wasm.wasm"
];

self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
    );

});

self.addEventListener("fetch", event => {

    event.respondWith(
        caches.match(event.request)
            .then(response =>
                response || fetch(event.request)
            )
    );

});