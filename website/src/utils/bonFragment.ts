/**
 * Classic inline script for the head of the game page. It must run while the head is parsed,
 * before Matomo's deferred module and its first page view. Order: strip the fragment first,
 * then validate the raw value (valid codes have no escapes), then store it.
 */
export const BON_FRAGMENT_SCRIPT = `
if (location.hash.startsWith('#code=')) {
  var v = location.hash.slice(6);
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {
    /* nothing to do */
  }
  try {
    if (/^[A-Za-z0-9-]{1,40}$/.test(v)) sessionStorage.setItem('bonRedeem', v);
  } catch (e) {
    /* storage blocked: the code form still works by hand */
  }
}
`;
