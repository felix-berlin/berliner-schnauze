// Site structure copied from the production CMS (menus, funding links, social profiles, book recommendations).
// All of it is public on the website; no word data lives here.
export const navigation = {
  "main": [
    {
      "title": "Wort Index",
      "link": "/wort",
      "rel": null,
      "description": "Alle Wörter von A bis Z"
    },
    {
      "title": "Magazin",
      "link": "/magazin",
      "rel": null,
      "description": "Jeschichten rund um Berlinerisch"
    },
    {
      "title": "Anki-Karteikarten",
      "link": "/anki",
      "rel": null,
      "description": "Berlinerisch lernen, Karte für Karte"
    },
    {
      "title": "Berliner oder nicht?",
      "link": "/games/berliner-oder-nicht",
      "rel": null,
      "description": "Dit Spiel: Teste Dein Berlinisch"
    },
    {
      "title": "Wort vorschlagen",
      "link": "/wort-vorschlagen",
      "rel": null,
      "description": null
    },
    {
      "title": "Projekt unterstützen",
      "link": "/spenden",
      "rel": null,
      "description": null
    },
    {
      "title": "Was ist neu?",
      "link": "/changelog",
      "rel": null,
      "description": null
    },
    {
      "title": "Einstellungen",
      "link": "/settings",
      "rel": null,
      "description": null
    }
  ],
  "footer1": [
    {
      "title": "Magazin",
      "link": "/magazin",
      "rel": null,
      "description": null
    },
    {
      "title": "Wort vorschlagen",
      "link": "/wort-vorschlagen",
      "rel": null,
      "description": null
    },
    {
      "title": "Wort Index",
      "link": "/wort",
      "rel": null,
      "description": null
    },
    {
      "title": "Offline-Cache",
      "link": "/settings/cache",
      "rel": null,
      "description": null
    },
    {
      "title": "Was ist neu?",
      "link": "/changelog",
      "rel": null,
      "description": null
    },
    {
      "title": "tech. Changelog",
      "link": "/technischer-changelog",
      "rel": null,
      "description": null
    },
    {
      "title": "tech. Fehler melden",
      "link": "https://github.com/felix-berlin/berliner-schnauze/issues/new",
      "rel": null,
      "description": null
    }
  ],
  "footer2": [
    {
      "title": "Impressum",
      "link": "/impressum",
      "rel": null,
      "description": null
    },
    {
      "title": "Datenschutz",
      "link": "/datenschutz",
      "rel": null,
      "description": null
    }
  ]
};

export const company = {
  "platforms": [
    {
      "name": "GitHub Sponsors",
      "link": "https://github.com/sponsors/felix-berlin"
    },
    {
      "name": "Ko-fi",
      "link": "https://ko-fi.com/felixberlin"
    },
    {
      "name": "PayPal",
      "link": "https://paypal.me/FelixScholze"
    },
    {
      "name": "Buy me a coffee",
      "link": "https://www.buymeacoffee.com/felixberlin"
    }
  ],
  "wallets": [
    {
      "address": "0x4A21A332cAc9809dBCAdcD4CeDD43fdF32661eeE",
      "chains": [
        "Ethereum",
        "Linea",
        "Base",
        "BNB Chain",
        "Sei",
        "Polygon",
        "OP",
        "Arbitrum"
      ]
    },
    {
      "address": "bc1qdp6ucj4pcp7w94y4nevktzazpul53pr2jxt040",
      "chains": [
        "Bitcoin"
      ]
    },
    {
      "address": "HUj6hkvdb9kHhRGwLQfT4K6q1RBeXsR7xxCNekT9ZjrA",
      "chains": [
        "Solana"
      ]
    },
    {
      "address": "TRwwuT7924VxDNzDcVj7TRz9kpgtyAb2C3",
      "chains": [
        "Tron"
      ]
    }
  ],
  "socialMedia": [
    {
      "label": "Bluesky",
      "profile": "https://bsky.app/profile/berliner-schnauze.wtf",
      "relMe": false
    },
    {
      "label": "Mastodon",
      "profile": "https://mastodon.social/@berliner_schnauze",
      "relMe": true
    },
    {
      "label": "GitHub",
      "profile": "https://github.com/felix-berlin/berliner-schnauze",
      "relMe": false
    },
    {
      "label": "Facebook",
      "profile": "https://www.facebook.com/Berliner.Schnauze030",
      "relMe": false
    }
  ]
};

export const affiliate = {
  "books": [
    {
      "title": "Langenscheidt Lilliput Berlinerisch",
      "description": "~5.000 Stichwörter, Berlinerisch ↔ Hochdeutsch",
      "href": "https://amzn.to/4xR4Bc3",
      "imageUrl": "https://m.media-amazon.com/images/I/41+kWR+0HCL._SL160_.jpg",
      "imageAlt": null,
      "badge": "Wörterbuch",
      "badgeModifier": "dictionary"
    },
    {
      "title": "Berlinerisch: Watt denn, icke?",
      "description": "Mit typischen Berliner Sprüchen & Sprachgeschichte",
      "href": "https://amzn.to/4oSsOuf",
      "imageUrl": "https://m.media-amazon.com/images/I/61GIlaMv1iL._SL160_.jpg",
      "imageAlt": null,
      "badge": "Nachschlagewerk",
      "badgeModifier": "reference"
    },
    {
      "title": "Da kiekste, wa?! Dialekt-Quiz",
      "description": "50 typische Berliner Begriffe als Kartenspiel",
      "href": "https://amzn.to/4vzMQMP",
      "imageUrl": "https://m.media-amazon.com/images/I/71NffJVrOJL._SL160_.jpg",
      "imageAlt": null,
      "badge": "Geschenk",
      "badgeModifier": "gift"
    }
  ],
  "disclaimers": [
    {
      "plattform": "Amazon",
      "text": "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen."
    }
  ]
};
