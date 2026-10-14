export function setFavicon(url) {
  const link = document.querySelector('link[rel~="icon"]') || document.createElement('link');
  link.rel = 'icon';
  link.href = url || '/favicon.ico';
  if (!link.isConnected) document.head.appendChild(link);
}
