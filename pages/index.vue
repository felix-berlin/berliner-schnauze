<template>
  <div class="c-content">
    <main class="c-main">
      <h1 style="font-size: 4rem;">
        Na Keule, keen'n Dunst vom Berlinern?<br> Dann mal uff-gepasst!
      </h1>
      <WordList :critical="true" />
    </main>
  </div>
</template>

<script>

export default {
  name: 'IndexPage',

  speedkitComponents: {
    WordList: () => import('@/components/word-list')
  }

}
</script>
