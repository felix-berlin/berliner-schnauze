<template>
  <!-- A focusable non-link until the feature exists; aria-disabled keeps it reachable for the tooltip. -->
  <button
    v-tooltip="{
      content: 'Kommt bald! Det Einsprechen is noch in Arbeit, Moment ma.',
      placement: 'top',
    }"
    type="button"
    class="c-button"
    data-variant="secondary lg center-icon soft"
    aria-disabled="true"
  >
    <slot />
  </button>
</template>
