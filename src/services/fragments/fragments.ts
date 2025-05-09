import { graphql } from "@/gql";

export const PostTypeSeoFragment = graphql(`
  fragment PostTypeSeoFragment on PostTypeSEO {
    title
    canonical
    metaDesc
    metaRobotsNofollow
    metaRobotsNoindex
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
  }
`);
