// One-time: create the private receipts folder through the API, using the refresh token
// you got from the OAuth Playground. Under the drive.file scope the app only sees files it
// created itself, so the folder must be made here, never by hand in the Drive web UI.
// Run: node scripts/create-drive-folder.mjs
import { readFileSync, writeFileSync } from "node:fs";

const ENV = ".env.local";
const read = () => readFileSync(ENV, "utf8");
const env = Object.fromEntries(
  read().split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const { AUTH_GOOGLE_ID: id, AUTH_GOOGLE_SECRET: secret, DRIVE_REFRESH_TOKEN: refresh } = env;
if (!id || !secret || !refresh) {
  console.error("Fill AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET and DRIVE_REFRESH_TOKEN in .env.local first.");
  process.exit(1);
}
if (env.DRIVE_FOLDER_ID) {
  console.error("DRIVE_FOLDER_ID is already set. Clear it first if you really want a new folder.");
  process.exit(1);
}

const tok = await (await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
})).json();
if (!tok.access_token) {
  console.error("Could not get an access token:", tok.error_description ?? tok.error ?? "unknown error");
  process.exit(1);
}

const folder = await (await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
  method: "POST",
  headers: { authorization: `Bearer ${tok.access_token}`, "content-type": "application/json" },
  body: JSON.stringify({ name: "START Shop Receipts", mimeType: "application/vnd.google-apps.folder" }),
})).json();
if (!folder.id) {
  console.error("Could not create the folder:", JSON.stringify(folder.error ?? folder));
  process.exit(1);
}

const t = read(), re = /^DRIVE_FOLDER_ID=.*$/m;
writeFileSync(ENV, re.test(t) ? t.replace(re, () => `DRIVE_FOLDER_ID=${folder.id}`) : `${t}\nDRIVE_FOLDER_ID=${folder.id}\n`);
console.log('Saved DRIVE_FOLDER_ID to .env.local. Folder "START Shop Receipts" now exists in that Drive account.');
