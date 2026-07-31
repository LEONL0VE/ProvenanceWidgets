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

await access(generatedScript, constants.R_OK);
await copyFile(generatedScript, publicScript);

try {
    await rename(generatedStyles, publicStyles);
} catch (error) {
    if (error?.code !== "EPERM") throw error;
    await copyFile(generatedStyles, publicStyles);
}
