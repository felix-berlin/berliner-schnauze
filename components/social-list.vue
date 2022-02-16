<template>
  <div class="c-social-list" :class="modifier">
    <ul class="c-social-list__list u-list-reset" :class="listModifier">
      <li v-for="(social, index) in list" :key="index" class="c-social-list__item" :class="listItemModifier">
        <a
          v-tooltip="{
            content: social.tooltip,
            disabled: (social.tooltip.length ? false : true) || hideTooltips,
            theme: 'berliner-schnauze'
          }"
          :href="social.link"
          :aria-label="social.ariaLabel"
          rel="noopener"
          target="_blank"
          class="c-social-list__link"
          :class="listLinkModifier"
        >
          <Github v-if="social.name === 'github'" />
          <Twitter v-if="social.name === 'twitter'" />
          <Facebook v-if="social.name === 'facebook'" />
          <Send v-if="social.name === 'mail'" />
        </a>
      </li>
    </ul>
  </div>
</template>
  </div>

<script>
import { Github, Facebook, Twitter, Send } from 'lucide-vue'

export default {
  name: 'SocialList',

  components: {
    Github,
    Facebook,
    Twitter,
    Send
  },

  props: {
    modifier: {
      type: String,
      default: ''
    },
    listModifier: {
      type: String,
      default: ''
    },
    listItemModifier: {
      type: String,
      default: ''
    },
    listLinkModifier: {
      type: String,
      default: ''
    },
    hideTooltips: {
      type: Boolean,
      default: false
    }
  },

  data () {
    return {
      list: [
        {
          name: 'github',
          link: 'https://github.com/felix-berlin/berliner-schnauze',
          ariaLabel: 'Link zum Github Projekt',
          tooltip: 'Juhu, Berliner Schnauze ist ein Open Source Projekt auf Github.'
        },
        {
          name: 'twitter',
          link: 'https://twitter.com/BLN_Schnauze',
          ariaLabel: 'Folge Berliner Schnauze auf Twitter',
          tooltip: 'Verrückt, Berliner Schnauze gibts auch auf Twitter.'
        },
        {
          name: 'facebook',
          link: 'https://www.facebook.com/Berliner.Schnauze030',
          ariaLabel: 'Folge Berliner Schnauze auf Facebook',
          tooltip: 'Altmodisch, aber auf Facebook gibt es Berliner Schnauze auch.'
        },
        {
          name: 'mail',
          link: 'mailto:mail@berliner-schnauze.wtf',
          ariaLabel: 'Sende Berliner-Schnauze eine Nachricht per Mail',
          tooltip: 'Du kennst noch andere Worte? Schreib mir eine Mail.'
        }
      ]
    }
  }
}
</script>
