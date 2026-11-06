// Matomo's own-code opt-out (cookies on this site, so it also works where the opt-out iframe's third-party
// cookie is blocked). The tracker reads the same two cookies and stops tracking once the removed-cookie is set.
const GIVEN = "mtm_consent";
const REMOVED = "mtm_consent_removed";
const THIRTY_YEARS = 946_080_000_000;

const readCookie = (name: string) =>
  document.cookie.split("; ").some((c) => c.startsWith(`${name}=`));

const writeCookie = (name: string, value: string, msToExpire: number) => {
  const secure = location.protocol === "https:" ? ";Secure" : "";
  const expires = new Date(Date.now() + msToExpire).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax${secure}`;
};

/** Tracked unless the removed-cookie is set (and not overridden by the consent cookie). */
export const isTracked = () => !readCookie(REMOVED) || readCookie(GIVEN);

const setTracked = (tracked: boolean) => {
  if (tracked) {
    writeCookie(REMOVED, "", -1);
    writeCookie(GIVEN, String(Date.now()), THIRTY_YEARS);
  } else {
    writeCookie(GIVEN, "", -1);
    writeCookie(REMOVED, String(Date.now()), THIRTY_YEARS);
  }
};

/** Fills `root` with the opt-out checkbox; safe to call again after a page swap. */
export const renderMatomoOptOut = (root: HTMLElement) => {
  const tracked = isTracked();
  const box = document.createElement("input");
  box.type = "checkbox";
  box.id = "matomo-track-visits";
  box.checked = tracked;
  const label = document.createElement("label");
  label.htmlFor = box.id;
  label.textContent = tracked
    ? "Dein Besuch wird aktuell von der Reichweitenmessung erfasst. Häkchen entfernen, um nicht mehr erfasst zu werden."
    : "Dein Besuch wird aktuell nicht erfasst (Opt-out aktiv). Häkchen setzen, um wieder erfasst zu werden.";
  box.addEventListener("change", () => {
    setTracked(box.checked);
    renderMatomoOptOut(root);
  });
  root.replaceChildren(box, " ", label);
};
