import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PaymentStatusSkeleton } from '../components/SkeletonLoader';
import { CheckCircle2, XCircle, Loader2, Clock, Copy, ExternalLink, ArrowLeft } from 'lucide-react';

interface Transaction {
    id: string;
    merchant_order_id: string;
    invoice_code: string;
    amount: number;
    payment_method: string;
    payment_method_name: string;
    duitku_reference: string;
    va_number: string | null;
    qr_string: string | null;
    status: 'pending' | 'success' | 'failed' | 'expired';
    result_code: string;
    status_message: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    product_details: string;
    expiry_time: string;
    created_at: string;
    campaigns: {
        title: string;
        slug: string;
        image_url: string;
    } | null;
}

export default function PaymentStatusPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copiedVA, setCopiedVA] = useState(false);
    const [copiedInvoice, setCopiedInvoice] = useState(false);
    const [checking, setChecking] = useState(false);

    const merchantOrderId = searchParams.get('merchantOrderId') || searchParams.get('orderId');

    useEffect(() => {
        if (merchantOrderId) {
            fetchTransaction();
        } else {
            setError('Order ID tidak ditemukan');
            setLoading(false);
        }
    }, [merchantOrderId]);

    async function fetchTransaction() {
        try {
            setLoading(true);

            const { data, error: fetchError } = await supabase
                .from('transactions')
                .select('*, campaigns(title, slug, image_url)')
                .eq('merchant_order_id', merchantOrderId)
                .single();

            if (fetchError || !data) {
                setError('Transaksi tidak ditemukan');
                return;
            }

            setTransaction(data as Transaction);

            // If transaction is still pending, check status with Duitku
            if (data.status === 'pending') {
                await checkTransactionStatus();
            }
        } catch (err: any) {
            console.error('Error fetching transaction:', err);
            setError('Gagal memuat data transaksi');
        } finally {
            setLoading(false);
        }
    }

    async function checkTransactionStatus() {
        try {
            setChecking(true);

            const { data, error } = await supabase.functions.invoke('check-duitku-transaction', {
                body: { merchantOrderId },
            });

            if (error) throw error;



            // Refresh transaction data
            await fetchTransaction();
        } catch (err: any) {
            console.error('Error checking transaction:', err);
        } finally {
            setChecking(false);
        }
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    }

    function formatDate(dateString: string) {
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    }

    async function copyToClipboard(text: string, type: 'invoice' | 'va') {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'invoice') {
                setCopiedInvoice(true);
                setTimeout(() => setCopiedInvoice(false), 2000);
            } else {
                setCopiedVA(true);
                setTimeout(() => setCopiedVA(false), 2000);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    if (loading) {
        return <PaymentStatusSkeleton />;
    }

    if (error || !transaction) {
        return (
            <div className="fixed inset-0 bg-gray-100 flex justify-center">
                <div className="w-full max-w-[480px] bg-gradient-to-br from-red-50 to-white shadow-2xl flex flex-col h-full relative p-4">
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="bg-white rounded-2xl shadow-xl p-8 w-full text-center">
                            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">Terjadi Kesalahan</h1>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                            >
                                Kembali ke Beranda
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isSuccess = transaction.status === 'success';
    const isPending = transaction.status === 'pending';
    const isFailed = transaction.status === 'failed' || transaction.status === 'expired';

    return (
        <div className="fixed inset-0 bg-gray-100 flex justify-center">
            <div className={`w-full max-w-[480px] shadow-2xl flex flex-col h-full relative bg-gradient-to-br ${isSuccess ? 'from-green-50 to-white' :
                isPending ? 'from-yellow-50 to-white' :
                    'from-red-50 to-white'
                }`}>
                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-4">
                    <div className="w-full">
                        {/* Back button */}
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Kembali</span>
                        </button>

                        {/* Status Card */}
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                            {/* Status Header */}
                            <div className={`p-8 text-center ${isSuccess ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                isPending ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                                    'bg-gradient-to-br from-red-500 to-red-600'
                                }`}>
                                {isSuccess && (
                                    <>
                                        <CheckCircle2 className="w-20 h-20 text-white mx-auto mb-4" />
                                        <h1 className="text-3xl font-bold text-white mb-2">Pembayaran Berhasil!</h1>
                                        <p className="text-white/90">Terima kasih atas donasi Anda</p>
                                    </>
                                )}
                                {isPending && (
                                    <>
                                        <Clock className="w-20 h-20 text-white mx-auto mb-4 animate-pulse" />
                                        <h1 className="text-3xl font-bold text-white mb-2">Menunggu Pembayaran</h1>
                                        <p className="text-white/90">Silakan selesaikan pembayaran Anda</p>
                                    </>
                                )}
                                {isFailed && (
                                    <>
                                        <XCircle className="w-20 h-20 text-white mx-auto mb-4" />
                                        <h1 className="text-3xl font-bold text-white mb-2">Pembayaran Gagal</h1>
                                        <p className="text-white/90">Silakan coba lagi atau hubungi customer service</p>
                                    </>
                                )}
                            </div>

                            {/* Transaction Details */}
                            <div className="p-6 space-y-4">
                                {/* Invoice Code */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Nomor Invoice</p>
                                        <p className="font-bold text-gray-800 text-lg break-all">{transaction.invoice_code}</p>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(transaction.invoice_code, 'invoice')}
                                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${copiedInvoice ? 'bg-green-100 text-green-600' : 'hover:bg-gray-200 text-gray-600'}`}
                                    >
                                        {copiedInvoice ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Reference */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Referensi Duitku</p>
                                        <p className="font-semibold text-gray-800 break-all">{transaction.duitku_reference}</p>
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                                    <div>
                                        <p className="text-sm text-orange-600 mb-1">Total Donasi</p>
                                        <p className="font-bold text-orange-600 text-2xl">{formatCurrency(transaction.amount)}</p>
                                    </div>
                                </div>

                                {/* Campaign Info */}
                                {transaction.campaigns && (
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-2">Campaign</p>
                                        <div className="flex items-center gap-3">
                                            {transaction.campaigns.image_url && (
                                                <img
                                                    src={transaction.campaigns.image_url}
                                                    alt={transaction.campaigns.title}
                                                    className="w-16 h-16 rounded-lg object-cover"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">{transaction.campaigns.title}</p>
                                                <button
                                                    onClick={() => navigate(`/campaign/${transaction.campaigns?.slug}`)}
                                                    className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1 mt-1"
                                                >
                                                    Lihat Campaign <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* VA Number (if applicable) */}
                                {transaction.va_number && isPending && (
                                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                        <p className="text-sm text-blue-600 mb-2">Nomor Virtual Account</p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-mono font-bold text-blue-600 text-xl break-all">{transaction.va_number}</p>
                                            <button
                                                onClick={() => copyToClipboard(transaction.va_number!, 'va')}
                                                className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 ${copiedVA ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                            >
                                                {copiedVA ? (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Tersalin!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4" />
                                                        Salin
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Method */}{/* Adjusted slightly for layout safety */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Metode Pembayaran</p>
                                        <p className="font-semibold text-gray-800">
                                            {transaction.payment_method_name || transaction.payment_method}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-600 mb-1">Status</p>
                                        <p className={`font-semibold ${isSuccess ? 'text-green-600' :
                                            isPending ? 'text-yellow-600' :
                                                'text-red-600'
                                            }`}>
                                            {isSuccess ? 'Berhasil' : isPending ? 'Pending' : 'Gagal'}
                                        </p>
                                    </div>
                                </div>

                                {/* Expiry Time (if pending) */}
                                {isPending && transaction.expiry_time && (
                                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="flex items-center gap-2 text-yellow-700">
                                            <Clock className="w-5 h-5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm">Batas Waktu Pembayaran:</p>
                                                <p className="font-semibold">{formatDate(transaction.expiry_time)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Info */}
                                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                    <p className="text-sm text-gray-600 mb-2">Informasi Donatur</p>
                                    <div className="space-y-1">
                                        <p className="text-sm"><span className="font-semibold">Nama:</span> {transaction.customer_name}</p>
                                        <p className="text-sm break-all"><span className="font-semibold">Email:</span> {transaction.customer_email}</p>
                                        {transaction.customer_phone && (
                                            <p className="text-sm"><span className="font-semibold">Telepon:</span> {transaction.customer_phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-center text-sm text-gray-500">
                                    {formatDate(transaction.created_at)}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3 pb-8">
                            {isPending && (
                                <button
                                    onClick={checkTransactionStatus}
                                    disabled={checking}
                                    className="w-full bg-orange-500 text-white py-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {checking ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Memeriksa Status...
                                        </>
                                    ) : (
                                        'Periksa Status Pembayaran'
                                    )}
                                </button>
                            )}

                            {isSuccess && transaction.campaigns && (
                                <button
                                    onClick={() => navigate(`/campaign/${transaction.campaigns?.slug}`)}
                                    className="w-full bg-orange-500 text-white py-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                                >
                                    Lihat Campaign
                                </button>
                            )}

                            <button
                                onClick={() => navigate('/')}
                                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Kembali ke Beranda
                            </button>
                        </div>

                        {/* WhatsApp Info */}
                        {isSuccess && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                                <p className="text-sm text-green-700">
                                    ✅ Bukti pembayaran telah dikirim ke WhatsApp Anda
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
