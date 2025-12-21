import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppName } from '../hooks/useAppName';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import Header from '../components/Header';

export default function OTPVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appName } = useAppName();
  const primaryColor = usePrimaryColor();
  const email = (location.state as { email?: string })?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get first letter of app name for icon
  // const appInitial = appName.charAt(0).toUpperCase();

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 7) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 8);
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 8; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length !== 8) {
      setError('Masukkan 8 digit OTP');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (error) throw error;

      if (data.user) {
        // Navigate to dashboard on successful verification
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'OTP tidak valid. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) throw error;

      alert('OTP telah dikirim ulang ke email Anda');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim OTP. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="flex flex-col h-full bg-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-gray-600 mb-4">Email tidak ditemukan</p>
          <Link to="/login" className="font-semibold" style={{ color: primaryColor }}>
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <div className="flex-1 p-4 flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-sm"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Mail className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifikasi OTP</h2>
            <p className="text-gray-600">
              Kami telah mengirimkan kode OTP ke
            </p>
            <p className="font-semibold mt-1 text-lg" style={{ color: primaryColor }}>{email}</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-8">
            {/* OTP Input */}
            <div>
              <div className="flex justify-center gap-1 sm:gap-2 flex-wrap max-w-full" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-8 h-10 sm:w-10 sm:h-12 text-center text-lg sm:text-xl font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white transition-all shadow-sm"
                    style={{
                      '--focus-border': primaryColor,
                      '--focus-ring': `${primaryColor}33`,
                    } as React.CSSProperties & { '--focus-border': string; '--focus-ring': string }}
                    onFocus={(e) => {
                      e.target.style.borderColor = primaryColor;
                      e.target.style.boxShadow = `0 4px 6px -1px ${primaryColor}15`;
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  />
                ))}
              </div>
              {error && (
                <div className="flex items-center justify-center gap-2 mt-4 text-red-600 bg-red-50 p-2 rounded-lg text-sm">
                  <span>⚠️</span>
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length !== 8}
              className="w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
              style={{
                backgroundColor: loading || otp.join('').length !== 8 ? '#d1d5db' : primaryColor // Gray when disabled
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memverifikasi...
                </span>
              ) : (
                'Verifikasi OTP'
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center pt-2">
              <p className="text-gray-600 mb-2">
                Tidak menerima kode?
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="font-bold hover:underline transition-colors disabled:text-gray-400"
                style={{ color: loading ? undefined : primaryColor }}
              >
                Kirim ulang OTP
              </button>
            </div>

            <div className="text-center">
              <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600">
                Salah email? Kembali ke login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


