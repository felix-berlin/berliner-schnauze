<template>
  <div class="c-table">
    <p v-text="wordCount" />

    <vue-good-table
      :columns="columns"
      :rows="words"
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
        <span :id="props.row.label" v-waypoint="{ active: true, callback: onWaypoint, intersectionOptions }" class="my-fancy-class">
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
      wordCount: 0,
      currentDictionaryPosition: '',
      intersectionOptions: {
        root: null,
        rootMargin: '0px 0px 0px 0px',
        threshold: 0.5 // [0.25, 0.75] if you want a 25% offset!
      }
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
    },

    onWaypoint ({ going, direction, el }) {
      const currentElementId = el.getAttribute('id')
      const currentElementRow = el.closest('.vgt-row-header')

      if (going === this.$waypointMap.GOING_IN) {
        console.log('waypoint going in! ' + currentElementId)

        // Save the current Element
        this.currentDictionaryPosition = currentElementId

        // Append a focus class to the active row
        currentElementRow.classList.add('is-active')

        // Remove the class after 2s
        setTimeout(() => {
          currentElementRow.classList.remove('is-active')
        }, 2000)

        // TODO: add the currentElement to the Store
        this.$store.commit('increment', { letter: currentElementId })
      }

      // if (going === this.$waypointMap.GOING_OUT) {
      //   el.classList.remove('is-active')
      // }

      // if (direction === this.$waypointMap.DIRECTION_TOP) {
      //   console.log('waypoint going top! ' + currentElementId)
      // }
    }
  }

}
</script>
