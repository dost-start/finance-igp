import { createDriveStore, driveConfigFromEnv } from "./drive";
import { createLocalStore } from "./local";
import type { FileStore } from "./types";

let store: FileStore | undefined;

// Drive when its settings exist. The local folder is a development fallback only: production
// without Drive settings fails loudly instead of quietly writing files nobody can see.
export function getFileStore(): FileStore {
  if (store) return store;
  const drive = driveConfigFromEnv();
  if (drive) return (store = createDriveStore(drive));
  if (process.env.NODE_ENV === "production") throw new Error("File storage is not configured");
  return (store = createLocalStore());
}

export type { FileStore, StoredFile } from "./types";
