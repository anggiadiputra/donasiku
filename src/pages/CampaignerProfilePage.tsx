import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Profile, Campaign } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { MapPin, Globe, Facebook, Instagram, Twitter, Heart, Share2, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import VerifiedBadge from '../components/VerifiedBadge';

export default function CampaignerProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchProfile();
            fetchCampaigns();
        }
    }, [id]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Gagal mengambil data profil');
        }
    };

    const fetchCampaigns = async () => {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('user_id', id)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampaigns(data || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const calculateProgress = (raised: number, target: number) => {
        if (target === 0) return 0;
        return Math.min(100, Math.round((raised / target) * 100));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Profil Tidak Ditemukan</h1>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Beranda
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />

            <main className="flex-1">
                {/* Profile Header */}
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-full flex items-center justify-center text-3xl font-bold text-gray-400 overflow-hidden border-4 border-white shadow-md">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.organization_name || profile.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        (profile.organization_name || profile.full_name || '?').charAt(0).toUpperCase()
                                    )}
                                </div>
                                {(profile.verification_status === 'verified' || profile.role === 'admin') && (
                                    <div className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-sm">
                                        <VerifiedBadge size="lg" />
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2">
                                        {profile.organization_name || profile.full_name}
                                        {(profile.verification_status === 'verified' || profile.role === 'admin') && (
                                            <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                                                Verified
                                            </span>
                                        )}
                                    </h1>
                                    <p className="text-gray-500 mt-1 flex items-center justify-center md:justify-start gap-1">
                                        Campaigner {profile.organization_name ? 'Organisasi' : 'Individu'}
                                    </p>
                                </div>

                                {profile.bio && (
                                    <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto md:mx-0">
                                        {profile.bio}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-600">
                                    {profile.organization_name && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span>Terpusat di Indonesia</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Heart className="w-4 h-4 text-pink-400" />
                                        <span>{campaigns.length} Campaign Aktif</span>
                                    </div>
                                </div>

                                {/* Social Links */}
                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    {profile.social_links?.website && (
                                        <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                                            <Globe className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile.social_links?.facebook && (
                                        <a href={profile.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-blue-600">
                                            <Facebook className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile.social_links?.instagram && (
                                        <a href={profile.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-pink-600">
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile.social_links?.twitter && (
                                        <a href={profile.social_links.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-blue-400">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            toast.success('Link profil disalin!');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Bagikan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campaigns List */}
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 px-1">Campaign Aktif</h2>

                    {campaigns.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Heart className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Belum Ada Campaign</h3>
                            <p className="text-gray-500 mt-1">Campaigner ini belum memiliki campaign yang sedang berlangsung.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {campaigns.map((campaign) => (
                                <div
                                    key={campaign.id}
                                    onClick={() => navigate(`/campaign/${campaign.slug}`)}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                                >
                                    <div className="aspect-video overflow-hidden">
                                        <img
                                            src={campaign.image_url}
                                            alt={campaign.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <h3 className="font-bold text-gray-900 line-clamp-2 min-h-[3rem]">
                                            {campaign.title}
                                        </h3>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>Terkumpul: <strong>{formatCurrency(campaign.current_amount)}</strong></span>
                                                <span>{calculateProgress(campaign.current_amount, campaign.target_amount)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{
                                                        width: `${calculateProgress(campaign.current_amount, campaign.target_amount)}%`,
                                                        backgroundColor: primaryColor
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
