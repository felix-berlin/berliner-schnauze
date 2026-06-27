import { useIntersectionObserver } from '@vueuse/core'
import type { Ref } from 'vue'
import { trackContentImpressionsWithinNode } from '@utils/analytics'

export function useContentTracking(el: Ref<HTMLElement | SVGElement | null>) {
  const { stop } = useIntersectionObserver(el, ([entry]) => {
    if (entry.isIntersecting && el.value) {
      trackContentImpressionsWithinNode(el.value)
      stop()
    }
  })
}
