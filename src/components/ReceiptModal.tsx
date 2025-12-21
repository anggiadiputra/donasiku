import { X, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useAppName } from '../hooks/useAppName';
import { amountToWords } from '../utils/numberToWords';

interface Transaction {
    id: string;
    merchant_order_id: string;
    invoice_code: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_message: string;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    campaign_id: string;
    product_details?: string;
}

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
    campaign: any;
}

export default function ReceiptModal({ isOpen, onClose, transaction, campaign }: ReceiptModalProps) {
    const { appName } = useAppName();

    if (!isOpen) return null;

    // Use product_details from transaction if available (for Fidyah etc), otherwise campaign title
    const programName = transaction.product_details || campaign.title || 'Donasi';

    // ...

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDateTime = (dateString: string) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const handlePrint = () => {
        window.print();
    };

    const qrCodeValue = `${window.location.origin}/invoice/${transaction.invoice_code}`;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header Actions - Hidden when printing */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
                    <h2 className="text-lg font-bold text-gray-900">E-Kwitansi</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Receipt Content - Printable */}
                <div className="p-8 relative" id="receipt-content">
                    {/* Watermark Background - Global for the receipt */}
                    {transaction.status === 'success' && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none z-50 flex items-center justify-center">
                            <div className="absolute inset-0 flex flex-wrap items-center justify-center transform -rotate-45 scale-150 opacity-0 print-watermark">
                                {[...Array(30)].map((_, i) => (
                                    <div key={i} className="text-3xl font-black text-green-600 px-6 py-6 whitespace-nowrap">
                                        LUNAS
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-300">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">
                                        {appName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-gray-900">
                                        {campaign.organization_name || appName}
                                    </h1>
                                    <p className="text-xs text-gray-600">{window.location.hostname}</p>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="inline-block bg-pink-100 px-3 py-1.5 rounded-lg mb-2">
                                <p className="text-pink-600 font-bold text-xs">E-Kwitansi</p>
                            </div>
                            <p className="text-xs font-bold text-gray-900">#{transaction.invoice_code}</p>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="text-right mb-6">
                        <p className="text-xs text-gray-600">Date: {formatDateTime(transaction.created_at)}</p>
                    </div>

                    {/* Donor Information */}
                    <div className="mb-6">
                        <p className="text-xs text-gray-600 mb-1">Telah terima dari</p>
                        <p className="font-bold text-gray-900 text-sm">
                            {transaction.customer_name} ({transaction.customer_phone})
                        </p>
                    </div>

                    {/* Amount in Words */}
                    <div className="mb-6">
                        <p className="text-xs text-gray-600 mb-1">Uang sejumlah</p>
                        <p className="italic text-gray-900 font-semibold text-sm">{amountToWords(transaction.amount)}</p>
                    </div>

                    {/* Program */}
                    <div className="mb-8">
                        <p className="text-xs text-gray-600 mb-1">Untuk Program</p>
                        <p className="font-bold text-gray-900 text-base">{programName}</p>
                    </div>

                    {/* Amount and Status */}
                    {/* Amount and Status */}
                    <div className="mb-8">
                        {/* Amount Display */}
                        <div className="border-2 border-gray-900 rounded-lg p-4 bg-white/80 backdrop-blur-sm print:bg-transparent">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs text-gray-600 mb-1">Total Pembayaran</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-lg font-bold text-sm ${transaction.status === 'success'
                                    ? 'bg-green-100 text-green-800 border-2 border-green-600'
                                    : 'bg-orange-100 text-orange-800 border-2 border-orange-600'
                                    }`}>
                                    {transaction.status === 'success' ? 'LUNAS' : 'BELUM LUNAS'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-8">
                        <div className="text-center">
                            <div className="bg-white p-2 border-2 border-gray-900 rounded-lg inline-block">
                                <QRCode
                                    value={qrCodeValue}
                                    size={70}
                                    level="M"
                                />
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                                Scan to validate
                            </p>
                            <p className="text-xs text-gray-500">
                                #{transaction.invoice_code}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 pt-4">
                        <p className="text-xs text-gray-600 text-center">
                            {campaign.organization_name || appName} | Terima kasih atas donasi Anda
                        </p>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
        @media print {
          /* Force print colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure backgrounds print */
          .bg-gray-900,
          .bg-green-600,
          .bg-green-100,
          .bg-orange-600,
          .bg-orange-100,
          .bg-orange-500,
          .bg-pink-100,
          .text-green-600,
          .text-green-800,
          .text-orange-800,
          .border-gray-900,
          .border-green-600,
          .border-orange-600,
          .border-gray-800,
          .border-blue-600 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Watermark opacity */
          .opacity-0 {
            opacity: 0;
          }
          .opacity-6 {
            opacity: 0.06;
          }
          
          /* Ensure watermark prints with subtle opacity */
          @media print {
            .print-watermark {
              opacity: 0.1 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:opacity-10 {
              opacity: 0.1 !important;
            }
          }
        }
      `}</style>
        </div>
    );
}
