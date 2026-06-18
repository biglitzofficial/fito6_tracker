import { v4 as uuidv4 } from 'uuid';
import { bucket } from './firebase';

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ path: string; size: number }> {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const path = `documents/${uuidv4()}${ext}`;
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });

  return { path, size: buffer.length };
}

export async function deleteFile(path: string): Promise<void> {
  await bucket.file(path).delete({ ignoreNotFound: true });
}

export async function getSignedDownloadUrl(path: string, filename: string): Promise<string> {
  const [url] = await bucket.file(path).getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000,
    responseDisposition: `attachment; filename="${filename.replace(/"/g, '')}"`,
  });
  return url;
}

export async function downloadFile(path: string): Promise<Buffer> {
  const [buffer] = await bucket.file(path).download();
  return buffer;
}
