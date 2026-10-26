import type { FileStore, StoredFile } from "./types";

// Google Drive over plain fetch, authenticated as the finance Google account with a refresh
// token and the narrow drive.file scope. This module never creates permissions or share links.
type Config = { clientId: string; clientSecret: string; refreshToken: string; folderId: string };

export function driveConfigFromEnv(env: NodeJS.ProcessEnv = process.env): Config | null {
  const { AUTH_GOOGLE_ID: clientId, AUTH_GOOGLE_SECRET: clientSecret, DRIVE_REFRESH_TOKEN: refreshToken, DRIVE_FOLDER_ID: folderId } = env;
  return clientId && clientSecret && refreshToken && folderId ? { clientId, clientSecret, refreshToken, folderId } : null;
}

export function createDriveStore(config: Config): FileStore {
  let cached: { token: string; expiresAt: number } | null = null;

  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) throw new Error("drive auth failed");
    cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return cached.token;
  }

  return {
    async put({ name, mime, bytes }) {
      const boundary = `b${crypto.randomUUID()}`;
      const head = `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [config.folderId] })}\r\n--${boundary}\r\ncontent-type: ${mime}\r\n\r\n`;
      const body = new Blob([head, new Uint8Array(bytes), `\r\n--${boundary}--`]);
      const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST",
        headers: { authorization: `Bearer ${await accessToken()}`, "content-type": `multipart/related; boundary=${boundary}` },
        body,
      });
      const json = (await res.json()) as { id?: string };
      if (!res.ok || !json.id) throw new Error(`drive upload failed (${res.status})`);
      return json.id;
    },

    async get(id): Promise<StoredFile | null> {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
        headers: { authorization: `Bearer ${await accessToken()}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`drive download failed (${res.status})`);
      return { bytes: new Uint8Array(await res.arrayBuffer()), mime: res.headers.get("content-type") ?? "application/octet-stream" };
    },
  };
}
