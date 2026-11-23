/**
 * ClientRouter lifecycle for a bundled script (it runs once per tab, the page is swapped under it): `start` runs on
 * every `astro:page-load`, the previous stop runs before a restart and on `astro:before-swap` (`onSwap` runs there
 * too, after the stop). Returns the removal of both listeners (which also stops the current run).
 */
export const onPage = (
  start: () => (() => void) | void,
  { doc = document, onSwap }: { doc?: Document; onSwap?: () => void } = {},
): (() => void) => {
  let stop = () => {};
  const end = () => {
    stop();
    stop = () => {};
  };
  const onLoad = () => {
    end();
    stop = start() ?? (() => {});
  };
  const onBeforeSwap = () => {
    end();
    onSwap?.();
  };
  doc.addEventListener("astro:page-load", onLoad);
  doc.addEventListener("astro:before-swap", onBeforeSwap);
  return () => {
    doc.removeEventListener("astro:page-load", onLoad);
    doc.removeEventListener("astro:before-swap", onBeforeSwap);
    end();
  };
};
