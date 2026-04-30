<template>
  <div class="c-word-of-the-day">
    <div class="c-word-of-the-day__content">
      <div class="c-word-of-the-day__crown-icon skeleton">
        <div class="skeleton__icon" />
      </div>

      <div class="c-word-of-the-day__word-wrap skeleton">
        <div class="skeleton__word" />
      </div>

      <hr class="c-word-of-the-day__divider" />

      <p class="c-word-of-the-day__headline skeleton">
        <span class="skeleton__text" />
      </p>
    </div>

    <div class="c-word-of-the-day__update skeleton">
      <span class="skeleton__text skeleton__text--short" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@styles/mixins/_skeleton-loader.scss" as *;
@use "@sass-butler/mixins" as butler-mx;
@use "@sass-butler/functions" as butler-fn;
@use "@styles/variables" as vars;

.skeleton {
  &__icon {
    @include skeleton-loader;
    width: 80px;
    height: 80px;
    border-radius: 4px;
  }

  &__word {
    @include skeleton-loader;
    width: 120px;
    height: 32px;
    border-radius: 4px;
    margin: 0 auto;
  }

  &__text {
    @include skeleton-loader;
    display: inline-block;
    height: 1.2em;
    border-radius: 4px;
    min-width: 100px;

    &--short {
      width: 120px;
    }
  }
}
</style>
