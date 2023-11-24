import { fetchAPI } from "@services/fetchApi";
import { seo } from "@services/graphQlQueryParts";
import type { RootQuery } from "@ts_types/generated/graphql";

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
