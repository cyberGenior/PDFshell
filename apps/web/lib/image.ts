'use client';

/**
 * Decode any browser-supported image (JPG/PNG/WebP/GIF…) and re-encode it to PNG
 * bytes via a canvas. Shared by tools that stamp user images onto a PDF
 * (watermark, edit) so pdf-lib — which only embeds PNG/JPEG — always gets PNG.
 * Also returns the natural aspect ratio for sizing the overlay.
 */
export async function fileToPng(file: File): Promise<{ bytes: Uint8Array; aspect: number }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  ctx.drawImage(bitmap, 0, 0);
  const aspect = bitmap.width / bitmap.height;
  bitmap.close();

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('Image encoding failed.');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), aspect };
}
