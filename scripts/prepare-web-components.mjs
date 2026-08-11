import {
    access,
    copyFile,
    rename,
} from "node:fs/promises";
import { constants } from "node:fs";

const outputDirectory = new URL(
    "../dist/web-components/",
    import.meta.url
);
const generatedStyles = new URL("index.css", outputDirectory);
const publicStyles = new URL("styles.css", outputDirectory);
const generatedScript = new URL(
    "index.global.js",
    outputDirectory
);
const publicScript = new URL("index.js", outputDirectory);
const generatedTypes = new URL(
    "../src/web-components/public.d.ts",
    import.meta.url
);
const publicTypes = new URL("index.d.ts", outputDirectory);

await access(generatedScript, constants.R_OK);
await copyFile(generatedScript, publicScript);
await copyFile(generatedTypes, publicTypes);

try {
    await rename(generatedStyles, publicStyles);
} catch (error) {
    if (error?.code !== "EPERM") throw error;
    await copyFile(generatedStyles, publicStyles);
}
