import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import { USERSCRIPT } from "./src/userscript";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      build: {
        fileName: "openfront-extended-ui.user.js",
        metaFileName: true,
      },
      userscript: { ...USERSCRIPT },
    }),
  ],
});
