// Worker thread for OG images (src/services/ogImage.ts): canvaskit's wasm memory (~150 MB) never shrinks, it is
// only freed with the thread that loaded it. Plain .mjs outside the bundle, resolved from node_modules.
import { parentPort } from "node:worker_threads";

// By path, past the package's `exports`: its index also loads the route helpers, which import `astro` (not in
// the image).
const { generateOpenGraphImage } = await import(
  new URL("../node_modules/astro-og-canvas/dist/generateOpenGraphImage.js", import.meta.url).href
);

parentPort.on("message", async ({ id, options }) => {
  try {
    parentPort.postMessage({ id, image: await generateOpenGraphImage(options) });
  } catch (error) {
    parentPort.postMessage({ error: String(error), id });
  }
});
