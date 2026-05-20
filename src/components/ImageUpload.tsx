import { useRef, useState, useEffect } from 'react';
import { validateImageFile } from '../lib/storage';

interface ImageUploadProps {
  label: string;
  onImageSelect: (file: File | null) => void;
  currentPreview?: string | null;
  maxSizeMB?: number;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'any';
}

export function ImageUpload({ 
  label, 
  onImageSelect, 
  currentPreview, 
  maxSizeMB = 10,
  className = '',
  aspectRatio = 'video'
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file, maxSizeMB);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onImageSelect(file);
  };

  const handleRemove = () => {
    onImageSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-[4/1]' : '';

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-bold text-black">{label}</label>
      
      <div 
        onClick={() => !currentPreview && fileInputRef.current?.click()}
        className={`relative group overflow-hidden rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 transition-all ${!currentPreview ? 'cursor-pointer hover:bg-gray-100 hover:border-[#528FB9]/50' : ''} ${aspectClass}`}
      >
        {currentPreview ? (
          <img src={currentPreview} className="w-full h-full object-cover" alt="Upload Preview" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
            <svg className="w-8 h-8 mb-2 opacity-50 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-[#528FB9] transition-colors">Click to upload image</span>
            <span className="text-[9px] mt-1 opacity-60">Max {maxSizeMB}MB (JPG, PNG, WebP)</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition-transform"
          >
            {currentPreview ? 'Change' : 'Upload'}
          </button>
          {currentPreview && (
            <button 
              type="button"
              onClick={handleRemove}
              className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition-transform"
            >
              Remove
            </button>
          )}
        </div>

        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp, image/jpg, image/avif"
          className="hidden"
        />
      </div>
      
      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}
