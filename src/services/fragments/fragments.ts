import { graphql } from "@/gql";

export const TaxonomySeoFragment = graphql(`
  fragment TaxonomySeoFragment on TaxonomySEO {
    title
    metaDesc
    canonical
    opengraphDescription
    opengraphTitle
    opengraphType
    opengraphUrl
    opengraphImage {
      sourceUrl
    }
    twitterDescription
    twitterTitle
    metaRobotsNofollow
    metaRobotsNoindex
  }
`);

export const PostTypeSeoFragment = graphql(`
  fragment PostTypeSeoFragment on PostTypeSEO {
    title
    readingTime
    canonical
    metaDesc
    opengraphSiteName
    opengraphAuthor
    opengraphDescription
    opengraphPublisher
    opengraphTitle
    opengraphType
    opengraphUrl
    opengraphPublishedTime
    opengraphModifiedTime
    opengraphImage {
      sourceUrl
    }
    twitterDescription
    twitterTitle
    metaRobotsNofollow
    metaRobotsNoindex
  }
`);

export const MediaItem = graphql(`
  fragment MediaItem on MediaItem {
    mediaItemUrl
  }
`);

export const WordPropertiesBerlinerischAudio = graphql(`
  fragment WordPropertiesBerlinerischAudio on WordPropertiesBerlinerischAudio {
    audio {
      node {
        ...MediaItem
      }
    }
    gender
  }
`);

export const WordPropertiesExamplesExampleAudio = graphql(`
  fragment WordPropertiesExamplesExampleAudio on WordPropertiesExamplesExampleAudio {
    gender
    audio {
      node {
        ...MediaItem
      }
    }
  }
`);

export const WordPropertiesExamples = graphql(`
  fragment WordPropertiesExamples on WordPropertiesExamples {
    example
    exampleExplanation
    exampleAudio {
      ...WordPropertiesExamplesExampleAudio
    }
  }
`);

export const WordPropertiesWikimediaFiles = graphql(`
  fragment WordPropertiesWikimediaFiles on WordPropertiesWikimediaFiles {
    wikimediaFile
    description
    caption
  }
`);

export const WordProperties = graphql(`
  fragment WordProperties on WordProperties {
    article
    berlinerisch
    berlinerischAudio {
      ...WordPropertiesBerlinerischAudio
    }
    learnMore
    berolinismus
    examples {
      ...WordPropertiesExamples
    }
    translations {
      translation
    }
    alternativeWords {
      alternativeWord
    }
    relatedWords {
      nodes {
        ... on BerlinerWord {
          id
          wordProperties {
            berlinerisch
          }
          slug
        }
      }
    }
    wikimediaFiles {
      ...WordPropertiesWikimediaFiles
    }
    infoText
    images {
      nodes {
        sourceUrl
        mediaDetails {
          height
          width
        }
        caption(format: RENDERED)
        altText
        description(format: RENDERED)
      }
    }
  }
`);

export const BerlinerWord = graphql(`
  fragment BerlinerWord on BerlinerWord {
    id
    slug
    title
    wordGroup
    dateGmt
    modifiedGmt
    berlinerWordId
    wordProperties {
      ...WordProperties
    }
    berlinerischWordTypes {
      nodes {
        name
      }
    }
    berlinerischThemen {
      nodes {
        name
        slug
      }
    }
    seo {
      ...PostTypeSeoFragment
    }
  }
`);
