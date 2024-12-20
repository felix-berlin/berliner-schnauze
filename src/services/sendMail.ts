import { fetchAPI } from "@services/fetchApi.ts";
import type { SendEmailPayload, SendEmailInput } from "@ts_types/generated/graphql.ts";
import type { FormData } from "@components/SuggestWordForm.vue";
import { WP_REST_API, SUGGEST_WORD_FORM_ID } from "astro:env/client";

/**
 * Sends an email using the sendEmail mutation
 * @see https://github.com/ashhitch/wp-graphql-send-mail
 *
 * @param   {SendEmailInput<SendEmailPayload>}  input
 *
 * @return  {Promise<SendEmailPayload>}
 */
export const sendEmail = async (input: SendEmailInput): Promise<SendEmailPayload> => {
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

    return res.data as SendEmailPayload;
  });

  return data;
};

/**
 * Posts the form data to the contact form 7 API
 *
 * @return  {Promise<void>}
 */
export const sendEmailViaContactForm7 = async (formData: FormData): Promise<void> => {
  const formInputs = new FormData();

  for (const name in formData) {
    if (formData[name] !== undefined) {
      formInputs.append(name, formData[name]);
    }
  }

  await fetch(`${WP_REST_API}`, {
    headers: {
      Authorization: `Bearer ${import.meta.env.WP_AUTH_REFRESH_TOKEN}`,
    },
  })
    .then((response) => response.json())
    .then((data) => console.log(data))
    .catch((error) => console.error("Error:", error));

  await fetch(`${WP_REST_API}/contact-form-7/v1/contact-forms/${SUGGEST_WORD_FORM_ID}/feedback`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.WP_AUTH_REFRESH_TOKEN}`,
    },
    body: formInputs,
  }).then((response) => {
    if (!response.ok) {
      console.log("response: ", response, response.json());
      return Promise.reject(new Error("Send E-Mail failed", { cause: response.status }));
    }
    return response.json();
  });
};
