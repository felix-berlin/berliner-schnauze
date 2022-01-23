<template>
  <div class="c-table">
    <p v-text="wordCount" />

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
        enabled: true,
        collapsable: false
      }"
    >
      <template slot="table-header-row" slot-scope="props">
        <span :id="props.row.label" class="my-fancy-class">
          {{ props.row.label }}
        </span>
      </template>
    </vue-good-table>
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
          field: 'berlinerisch',
          thClass: 'c-table__th'
        },
        {
          label: 'Übersetzung',
          field: 'translation',
          html: true
        },
        {
          label: 'Beispiel',
          field: 'example',
          html: true
        }
      ],
      words: [],
      groupNames: this.$store.state.groupNames,
      wordCount: 0
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
      const letter = this.groupNames
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
          words.forEach((word, index) => {
            this.wordCount = index
            const checkWord = word.berlinerisch.toLowerCase()
            const groupNamesLower = this.groupNames
            groupNamesLower.forEach((groupItem, index) => {
              if (checkWord.startsWith(groupItem.toLowerCase())) {
                this.words[index].children.push(word)
              }
            })
          })
        })
    }
  }

}
</script>
