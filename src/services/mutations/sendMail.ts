import type { FormData } from "@components/SuggestWordForm.vue";
import { WP_REST_API, SUGGEST_WORD_FORM_ID, WP_AUTH_REFRESH_TOKEN } from "astro:env/client";
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
export const sendEmailViaContactForm7 = async (formData: FormData): Promise<void> => {
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
    .then((data) => console.log(data))
    .catch((error) => console.error("Error:", error));

  await fetch(`${WP_REST_API}/contact-form-7/v1/contact-forms/${SUGGEST_WORD_FORM_ID}/feedback`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
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
