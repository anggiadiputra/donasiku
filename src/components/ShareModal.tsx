import { useState } from 'react';
import { X, Link, Check } from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl?: string;
    shareText?: string;
}

export default function ShareModal({
    isOpen,
    onClose,
    shareUrl = window.location.href,
    shareText = 'Mari bantu sesama dengan berdonasi di Donasiku.'
}: ShareModalProps) {
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen) return null;

    // Clean URL params if needed, or use as is
    // Often we want clean share links, but FidyahPage had specific UTM params
    // We will use the passed shareUrl or default to current window location

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm sm:rounded-2xl rounded-t-2xl p-6 animate-slideUp sm:animate-none" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Bagikan lewat</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    {/* WhatsApp */}
                    <button
                        onClick={() => {
                            window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
                        }}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">WhatsApp</span>
                    </button>

                    {/* Facebook */}
                    <button
                        onClick={() => {
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                        }}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                            </svg>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Facebook</span>
                    </button>

                    {/* LINE */}
                    <button
                        onClick={() => {
                            window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
                        }}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-12 h-12 bg-[#00C300] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                <path d="M21.2 9.6c0-4.6-4.6-8.4-10.2-8.4-5.6 0-10.2 3.8-10.2 8.4 0 4.1 3.6 7.6 8.5 8.3.3 0 .7.1.8.3.2.4.1 1-.1 1.6 0 0-.2.9 0 1.1.2.2.6.2.8.1.3 0 2.5-1.5 3.4-2.5 1.7-1.3 2.8-2.6 2.8-2.6 2.1-1.6 3.2-3.8 3.2-6.3zm-11.4 3c0 .2-.2.4-.4.4h-3.4c-.2 0-.4-.2-.4-.4v-5.6c0-.2.2-.4.4-.4h.8c.2 0 .4.2.4.4v4.4h2.2c.2 0 .4.2.4.4v.8zm3.2 0c0 .2-.2.4-.4.4h-.8c-.2 0-.4-.2-.4-.4v-5.6c0-.2.2-.4.4-.4h.8c.2 0 .4.2.4.4v5.6zm4.5 0c0 .2-.2.4-.4.4h-.8c-.1 0-.2-.1-.3-.2l-2.4-3.3v2.7c0 .2-.2.4-.4.4h-.8c-.2 0-.4-.2-.4-.4v-5.6c0-.2.2-.4.4-.4h.8c-.1 0-.2.1-.3.2l2.4 3.3v-2.7c0-.2.2-.4.4-.4h.8c.2 0 .4.2.4.4v5.6zm4.1-1.6c0 .2-.2.4-.4.4h-2.2c-.2 0-.4-.2-.4-.4v-.8c0-.2.2-.4.4-.4h2.2c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4h-2.2v-1h2.2c.2 0 .4-.2.4-.4v-.8c0-.2-.2-.4-.4-.4h-3.4c-.2 0-.4.2-.4.4v5.6c0 .2.2.4.4.4h3.4c.2 0 .4-.2.4-.4v-.8z" />
                            </svg>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">LINE</span>
                    </button>

                    {/* Twitter */}
                    <button
                        onClick={() => {
                            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
                        }}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-12 h-12 bg-[#1DA1F2] rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                            </svg>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">Twitter</span>
                    </button>
                </div>

                {/* Copy Link Section */}
                <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                    <Link className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                    <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 bg-transparent border-none text-xs text-gray-600 focus:ring-0 truncate"
                    />
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${isCopied
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        {isCopied ? (
                            <>
                                <Check className="w-3 h-3" />
                                Tersalin!
                            </>
                        ) : (
                            'Salin'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
