import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.SHOPIFY_API_KEY || process.env.SHOPIFY_API_KEY || "";
  return {
    plugins: [reactRouter(), tsconfigPaths()],
    define: {
      "process.env.SHOPIFY_API_KEY": JSON.stringify(apiKey),
    },
    server: {
      port: Number(env.PORT || process.env.PORT || 3000),
      host: env.HOST || process.env.HOST || "localhost",
    },
  };
});
