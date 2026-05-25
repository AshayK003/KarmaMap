import { apiFetch } from '../utils/api';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { compressImage } from './storage';

export async function updateNgoUpi(upi_id: string): Promise<Profile> {
  return apiFetch<{ profile: Profile }>('/api/ngo/upi', {
    method: 'PATCH',
    body: JSON.stringify({ upi_id }),
  }).then((r) => r.profile);
}

export async function uploadNgoQrCode(file: File, userId: string): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large (max 5MB)');
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Invalid file type. Use PNG, JPEG, or WebP.');
  }

  const compressed = await compressImage(file);
  const path = `${userId}/${Date.now()}_${file.name.replace(/\.[^.]+$/, '.jpg')}`;
  const { error } = await supabase.storage.from('ngo-qr-codes').upload(path, compressed);
  if (error) throw error;

  const { data: urlData } = supabase.storage.from('ngo-qr-codes').getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error('Failed to get public URL');

  await apiFetch<{ profile: Profile }>('/api/ngo/upi', {
    method: 'PATCH',
    body: JSON.stringify({ upi_qr_url: publicUrl }),
  });

  return publicUrl;
}

export async function fetchPublicNgoProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, name, bio, upi_id, upi_qr_url, created_at')
    .eq('id', id)
    .eq('role', 'ngo')
    .single();
  return data as Profile | null;
}
