import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { PhotoUploadStatus } from '../services/storage';
import { compressAndUpload, createLocalPreview, revokePreview } from '../services/storage';

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
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
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
    setUploadedUrl(null);
    setErrorMessage(null);
    setStatus('compressing');

    try {
      const url = await compressAndUpload(
        user.id,
        file,
        label.toLowerCase().includes('before') ? 'before' : 'after',
        setStatus,
      );
      setUploadedUrl(url);
      onUploadComplete(url);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const isBusy = status === 'compressing' || status === 'uploading';
  const displaySrc = status === 'done' && uploadedUrl ? uploadedUrl : localPreview;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-slate-200">{label}</label>
      <button
        type="button"
        aria-label={label ? `Upload ${label.toLowerCase()}` : 'Upload photo'}
        onClick={() => {
          if (!isBusy) inputRef.current?.click();
        }}
        disabled={isBusy}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 disabled:cursor-wait disabled:opacity-70"
        style={{
          borderColor: status === 'error' ? '#fca5a5' : status === 'done' ? '#6ee7b7' : '#6ee7b7',
          backgroundColor:
            status === 'error' ? '#fef2f2' : status === 'done' ? '#ecfdf5' : '#ecfdf5',
        }}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={label}
            className="w-full h-auto rounded-lg object-contain"
            onError={() => console.error('Photo display failed:', displaySrc)}
          />
        ) : (
          <span className="text-2xl">📷</span>
        )}
      </button>

      <div className="flex items-center gap-2 min-h-[20px]">
        {status === 'compressing' && (
          <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            Compressing image…
          </span>
        )}
        {status === 'uploading' && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Uploading…
          </span>
        )}
        {status === 'done' && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Photo uploaded ✓
          </span>
        )}
        {status === 'error' && (
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            {errorMessage ?? 'Upload failed — tap to retry'}
          </span>
        )}
        {status === 'idle' && (
          <span className="text-xs text-gray-500 dark:text-slate-400">{STATUS_LABELS.idle}</span>
        )}
      </div>

      <input
        ref={inputRef}
        id="photo-upload-input"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
    </div>
  );
}
