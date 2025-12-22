import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle, Clock, Loader2, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import ReceiptModal from '../components/ReceiptModal';
import { InvoicePageSkeleton } from '../components/SkeletonLoader';
import { usePageTitle } from '../hooks/usePageTitle';

export default function InvoicePage() {
  const { invoiceCode } = useParams<{ invoiceCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    transaction: any;
    campaign: any;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerMessage: string;
    paymentMethodName?: string;
  } | null>(null);

  const [copiedVA, setCopiedVA] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [paymentFee, setPaymentFee] = useState(3000); // Default fee
  const [transactionStatus, setTransactionStatus] = useState<string>('pending');

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Set page title
  usePageTitle(transactionStatus === 'success' ? 'Invoice Pembayaran' : 'Instruksi Pembayaran');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'pending' | 'failed'>('pending');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const initData = async () => {
      setLoading(true);

      // 1. Try to get data from navigation state
      if (location.state?.transaction) {
        setData({
          transaction: location.state.transaction,
          campaign: location.state.campaign,
          customerName: location.state.customerName || 'Orang Baik',
          customerPhone: location.state.customerPhone || '',
          customerEmail: location.state.customerEmail || '',
          customerMessage: location.state.customerMessage || '',
          paymentMethodName: location.state.paymentMethodName
        });
        setLoading(false);
        return;
      }

      // 2. If no state, fetch from database using invoiceCode
      if (invoiceCode) {
        try {
          const { data: tx, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .or(`invoice_code.eq.${invoiceCode},merchant_order_id.eq.${invoiceCode}`)
            .single();

          if (txError) throw txError;

          if (tx) {
            // Fetch campaign
            const { data: camp, error: campError } = await supabase
              .from('campaigns')
              .select('*')
              .eq('id', tx.campaign_id)
              .single();

            if (campError) throw campError;

            // Map DB snake_case to component camelCase expectations
            const mappedTransaction = {
              ...tx,
              merchantOrderId: tx.merchant_order_id,
              paymentMethod: tx.payment_method,
              createdAt: tx.created_at,
              expiryTime: tx.expiry_time,
              duitkuReference: tx.duitku_reference,
              vaNumber: tx.va_number,
              qrString: tx.qr_string,
              invoiceCode: tx.invoice_code
            };

            setData({
              transaction: mappedTransaction,
              campaign: camp,
              customerName: tx.customer_name || 'Orang Baik',
              customerPhone: tx.customer_phone || '',
              customerEmail: tx.customer_email || '',
              customerMessage: tx.customer_message || '',
            });
          }
        } catch (error) {
          console.error('Error fetching invoice data:', error);
        }
      }

      setLoading(false);
    };

    initData();
  }, [invoiceCode, location.state]);

  const transaction = data?.transaction;
  const campaign = data?.campaign;
  const customerName = data?.customerName || 'Orang Baik';
  const paymentMethodName = data?.paymentMethodName;

  // Extract primitives for stable dependencies
  const merchantOrderId = transaction?.merchantOrderId;
  const paymentMethodCode = transaction?.paymentMethod;

  // Fetch payment method fee
  useEffect(() => {
    const fetchPaymentFee = async () => {
      if (!paymentMethodCode) return;

      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('total_fee')
          .eq('payment_method_code', paymentMethodCode)
          .single();

        if (error) {
          console.error('Error fetching payment fee:', error);
        } else if (data?.total_fee) {
          console.log('📊 Payment fee from DB:', data.total_fee);
          setPaymentFee(parseFloat(data.total_fee));
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchPaymentFee();
  }, [paymentMethodCode]);

  // Ref to track status for polling without triggering re-effects
  const transactionStatusRef = useRef('pending');

  useEffect(() => {
    transactionStatusRef.current = transactionStatus;
  }, [transactionStatus]);

  // Fetch transaction status from database
  useEffect(() => {
    if (!merchantOrderId) return;

    const fetchTransactionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('status')
          .eq('merchant_order_id', merchantOrderId)
          .single();

        if (error) {
          console.error('Error fetching transaction status:', error);
        } else if (data) {
          console.log('📊 Transaction status from DB:', data.status);
          if (data.status !== transactionStatusRef.current) {
            setTransactionStatus(data.status);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchTransactionStatus();

    // Poll status every 10 seconds if still pending
    const interval = setInterval(() => {
      if (transactionStatusRef.current === 'pending') {
        fetchTransactionStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [merchantOrderId]);

  if (loading) {
    return <InvoicePageSkeleton />;
  }

  // If no data, show error
  if (!transaction || !campaign) {
    console.error('❌ Missing transaction or campaign data');
    return (
      <div className="fixed inset-0 bg-gray-100 flex justify-center">
        <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative p-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-white rounded-lg p-8 w-full">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Data tidak ditemukan</h1>
              <p className="text-gray-600 mb-6">Invoice data tidak tersedia. Silakan buat donasi baru.</p>
              <button
                onClick={() => navigate('/')}
                className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors w-full"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVA(true);
    setTimeout(() => setCopiedVA(false), 2000);
  };

  const getPaymentMethodName = (code: string) => {
    const methods: { [key: string]: string } = {
      'BC': 'BCA Virtual Account',
      'M2': 'Mandiri Virtual Account',
      'BN': 'BNI Virtual Account',
      'BR': 'BRI Virtual Account',
      'I1': 'BSI VA',
      'AG': 'Bank Agregator',
      'NC': 'Bank Neo Commerce',
      'OV': 'OVO',
      'DA': 'DANA',
      'SP': 'ShopeePay',
      'LF': 'LinkAja',
      'NQ': 'QRIS',
    };
    return methods[code] || code;
  };

  const handleCheckPayment = async () => {
    try {
      setIsChecking(true);
      console.log('🔍 Checking payment status for:', transaction.merchantOrderId);

      const { data, error } = await supabase.functions.invoke('check-duitku-transaction', {
        body: {
          merchantOrderId: transaction.merchantOrderId,
        },
      });

      if (error) {
        console.error('❌ Error checking payment:', error);
        throw new Error(error.message || 'Gagal memeriksa status pembayaran');
      }

      console.log('✅ Payment check response:', data);

      if (data && data.status) {
        if (data.status === 'success') {
          setModalType('success');
          setModalMessage('Terima kasih atas donasi Anda! 🙏');
          setShowModal(true);

          // Reload current page to show paid status
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (data.status === 'pending') {
          setModalType('pending');
          setModalMessage('Pembayaran Anda belum kami terima. Silakan lakukan pembayaran terlebih dahulu.');
          setShowModal(true);
        } else if (data.status === 'failed') {
          setModalType('failed');
          setModalMessage('Pembayaran gagal diproses. Silakan coba lagi atau hubungi customer service.');
          setShowModal(true);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('💥 Check payment error:', error);
      setModalType('failed');
      setModalMessage(`Gagal memeriksa status: ${error.message || 'Terjadi kesalahan, silakan coba lagi.'}`);
      setShowModal(true);
    } finally {
      setIsChecking(false);
    }
  };

  // Calculate total amount using fetched payment fee
  const totalAmount = transaction.amount + paymentFee;

  console.log('💰 Payment calculations:', {
    amount: transaction.amount,
    paymentFee: paymentFee,
    totalAmount: totalAmount,
    formatted: {
      amount: formatCurrency(transaction.amount),
      fee: formatCurrency(paymentFee),
      total: formatCurrency(totalAmount),
    }
  });

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center">
      <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {/* Card Container */}
          <div className="bg-white p-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {transactionStatus === 'success' ? 'Invoice Pembayaran' : 'Instruksi Pembayaran'}
              </h1>
              {transactionStatus === 'success' && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">LUNAS</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-6">
              {transactionStatus === 'success'
                ? `Pembayaran untuk order ${transaction.merchantOrderId} telah berhasil.`
                : `Silakan selesaikan pembayaran untuk order ${transaction.merchantOrderId}.`
              }
            </p>

            {/* Transaction Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Datetime</span>
                <span className="font-medium text-gray-900">
                  {formatDateTime(transaction.createdAt || new Date().toISOString())}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Metode</span>
                <span className="font-medium text-gray-900">
                  {paymentMethodName || getPaymentMethodName(transaction.paymentMethod)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium text-gray-900">{formatCurrency(transaction.amount)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment Fee</span>
                <span className="font-medium text-gray-900">{formatCurrency(paymentFee)}</span>
              </div>

              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reference</span>
                <span className="font-mono text-xs text-gray-900 break-all">
                  {transaction.reference || transaction.duitkuReference || transaction.merchantOrderId}
                </span>
              </div>

              {/* Expiry Time */}
              {transaction.expiryTime && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Berlaku Hingga</span>
                  <span className="font-medium text-orange-600">{formatDateTime(transaction.expiryTime)}</span>
                </div>
              )}
            </div>

            {/* QR Code Box */}
            {transaction.qrString && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-gray-900 mb-4">Scan QRIS untuk membayar</p>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <QRCode
                    value={transaction.qrString}
                    size={200}
                    level="H"
                    className="w-full h-auto max-w-[200px]"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-4 max-w-xs">
                  Mendukung pembayaran via ShopeePay, GoPay, OVO, DANA, LinkAja, dan seluruh aplikasi Mobile Banking yang mendukung QRIS.
                </p>
              </div>
            )}

            {/* VA Number Box - Only show if payment is pending */}
            {transaction.vaNumber && transactionStatus !== 'success' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Nomor Virtual Account</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg md:text-xl font-bold text-gray-900 tracking-wider break-all">
                    {transaction.vaNumber}
                  </p>
                  <button
                    onClick={() => copyToClipboard(transaction.vaNumber)}
                    className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Copy"
                  >
                    {copiedVA ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Setelah bayar, klik tombol "Konfirmasi".
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (campaign?.slug) {
                    navigate(`/campaign/${campaign.slug}`);
                  } else {
                    navigate('/');
                  }
                }}
                className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors py-3 px-4 rounded-lg"
              >
                Kembali
              </button>

              {/* Konfirmasi Button - Only show if payment is pending */}
              {transactionStatus !== 'success' && (
                <button
                  onClick={handleCheckPayment}
                  disabled={isChecking}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </>
                  ) : (
                    'Konfirmasi'
                  )}
                </button>
              )}

              {transactionStatus === 'success' && (
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Kwitansi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Modal */}
      {
        showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slideUp">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                {modalType === 'success' && (
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                )}
                {modalType === 'pending' && (
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-12 h-12 text-orange-600 animate-pulse" />
                  </div>
                )}
                {modalType === 'failed' && (
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-5xl">❌</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-center mb-3 text-gray-800">
                {modalType === 'success' && 'Pembayaran Berhasil!'}
                {modalType === 'pending' && 'Belum Ada Pembayaran'}
                {modalType === 'failed' && 'Pembayaran Gagal'}
              </h3>

              {/* Message */}
              <p className="text-center text-gray-600 mb-8 leading-relaxed">
                {modalMessage}
              </p>

              {/* Buttons */}
              <div className="space-y-3">
                {modalType === 'success' ? (
                  <div className="text-center text-sm text-gray-500">
                    Mengalihkan ke halaman sukses...
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                      Mengerti
                    </button>
                    {modalType === 'pending' && (
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Setelah melakukan pembayaran, tunggu beberapa saat lalu klik Konfirmasi lagi
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Add animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>

      {/* Receipt Modal */}
      {
        transaction && campaign && (
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={() => setShowReceiptModal(false)}
            transaction={{
              id: transaction.id || '',
              merchant_order_id: transaction.merchantOrderId || '',
              invoice_code: transaction.invoiceCode || '',
              customer_name: customerName,
              customer_phone: data?.customerPhone || '',
              customer_email: data?.customerEmail || '',
              customer_message: data?.customerMessage || '',
              amount: transaction.amount || 0,
              payment_method: transaction.paymentMethod || '',
              status: transactionStatus,
              created_at: transaction.createdAt || new Date().toISOString(),
              campaign_id: campaign.id || '',
              product_details: transaction.productDetails, // Pass product details for receipt
            }}
            campaign={campaign}
          />
        )
      }
    </div >
  );
}
