import { experimental_AstroContainer as AstroContainer } from "astro/container";
import vueServerRenderer from "@astrojs/vue/server.js";

export async function createAstroRender(component: unknown) {
  const container = await AstroContainer.create({
    renderers: [{
      name: "@astrojs/vue",
      clientEntrypoint: "@astrojs/vue/client.js",
      ssr: vueServerRenderer,
    }],
  });
  return (props: Record<string, unknown>) =>
    container.renderToString(
      component as Parameters<typeof container.renderToString>[0],
      { props },
    );
}
