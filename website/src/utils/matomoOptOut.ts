// Own-code Matomo opt-out (a cookie on this site, so it also works where the opt-out iframe's third-party cookie
// is blocked). The tracker does not read this cookie: Layout.astro checks it before astro-matomo starts and swaps
// `_paq` for a sink, so no tracking request is ever built. A tracker that is already running (privacy page opened
// via view transition) is stopped with `optUserOut` in setTracked.
export const OPT_OUT_COOKIE = "bs_matomo_optout";
const THIRTY_YEARS = 946_080_000_000;

// document.cookie throws in sandboxed frames and some hardened browsers: treat that as "cannot store".
const readCookie = (): boolean => {
  try {
    return document.cookie.split("; ").some((c) => c.startsWith(`${OPT_OUT_COOKIE}=`));
  } catch {
    return false;
  }
};

const writeCookie = (value: string, msToExpire: number) => {
  const secure = location.protocol === "https:" ? ";Secure" : "";
  const expires = new Date(Date.now() + msToExpire).toUTCString();
  try {
    document.cookie = `${OPT_OUT_COOKIE}=${value};expires=${expires};path=/;SameSite=Lax${secure}`;
  } catch {
    // verified by the caller through readCookie
  }
};

export const isTracked = () => !readCookie();

/** Sets or clears the opt-out; false when the browser did not keep the cookie. */
const setTracked = (tracked: boolean): boolean => {
  writeCookie(tracked ? "" : "1", tracked ? -1 : THIRTY_YEARS);
  if (!tracked) window._paq?.push(["optUserOut"]);
  return isTracked() === tracked;
};

/** Fills `root` with the opt-out checkbox; safe to call again after a page swap. */
export const renderMatomoOptOut = (root: HTMLElement, failed = false) => {
  const tracked = isTracked();
  const box = document.createElement("input");
  box.type = "checkbox";
  box.id = "matomo-track-visits";
  box.checked = tracked;
  const label = document.createElement("label");
  label.htmlFor = box.id;
  label.textContent = failed
    ? "Dein Browser lässt das Speichern des Opt-outs nicht zu (Cookies aktivieren und noch mal versuchen)."
    : tracked
      ? "Dein Besuch wird aktuell von der Reichweitenmessung erfasst. Häkchen entfernen, um nicht mehr erfasst zu werden."
      : "Dein Besuch wird aktuell nicht erfasst (Opt-out aktiv). Häkchen setzen, um wieder erfasst zu werden.";
  box.addEventListener("change", () => renderMatomoOptOut(root, !setTracked(box.checked)));
  root.replaceChildren(box, " ", label);
};
