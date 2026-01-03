import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  ShoppingCart,
  Building2,
  Wallet,
  Store,
  Coins,
  Info,
  ChevronUp,
  ChevronDown,
  Megaphone
} from 'lucide-react';
import { supabase, ZakatSettings, Campaign } from '../lib/supabase';
import Header from '../components/Header';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { usePageTitle } from '../hooks/usePageTitle';
import { getHoverColor } from '../utils/colorUtils';
import Footer from '../components/Footer';
import { ZakatPageSkeleton } from '../components/SkeletonLoader';

type ZakatType = 'penghasilan' | 'tabungan' | 'perdagangan' | 'emas';
type Frequency = 'monthly' | 'yearly';

export default function ZakatPage() {
  usePageTitle('Bayar Zakat');
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const hoverColor = getHoverColor(primaryColor);
  const [zakatType, setZakatType] = useState<ZakatType>('penghasilan');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [income, setIncome] = useState<string>('');
  const [otherIncome, setOtherIncome] = useState<string>('');
  const [deductFromGross, setDeductFromGross] = useState(false);
  const [settings, setSettings] = useState<ZakatSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Linked Campaign State
  const [targetCampaign, setTargetCampaign] = useState<Campaign | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [expandedUpdateId, setExpandedUpdateId] = useState<string | null>(null);

  // Helper to format rough "time ago"
  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari yang lalu`;
    return `${Math.floor(days / 30)} bulan yang lalu`;
  };

  useEffect(() => {
    fetchZakatSettings();
  }, []);

  const fetchZakatSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('zakat_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching zakat settings:', error);
      }

      if (data) {
        setSettings(data);

        // Fetch Target Campaign if exists
        if (data.target_campaign_id) {
          const { data: campaignData } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', data.target_campaign_id)
            .single();

          if (campaignData) {
            setTargetCampaign(campaignData);
            fetchUpdates(campaignData.id);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async (campaignId: string) => {
    const { data: updatesData, error: updatesError } = await supabase
      .from('campaign_updates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (!updatesError && updatesData) {
      setUpdates(updatesData);
    }
  };

  const calculateNishab = () => {
    if (!settings) return 0;
    const nishab = (settings.gold_price_per_gram * settings.nishab_gold_grams);
    return frequency === 'monthly' ? nishab : nishab * 12;
  };

  const calculateZakat = () => {
    const incomeNum = parseFloat(income.replace(/[^\d]/g, '')) || 0;
    const otherIncomeNum = parseFloat(otherIncome.replace(/[^\d]/g, '')) || 0;
    const totalIncome = frequency === 'monthly'
      ? (incomeNum + otherIncomeNum)
      : (incomeNum + otherIncomeNum) * 12;

    const nishab = calculateNishab();

    if (totalIncome < nishab) {
      return { isObligatory: false, amount: 0, totalIncome };
    }

    const zakatAmount = totalIncome * (settings?.zakat_percentage || 0.025);
    return { isObligatory: true, amount: zakatAmount, totalIncome };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatInputCurrency = (value: string) => {
    const numValue = value.replace(/[^\d]/g, '');
    if (!numValue) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(numValue));
  };

  const handleIncomeChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setIncome(formatted);
  };

  const handleOtherIncomeChange = (value: string) => {
    const formatted = formatInputCurrency(value);
    setOtherIncome(formatted);
  };

  const result = calculateZakat();

  if (loading) {
    return <ZakatPageSkeleton />;
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          <Header />

          {/* Page Title */}
          <div className="px-4 py-6">
            <h1 className="text-xl font-bold text-gray-800">PILIH JENIS ZAKAT ANDA</h1>
          </div>

          <div className="px-4 py-6 space-y-6">
            {/* Zakat Type Selection */}
            <div>
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => setZakatType('penghasilan')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${zakatType === 'penghasilan'
                    ? 'border-transparent'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  style={zakatType === 'penghasilan' ? { backgroundColor: `${primaryColor}10`, borderColor: primaryColor } : {}}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: zakatType === 'penghasilan' ? primaryColor : '#e5e7eb' }}>
                    <Building2 className={`w-6 h-6 ${zakatType === 'penghasilan' ? 'text-white' : 'text-gray-600'
                      }`} />
                  </div>
                  <span className={`text-xs font-semibold ${zakatType === 'penghasilan' ? '' : 'text-gray-700'
                    }`}
                    style={zakatType === 'penghasilan' ? { color: primaryColor } : {}}
                  >
                    Penghasilan
                  </span>
                </button>

                <button
                  onClick={() => setZakatType('tabungan')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${zakatType === 'tabungan'
                    ? 'border-transparent'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  style={zakatType === 'tabungan' ? { backgroundColor: `${primaryColor}10`, borderColor: primaryColor } : {}}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: zakatType === 'tabungan' ? primaryColor : '#e5e7eb' }}>
                    <Wallet className={`w-6 h-6 ${zakatType === 'tabungan' ? 'text-white' : 'text-gray-600'
                      }`} />
                  </div>
                  <span className="text-xs font-semibold"
                    style={{ color: zakatType === 'tabungan' ? primaryColor : '#374151' }}
                  >
                    Tabungan
                  </span>
                </button>

                <button
                  onClick={() => setZakatType('perdagangan')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${zakatType === 'perdagangan'
                    ? 'border-transparent'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  style={zakatType === 'perdagangan' ? { backgroundColor: `${primaryColor}10`, borderColor: primaryColor } : {}}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: zakatType === 'perdagangan' ? primaryColor : '#e5e7eb' }}>
                    <Store className={`w-6 h-6 ${zakatType === 'perdagangan' ? 'text-white' : 'text-gray-600'
                      }`} />
                  </div>
                  <span className="text-xs font-semibold"
                    style={{ color: zakatType === 'perdagangan' ? primaryColor : '#374151' }}
                  >
                    Perdagangan
                  </span>
                </button>

                <button
                  onClick={() => setZakatType('emas')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${zakatType === 'emas'
                    ? 'border-transparent'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  style={zakatType === 'emas' ? { backgroundColor: `${primaryColor}10`, borderColor: primaryColor } : {}}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: zakatType === 'emas' ? primaryColor : '#e5e7eb' }}>
                    <Coins className={`w-6 h-6 ${zakatType === 'emas' ? 'text-white' : 'text-gray-600'
                      }`} />
                  </div>
                  <span className="text-xs font-semibold"
                    style={{ color: zakatType === 'emas' ? primaryColor : '#374151' }}
                  >
                    Emas
                  </span>
                </button>
              </div>
            </div>

            {/* Frequency Selection */}
            <div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="monthly"
                    checked={frequency === 'monthly'}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-4 h-4"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-sm font-medium text-gray-700">Perbulan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="yearly"
                    checked={frequency === 'yearly'}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-4 h-4"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-sm font-medium text-gray-700">Pertahun</span>
                </label>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Penghasilan
                </label>
                <input
                  type="text"
                  value={income}
                  onChange={(e) => handleIncomeChange(e.target.value)}
                  placeholder="Masukkan penghasilan bulanan anda"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none"
                  style={{ '--focus-border': primaryColor } as React.CSSProperties}
                  onFocus={(e) => e.target.style.borderColor = primaryColor}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pendapatan Lain (Bonus, THR)
                </label>
                <input
                  type="text"
                  value={otherIncome}
                  onChange={(e) => handleOtherIncomeChange(e.target.value)}
                  placeholder="Opsional, Jika Ada"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none"
                  style={{ '--focus-border': primaryColor } as React.CSSProperties}
                  onFocus={(e) => e.target.style.borderColor = primaryColor}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">
                Untuk kehati-hatian dipotong dari gaji bruto
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductFromGross}
                  onChange={(e) => setDeductFromGross(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"
                  style={deductFromGross ? { backgroundColor: primaryColor } : {}}
                ></div>
              </label>
            </div>

            {/* Zakat Payment Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Wajib bayar</h3>
              <div className={`p-4 rounded-lg ${result.isObligatory ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}>
                <p className={`text-sm ${result.isObligatory ? 'text-green-800' : 'text-red-600'
                  }`}>
                  {result.isObligatory
                    ? `Wajib Membayar Zakat: ${formatCurrency(result.amount)}`
                    : 'Tidak Wajib Membayar Zakat, Tapi Bisa Berinfak'
                  }
                </p>
              </div>
            </div>

            {/* Note Section */}
            {settings && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <h4 className="font-semibold text-blue-900">Note:</h4>
                </div>
                <div className="text-xs text-blue-800 space-y-1">
                  {settings.calculation_note && (
                    <p className="mb-2">{settings.calculation_note}</p>
                  )}
                  <p>Harga prediksi rata-rata emas per gram: <strong>{formatCurrency(settings.gold_price_per_gram)}</strong></p>
                  <p>Total Nishab Zakat ({settings.nishab_gold_grams} gr emas) perbulan setara dengan: <strong>{formatCurrency(settings.gold_price_per_gram * settings.nishab_gold_grams)}</strong></p>
                  <p>Total Nishab Zakat ({settings.nishab_gold_grams} gr emas) pertahun setara dengan: <strong>{formatCurrency(settings.gold_price_per_gram * settings.nishab_gold_grams * 12)}</strong></p>
                  {settings.gold_price_source && (
                    <p className="mt-2 text-blue-700">Sumber: {settings.gold_price_source}</p>
                  )}
                </div>
              </div>
            )}

            {/* Total Display */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-lg font-bold text-gray-800">Total</span>
              <span className="text-lg font-bold" style={{ color: primaryColor }}>
                {formatCurrency(result.amount)}
              </span>
            </div>

            {/* Divider Thick */}
            <div className="h-2 bg-gray-50 w-full mt-6 -mx-4" />

            <div className="bg-white overflow-hidden -mx-4">
              {/* Info Terbaru Section */}
              <div className="px-5 py-5 border-b border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-blue-600" />
                    Kabar Terbaru
                  </h3>
                  <div className="flex items-center gap-2">
                    {updates.length > 0 && (
                      <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full">{updates.length} Update</span>
                    )}
                  </div>
                </div>

                <div className="relative pl-2">
                  {/* Vertical Line */}
                  <div className="absolute left-[7px] top-2 bottom-4 w-[2px] bg-gray-100"></div>

                  {(updates.length === 0 || !targetCampaign) ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed ml-6">
                      <p className="text-gray-500 text-sm mb-2">Belum ada kabar terbaru dari penggalang dana.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {updates.slice(0, 3).map((update) => (
                        <div key={update.id} className="relative pl-8">
                          {/* Dot Indicator */}
                          <div
                            className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10"
                            style={{ backgroundColor: primaryColor }}
                          ></div>

                          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900 text-sm">{update.title}</h4>
                              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap">
                                {getTimeAgo(update.created_at)}
                              </span>
                            </div>

                            {update.image_url && (
                              <div className="mb-3 rounded-lg overflow-hidden h-32 w-full">
                                <img src={update.image_url} alt="Update" className="w-full h-full object-cover" />
                              </div>
                            )}

                            <div
                              className={`text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none ${expandedUpdateId === update.id ? '' : 'line-clamp-3'}`}
                              dangerouslySetInnerHTML={{ __html: update.content }}
                            />

                            {update.content.length > 150 && (
                              <button
                                onClick={() => setExpandedUpdateId(expandedUpdateId === update.id ? null : update.id)}
                                className="text-xs font-semibold mt-2 flex items-center gap-1 hover:underline"
                                style={{ color: primaryColor }}
                              >
                                {expandedUpdateId === update.id ? (
                                  <>Sembunyikan <ChevronUp className="w-3 h-3" /></>
                                ) : (
                                  <>Lihat Selengkapnya <ChevronDown className="w-3 h-3" /></>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {updates.length > 3 && (
                        <button className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ml-4">
                          Lihat Semua Kabar ({updates.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Pencairan Dana */}
              <div className="px-5 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800">Pencairan Dana</h3>
                    <p className="text-xs text-gray-500 mt-1">Transparansi penggunaan dana</p>
                  </div>
                  <button
                    onClick={() => {
                      if (targetCampaign?.slug) {
                        navigate(`/campaign/${targetCampaign.slug}/withdrawals`);
                      }
                    }}
                    className={`font-semibold text-sm px-3 py-1.5 rounded-lg border transition-colors ${!targetCampaign ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                    style={targetCampaign ? { color: primaryColor, borderColor: `${primaryColor}20`, backgroundColor: `${primaryColor}10` } : {}}
                    disabled={!targetCampaign}
                  >
                    Lihat Rincian
                  </button>
                </div>
              </div>
            </div>

            {/* Spacer for bottom bar */}
            <div className="h-20"></div>
          </div>

          <Footer />
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
                if (result.isObligatory && result.amount > 0) {
                  navigate(`/donasi?amount=${result.amount}&type=zakat&zakatType=${zakatType}`);
                }
              }}
              disabled={!result.isObligatory || result.amount === 0}
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
              {income || otherIncome ? 'Lanjutkan' : 'Input Nominal'}
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
