import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import Header from '../components/Header';
import { usePageTitle } from '../hooks/usePageTitle';

export default function RegisterPage() {
    usePageTitle('Daftar Akun Baru');
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();

    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        phone: '' // Optional
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [checkingConfig, setCheckingConfig] = useState(true);

    // Registration config state
    const [isRegistrationAllowed, setIsRegistrationAllowed] = useState(true);
    const [registrationMessage, setRegistrationMessage] = useState('Pendaftaran sedang ditutup.');

    // 1. Check if registration is allowed
    useEffect(() => {
        const checkConfig = async () => {
            try {
                // Fetch config via secure RPC
                const { data, error } = await supabase.rpc('get_public_config');

                if (error) throw error;

                if (data) {
                    setIsRegistrationAllowed(data.allow_registration);
                    if (data.registration_message) {
                        setRegistrationMessage(data.registration_message);
                    }
                }
            } catch (err) {
                console.error('Error fetching registration config:', err);
                // Fallback: Assume open or closed? Safe default: Open for now as it was before.
                // Or wait, if error, maybe fail safe? 
            } finally {
                setCheckingConfig(false);
            }
        };

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/dashboard', { replace: true });
            }
        };

        checkSession();
        checkConfig();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isRegistrationAllowed) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // 1. Sign Up
            const { data, error: signUpError } = await supabase.auth.signInWithOtp({
                email: formData.email,
                options: {
                    emailRedirectTo: window.location.origin + '/dashboard',
                    data: {
                        full_name: formData.fullName,
                        phone: formData.phone // Metadata
                    }
                },
            });

            if (signUpError) throw signUpError;

            // 2. Success
            setSuccess(true);
            setTimeout(() => {
                navigate('/otp-verification', {
                    state: { email: formData.email, isRegister: true }
                });
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    // Loading Screen
    if (checkingConfig) {
        return (
            <div className="flex flex-col h-screen bg-white justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }}></div>
                <p className="mt-4 text-gray-500">Memuat aturan pendaftaran...</p>
            </div>
        );
    }

    // BLOCKED Screen
    if (!isRegistrationAllowed) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-50">
                <Header />
                <div className="flex-1 p-4 flex flex-col justify-center items-center">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔒</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Pendaftaran Ditutup</h2>
                        <p className="text-gray-600 mb-6">{registrationMessage}</p>

                        <Link
                            to="/login"
                            className="block w-full py-3 rounded-xl font-bold text-white transition-all shadow-md"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Kembali ke Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />

            <div className="flex-1 p-4 flex flex-col justify-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Daftar Akun Baru</h2>
                        <p className="text-gray-600">Bergabunglah untuk memulai campaign Anda</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Nama Lengkap
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Nama Lengkap Anda"
                                    required
                                    disabled={loading || success}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                                    style={{ caretColor: primaryColor }}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="nama@email.com"
                                    required
                                    disabled={loading || success}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                                    style={{ caretColor: primaryColor }}
                                />
                            </div>
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm flex items-center gap-2">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                        {success && (
                            <div className="text-green-600 bg-green-50 p-3 rounded-lg text-sm flex items-center gap-2">
                                <span>✅</span> Link OTP telah dikirim ke email Anda!
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {loading ? 'Memproses...' : success ? 'Berhasil!' : 'Daftar Sekarang'}
                        </button>

                        {/* Login Link */}
                        <div className="text-center pt-2">
                            <p className="text-gray-600">
                                Sudah punya akun?{' '}
                                <Link to="/login" className="font-bold hover:underline" style={{ color: primaryColor }}>
                                    Masuk di sini
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer info similar to Login */}
                <div className="mt-6 text-center text-xs text-gray-500">
                    Dengan mendaftar, Anda menyetujui Syarat & Ketentuan kami.
                </div>
            </div>
        </div>
    );
}
