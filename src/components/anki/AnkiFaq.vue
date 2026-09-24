<template>
  <BaseAccordion type="single" collapsible default-value="0" class="c-anki-faq">
    <AccordionItem v-for="(faq, idx) in faqs" :key="faq.q" :value="String(idx)">
      <AccordionHeader :level="3">
        <AccordionTrigger>{{ faq.q }}</AccordionTrigger>
      </AccordionHeader>
      <AccordionContent>{{ faq.a }}</AccordionContent>
    </AccordionItem>
  </BaseAccordion>
</template>

<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  BaseAccordion,
} from "@components/accordion";

defineProps<{
  faqs: { q: string; a: string }[];
}>();
</script>
