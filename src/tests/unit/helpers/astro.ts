import { experimental_AstroContainer as AstroContainer } from "astro/container";

export async function createAstroRender(component: unknown) {
  const container = await AstroContainer.create();
  return (props: Record<string, unknown>) =>
    container.renderToString(
      component as Parameters<typeof container.renderToString>[0],
      { props },
    );
}
