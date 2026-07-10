import { SUGGEST_WORD_FORM_ID, WP_REST_API } from "astro:env/client";
import { WP_AUTH_REFRESH_TOKEN } from "astro:env/server";

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

/**
 * Posts the form data to the contact form 7 API
 *
 * @return  {Promise<void>}
 */
export const sendEmailViaContactForm7 = async (
  formData: Record<string, string | undefined>,
): Promise<void> => {
  const formInputs = new FormData();

  for (const name in formData) {
    if (formData[name] !== undefined) {
      formInputs.append(name, formData[name]);
    }
  }

  await fetch(`${WP_REST_API}`, {
    headers: {
      Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
    },
  })
    .then((response) => response.json())
    .catch((error) => console.error("Error:", error));

  await fetch(`${WP_REST_API}/contact-form-7/v1/contact-forms/${SUGGEST_WORD_FORM_ID}/feedback`, {
    body: formInputs,
    headers: {
      Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
    },
    method: "POST",
  }).then((response) => {
    if (!response.ok) {
      return Promise.reject(new Error("Send E-Mail failed", { cause: response.status }));
    }
    return response.json();
  });
};
