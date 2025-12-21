import { Check, X, CreditCard } from 'lucide-react';

interface PaymentMethod {
    paymentMethod: string;
    paymentName: string;
    paymentImage: string;
    totalFee: string;
}

interface PaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (method: string, methodName: string) => void;
    selectedMethod?: string;
    methods: PaymentMethod[];
}

export default function PaymentMethodModal({
    isOpen,
    onClose,
    onSelect,
    selectedMethod,
    methods,
}: PaymentMethodModalProps) {
    const handleSelect = (method: string, methodName: string) => {
        onSelect(method, methodName);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            {/* Modal Container - Narrower */}
            <div className="bg-white w-full sm:max-w-sm rounded-2xl max-h-[75vh] flex flex-col animate-slide-up shadow-xl">
                {/* Header - Compact */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm">Pilih Metode Pembayaran</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-3">
                    {methods.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-700 text-center text-sm">
                                Tidak ada metode pembayaran tersedia
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {methods.map((method) => {
                                const isSelected = selectedMethod === method.paymentMethod;

                                return (
                                    <button
                                        key={method.paymentMethod}
                                        type="button"
                                        onClick={() => handleSelect(method.paymentMethod, method.paymentName)}
                                        className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                    >
                                        {/* Payment Image */}
                                        {method.paymentImage && (
                                            <img
                                                src={method.paymentImage}
                                                alt={method.paymentName}
                                                className="w-10 h-10 object-contain flex-shrink-0"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        )}

                                        {/* Payment Info */}
                                        <div className="flex-1 text-left min-w-0">
                                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'
                                                }`}>
                                                {method.paymentName}
                                            </p>
                                        </div>

                                        {/* Check Icon */}
                                        {isSelected && (
                                            <div className="flex-shrink-0">
                                                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer - Compact */}
                <div className="p-3 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
