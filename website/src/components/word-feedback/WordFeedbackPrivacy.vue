<template>
  <div class="privacy">
    <label class="remember">
      <input
        type="checkbox"
        :checked="remember"
        @change="emit('update:remember', ($event.target as HTMLInputElement).checked)"
      />
      Meine Angaben für weitere Wörter merken (nur in diesem Browser)
    </label>
    <p>
      Wir speichern Deine Antworten ohne Namen, aber mit einer Kennung aus einem Cookie (<a
        href="/datenschutz#7-wort-feedback"
        >Datenschutz</a
      >).
      <button class="c-textlink" :disabled="pending" type="button" @click="emit('delete')">
        Alle meine Antworten löschen
      </button>
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ pending: boolean; remember: boolean }>();
const emit = defineEmits<{ delete: []; "update:remember": [value: boolean] }>();
</script>
