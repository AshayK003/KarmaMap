import { supabase } from '../lib/supabase';

export type PhotoUploadStatus = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

function imageToJpegBlob(img: HTMLImageElement): Promise<Blob> {
  const max = 1200;
  let { width, height } = img;
  if (width > max || height > max) {
    const ratio = Math.min(max / width, max / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.8,
    );
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = url;
  });
}

export async function compressImage(file: File): Promise<File> {
  const buffer = await file.arrayBuffer();
  const mime = file.type || 'image/jpeg';

  // Try blob URL first, fall back to data URL if the Image can't decode the format
  let img: HTMLImageElement;
  const blobUrl = URL.createObjectURL(new Blob([buffer], { type: mime }));
  try {
    img = await loadImageFromUrl(blobUrl);
  } catch {
    URL.revokeObjectURL(blobUrl);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image data'));
      reader.readAsDataURL(new Blob([buffer], { type: mime }));
    });
    img = await loadImageFromUrl(dataUrl);
  }
  URL.revokeObjectURL(blobUrl);

  const jpegBlob = await imageToJpegBlob(img);
  return new File([jpegBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

export async function uploadParticipationPhoto(
  userId: string,
  file: File,
  type: 'before' | 'after',
): Promise<string> {
  const path = `${userId}/${type}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('participation-photos')
    .upload(path, file, { upsert: true, contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('participation-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function compressAndUpload(
  userId: string,
  file: File,
  type: 'before' | 'after',
  onStatus?: (status: PhotoUploadStatus) => void,
): Promise<string> {
  onStatus?.('compressing');
  let compressed: File;
  try {
    compressed = await compressImage(file);
  } catch {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image too large and compression failed');
    }
    compressed = file;
  }
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
