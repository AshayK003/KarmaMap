import { useRef, useState } from 'react';
import { createLocalPreview, revokePreview } from '../services/storage';

interface PhotoUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
  previewUrl?: string;
}

export function PhotoUpload({ label, onFileSelect, previewUrl }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localPreview) revokePreview(localPreview);
    const preview = createLocalPreview(file);
    setLocalPreview(preview);
    onFileSelect(file);
  };

  const displayUrl = previewUrl ?? localPreview;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4 hover:bg-emerald-50"
      >
        {displayUrl ? (
          <img src={displayUrl} alt={label} className="max-h-32 rounded-lg object-cover" />
        ) : (
          <>
            <span className="text-2xl">📷</span>
            <span className="mt-1 text-xs text-gray-500">Tap to capture or upload</span>
          </>
        )}
      </button>
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
