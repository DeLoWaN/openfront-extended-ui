import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

const REPO_RAW =
  "https://raw.githubusercontent.com/DeLoWaN/openfront-extended-ui/main/dist";

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      build: {
        fileName: "openfront-extended-ui.user.js",
        metaFileName: true,
      },
      userscript: {
        name: "OpenFront Extended UI",
        namespace: "https://github.com/DeLoWaN/openfront-extended-ui",
        description:
          "Adds readouts to the OpenFront.io game view. Changes nothing in the game.",
        author: "DeLoWaN",
        license: "MIT",
        match: [
          "https://openfront.io/*",
          "https://*.openfront.io/*",
          "http://localhost:9000/*",
        ],
        // No grant, so the script runs in the page's own context and reaches
        // the page's globals. See docs/adr/0005.
        grant: "none",
        "run-at": "document-idle",
        downloadURL: `${REPO_RAW}/openfront-extended-ui.user.js`,
        updateURL: `${REPO_RAW}/openfront-extended-ui.meta.js`,
      },
    }),
  ],
});
