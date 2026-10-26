// Where receipt and QR images live. Drive in production, a local folder for development.
// Callers never see Drive URLs or permissions: files are private and are only ever read back
// through our own routes after an access check.
export type StoredFile = { bytes: Uint8Array; mime: string };

export type StoredFileInfo = { id: string; name: string; createdAt: string };

export interface FileStore {
  put(input: { name: string; mime: string; bytes: Uint8Array }): Promise<string>;
  get(id: string): Promise<StoredFile | null>;
  // Used only to keep the newest nightly backups and drop older ones. The development store has no list.
  list?(namePrefix: string): Promise<StoredFileInfo[]>;
  remove?(id: string): Promise<void>;
}
