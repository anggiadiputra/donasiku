import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { supabase, Campaign, Testimonial } from '../lib/supabase';
import ShareModal from '../components/ShareModal';
import VerifiedBadge from '../components/VerifiedBadge';

import Header from '../components/Header';
import Footer from '../components/Footer';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { CampaignPageSkeleton } from '../components/SkeletonLoader';
import { useAppName } from '../hooks/useAppName';
import { usePageTitle } from '../hooks/usePageTitle';
import { isNetworkError } from '../utils/errorHandling';

export default function CampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const { appName } = useAppName();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  usePageTitle(campaign?.title || 'Detail Campaign');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [donors, setDonors] = useState<any[]>([]);
  const [realtimeStats, setRealtimeStats] = useState({ amount: 0, count: 0 });
  const [showShareModal, setShowShareModal] = useState(false);

  // Calculate hover color (darker)
  const getHoverColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const hoverR = Math.max(0, r - 25);
    const hoverG = Math.max(0, g - 25);
    const hoverB = Math.max(0, b - 25);
    return `#${hoverR.toString(16).padStart(2, '0')}${hoverG.toString(16).padStart(2, '0')}${hoverB.toString(16).padStart(2, '0')}`;
  };

  const hoverColor = getHoverColor(primaryColor);

  useEffect(() => {
    if (slug) {
      // Redirect system campaigns to their dedicated pages
      const systemRedirects: Record<string, string> = {
        'infaq': '/infaq',
        'fidyah': '/fidyah',
        'zakat': '/zakat',
        'wakaf': '/wakaf',
        'sedekah-subuh': '/sedekah-subuh'
      };

      if (systemRedirects[slug]) {
        navigate(systemRedirects[slug], { replace: true });
        return;
      }

      fetchCampaign(slug);
    }
  }, [slug]);

  const fetchCampaign = async (campaignSlug: string, retryCount = 0) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          profiles:user_id (
            full_name,
            organization_name,
            avatar_url,
            verification_status,
            role
          ),
          organizations (
            name,
            logo_url,
            slug,
            verification_status
          )
        `)
        .eq('slug', campaignSlug)
        .single();

      if (error) {
        if (isNetworkError(error) && retryCount < 2) {
          console.warn(`Campaign detail network issue, retrying (${retryCount + 1})...`);
          setTimeout(() => fetchCampaign(campaignSlug, retryCount + 1), 2000);
          return;
        }

        if (error.code !== 'PGRST116') {
          console.error('Error fetching campaign:', error);
        }
        setCampaign(null);
        return;
      }

      if (data) {
        // Check access: Published OR Owner
        let shouldShow = data.status === 'published';

        if (!shouldShow) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && data.user_id === user.id) {
            shouldShow = true;
          }
        }

        if (shouldShow) {
          // If profile returned by join, we don't need second query
          // But we keep the fallback override logic for safety
          if (!data.organizations) {
            // Priority: Org Name in profile > Platform Name (for Admin) > Full Name > hardcoded
            if (data.profiles?.role === 'admin') {
              data.organization_name = data.profiles?.organization_name || appName || data.profiles?.full_name || 'Donasiku';
            } else {
              data.organization_name = data.profiles?.organization_name || data.profiles?.full_name || data.organization_name;
            }
          }

          setCampaign(data);
          setRealtimeStats({
            amount: data.current_amount,
            count: data.donor_count || 0
          });
          fetchCampaignTransactions(data.id);
        }
      }
    } catch (err: any) {
      console.error('Unexpected Detail error:', err);
      if (isNetworkError(err) && retryCount < 2) {
        setTimeout(() => fetchCampaign(campaignSlug, retryCount + 1), 2000);
        return;
      }
      setCampaign(null);
    } finally {
      if (retryCount === 0 || !loading) {
        setLoading(false);
      }
    }
  };

  const fetchCampaignTransactions = async (campaignId: string, retryCount = 0) => {
    try {
      // 1. Fetch ALL success transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, customer_name, customer_message, created_at, amount, amen_count, is_anonymous, metadata')
        .eq('campaign_id', campaignId)
        .eq('status', 'success')
        .order('created_at', { ascending: false });

      if (transactionsError) {
        if (isNetworkError(transactionsError) && retryCount < 2) {
          setTimeout(() => fetchCampaignTransactions(campaignId, retryCount + 1), 2000);
          return;
        }
        console.error('Error fetching transactions:', transactionsError);
      }

      const validTransactions = transactionsData || [];

      // Calculate Realtime Stats
      const totalAmount = validTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalCount = validTransactions.length;
      setRealtimeStats({ amount: totalAmount, count: totalCount });

      // Set Donors List
      setDonors(validTransactions);

      // 2. Fetch Manual Testimonials
      const { data: testimonialsData } = await supabase
        .from('testimonials')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      // 3. Prepare Prayers List
      const transactionMessages: Testimonial[] = validTransactions
        .filter(t => t.customer_message && t.customer_message.trim().length > 0)
        .map(tx => ({
          id: tx.id,
          campaign_id: campaignId,
          donor_name: (tx.is_anonymous || tx.metadata?.is_anonymous) ? 'Orang Baik' : (tx.customer_name || 'Hamba Allah'),
          message: tx.customer_message,
          amen_count: tx.amen_count || 0,
          source_type: 'transaction',
          created_at: tx.created_at,
        }));

      const existingTestimonials: Testimonial[] = (testimonialsData || []).map(t => ({
        id: t.id,
        campaign_id: campaignId,
        donor_name: t.donor_name,
        message: t.message,
        amen_count: t.amen_count || 0,
        source_type: 'testimonial',
        created_at: t.created_at
      }));

      // Combine and sort by date descending
      const allPrayers = [...transactionMessages, ...existingTestimonials].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTestimonials(allPrayers);

    } catch (error) {
      console.error('Error in fetchCampaignTransactions:', error);
    }
  };

  const handleAmen = async (id: string, sourceType: 'transaction' | 'testimonial' = 'testimonial') => {
    // Check local storage
    const storageKey = `amen_${id}`;
    // Uncomment checking below to enforce one-time click per device
    // if (localStorage.getItem(storageKey)) return;

    // Save to local storage (marker that user has clicked)
    localStorage.setItem(storageKey, 'true');

    // Optimistic UI update
    setTestimonials(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, amen_count: (t.amen_count || 0) + 1 };
      }
      return t;
    }));

    // Call RPC
    try {
      const { error } = await supabase.rpc('increment_amen', {
        row_id: id,
        is_transaction: sourceType === 'transaction'
      });
      if (error) console.error('Error incrementing amen:', error);
    } catch (err) {
      console.error('Error calling increment_amen:', err);
    }
  };

  const handleDonate = () => {
    if (campaign && slug) {
      // Use slug from database or current URL slug
      const campaignSlug = campaign.slug || slug;
      navigate(`/campaign/${campaignSlug}/donasi-amount`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

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

  if (loading) {
    return <CampaignPageSkeleton />;
  }

  if (!campaign) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white flex flex-col h-full shadow-2xl relative">
          <div className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Kampanye tidak ditemukan</h1>
              <button
                onClick={() => navigate('/')}
                className="text-white px-6 py-3 rounded-full font-semibold transition-colors"
                style={{ backgroundColor: primaryColor }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hoverColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = primaryColor;
                }}
              >
                Kembali ke Beranda
              </button>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = (realtimeStats.amount / campaign.target_amount) * 100;
  const displayedTestimonials = testimonials.slice(0, 5);
  const displayedDonors = donors.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
      <div className="w-full max-w-[480px] bg-white flex flex-col h-full shadow-2xl relative">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* 1. Header Image & Navigation */}
          <div className="relative">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="w-full h-[220px] object-cover"
              />
            ) : (
              <div className="w-full h-[220px] bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
            )}
            {/* Back Button Overlay */}
            <div className="absolute top-4 left-4 z-10">
              <button
                onClick={() => navigate('/')}
                className="bg-black/20 backdrop-blur-sm p-2 rounded-full hover:bg-black/30 transition-colors"
                title="Kembali ke Beranda"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </div>
            {/* Urgent Label Overlay */}
            {campaign.is_urgent && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                <span
                  className="inline-block px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wider mb-1"
                  style={{ backgroundColor: primaryColor }}
                >
                  Darurat
                </span>
                <p className="text-white font-bold text-sm">Butuh Bantuan Segera!</p>
              </div>
            )}
          </div>

          <div className="px-5 py-6">


            {/* 3. Title */}
            <h1 className="text-xl font-bold text-gray-900 leading-snug mb-4">
              {campaign.title}
            </h1>

            {/* 4. Donation Stats */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-1">
                <p className="text-xs text-gray-500">Dana terkumpul</p>
                {(campaign.end_date) && (
                  <p className="text-xs text-gray-500">
                    Sisa hari: <span className="font-semibold text-gray-700">{Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))} hari</span>
                  </p>
                )}
              </div>
              <p className="text-2xl font-bold mb-2" style={{ color: primaryColor }}>
                {formatCurrency(realtimeStats.amount)}
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(progressPercentage, 100)}%`,
                    backgroundColor: primaryColor
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1.5">
                  {realtimeStats.count > 0 && (
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {donors.slice(0, 3).map((t, i) => (
                        <div key={i} className="inline-flex h-5 w-5 rounded-full ring-1 ring-white bg-gray-100 items-center justify-center">
                          <span className="text-[9px] font-bold text-gray-500">
                            {(t.is_anonymous || t.metadata?.is_anonymous || !t.customer_name) ? '?' : t.customer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="text-gray-600 font-medium ml-1">
                    {realtimeStats.count} <span className="font-normal text-gray-500">Donasi</span>
                  </span>
                </div>
                {campaign.target_amount > 0 && campaign.target_amount < 1000000000000 ? (
                  <span className="text-gray-700 text-xs font-semibold">Target: {formatCurrency(campaign.target_amount)}</span>
                ) : (
                  <span className="text-gray-700 text-xs font-semibold flex items-center gap-1">Target: <span className="text-lg leading-none">∞</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Divider Thick */}
          <div className="h-2 bg-gray-50 w-full" />

          {/* Informasi Penggalangan Dana */}
          <div className="px-5 py-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Informasi Penggalangan Dana</h3>
            <div
              className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                // @ts-ignore
                const orgSlug = campaign.organizations?.slug;
                if (orgSlug) {
                  navigate(`/org/${orgSlug}`);
                }
              }}
            >
              <p className="text-sm font-semibold text-gray-700 mb-3">Penggalang Dana</p>
              <div className="flex items-center gap-3">
                {/* Logo */}
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {/* @ts-ignore */}
                  {(campaign.organizations?.logo_url || campaign.organization_logo || campaign.profiles?.avatar_url) ? (
                    /* @ts-ignore */
                    <img src={campaign.organizations?.logo_url || campaign.organization_logo || campaign.profiles?.avatar_url} alt="Org" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-pink-500 font-bold text-lg">
                      {/* @ts-ignore */}
                      {(campaign.organizations?.name || campaign.organization_name || campaign.profiles?.organization_name || campaign.profiles?.full_name || appName || 'D').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name & Badge */}
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-900 text-sm">
                      {/* @ts-ignore */}
                      {campaign.organizations?.name || campaign.organization_name || campaign.profiles?.organization_name || campaign.profiles?.full_name || appName || 'Donasiku'}
                    </span>
                    {/* Verified Badge - Now using component */}
                    {((campaign.organizations?.verification_status === 'verified') ||
                      (!campaign.organizations && (campaign.profiles?.verification_status === 'verified' || campaign.profiles?.role === 'admin'))) && (
                        <VerifiedBadge size="md" />
                      )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <span>
                      {((campaign.organizations?.verification_status === 'verified') ||
                        (!campaign.organizations && (campaign.profiles?.verification_status === 'verified' || campaign.profiles?.role === 'admin')))
                        ? 'Identitas terverifikasi'
                        : 'Identitas belum terverifikasi'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Campaign Story (Description) */}
          <div className="px-5 py-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Cerita Penggalangan Dana</h2>
              <span className="text-xs text-gray-400">{new Date(campaign.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>

            <div
              className={`relative overflow-hidden text-gray-700 leading-relaxed text-sm rich-text-content transition-all duration-300 ${!isDescriptionExpanded ? 'max-h-[300px]' : ''}`}
            >
              <div dangerouslySetInnerHTML={{ __html: campaign.full_description || campaign.description }} />

              {!isDescriptionExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>

            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="w-full mt-4 py-2.5 border border-gray-200 rounded text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              {isDescriptionExpanded ? 'Tutup Cerita' : 'Baca Selengkapnya'}
            </button>

            <style>{`
            .rich-text-content p { margin-bottom: 1em; }
            .rich-text-content img { border-radius: 8px; max-width: 100%; height: auto; margin: 1em 0; }
            .rich-text-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
            .rich-text-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
            .rich-text-content li { margin-bottom: 0.5em; }
           `}</style>
          </div>

          {/* Divider Thick */}
          <div className="h-2 bg-gray-50 w-full" />


          {/* 6. Section: Kabar Terbaru */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800">Kabar Terbaru</h3>
              <span className="text-blue-500 text-sm cursor-pointer">Lihat Semua</span>
            </div>
            <p className="text-gray-500 text-sm">Belum ada kabar terbaru dari penggalang dana.</p>
          </div>

          {/* 7. Section: Donasi (New) */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Donasi <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full ml-1">{realtimeStats.count}</span></h3>
              {donors.length > 0 && (
                <button
                  onClick={() => navigate(`/campaign/${slug}/donatur`)}
                  className="text-blue-500 text-sm hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Lihat Semua
                </button>
              )}
            </div>

            {donors.length === 0 ? (
              <p className="text-gray-500 text-sm">Belum ada donasi.</p>
            ) : (
              <div className="space-y-3">
                {displayedDonors.map((donor) => (
                  <div key={donor.id} className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      {(donor.is_anonymous || donor.metadata?.is_anonymous || !donor.customer_name) ? (
                        <div className="w-5 h-5 bg-gray-200 rounded-full" />
                      ) : (
                        <span className="font-bold text-gray-500 text-sm">
                          {donor.customer_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">
                        {donor.is_anonymous ? 'Hamba Allah' : (donor.customer_name || 'Hamba Allah')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Berdonasi sebesar <span className="font-semibold text-gray-900">{formatCurrency(donor.amount)}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {getTimeAgo(donor.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 8. Section: Doa-doa */}
          <div className="px-5 py-5 pb-8 bg-blue-50/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                Doa-doa Orang Baik <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">{testimonials.length}</span>
              </h3>
              {testimonials.length > 0 && (
                <button
                  onClick={() => navigate(`/campaign/${slug}/doa`)}
                  className="text-blue-500 text-sm hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Lihat Semua
                </button>
              )}
            </div>

            {testimonials.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">Jadilah yang pertama mendoakan!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedTestimonials.map((testimonial) => (
                  <div key={testimonial.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">{testimonial.donor_name}</span>
                        <span className="text-[10px] text-gray-400">• {getTimeAgo(testimonial.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">{testimonial.message}</p>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleAmen(testimonial.id, testimonial.source_type)}
                        disabled={!!localStorage.getItem(`amen_${testimonial.id}`)}
                        className="flex items-center gap-1.5 text-xs font-medium transition-all border rounded-full px-3 py-1 disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{
                          color: localStorage.getItem(`amen_${testimonial.id}`) ? primaryColor : '#6b7280',
                          borderColor: localStorage.getItem(`amen_${testimonial.id}`) ? `${primaryColor}40` : '#e5e7eb',
                          backgroundColor: localStorage.getItem(`amen_${testimonial.id}`) ? `${primaryColor}10` : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!localStorage.getItem(`amen_${testimonial.id}`)) {
                            e.currentTarget.style.backgroundColor = `${primaryColor}25`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!localStorage.getItem(`amen_${testimonial.id}`)) {
                            e.currentTarget.style.backgroundColor = `${primaryColor}10`;
                          }
                        }}
                      >
                        {localStorage.getItem(`amen_${testimonial.id}`) ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                        )}
                        {localStorage.getItem(`amen_${testimonial.id}`) ? 'Aamiin' : 'Aamiinkan'}
                        {testimonial.amen_count ? <span className="ml-1">({testimonial.amen_count})</span> : null}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 9. Sticky Action Footer */}
        <div className="border-t border-gray-200 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="w-12 h-12 flex items-center justify-center rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
              aria-label="Bagikan"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDonate}
              className="flex-1 rounded font-bold text-white text-lg tracking-wide shadow-md hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              Donasi Sekarang
            </button>
          </div>
        </div>
      </div>


      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={`${window.location.origin}${window.location.pathname}?utm_source=socialsharing_donor_web_campaign_detail&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`}
        shareText={campaign ? `Bantu ${campaign.title} di Donasiku!` : 'Bantu campaign ini di Donasiku!'}
      />
    </div >
  );
}
