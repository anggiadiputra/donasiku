```javascript
import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToS3ViaAPI } from '../utils/s3Storage';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    folder?: string;
    label?: string;
    className?: string;
    placeholder?: string;
    height?: string; // CSS height class or value, default "h-48"
}

export default function ImageUpload({
    value,
    onChange,
    folder = 'uploads',
    label = 'Upload Gambar',
    className = '',
    placeholder = 'Klik untuk upload gambar',
    height = 'h-48'
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 5MB');
            return;
        }

        try {
            setUploading(true);
            const url = await uploadToS3ViaAPI(file, folder);
            if (url) {
                onChange(url);
            } else {
                throw new Error('Upload failed (empty URL)');
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error('Gagal mengupload gambar: ' + (error.message || 'Unknown error'));
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={className}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

            <div className="relative group">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />

                {value ? (
                    <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img
                            src={value}
                            alt="Uploaded"
                            className={`w - full ${ height } object - cover bg - gray - 50`}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                                title="Ganti Gambar"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                disabled={uploading}
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                title="Hapus Gambar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {uploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className={`
border - 2 border - dashed border - gray - 300 rounded - lg p - 6
              flex flex - col items - center justify - center gap - 3
cursor - pointer hover: bg - gray - 50 transition - colors
              ${ height }
              ${ uploading ? 'opacity-50 pointer-events-none' : '' }
`}
                    >
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            {uploading ? (
                                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                            ) : (
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">
                                {uploading ? 'Mengupload...' : placeholder}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
