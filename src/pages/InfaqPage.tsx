import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  ChevronUp,
  ChevronDown,
  User,
  Megaphone
} from 'lucide-react';
import { supabase, Donation, InfaqSettings, Campaign } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ShareModal from '../components/ShareModal';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { usePageTitle } from '../hooks/usePageTitle';
import { getHoverColor } from '../utils/colorUtils';

export default function InfaqPage() {
  usePageTitle('Bayar Infaq');
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const hoverColor = getHoverColor(primaryColor);
  const [amount, setAmount] = useState<string>('125000');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [donors, setDonors] = useState<Donation[]>([]);
  const [totalDonors, setTotalDonors] = useState(0);
  const [settings, setSettings] = useState<InfaqSettings | null>(null);

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
    }
  };

  const presetAmounts = settings?.preset_amounts || [25000, 50000, 100000, 250000];

  const fetchRecentDonors = async () => {
    try {
      // 1. Fetch Data (Recent 5)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'success')
        .ilike('product_details', '%Infaq%') // Add filter explicitly just in case
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching donors:', error);
      } else {
        // Map transactions to donor format
        const mappedDonors = data?.map(tx => ({
          id: tx.id,
          donor_name: tx.customer_name,
          amount: tx.amount,
          is_anonymous: tx.is_anonymous || tx.metadata?.is_anonymous,
          created_at: tx.created_at,
          campaign_id: tx.campaign_id,
          payment_method: tx.payment_method,
          status: tx.status,
          message: tx.customer_message
        })) || [];
        setDonors(mappedDonors as (Donation & { message?: string })[]);
      }

      // 2. Fetch Total Count
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'success')
        .ilike('product_details', '%Infaq%'); // Add filter explicitly

      if (count !== null) {
        setTotalDonors(count);
      } else if (data) {
        setTotalDonors(prev => Math.max(prev, data.length));
      }

    } catch (error) {
      console.error('Error:', error);
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

  /* ... unused variables removed ... */



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
            {/* Divider Thick */}
            <div className="h-2 bg-gray-50 w-full mt-6 -mx-4" />

            {/* Info Terbaru Section */}
            <div className="bg-white overflow-hidden -mx-4">
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

            {/* Donatur Section */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Donatur ({totalDonors})</h3>
              <div className="space-y-3">
                {donors.map((donor) => (
                  <div key={donor.id} className="flex gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}20` }}>
                      <User className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {donor.is_anonymous ? 'Hamba Allah' : donor.donor_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(donor.created_at)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-800">
                          {formatCurrency(donor.amount)}
                        </p>
                      </div>
                      {/* Show message if exists */}
                      {((donor as any).message) && (
                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded italic">
                          "{((donor as any).message)}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {donors.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Belum ada donatur.</p>
                )}
                {totalDonors > 0 && (
                  <button
                    onClick={() => navigate('/infaq/donasi')}
                    className="w-full font-semibold text-sm flex items-center justify-center gap-1 transition-colors py-2 mt-2"
                    style={{ color: primaryColor }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Lihat Selengkapnya
                    <ChevronUp className="w-4 h-4 rotate-90" />
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
              onClick={() => setShowShareModal(true)}
              className="text-white p-2 rounded-full transition-colors"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Share2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const amountNum = parseFloat(amount.replace(/[^\d]/g, '')) || 0;
                if (amountNum > 0) {
                  navigate(`/infaq/bayar`, {
                    state: {
                      customAmount: amountNum,
                      paymentType: 'infaq',
                      messagePlaceholder: "Sampaikan niat berinfak",
                      messageRequired: true,
                      emailRequired: true,
                      // Pass any other necessary info
                    }
                  });
                }
              }}
              disabled={!amount || parseFloat(amount.replace(/[^\d]/g, '')) === 0}
              className="flex-1 ml-4 bg-white px-4 py-2 rounded-lg font-bold transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ color: primaryColor }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
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

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={`${window.location.origin}/infaq?utm_source=socialsharing_donor_web_infaq&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`}
        shareText="Mari tunaikan Infaq anda sekarang."
      />

    </div >
  );
}

