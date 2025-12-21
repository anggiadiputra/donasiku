import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  User,
  Clock
} from 'lucide-react';
import { supabase, Donation, InfaqSettings } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { getHoverColor } from '../utils/colorUtils';

export default function InfaqPage() {
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const hoverColor = getHoverColor(primaryColor);
  const [amount, setAmount] = useState<string>('125000');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showMoreDonors, setShowMoreDonors] = useState(false);
  const [donors, setDonors] = useState<Donation[]>([]);
  const [settings, setSettings] = useState<InfaqSettings | null>(null);

  useEffect(() => {
    fetchInfaqSettings();
    fetchRecentDonors();
  }, []);

  const fetchInfaqSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('infaq_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching infaq settings:', error);
      }

      if (data) {
        const infaqSettings = {
          ...data,
          preset_amounts: Array.isArray(data.preset_amounts)
            ? data.preset_amounts
            : JSON.parse(data.preset_amounts || '[25000, 50000, 100000, 250000]'),
          default_amount: parseFloat(data.default_amount) || 125000,
        };
        setSettings(infaqSettings);
        setAmount(infaqSettings.default_amount.toString());
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const presetAmounts = settings?.preset_amounts || [25000, 50000, 100000, 250000];

  const fetchRecentDonors = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching donors:', error);
      } else {
        // Map transactions to donor format
        const mappedDonors = data?.map(tx => ({
          id: tx.id,
          donor_name: tx.customer_name,
          amount: tx.amount,
          is_anonymous: tx.customer_name === 'Orang Baik',
          created_at: tx.created_at,
          campaign_id: tx.campaign_id,
          payment_method: tx.payment_method,
          status: tx.status,
        })) || [];
        setDonors(mappedDonors as Donation[]);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d]/g, '')) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const formatInputCurrency = (value: string) => {
    const numValue = value.replace(/[^\d]/g, '');
    if (!numValue) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(numValue));
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setAmount(formatted.replace(/[^\d]/g, ''));
  };

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} pukul ${hours}.${minutes}`;
  };

  const displayedDonors = showMoreDonors ? donors : donors.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          <Header />

          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 px-4 py-8">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-white/50 rounded-lg flex items-center justify-center">
                  <div className="text-4xl">🕌</div>
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1" style={{ color: primaryColor }}>
                  {settings?.program_title || 'SEDEKAH MU'}
                </h1>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {settings?.program_subtitle || 'Wujud Keimanan Pada Allah Semata dan Kepedulian Untuk Sesama'}
                </p>
                {settings?.quran_verse && (
                  <>
                    <p className="text-xs text-gray-600 mt-2 italic">
                      "{settings.quran_verse}"
                    </p>
                    {settings.quran_reference && (
                      <p className="text-xs text-gray-500 mt-1">({settings.quran_reference})</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="px-4 py-6 space-y-6">
            {/* Infaq Input Section */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Infaq</h2>
              <p className="text-sm text-gray-600 mb-4">Masukan Nominal Infak</p>

              <div className="mb-4">
                <input
                  type="text"
                  value={formatInputCurrency(amount)}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Masukkan nominal"
                  className="w-full px-4 py-4 text-2xl font-bold text-gray-800 border-2 border-gray-200 rounded-lg focus:outline-none text-center"
                  style={{ borderColor: '#e5e7eb' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    className="px-3 py-2 rounded-lg font-semibold text-sm transition-colors border-2"
                    style={Math.abs(parseFloat(amount.replace(/[^\d]/g, '')) - preset) < 1000
                      ? { backgroundColor: primaryColor, color: 'white', borderColor: primaryColor }
                      : { backgroundColor: 'white', color: '#374151', borderColor: '#e5e7eb' }
                    }
                    onMouseEnter={(e) => {
                      if (Math.abs(parseFloat(amount.replace(/[^\d]/g, '')) - preset) >= 1000) {
                        e.currentTarget.style.borderColor = primaryColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (Math.abs(parseFloat(amount.replace(/[^\d]/g, '')) - preset) >= 1000) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    {formatCurrency(preset).replace('Rp', 'Rp ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Program Description */}
            {settings?.program_description && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  {settings.program_title || 'Sedekah Mu, Wujud Keimanan dan Kepedulian'}
                </h3>
                <div className={`text-sm text-gray-700 leading-relaxed space-y-3 ${!showFullDescription ? 'line-clamp-6' : ''}`}>
                  <div dangerouslySetInnerHTML={{ __html: settings.program_description.replace(/\n/g, '<br />') }} />
                  {showFullDescription && settings.program_image && (
                    <div className="my-4">
                      <img
                        src={settings.program_image}
                        alt="Program"
                        className="w-full rounded-lg"
                      />
                    </div>
                  )}
                  {showFullDescription && settings.note_text && (
                    <p>{settings.note_text}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-3 font-semibold text-sm flex items-center gap-1 transition-colors"
                  style={{ color: primaryColor }}
                  onMouseEnter={(e) => e.currentTarget.style.color = hoverColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = primaryColor}
                >
                  {showFullDescription ? (
                    <>
                      Tampilkan Sedikit
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Tampilkan Lebih Banyak
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Info Terbaru */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Info Terbaru</h3>
              <h4 className="text-base font-semibold text-gray-800 mb-2">
                Hadir Menjadi Kebahagiaan, Pulang Membawa Keberkahan, In Syaa Allah
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                Kebaikan tidak mengenal batas. Setiap kebaikan yang kita lakukan akan kembali kepada kita dengan berlipat ganda. Mari bersama-sama menebar kebaikan melalui sedekah.
              </p>
              <div className="mb-3">
                <img
                  src="https://images.pexels.com/photos/3184425/pexels-photo-3184425.jpeg"
                  alt="Info"
                  className="w-full rounded-lg"
                />
              </div>
              <button
                className="font-semibold text-sm flex items-center gap-1 transition-colors"
                style={{ color: primaryColor }}
                onMouseEnter={(e) => e.currentTarget.style.color = hoverColor}
                onMouseLeave={(e) => e.currentTarget.style.color = primaryColor}
              >
                Lihat Selengkapnya
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Donatur Section */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Donatur</h3>
              <div className="space-y-3">
                {displayedDonors.map((donor) => (
                  <div key={donor.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}20` }}>
                      <User className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{formatDate(donor.created_at)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {donor.is_anonymous ? 'Orang Baik' : (donor.donor_name || 'Hamba Allah')}
                      </p>
                      <p className="text-sm font-bold mt-1" style={{ color: primaryColor }}>
                        {formatCurrency(donor.amount)}
                      </p>
                    </div>
                  </div>
                ))}
                {donors.length > 5 && (
                  <button
                    onClick={() => setShowMoreDonors(!showMoreDonors)}
                    className="w-full font-semibold text-sm flex items-center justify-center gap-1 transition-colors py-2"
                    style={{ color: primaryColor }}
                    onMouseEnter={(e) => e.currentTarget.style.color = hoverColor}
                    onMouseLeave={(e) => e.currentTarget.style.color = primaryColor}
                  >
                    {showMoreDonors ? 'Tampilkan Sedikit' : 'Lihat Selengkapnya'}
                    {showMoreDonors ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Program Terkait */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Program Terkait</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/1912868/pexels-photo-1912868.jpeg"
                    alt="Sedekah Mu"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-gray-800">SEDEKAH MU</h4>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/3184423/pexels-photo-3184423.jpeg"
                    alt="Program"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-gray-800">SEDEKAH SEMBAKO GURU DHUAFA</h4>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/3184424/pexels-photo-3184424.jpeg"
                    alt="Program"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-gray-800">BERBAGI MAKANAN BERGIZI</h4>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src="https://images.pexels.com/photos/3184425/pexels-photo-3184425.jpeg"
                    alt="Program"
                    className="w-full h-32 object-cover"
                  />
                  <div className="p-3">
                    <h4 className="text-sm font-semibold text-gray-800">KADO LIBURAN AKHIR TAHUN</h4>
                  </div>
                </div>
              </div>
              <button
                className="w-full mt-3 font-semibold text-sm flex items-center justify-center gap-1 transition-colors py-2"
                style={{ color: primaryColor }}
                onMouseEnter={(e) => e.currentTarget.style.color = hoverColor}
                onMouseLeave={(e) => e.currentTarget.style.color = primaryColor}
              >
                Lihat Semua
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Footer />

          {/* Spacer for bottom nav */}
          <div className="h-24"></div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
            <button
              onClick={() => navigate(-1)}
              className="text-white p-2 rounded-full transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              className="text-white p-2 rounded-full transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              className="text-white p-2 rounded-full transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const amountNum = parseFloat(amount.replace(/[^\d]/g, '')) || 0;
                if (amountNum > 0) {
                  navigate(`/donasi?amount=${amountNum}&type=infaq`);
                }
              }}
              disabled={!amount || parseFloat(amount.replace(/[^\d]/g, '')) === 0}
              className="flex-1 ml-4 bg-white px-4 py-2 rounded-lg font-bold transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ color: primaryColor }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              Tunaikan Sekarang
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

