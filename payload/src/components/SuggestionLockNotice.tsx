/** Banner on a locked suggestion (shown by the `condition` of the `lockNotice` field in Suggestions). */
export const SuggestionLockNotice = () => (
  <div
    role="status"
    style={{
      border: "1px solid var(--theme-warning-500)",
      background: "var(--theme-warning-100)",
      color: "var(--theme-warning-800, var(--theme-text))",
      padding: "0.75rem 1rem",
      marginBottom: "1rem",
      borderRadius: "4px",
    }}
  >
    <strong>Gesperrt:</strong> Das Wort aus diesem Vorschlag ist veröffentlicht. Der Vorschlag kann
    nicht mehr geändert werden. Das Wort steht im Feld „Wort“ in der Seitenleiste.
  </div>
);
