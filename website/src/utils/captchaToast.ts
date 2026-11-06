/** Toast for a submit without a captcha token: stuck (script blocked, bad site key) or still running. */
export const captchaWaitToast = (failed: boolean) =>
  failed
    ? {
        message:
          "Die Prüfung, ob de 'n Mensch bist, klemmt. Lad die Seite neu oder mach den Blocker kurz aus.",
        status: "error" as const,
      }
    : { message: "Moment noch, ick prüf dich kurz.", status: "warning" as const };
