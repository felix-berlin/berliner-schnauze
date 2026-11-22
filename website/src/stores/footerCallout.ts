import { $isPwaInstalled, $showInstallButton } from "@stores/installApp.ts";
import { computed } from "nanostores";

/** The footer's app callout shows (and its word sign gives way) while the app can be installed but is not. */
export const $showAppCallout = computed(
  [$showInstallButton, $isPwaInstalled],
  (installable, installed) => installable && !installed,
);
