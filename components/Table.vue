<template>
  <div>
    <vue-good-table
      :columns="columns"
      :rows="words"
      :fixed-header="true"
      :search-options="{
        enabled: true,
        placeholder: 'Suche nach einem Begriff oder Redewendung',

      }"
      :sort-options="{
        enabled: true,
        initialSortBy: {field: 'berlinerisch', type: 'asc'}
      }"
      :group-options="{
        enabled: true
      }"
      :pagination-options="{
        enabled: true,
        perPage: 15,
        nextLabel: 'nächste',
        prevLabel: 'vorher',
        rowsPerPageLabel: 'Zeilen pro Seite',
        ofLabel: 'von',
        pageLabel: 'page', // for 'pages' mode
        allLabel: 'Alle',
      }"
    />
  </div>
</template>

<script>
export default {
  name: 'LangTable',

  data () {
    return {
      columns: [
        {
          label: 'Berlinerisch',
          field: 'berlinerisch'
        },
        {
          label: 'Übersetzung',
          field: 'translation'
        },
        {
          label: 'Beispiel',
          field: 'example',
          html: true
        }
      ],
      words: []
    }
  },

  created () {
  },

  mounted () {
    this.createGroups()
    this.fetchWords('https://webshaped.de/wp-json/berlinerisch/v1/post')
  },

  methods: {
    createGroups () {
      const letter = ['A', 'B', 'C', 'D', 'E']
      letter.forEach((element) => {
        const groups = {
          mode: 'span',
          label: element,
          html: false,
          children: []
        }

        this.words.push(groups)
      })
    },

    fetchWords (url) {
      fetch(url)
        .then(r => r.json())
        .then((response) => {
          const words = response.map(x => x.acf)
          words.forEach((element) => {
            const checkWord = element.berlinerisch
            if (checkWord.startsWith('A') || checkWord.startsWith('a')) {
              this.words[0].children.push(element)
            }
            if (checkWord.startsWith('B') || checkWord.startsWith('b')) {
              this.words[1].children.push(element)
            }
            if (checkWord.startsWith('C') || checkWord.startsWith('c')) {
              this.words[2].children.push(element)
            }
            if (checkWord.startsWith('D') || checkWord.startsWith('d')) {
              this.words[3].children.push(element)
            }
            if (checkWord.startsWith('E') || checkWord.startsWith('e')) {
              this.words[4].children.push(element)
            }
          })
        })
    }
  }

}
</script>
