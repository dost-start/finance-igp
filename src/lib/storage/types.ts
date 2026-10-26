// Where receipt and QR images live. Drive in production, a local folder for development.
// Callers never see Drive URLs or permissions: files are private and are only ever read back
// through our own routes after an access check.
export type StoredFile = { bytes: Uint8Array; mime: string };

export interface FileStore {
  put(input: { name: string; mime: string; bytes: Uint8Array }): Promise<string>;
  get(id: string): Promise<StoredFile | null>;
}
