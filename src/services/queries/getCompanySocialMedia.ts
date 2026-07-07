import { graphql } from "@/gql";
import { CompanySocialMediaDocument } from "@/gql/graphql.ts";
import { wpGraphqlClient } from "@services/wpGraphqlClient";

export interface SocialMenuItem {
  link: string;
  rel?: string;
  title: string;
}

export const fetchSocialMenu = async (): Promise<SocialMenuItem[]> => {
  const response = await wpGraphqlClient.query(CompanySocialMediaDocument, {}).toPromise();

  if (response.error) {
    console.error("Error fetching social media links:", response.error);
    return [];
  }

  const entries = response.data?.company?.companyInformations?.socialMedia ?? [];

  return entries
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .flatMap((entry) => {
      // ACF select with "Both (Array)" return format: [value, label]
      const [value, label] = entry.networkname ?? [];
      const title = label ?? (value ? value.charAt(0).toUpperCase() + value.slice(1) : null);

      if (!entry.networkprofile || !title) return [];

      return [
        {
          link: entry.networkprofile,
          title,
          ...(entry.rel ? { rel: entry.rel } : {}),
        },
      ];
    });
};

export const CompanySocialMedia = graphql(`
  query CompanySocialMedia {
    company {
      companyInformations {
        socialMedia {
          rel
          networkprofile
          networkname
        }
      }
    }
  }
`);
