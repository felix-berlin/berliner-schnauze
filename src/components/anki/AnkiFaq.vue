<template>
  <BaseAccordion class="c-anki-faq">
    <AccordionItem v-for="(faq, idx) in faqs" :key="faq.q" name="anki-faq" :open="idx === 0">
      <AccordionTrigger :level="3">{{ faq.q }}</AccordionTrigger>
      <AccordionContent>{{ faq.a }}</AccordionContent>
    </AccordionItem>
  </BaseAccordion>
</template>

<script setup lang="ts">
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  BaseAccordion,
} from "@components/accordion";

defineProps<{
  faqs: { q: string; a: string }[];
}>();
</script>
