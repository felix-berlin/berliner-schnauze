<template>
  <div>
    <button type="button" class="c-button" @click="CookieConsent.showPreferences()">
      Cookie Einstellungen
    </button>
  </div>
</template>

<script setup lang="ts">
import "vanilla-cookieconsent/dist/cookieconsent.css";
import * as CookieConsent from "vanilla-cookieconsent";

CookieConsent.run({
  categories: {
    analytics: {},
    necessary: {
      enabled: true, // this category is enabled by default
      readOnly: true, // this category cannot be disabled
    },
  },
  guiOptions: {
    consentModal: {
      layout: "box inline",
      position: "bottom left",
    },
  },
  language: {
    default: "en",

    translations: {
      en: {
        consentModal: {
          acceptAllBtn: "Accept",
          acceptNecessaryBtn: "Reject",
          closeIconLabel: "Reject all and close",
          description:
            "Our website uses essential cookies to ensure its proper operation and tracking cookies to understand how you interact with it. The latter will be set only after consent.",
          footer: `
            <a href="#link">Privacy Policy</a>
            <a href="#link">Impressum</a>
          `,
          showPreferencesBtn: "Manage preferences",
          title: "Hello traveller, it's cookie time!",
        },
        preferencesModal: {
          acceptAllBtn: "Accept all",
          acceptNecessaryBtn: "Reject all",
          savePreferencesBtn: "Save preferences",
          sections: [
            {
              description:
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. For more details, refer to our <a href="#" class="cc__link">privacy policy</a>.',
              title: "Cookie usage",
            },
            {
              description:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              linkedCategory: "necessary",
              title: "Strictly necessary cookies",
            },
            {
              cookieTable: {
                body: [
                  {
                    desc: "description ...",
                    domain: "yourdomain.com",
                    name: "_ga",
                  },
                  {
                    desc: "description ...",
                    domain: "yourdomain.com",
                    name: "_gid",
                  },
                ],
                headers: {
                  desc: "Description",
                  domain: "Domain",
                  name: "Cookie",
                },
              },
              description:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              linkedCategory: "analytics",
              title: "Performance and analytics cookies",
            },
            {
              description:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              linkedCategory: "ads",
              title: "Advertisement and targeting cookies",
            },
            {
              description:
                'For any queries in relation to our policy on cookies and your choices, please <a class="cc__link" href="#yourdomain.com">contact me</a>.',
              title: "More information",
            },
          ],
          title: "Cookie preferences",
        },
      },
    },
  },
});
</script>

<style scoped></style>
