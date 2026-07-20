import { graphql } from "@/gql";

export const CoreImageBlockFields = graphql(`
  fragment CoreImageBlockFields on CoreImageBlock {
    name
    order
    saveContent
    attributes {
      ... on CoreImageBlockAttributes {
        url
        width
        height
        alt
      }
    }
  }
`);

export const CoreQuoteBlockFields = graphql(`
  fragment CoreQuoteBlockFields on CoreQuoteBlock {
    name
    order
    saveContent
    attributes {
      ... on CoreQuoteBlockAttributes {
        value
      }
    }
  }
`);
