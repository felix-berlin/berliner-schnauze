import { onMounted, type Ref } from "vue";
import { trackContentImpressionsWithinNode } from "@utils/analytics";

/**
 * Registers a Vue template ref for Matomo Content Tracking.
 * Scans the element for data-track-content blocks after mount,
 * covering Vue islands that render after astro-matomo's initial DOM scan.
 *
 * @see https://developer.matomo.org/guides/content-tracking
 */
export function useContentTracking(el: Ref<Element | null>): void {
  onMounted(() => {
    if (el.value) trackContentImpressionsWithinNode(el.value);
  });
}
