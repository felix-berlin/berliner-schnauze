import { ref, useTemplateRef } from "vue";

/**
 * Token and failure state of one `<TurnStile ref="turnstile">` in the calling form. Bind the widget with
 * `ref="turnstile" @token="onToken" @error="onError"`. A token works once: call `spend()` after every send, the
 * widget then issues the next one. `onToken` runs for every non-empty token (e.g. to send a click that waited).
 */
export const useTurnstile = (onReady?: (token: string) => void) => {
  const widget = useTemplateRef<{ reset: () => void }>("turnstile");
  const token = ref("");
  // The check cannot run (script blocked, bad site key): waiting would never help.
  const failed = ref(false);

  const onToken = (value: string): void => {
    token.value = value;
    if (!value) return;
    failed.value = false;
    onReady?.(value);
  };
  const onError = (): void => {
    failed.value = true;
  };
  /** Forget the current token without touching the widget (form closed, widget unmounts). */
  const clear = (): void => {
    token.value = "";
  };
  const spend = (): void => {
    clear();
    widget.value?.reset();
  };

  return { clear, failed, onError, onToken, spend, token };
};
