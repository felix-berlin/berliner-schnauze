import { graphql } from "@/gql";

export const SendEmail = graphql(`
  mutation SendEmail($input: SendEmailInput = {}) {
    sendEmail(input: $input) {
      message
      origin
      sent
    }
  }
`);
