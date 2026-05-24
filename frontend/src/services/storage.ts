import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  });
}

export async function uploadParticipationPhoto(
  userId: string,
  file: File,
  type: 'before' | 'after'
): Promise<string> {
  const ext = 'jpg';
  const path = `${userId}/${type}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('participation-photos')
    .upload(path, file, { upsert: true, contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('participation-photos').getPublicUrl(path);
  return data.publicUrl;
}

export type PhotoUploadStatus = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

export async function compressAndUpload(
  userId: string,
  file: File,
  type: 'before' | 'after',
  onStatus?: (status: PhotoUploadStatus) => void
): Promise<string> {
  onStatus?.('compressing');
  const compressed = await compressImage(file);
  onStatus?.('uploading');
  const url = await uploadParticipationPhoto(userId, compressed, type);
  onStatus?.('done');
  return url;
}

export function createLocalPreview(file: File): string {
  return URL.createObjectURL(file);
}

export function revokePreview(url: string): void {
  URL.revokeObjectURL(url);
}
