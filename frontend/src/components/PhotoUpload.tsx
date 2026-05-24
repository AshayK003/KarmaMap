import { useRef, useState, useEffect } from 'react';
import { createLocalPreview, revokePreview, compressAndUpload } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import type { PhotoUploadStatus } from '../services/storage';

interface PhotoUploadProps {
  label: string;
  onUploadComplete: (url: string) => void;
}

const STATUS_LABELS: Record<PhotoUploadStatus, string> = {
  idle: 'Tap to capture or upload',
  compressing: 'Compressing…',
  uploading: 'Uploading…',
  done: 'Uploaded!',
  error: 'Upload failed',
};

export function PhotoUpload({ label, onUploadComplete }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<PhotoUploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) revokePreview(localPreview);
    };
  }, [localPreview]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (localPreview) revokePreview(localPreview);
    const preview = createLocalPreview(file);
    setLocalPreview(preview);
    setErrorMessage(null);
    setStatus('compressing');

    try {
      const url = await compressAndUpload(user.id, file, label.toLowerCase().includes('before') ? 'before' : 'after', setStatus);
      onUploadComplete(url);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const isBusy = status === 'compressing' || status === 'uploading';

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <button
        type="button"
        onClick={() => {
          if (!isBusy) inputRef.current?.click();
        }}
        disabled={isBusy}
        className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 disabled:cursor-wait disabled:opacity-70"
        style={{
          borderColor: status === 'error' ? '#fca5a5' : status === 'done' ? '#6ee7b7' : '#6ee7b7',
          backgroundColor: status === 'error' ? '#fef2f2' : status === 'done' ? '#ecfdf5' : '#ecfdf5',
        }}
      >
        {localPreview ? (
          <img src={localPreview} alt={label} className="max-h-32 rounded-lg object-cover" />
        ) : (
          <span className="text-2xl">📷</span>
        )}
      </button>

      <div className="flex items-center gap-2 min-h-[20px]">
        {status === 'compressing' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-600">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            Compressing image…
          </span>
        )}
        {status === 'uploading' && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Uploading…
          </span>
        )}
        {status === 'done' && (
          <span className="text-xs font-medium text-emerald-600">Photo uploaded ✓</span>
        )}
        {status === 'error' && (
          <span className="text-xs font-medium text-red-600">{errorMessage ?? 'Upload failed — tap to retry'}</span>
        )}
        {status === 'idle' && (
          <span className="text-xs text-gray-500">{STATUS_LABELS.idle}</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
