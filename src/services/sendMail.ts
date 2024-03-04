import { fetchAPI } from "@services/fetchApi.ts";
import type { SendEmailPayload, SendEmailInput } from "@ts_types/generated/graphql.ts";

/**
 * Sends an email using the sendEmail mutation
 * @see https://github.com/ashhitch/wp-graphql-send-mail
 *
 * @param   {SendEmailInput<SendEmailPayload>}  input
 *
 * @return  {Promise<SendEmailPayload>}
 */
export const sendEmail = async (input: SendEmailInput): Promise<SendEmailPayload> => {
  console.log(input.body);

  const data = await fetchAPI(
    `
  mutation SendEmail($input: SendEmailInput!) {
    sendEmail(input: $input) {
      origin
      sent
      message
    }
  }`,
    {
      variables: {
        input: {
          to: input.to,
          from: input.from,
          subject: input.subject,
          body: input.body,
          clientMutationId: input.clientMutationId,
        },
      },
    },
  ).then((res) => {
    if (res.errors) {
      return Promise.reject(new Error("Send E-Mail failed", { cause: res.errors }));
    }

    return res.data;
  });

  return data;
};
