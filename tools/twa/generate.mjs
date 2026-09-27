/* Generates the Android (Trusted Web Activity) project for BitWise into ./android
   from twa/twa-manifest.json using @bubblewrap/core.

   The launcher icons are read from public/icons through a throw-away local
   server, so the build never depends on the live site being deployed first.

   Env:
     TWA_VERSION_CODE  integer versionCode (defaults to the manifest value)
     TWA_VERSION_NAME  versionName string (defaults to the manifest value)   */
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { TwaGenerator, TwaManifest, ConsoleLog, fetchUtils } from "@bubblewrap/core";
import { serve } from "../serve.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = ROOT + "android";

const json = JSON.parse(await readFile(ROOT + "twa/twa-manifest.json", "utf8"));
if (process.env.TWA_VERSION_CODE) json.appVersionCode = Number(process.env.TWA_VERSION_CODE);
if (process.env.TWA_VERSION_NAME) json.appVersion = process.env.TWA_VERSION_NAME;

const server = await serve(0);
const local = `http://127.0.0.1:${server.address().port}/`;
json.iconUrl = local + "icons/icon-512.png";
json.maskableIconUrl = local + "icons/icon-maskable-512.png";
fetchUtils.setFetchEngine("node-fetch");

try {
  const manifest = new TwaManifest(json);
  const err = manifest.validate();
  if (err) throw new Error("twa-manifest.json: " + err);
  await rm(OUT, { recursive: true, force: true });
  await new TwaGenerator().createTwaProject(OUT, manifest, new ConsoleLog("twa"));
  console.log(`Android project generated in ${OUT} (versionCode ${json.appVersionCode}, versionName ${json.appVersion})`);
} finally {
  server.close();
}
