import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = path.join(root, "public", "mediapipe", "wasm");

if (!existsSync(src)) {
  console.warn("mediapipe wasm source not found, skipping copy:", src);
  process.exit(0);
}

await mkdir(path.dirname(dest), { recursive: true });
await cp(src, dest, { recursive: true });
console.log("Copied MediaPipe wasm assets to", dest);
