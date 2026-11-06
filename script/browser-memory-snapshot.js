// Ejecutar en la consola de DevTools de la aplicación. Solo lee datos.
// Devuelve tamaños y conteos; no muestra tokens, valores de preferencias ni URLs.
(async () => {
  const inspectStorage = (storage) => {
    const entries = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key === null) continue;
      const value = storage.getItem(key) ?? "";
      entries.push({ key, approximateBytesUTF16: 2 * (key.length + value.length) });
    }
    return entries.sort((a, b) => b.approximateBytesUTF16 - a.approximateBytesUTF16);
  };
  const safely = (read) => {
    try { return read(); } catch { return "No disponible"; }
  };
  const memory = performance.memory;
  const snapshot = {
    timestamp: new Date().toISOString(),
    localStorage: safely(() => inspectStorage(localStorage)),
    sessionStorage: safely(() => inspectStorage(sessionStorage)),
    jsHeapBytes: memory ? {
      used: memory.usedJSHeapSize,
      allocated: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
    } : "No disponible en este navegador",
    dom: {
      elements: document.querySelectorAll("*").length,
      canvases: document.querySelectorAll("canvas").length,
      videos: document.querySelectorAll("video").length,
      videosWithStream: [...document.querySelectorAll("video")].filter(v => v.srcObject !== null).length,
    },
    originStorage: await navigator.storage?.estimate?.().catch(() => undefined),
  };
  console.log(snapshot);
  return snapshot;
})();
