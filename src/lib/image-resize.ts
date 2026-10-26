// Runs in the buyer's browser. Phone screenshots and photos can be several MB, so shrink them
// before upload: longest side about 1600 px, JPEG, aiming for under 1 MB. The server still
// checks everything again and trusts nothing from here.
const MAX_SIDE = 1600;
const TARGET_BYTES = 1_000_000;
const HARD_LIMIT_BYTES = 3_500_000;

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality);
  });
}

export async function downscaleImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // also applies the photo's rotation
  try {
    let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 4; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#ffffff"; // transparent PNGs would turn black as JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      let blob = await toJpeg(canvas, 0.85);
      for (const q of [0.75, 0.65, 0.55, 0.45]) {
        if (blob.size <= TARGET_BYTES) break;
        blob = await toJpeg(canvas, q);
      }
      if (blob.size <= HARD_LIMIT_BYTES) return blob;
      scale *= 0.75;
    }
    throw new Error("image too large");
  } finally {
    bitmap.close();
  }
}
