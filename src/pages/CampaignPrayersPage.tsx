import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

// Utility functions
const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari yang lalu`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} bulan yang lalu`;
    const years = Math.floor(months / 12);
    return `${years} tahun yang lalu`;
};

export default function CampaignPrayersPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();

    const [loading, setLoading] = useState(true);
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignTitle, setCampaignTitle] = useState('');
    // Force update for UI re-render on amen click
    const [updateTrigger, setUpdateTrigger] = useState(0);

    useEffect(() => {
        if (slug) {
            fetchData();
        }
    }, [slug]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Get Campaign ID by Slug
            const { data: campaign, error: campaignError } = await supabase
                .from('campaigns')
                .select('id, title')
                .eq('slug', slug)
                .single();

            if (campaignError || !campaign) throw new Error('Campaign not found');
            setCampaignTitle(campaign.title);

            // 2. Fetch Transactions (Messages)
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .select('id, customer_name, customer_message, created_at, amen_count')
                .eq('campaign_id', campaign.id)
                .eq('status', 'success')
                .not('customer_message', 'is', null)
                .neq('customer_message', '');

            if (txError) throw txError;

            // 3. Fetch Testimonials
            const { data: testData, error: testError } = await supabase
                .from('testimonials')
                .select('*')
                .eq('campaign_id', campaign.id);

            if (testError) throw testError;

            // Combine and map
            const txMessages = (txData || []).map(tx => ({
                id: tx.id,
                donor_name: tx.customer_name || 'Hamba Allah',
                message: tx.customer_message,
                amen_count: tx.amen_count || 0,
                source_type: 'transaction',
                created_at: tx.created_at
            }));

            const testMessages = (testData || []).map(t => ({
                id: t.id,
                donor_name: t.donor_name,
                message: t.message,
                amen_count: t.amen_count || 0,
                source_type: 'testimonial',
                created_at: t.created_at
            }));

            const allPrayers = [...txMessages, ...testMessages].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setTestimonials(allPrayers);

        } catch (error) {
            console.error('Error fetching prayers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAmen = async (id: string, sourceType: string) => {
        // Optimistic UI update
        localStorage.setItem(`amen_${id}`, 'true');
        setUpdateTrigger(prev => prev + 1);

        // Call RPC
        try {
            // Use logic matching CampaignPage.tsx
            const { error } = await supabase.rpc('increment_amen', {
                row_id: id,
                is_transaction: sourceType === 'transaction'
            });

            if (error) throw error;

            // Update local count
            setTestimonials(prev => prev.map(t => {
                if (t.id === id) {
                    return { ...t, amen_count: (t.amen_count || 0) + 1 };
                }
                return t;
            }));
        } catch (err) {
            console.error('Error sending amen:', err);
            // Revert if needed? Usually OK to leave optimistic or revert on specific error
        }
    };

    const filteredTestimonials = testimonials.filter(t => {
        const name = t.donor_name || 'Hamba Allah';
        const msg = t.message || '';
        const q = searchQuery.toLowerCase();
        return name.toLowerCase().includes(q) || msg.toLowerCase().includes(q);
    });

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 flex items-center px-4 py-3 sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="ml-2 flex-1">
                    <h1 className="font-bold text-gray-800 text-lg leading-tight">Doa-doa</h1>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{campaignTitle}</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-[61px] z-10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari doa atau nama..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                        onFocus={(e) => e.target.style.borderColor = primaryColor}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 rounded-full p-0.5"
                        >
                            <X className="w-3 h-3 text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full" style={{ borderTopColor: primaryColor }} />
                    </div>
                ) : filteredTestimonials.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">
                        {searchQuery ? 'Tidak ada doa yang cocok.' : 'Belum ada doa.'}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTestimonials.map((testimonial) => (
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
    );
}
