import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStore, StoredFile } from "./types";

// Development and test store under .data/ (git-ignored). Never used in production.
export function createLocalStore(dir = path.join(process.cwd(), ".data", "files")): FileStore {
  const safe = (id: string) => /^[a-zA-Z0-9-]+$/.test(id);
  return {
    async put({ mime, bytes }) {
      await mkdir(dir, { recursive: true });
      const id = crypto.randomUUID();
      await writeFile(path.join(dir, id), bytes);
      await writeFile(path.join(dir, `${id}.mime`), mime);
      return id;
    },
    async get(id): Promise<StoredFile | null> {
      if (!safe(id)) return null;
      try {
        const [bytes, mime] = await Promise.all([readFile(path.join(dir, id)), readFile(path.join(dir, `${id}.mime`), "utf8")]);
        return { bytes: new Uint8Array(bytes), mime };
      } catch {
        return null;
      }
    },
  };
}
