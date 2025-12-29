import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Share2, MapPin, CheckCircle, MessageCircle, ArrowUp } from 'lucide-react';
import { supabase, Campaign, Testimonial } from '../lib/supabase';
import ShareModal from '../components/ShareModal';

interface CampaignDetailProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CampaignDetail({ campaign, isOpen, onClose }: CampaignDetailProps) {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [showAllTestimonials, setShowAllTestimonials] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleDonate = () => {
    navigate('/donasi', { state: { campaign } });
    onClose();
  };

  useEffect(() => {
    if (campaign) {
      fetchTestimonials(campaign.id);
    }
  }, [campaign]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      setScrollY(target.scrollTop);
    };

    const modal = document.getElementById('campaign-detail-modal');
    if (modal) {
      modal.addEventListener('scroll', handleScroll);
      return () => modal.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchTestimonials = async (campaignId: string) => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (data) {
      setTestimonials(data);
    }
  };

  if (!isOpen || !campaign) return null;

  const progressPercentage = (campaign.current_amount / campaign.target_amount) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const displayedTestimonials = showAllTestimonials ? testimonials : testimonials.slice(0, 3);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div
        id="campaign-detail-modal"
        className="bg-white w-full h-screen overflow-y-auto relative"
      >
        <button
          onClick={onClose}
          className="sticky top-0 left-0 right-0 flex justify-end p-4 bg-white z-10 border-b border-gray-200"
        >
          <X className="w-6 h-6 text-gray-600 hover:text-gray-800" />
        </button>

        <div className="pb-24">
          <div className="relative">
            {campaign.image_url ? (
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300" />
            )}
            <div className="absolute top-4 right-4 flex gap-2">
              {campaign.is_urgent && (
                <div className="bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  SEDEKAH
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              {campaign.title}
            </h1>

            <div className="flex items-center gap-2 mb-4">
              {campaign.is_verified && (
                <div className="flex items-center gap-1 text-blue-600">
                  <CheckCircle className="w-5 h-5 fill-blue-600" />
                  <span className="text-sm font-semibold">Terverifikasi</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-gray-600 mb-6 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{campaign.target_location || 'Lokasi tidak tersedia'}</span>
            </div>

            <div className="bg-pink-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Dana Terkumpul</p>
                  <p className="text-3xl font-bold text-pink-600">
                    {formatCurrency(campaign.current_amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Target</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {formatCurrency(campaign.target_amount)}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-gradient-to-r from-pink-500 to-pink-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {campaign.donor_count || 0} Donatur telah membantu
              </p>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={handleDonate}
                className="flex-1 bg-blue-700 text-white py-3 rounded-full font-semibold hover:bg-blue-800 transition-colors"
              >
                Donasi Sekarang
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="w-12 h-12 flex items-center justify-center border-2 border-blue-700 text-blue-700 rounded-full hover:bg-blue-50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            <div className="border-t border-b border-gray-200 py-4 mb-6">
              <div className="flex gap-8 justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.round(progressPercentage)}%
                  </p>
                  <p className="text-xs text-gray-600">Tercapai</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {campaign.donor_count || 0}
                  </p>
                  <p className="text-xs text-gray-600">Donatur</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>Penggalang Dana</span>
              </h3>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center font-bold text-blue-700">
                  RA
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    {campaign.profiles?.organization_name || campaign.profiles?.full_name || campaign.organization_name || 'Donasiku'}
                  </p>
                  <p className="text-xs text-gray-500">Verified Organization</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Tentang Kampanye Ini</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {campaign.full_description || campaign.description}
              </p>
            </div>

            <div className="mb-8">
              <div className="flex gap-4 mb-4">
                <button className="flex-1 py-2 text-center font-semibold text-blue-700 border-b-2 border-blue-700">
                  Keterangan
                </button>
                <button className="flex-1 py-2 text-center font-semibold text-gray-500 border-b-2 border-gray-200 hover:text-gray-700">
                  Kabbar Terbaru
                </button>
              </div>
              <p className="text-gray-600 text-sm">Belum ada update terbaru</p>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Fundraiser</h3>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-lg text-center">
                <p className="text-gray-700 mb-4">Belum ada Fundraiser</p>
                <button className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-800 transition-colors">
                  Jadi Fundraiser
                </button>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Doa-doa orang baik ({testimonials.length})
              </h3>

              {testimonials.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Belum ada doa atau komentar</p>
              ) : (
                <div className="space-y-4">
                  {displayedTestimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-semibold text-gray-800 mb-1">
                        {testimonial.donor_name}
                      </p>
                      <p className="text-gray-700 mb-2">{testimonial.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(testimonial.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  ))}

                  {testimonials.length > 3 && !showAllTestimonials && (
                    <button
                      onClick={() => setShowAllTestimonials(true)}
                      className="w-full py-3 text-center text-blue-700 font-semibold hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-blue-700 text-blue-700 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Bagikan
              </button>
              <button
                onClick={handleDonate}
                className="flex-1 bg-blue-700 text-white py-3 rounded-full font-semibold hover:bg-blue-800 transition-colors"
              >
                Donasi Sekarang
              </button>
            </div>
          </div>
        </div>

        {scrollY > 100 && (
          <button
            onClick={() => {
              const modal = document.getElementById('campaign-detail-modal');
              if (modal) modal.scrollTop = 0;
            }}
            className="fixed bottom-6 right-6 bg-blue-700 text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition-colors z-50"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareUrl={`${window.location.origin}/campaign/${campaign?.slug}?utm_source=socialsharing_donor_web_campaign_detail&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`}
          shareText={campaign ? `Bantu ${campaign.title} di Donasiku!` : 'Bantu campaign ini di Donasiku!'}
        />
      </div>
    </div>
  );
}
