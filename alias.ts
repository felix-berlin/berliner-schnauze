import { fileURLToPath, URL } from "node:url";

export default {
  "@components": fileURLToPath(new URL("./src/components/", import.meta.url)),
  "@composables": fileURLToPath(new URL("./src/composables/", import.meta.url)),
  "@stores": fileURLToPath(new URL("./src/stores/", import.meta.url)),
  "@layouts": fileURLToPath(new URL("./src/layouts/", import.meta.url)),
  "@lib": fileURLToPath(new URL("./src/lib/", import.meta.url)),
  "@utils": fileURLToPath(new URL("./src/utils/", import.meta.url)),
  "@ts_types": fileURLToPath(new URL("./src/types/", import.meta.url)),
  "@features": fileURLToPath(new URL("./src/features/", import.meta.url)),
  "@services": fileURLToPath(new URL("./src/services/", import.meta.url)),
  "@sass-butler": fileURLToPath(
    new URL("node_modules/@felix_berlin/sass-butler/", import.meta.url),
  ),
  "@styles": fileURLToPath(new URL("./src/styles/", import.meta.url)),
  "@types": fileURLToPath(new URL("./src/types/", import.meta.url)),
  "@assets": fileURLToPath(new URL("./src/assets/", import.meta.url)),
};
