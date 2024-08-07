import { fetchAPI } from "@services/fetchApi.ts";
import { seo } from "@services/graphQlQueryParts.ts";
import type { RootQuery } from "@ts_types/generated/graphql.ts";

export const getPageById = async (id: string, idType = "URI"): Promise<RootQuery["page"]> => {
  const data = await fetchAPI(`
  {
    page(id: "${id}", idType: ${idType}) {
      slug
      title
      content
      ${seo}
    }
  }
  `).then((res) => res.data);
  return data?.page;
};
