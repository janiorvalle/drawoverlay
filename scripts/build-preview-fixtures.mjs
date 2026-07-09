import { buildPreviewFixtures, previewOutputs } from "./fixture-builds.mjs";

await buildPreviewFixtures();

console.log("Preview opt-in fixtures built:");
console.log(`- Vite: ${previewOutputs.vite}`);
console.log(`- Next.js: ${previewOutputs.next}`);
