import { graphql } from "@/gql";

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
