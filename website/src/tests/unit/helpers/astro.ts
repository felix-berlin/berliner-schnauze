import vueServerRenderer from "@astrojs/vue/server.js";
import { experimental_AstroContainer as AstroContainer } from "astro/container";

export async function createAstroRender(component: unknown) {
  const container = await AstroContainer.create({
    renderers: [
      {
        clientEntrypoint: "@astrojs/vue/client.js",
        name: "@astrojs/vue",
        ssr: vueServerRenderer,
      },
    ],
  });
  return (props: Record<string, unknown> = {}, params?: Record<string, string>) =>
    container.renderToString(component as Parameters<typeof container.renderToString>[0], {
      params,
      props,
    });
}
