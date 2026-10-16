import { withPayload } from "@payloadcms/next/withPayload";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return webpackConfig;
  },
  turbopack: { root: path.resolve(dirname, "..") },
  // Self-contained server for the Docker image; trace from the workspace root
  // so hoisted pnpm deps land in .next/standalone/node_modules.
  output: "standalone",
  outputFileTracingRoot: path.resolve(dirname, ".."),
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
