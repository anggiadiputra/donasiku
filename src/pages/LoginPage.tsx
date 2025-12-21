import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppName } from '../hooks/useAppName';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import Header from '../components/Header';

export default function LoginPage() {
  const navigate = useNavigate();
  const { appName } = useAppName();
  const primaryColor = usePrimaryColor();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // User is already logged in, redirect to dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/dashboard',
        },
      });

      if (error) throw error;

      setSuccess(true);
      // Navigate to OTP verification page
      setTimeout(() => {
        navigate('/otp-verification', { state: { email } });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim OTP. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="flex flex-col h-full bg-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-4"
            style={{ borderColor: primaryColor }}
          ></div>
          <p className="text-gray-600">Memeriksa status login...</p>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Selamat Datang</h2>
            <p className="text-gray-600">Masuk untuk mengelola akun Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  disabled={loading || success}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 focus:bg-white transition-all disabled:bg-gray-100"
                  style={{
                    caretColor: primaryColor,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-3 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 mt-3 text-green-600 bg-green-50 p-3 rounded-lg text-sm">
                  <span>✅</span>
                  <p>OTP telah dikirim ke email Anda!</p>
                </div>
              )}
            </div>

            {/* Send OTP Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
              style={{
                backgroundColor: primaryColor
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : success ? (
                'OTP Terkirim!'
              ) : (
                'Kirim Kode OTP'
              )}
            </button>

            {/* Registration Link */}
            <div className="text-center pt-2">
              <p className="text-gray-600">
                Belum punya akun?{' '}
                <Link
                  to="/register"
                  className="font-bold hover:underline"
                  style={{ color: primaryColor }}
                >
                  Daftar Sekarang
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-gray-500">
            Dilindungi oleh reCAPTCHA dan Google
          </p>
          <div className="text-xs text-gray-500 space-x-4">
            <Link to="/privacy" className="hover:text-gray-800 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-gray-800 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}



