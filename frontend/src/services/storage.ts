import { supabase } from '../lib/supabase';

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const max = 1920;
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context not available')); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
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
