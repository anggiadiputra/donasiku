import { useState, useEffect } from 'react';
import { X, Send, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import RichTextEditor from './RichTextEditor';
import ImageUpload from './ImageUpload';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

interface CreateUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
    onSuccess: () => void;
    initialData?: {
        id: string;
        title: string;
        content: string;
        image_url?: string;
    } | null;
}

export default function CreateUpdateModal({
    isOpen,
    onClose,
    campaignId,
    onSuccess,
    initialData
}: CreateUpdateModalProps) {
    const primaryColor = usePrimaryColor();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    // Populate form when initialData changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setContent(initialData.content || '');
                setImageUrl(initialData.image_url || '');
            } else {
                // Reset for create mode
                setTitle('');
                setContent('');
                setImageUrl('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error('Judul wajib diisi');
            return;
        }

        // Simple content validation (stripping HTML)
        if (!content.replace(/<[^>]*>/g, '').trim()) {
            toast.error('Konten update tidak boleh kosong');
            return;
        }

        setLoading(true);

        try {
            if (initialData?.id) {
                // Update existing
                const { error } = await supabase
                    .from('campaign_updates')
                    .update({
                        title: title.trim(),
                        content: content,
                        image_url: imageUrl || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', initialData.id);

                if (error) throw error;
                toast.success('Kabar terbaru berhasil diperbarui!');
            } else {
                // Create new
                const { error } = await supabase
                    .from('campaign_updates')
                    .insert({
                        campaign_id: campaignId,
                        title: title.trim(),
                        content: content,
                        image_url: imageUrl || null
                    });

                if (error) throw error;
                toast.success('Kabar terbaru berhasil diposting!');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving update:', error);
            toast.error('Gagal menyimpan update: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="bg-white rounded-2xl w-full max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col shadow-xl animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800">{initialData ? 'Edit Kabar Terbaru' : 'Tulis Kabar Terbaru'}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Title Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Judul Update <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Contoh: Penyaluran Bantuan Tahap 1"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-shadow"
                            style={{
                                '--tw-ring-color': primaryColor,
                                borderColor: 'var(--tw-ring-color)' // fallback will be overridden if focused
                            } as any}
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <ImageUpload
                            value={imageUrl}
                            onChange={setImageUrl}
                            folder="campaign-updates"
                            label="Foto Dokumentasi (Opsional)"
                            placeholder="Upload foto kegiatan"
                            height="h-40"
                        />
                    </div>

                    {/* Content Editor */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cerita / Keterangan <span className="text-red-500">*</span>
                        </label>
                        <div className="prose-sm">
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Ceritakan perkembangan terbaru program ini..."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {initialData ? 'Menyimpan...' : 'Memposting...'}
                            </>
                        ) : (
                            <>
                                {initialData ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                {initialData ? 'Simpan Perubahan' : 'Posting Kabar'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
