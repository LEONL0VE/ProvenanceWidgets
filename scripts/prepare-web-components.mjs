import {
    access,
    copyFile,
    rename,
    rm,
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
await copyFile(generatedTypes, publicTypes);

const publishGeneratedFile = async (generatedFile, publicFile) => {
    try {
        await rename(generatedFile, publicFile);
    } catch (error) {
        if (error?.code !== "EPERM") throw error;
        await copyFile(generatedFile, publicFile);
        await rm(generatedFile, { force: true });
    }
};

await publishGeneratedFile(generatedScript, publicScript);
await publishGeneratedFile(generatedStyles, publicStyles);
