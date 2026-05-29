<template>
  <BaseAccordion type="multiple" v-slot="{ toggle }">
    <ul class="c-pwa-cache__list u-list-reset">
      <li
        v-for="bucket in buckets"
        :key="bucket.name"
        class="c-pwa-cache__bucket"
      >
        <AccordionItem :value="bucket.name" :disabled="bucket.urls.length === 0">
          <div
            class="c-pwa-cache__bucket-header"
            :style="bucket.urls.length > 0 ? 'cursor: pointer' : ''"
            @click="bucket.urls.length > 0 && toggle(bucket.name)"
          >
            <span class="c-pwa-cache__bucket-name">
              {{ getBucketDisplayName(bucket.name) }}
            </span>
            <span class="c-pwa-cache__bucket-size">
              {{ formatBytes(bucket.totalSizeBytes) }}
            </span>
            <AccordionTrigger
              v-if="bucket.urls.length > 0"
              class="c-pwa-cache__bucket-toggle"
              :aria-label="`${getBucketDisplayName(bucket.name)} URLs anzeigen`"
              @click.stop
            >
              <template #icon>
                <component :is="ChevronDown" width="14" height="14" />
              </template>
            </AccordionTrigger>
            <button
              type="button"
              class="c-pwa-cache__bucket-delete"
              :aria-label="`${getBucketDisplayName(bucket.name)} leeren`"
              @click.stop="emit('clear-bucket', bucket.name)"
            >
              <component :is="X" width="16" height="16" />
            </button>
          </div>
          <div class="c-pwa-cache__bucket-meta">
            {{ bucket.urls.length }} {{ bucket.urls.length === 1 ? "Eintrag" : "Einträge" }}
            <template v-if="bucket.lastModified">
              · neu: {{ formatRelativeTime(bucket.lastModified) }}
            </template>
            <template
              v-if="
                bucket.oldestEntry &&
                bucket.oldestEntry.getTime() !== bucket.lastModified?.getTime()
              "
            >
              · alt: {{ formatRelativeTime(bucket.oldestEntry) }}
            </template>
          </div>
          <AccordionContent>
            <ul class="c-pwa-cache__urls u-list-reset">
              <li v-for="url in bucket.urls" :key="url" class="c-pwa-cache__url" :title="url">
                {{ formatUrl(url) }}
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </li>
    </ul>
  </BaseAccordion>
</template>

<script setup lang="ts">
import { AccordionContent, AccordionItem, AccordionTrigger, BaseAccordion } from "@components/accordion";
import { formatBytes, getBucketDisplayName } from "@composables/useCacheStorage";
import type { CacheBucket } from "@composables/useCacheStorage";
import { defineAsyncComponent } from "vue";

defineProps<{
  buckets: CacheBucket[];
}>();

const emit = defineEmits<{
  "clear-bucket": [name: string];
}>();

const ChevronDown = defineAsyncComponent(() => import("virtual:icons/lucide/chevron-down"));
const X = defineAsyncComponent(() => import("virtual:icons/lucide/x"));

function formatUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.length > 60 ? `${path.slice(0, 57)}…` : path;
  } catch {
    return url.length > 60 ? `${url.slice(0, 57)}…` : url;
  }
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "gerade eben";
  if (hours < 1) return `vor ${minutes} Min.`;
  if (days < 1) return `vor ${hours} Std.`;
  return `vor ${days} Tg.`;
}
</script>
