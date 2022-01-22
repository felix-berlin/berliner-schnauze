<template>
  <div>
    <!-- <table>
      <thead>
        <th>Berlinerisch</th>
        <th>Übersetzung</th>
        <th>Beispiel</th>
      </thead>
      <tbody>
        <tr v-for="(value, name, index) in lang" :key="index">
          <td>{{ value.berlinerisch }}</td>
          <td>{{ value.translation }}</td>
          <td>{{ value.example }}</td>
        </tr>
      </tbody>
    </table> -->

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
        perPage: 15
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
      words: [
        {
          mode: 'span', // span means this header will span all columns
          label: 'A', // this is the label that'll be used for the header
          html: false, // if this is true, label will be rendered as html
          children: []
        },
        {
          mode: 'span', // span means this header will span all columns
          label: 'B', // this is the label that'll be used for the header
          html: false, // if this is true, label will be rendered as html
          children: []
        },
        {
          mode: 'span', // span means this header will span all columns
          label: 'C', // this is the label that'll be used for the header
          html: false, // if this is true, label will be rendered as html
          children: []
        }
      ]
    }
  },

  mounted () {
    // const a = this.words.forEach((element) => {
    //   console.log('test')
    //   console.log(element)
    // })
    // console.log(a)
  },

  created () {
    fetch('https://webshaped.de/wp-json/berlinerisch/v1/post')
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
        })
      })
  }
}
</script>
