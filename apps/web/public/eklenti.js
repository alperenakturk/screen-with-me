// Extension install page: the browser's extensions address and the version (moved out of the page for the CSP).
// Tarayıcıya göre doğru eklentiler adresi
const ua = navigator.userAgent;
const extUrl = navigator.brave ? 'brave://extensions' : /Edg\//.test(ua) ? 'edge://extensions' : /OPR\//.test(ua) ? 'opera://extensions' : 'chrome://extensions';
document.querySelectorAll('.ext-url').forEach((el) => (el.textContent = extUrl));
document.querySelectorAll('.copy').forEach((button) =>
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(extUrl);
      button.textContent = button.dataset.copied;
    } catch {}
  }),
);
// Sürüm (derleme sırasında yazılır)
fetch('/extension-version.json')
  .then((r) => r.json())
  .then((v) => document.querySelectorAll('.version').forEach((el) => (el.textContent = `${el.dataset.versionLabel} ${v.version}`)))
  .catch(() => {});
