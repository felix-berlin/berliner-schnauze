import { graphql } from "@/gql";
import { MenuByNameDocument } from "@/gql/graphql.ts";
import { wpGraphqlClient } from "@services/wpGraphqlClient";

export interface MenuItem {
  link: string;
  rel?: string;
  title: string;
}

/**
 * Fetches a WordPress menu by name and maps its items to the NavList item shape.
 */
export const fetchMenu = async (name: string): Promise<MenuItem[]> => {
  const response = await wpGraphqlClient.query(MenuByNameDocument, { name }).toPromise();

  if (response.error) {
    console.error(`Error fetching menu "${name}":`, response.error);
    return [];
  }

  const nodes = response.data?.menu?.menuItems?.nodes ?? [];

  return nodes.flatMap((node) =>
    node.path && node.label
      ? [
          {
            link: node.path,
            title: node.label,
            ...(node.linkRelationship ? { rel: node.linkRelationship } : {}),
          },
        ]
      : [],
  );
};

export const MenuByName = graphql(`
  query MenuByName($name: ID!) {
    menu(id: $name, idType: NAME) {
      menuItems(first: 100) {
        nodes {
          label
          linkRelationship
          path
        }
      }
    }
  }
`);
