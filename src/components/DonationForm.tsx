import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Check, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Campaign } from '../lib/supabase';
import { findCampaignBySlug } from '../utils/slug';
import PaymentMethodSelector from './PaymentMethodSelector';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

export default function DonationForm() {
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const location = useLocation();
  const isFidyahPage = location.pathname === '/fidyah/bayar';
  const isInfaqPage = location.pathname === '/infaq/bayar';
  const { slug } = useParams<{ slug?: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(
    (location.state as { campaign?: Campaign })?.campaign || null
  );
  const [isLoading, setIsLoading] = useState(!campaign);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch campaign from slug if not provided via state
  useEffect(() => {
    if (slug && !campaign) {
      fetchCampaignFromSlug(slug);
    } else if (!slug && !campaign && (location.state as any)?.paymentType) {
      // Fallback: fetch campaign by paymentType (e.g. 'fidyah')
      const type = (location.state as any).paymentType;
      fetchCampaignFromSlug(type);
    }
  }, [slug, location.state]);

  const fetchCampaignFromSlug = async (campaignSlug: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaign:', error);
        return;
      }

      if (data) {
        const foundCampaign = findCampaignBySlug(data, campaignSlug);
        if (foundCampaign) {
          setCampaign(foundCampaign);
        } else if (data.length > 0) {
          // Fallback: Use the most recent campaign if specific one not found
          setCampaign(data[0]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };



  // Default campaign if none found
  const displayCampaign: Campaign = campaign || {
    id: '',
    title: 'Loading...',
    description: '',
    image_url: '',
    target_amount: 0,
    current_amount: 0,
    category: '',
    is_urgent: false,
    is_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!campaign && !isLoading) {
    // Optional: Handle not found more gracefully
  }

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentMethodName, setPaymentMethodName] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [hideName, setHideName] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Use campaign's preset amounts if available, otherwise use defaults
  const donationAmounts = useMemo(() => {
    // Hide presets for Fidyah and Infaq pages
    if (isFidyahPage || isInfaqPage) {
      return [];
    }

    if (campaign?.preset_amounts && Array.isArray(campaign.preset_amounts)) {
      // Filter out null/0 values and map to the format we need
      const validAmounts = campaign.preset_amounts
        .filter((amount: number) => amount && amount > 0)
        .map((amount: number, index: number) => {
          let label = '';

          if (amount >= 1000000) {
            // Format in millions (juta)
            const millions = amount / 1000000;
            label = millions % 1 === 0
              ? `Rp ${millions} jt`
              : `Rp ${millions.toFixed(1)} jt`;
          } else if (amount >= 1000) {
            // Format in thousands (ribu)
            const thousands = amount / 1000;
            label = thousands % 1 === 0
              ? `Rp ${thousands} rb`
              : `Rp ${thousands.toFixed(0)} rb`;
          } else {
            // Less than 1000, show as is
            label = `Rp ${amount} `;
          }

          return {
            value: amount,
            label,
            note: index === 1 ? 'sering dipilih' : undefined,
          };
        });

      // If we have valid amounts, use them
      if (validAmounts.length > 0) {
        return validAmounts;
      }
    }

    // Default fallback amounts
    return [];
  }, [campaign]);

  // Set initial selected amount to first preset amount
  useEffect(() => {
    if (donationAmounts.length > 0 && selectedAmount === null && !location.state) {
      setSelectedAmount(donationAmounts[0].value);
    }
  }, [donationAmounts]);

  // Handle passed amount from other pages (e.g. Fidyah, Zakat)
  useEffect(() => {
    const state = location.state as { customAmount?: number, note?: string, messagePlaceholder?: string } | null;
    if (state?.customAmount) {
      setCustomAmount(state.customAmount.toString());
      setSelectedAmount(null);
      if (state.note) {
        setMessage(state.note);
      }
    }
  }, [location.state]);

  const messagePlaceholder = (location.state as any)?.messagePlaceholder || "Tuliskan pesan atau doa disini (optional)";
  const messageRequired = (location.state as any)?.messageRequired || false;


  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
          <div className="bg-white z-10 border-b border-gray-200 flex-none px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
          <div className="p-4 space-y-6">
            <div className="w-full h-[220px] bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getDisplayAmount = () => {
    // Jika custom amount diisi, gunakan custom amount
    if (customAmount) {
      const amount = parseInt(customAmount.replace(/\D/g, ''));
      return amount || 0;
    }
    // Jika tidak ada custom amount, gunakan selectedAmount
    return selectedAmount || 0;
  };

  const handleAmountSelect = (amount: number | null) => {
    if (amount !== null) {
      setSelectedAmount(amount);
      setCustomAmount(''); // Reset custom amount when selecting preset
    } else {
      // When selecting "Nominal lainnya", clear selectedAmount
      setSelectedAmount(null);
      // Focus/reset custom amount?
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = getDisplayAmount();

    // Validate required fields
    if (amount === 0 || amount === null) {
      toast.error('Silakan pilih nominal donasi');
      return;
    }

    if (amount < 10000) {
      toast.error('Minimal donasi adalah Rp 10.000');
      return;
    }

    if (!paymentMethod) {
      toast.error('Silakan pilih metode pembayaran');
      return;
    }

    if (!fullName) {
      toast.error('Silakan isi nama lengkap');
      return;
    }

    if (!phone) {
      toast.error('Silakan isi nomor WhatsApp');
      return;
    }

    if (messageRequired && !message) {
      toast.error('Silakan isi niat berinfak');
      return;
    }

    if (!email || !email.trim()) {
      toast.error('Silakan isi alamat email');
      return;
    }

    // New validation: If campaignId is missing (e.g. invalid slug), validation fails
    if (!displayCampaign.id) {
      toast.error('Campaign tidak ditemukan. Silakan refresh halaman.');
      console.error('❌ Campaign ID is missing:', displayCampaign);
      return;
    }

    try {
      setIsProcessing(true);

      const anonymousName = (isFidyahPage || isInfaqPage) ? 'Hamba Allah' : 'Orang Baik';




      // Custom product details for Fidyah
      const numberOfDays = (location.state as any)?.numberOfDays || 1;
      const productDetails = isFidyahPage
        ? `Bayar Fidyah atas nama ${hideName ? anonymousName : fullName} untuk ${numberOfDays} hari`
        : isInfaqPage
          ? `Infaq atas nama ${hideName ? anonymousName : fullName}`
          : undefined;

      // Determine campaign ID or Slug
      let finalCampaignId = displayCampaign.id;
      let finalCampaignSlug = undefined;

      // If we are strictly on a system page (Infaq/Fidyah) and the 'displayCampaign' logic
      // defaulted to the fallback (latest campaign) because the specific slug didn't exist,
      // we should instead tell the backend to use/create the specific system campaign.
      // We detect this by checking if we have a known system slug but the displayCampaign doesn't match it.

      const targetSlug = isFidyahPage ? 'fidyah' : isInfaqPage ? 'infaq' : undefined;

      // If we have a target slug, pass it to the backend. 
      // The backend will create/find the system campaign.
      if (targetSlug) {
        finalCampaignSlug = targetSlug;
        // We can also clear finalCampaignId to force backend to look up by slug,
        // UNLESS displayCampaign WAS actually the correct one.
        // Safe bet: If displayCampaign.slug !== targetSlug, clear ID using slug.
        if (displayCampaign.slug !== targetSlug) {
          finalCampaignId = undefined; // Force backend to use slug
        }
      }

      // Call Edge Function to create transaction
      const { data: transaction, error: transactionError } = await supabase.functions.invoke('create-duitku-transaction', {
        body: {
          campaignId: finalCampaignId,
          campaignSlug: finalCampaignSlug || '', // Pass slug or empty string if undefined
          amount: amount,
          paymentMethod: paymentMethod,
          customerName: fullName,
          originalName: fullName, // Pass real name for admin dashboard
          isAnonymous: hideName,  // Flag for metadata
          customerEmail: email || `${phone}@donasiku.com`,
          customerPhone: phone,
          customerMessage: message || '',
          returnUrl: `${window.location.origin}/payment/success`,
          productDetails: productDetails,
        },
      });



      if (transactionError) {
        console.error('❌ Transaction Error:', transactionError);
        throw new Error(transactionError.message || transactionError.error || 'Terjadi kesalahan pada server (Edge Function)');
      }

      if (transaction && transaction.transaction) {


        // Navigate to invoice page with transaction data
        navigate(`/invoice/${transaction.transaction.invoiceCode}`, {
          state: {
            transaction: transaction.transaction,
            campaign: displayCampaign,
            customerName: hideName ? anonymousName : fullName,
            customerPhone: phone,
            customerEmail: email,
            paymentMethodName: paymentMethodName, // Full name from PaymentMethodSelector
            from: isFidyahPage ? '/fidyah' : isInfaqPage ? '/infaq' : undefined,
          },
        });
      } else {
        console.error('❌ Invalid response:', transaction);
        throw new Error('Tidak menerima data transaksi dari server');
      }

    } catch (error: any) {
      console.error('💥 Payment error:', error);

      // More specific error messages
      let errorMessage = 'Gagal membuat pembayaran. ';

      if (error.message?.includes('Failed to fetch')) {
        errorMessage += 'Tidak dapat menghubungi server. Periksa koneksi internet Anda.';
      } else if (error.message?.includes('Campaign not found')) {
        errorMessage += 'Campaign tidak ditemukan.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Silakan coba lagi atau hubungi admin.';
      }

      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
        {/* Header */}
        <div className="bg-white z-10 border-b border-gray-200 flex-none">
          <div className="px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isProcessing}
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-base font-normal text-gray-800 flex-1 truncate">
              {isFidyahPage ? 'Bayar Fidyah' : isInfaqPage ? 'Bayar Infaq' : displayCampaign.title}
            </h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          <form id="donation-form" onSubmit={handleSubmit} className="px-4 py-6">
            {/* Campaign Image - Display when accessed via /campaign/:slug/donasi-amount */}
            {slug && displayCampaign.image_url && (
              <div className="mb-6">
                <div className="w-full h-[220px] rounded-lg overflow-hidden shadow-md">
                  <img
                    src={displayCampaign.image_url}
                    alt={displayCampaign.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Program Information - Hide on Fidyah/Infaq Page since Header already says Bayar Fidyah/Infaq */}
            {!isFidyahPage && !isInfaqPage && (
              <div className="mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Anda akan berdonasi dalam program:</p>
                  <p className="font-bold text-gray-800 text-base leading-tight">{displayCampaign.title}</p>
                </div>
              </div>
            )}

            {/* Donation Amount Selection */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Donasi Terbaik Anda</h2>
              {donationAmounts.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {donationAmounts.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleAmountSelect(item.value)}
                      disabled={isProcessing}
                      className={`relative p-4 rounded-lg border-2 transition-all ${selectedAmount === item.value
                        ? 'border-transparent'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} `}
                      style={selectedAmount === item.value ? {
                        borderColor: primaryColor,
                        backgroundColor: `${primaryColor} 10`
                      } : {}}
                      onMouseEnter={(e) => {
                        if (selectedAmount !== item.value && !isProcessing) {
                          e.currentTarget.style.borderColor = primaryColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAmount !== item.value && !isProcessing) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      {selectedAmount === item.value && (
                        <div className="absolute top-2 right-2">
                          <div className="rounded-full p-1" style={{ backgroundColor: primaryColor }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="font-bold text-gray-800 text-sm md:text-base">{item.label}</p>
                        {item.note && (
                          <p className="text-[10px] text-gray-500 mt-1">{item.note}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAmountSelect(null)}
                    disabled={isProcessing}
                    className={`relative p-4 rounded-lg border-2 transition-all ${selectedAmount === null
                      ? 'border-transparent'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} `}
                    style={selectedAmount === null ? {
                      borderColor: primaryColor,
                      backgroundColor: `${primaryColor} 10`
                    } : {}}
                    onMouseEnter={(e) => {
                      if (selectedAmount !== null && !isProcessing) {
                        e.currentTarget.style.borderColor = primaryColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAmount !== null && !isProcessing) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    {selectedAmount === null && (
                      <div className="absolute top-2 right-2">
                        <div className="rounded-full p-1" style={{ backgroundColor: primaryColor }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="font-bold text-gray-800 text-sm md:text-base">Lainnya</p>
                      <p className="text-[10px] text-gray-500 mt-1">Manual</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Custom Amount Input */}
              {selectedAmount === null && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Masukkan nominal"
                    disabled={isProcessing}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none disabled:opacity-50"
                    style={{ '--focus-border': primaryColor } as React.CSSProperties}
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <PaymentMethodSelector
                amount={getDisplayAmount()}
                onSelect={(method, methodName) => {
                  setPaymentMethod(method);
                  setPaymentMethodName(methodName);
                }}
                selectedMethod={paymentMethod}
                selectedMethodName={paymentMethodName}
              />
            </div>

            {/* Personal Information */}
            <div className="mb-6">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama Lengkap"
                required

                disabled={isProcessing}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none mb-4 disabled:opacity-50"
                style={{ '--focus-border': primaryColor } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = primaryColor}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              <div className="flex items-center justify-between mb-4">
                <label className="text-sm text-gray-700">
                  {(isFidyahPage || isInfaqPage) ? 'Sembunyikan nama saya (Hamba Allah)' : 'Sembunyikan nama saya (Orang Baik)'}
                </label>
                <button
                  type="button"
                  onClick={() => setHideName(!hideName)}
                  disabled={isProcessing}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: hideName ? primaryColor : '#d1d5db' }}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hideName ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="No Whatsapp atau Handphone"
                required
                disabled={isProcessing}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none mb-4 disabled:opacity-50"
                style={{ '--focus-border': primaryColor } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = primaryColor}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                disabled={isProcessing}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none mb-4 disabled:opacity-50"
                style={{ '--focus-border': primaryColor } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = primaryColor}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={messagePlaceholder}
                rows={4}
                required={messageRequired}
                disabled={isProcessing}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none resize-none disabled:opacity-50"
                style={{ '--focus-border': primaryColor } as React.CSSProperties}
                onFocus={(e) => e.target.style.borderColor = primaryColor}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </form>
        </div>

        {/* Donate Button - Fixed at bottom of card */}
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg flex-none">
          <button
            type="submit"
            form="donation-form"
            disabled={isProcessing}
            className="w-full text-white py-4 rounded-lg font-bold text-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Memproses Pembayaran...
              </>
            ) : (
              `${(isFidyahPage || isInfaqPage) ? 'Tunaikan' : 'Donasi'} - ${formatCurrency(getDisplayAmount())} `
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
