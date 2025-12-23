
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { useAppName } from '../hooks/useAppName';

export default function NotFoundPage() {
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const { appName } = useAppName();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl max-w-md w-full text-center relative overflow-hidden">
                {/* Decorative Circle Background */}
                <div
                    className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-5"
                    style={{ backgroundColor: primaryColor }}
                />
                <div
                    className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-5"
                    style={{ backgroundColor: primaryColor }}
                />

                {/* 404 Illustration placeholder or Text */}
                <div className="relative z-10">
                    <h1
                        className="text-8xl font-black mb-2 opacity-10"
                        style={{ color: primaryColor }}
                    >
                        404
                    </h1>

                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Halaman Tidak Ditemukan
                        </h2>
                    </div>
                </div>

                <p className="text-gray-500 mb-8 relative z-10 mt-4">
                    Maaf, halaman yang Anda cari tidak tersedia atau mungkin telah dipindahkan.
                </p>

                <div className="flex flex-col gap-3 relative z-10">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-6 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Home className="w-5 h-5" />
                        Kembali ke Beranda
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3 px-6 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Kembali ke Sebelumnya
                    </button>
                </div>

                <div className="mt-8 text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} {appName}
                </div>
            </div>
        </div>
    );
}
