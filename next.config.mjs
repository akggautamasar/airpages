import { copyFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Serve the worker from this deployment with the same version as the renderer.
copyFileSync(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
  new URL("./public/pdf.worker.min.mjs", import.meta.url));

/** @type {import('next').NextConfig} */
export default { reactStrictMode: true };
