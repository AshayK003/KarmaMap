import { supabase } from '../lib/supabase';

export async function uploadParticipationPhoto(
  userId: string,
  file: File,
  type: 'before' | 'after'
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${type}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('participation-photos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('participation-photos').getPublicUrl(path);
  return data.publicUrl;
}

export function createLocalPreview(file: File): string {
  return URL.createObjectURL(file);
}

export function revokePreview(url: string): void {
  URL.revokeObjectURL(url);
}
