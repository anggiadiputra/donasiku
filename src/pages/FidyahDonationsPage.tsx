import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { usePageTitle } from '../hooks/usePageTitle';
import { Donation } from '../lib/supabase';

const DONORS_PER_PAGE = 20;

export default function FidyahDonationsPage() {
    usePageTitle('Donatur Fidyah');
    const navigate = useNavigate();
    const primaryColor = usePrimaryColor();
    const [donors, setDonors] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchDonors(0, true);
    }, []);

    const fetchDonors = async (pageNum: number, isInitial = false) => {
        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const from = pageNum * DONORS_PER_PAGE;
            const to = from + DONORS_PER_PAGE - 1;

            // Query specifically for Fidyah transactions
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'success')
                .ilike('product_details', '%Fidyah%')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.error('Error fetching donors:', error);
                if (isInitial) setDonors([]);
                setHasMore(false);
            } else {
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

                if (isInitial) {
                    setDonors(mappedDonors as (Donation & { message?: string })[]);
                } else {
                    setDonors(prev => [...prev, ...mappedDonors as (Donation & { message?: string })[]]);
                }

                if (mappedDonors.length < DONORS_PER_PAGE) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (isInitial) setDonors([]);
            setHasMore(false);
        } finally {
            if (isInitial) setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchDonors(nextPage, false);
    }, [page, loadingMore, hasMore]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [hasMore, loadingMore, loadMore]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-100 flex justify-center">
                <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full">
                    <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
                        <button className="p-2 bg-gray-100 rounded-full animate-pulse w-9 h-9"></button>
                        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="p-4 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-100 flex justify-center">
            <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
                <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">Donatur Fidyah</h1>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="p-4 space-y-6">
                        {donors.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                Belum ada donatur.
                            </div>
                        ) : (
                            donors.map((donor) => (
                                <div key={donor.id} className="flex gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}20` }}>
                                        <User className="w-5 h-5" style={{ color: primaryColor }} />
                                    </div>
                                    <div className="flex-1">
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
                            ))
                        )}

                        {/* Infinite Scroll Loader */}
                        {hasMore && (
                            <div ref={observerTarget} className="py-4 flex justify-center">
                                {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-gray-400" />}
                            </div>
                        )}

                        {/* End of list indicator */}
                        {!hasMore && donors.length > 0 && (
                            <p className="text-center text-xs text-gray-400 py-4">
                                Semua donatur telah ditampilkan
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
