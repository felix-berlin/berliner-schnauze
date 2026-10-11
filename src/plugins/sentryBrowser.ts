// Sentry costs ~500 ms main-thread time on mid-range mobiles; load it after the
// page is interactive. Errors before that point are not reported (accepted).
const loadSentry = () => {
  const init = () => void import("./sentryInit");
  if ("requestIdleCallback" in window) window.requestIdleCallback(init);
  else setTimeout(init, 1);
};

if (document.readyState === "complete") {
  loadSentry();
} else {
  window.addEventListener("load", loadSentry, { once: true });
}
