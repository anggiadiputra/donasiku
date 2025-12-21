import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import PaymentMethodModal from './PaymentMethodModal';
import { supabase } from '../lib/supabase';

interface PaymentMethod {
    paymentMethod: string;
    paymentName: string;
    paymentImage: string;
    totalFee: string;
}

interface PaymentMethodSelectorProps {
    amount: number;
    onSelect: (method: string, methodName: string) => void;
    selectedMethod?: string;
    selectedMethodName?: string;
}

export default function PaymentMethodSelector({
    amount,
    onSelect,
    selectedMethod,
    selectedMethodName,
}: PaymentMethodSelectorProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethodData, setSelectedMethodData] = useState<PaymentMethod | null>(null);

    // Preload payment methods on mount
    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    // Update selected method data when selection changes
    useEffect(() => {
        if (selectedMethod && methods.length > 0) {
            const found = methods.find(m => m.paymentMethod === selectedMethod);
            setSelectedMethodData(found || null);
        } else {
            setSelectedMethodData(null);
        }
    }, [selectedMethod, methods]);

    async function fetchPaymentMethods() {
        try {
            const { data, error } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            const formattedMethods = (data || []).map((method: any) => ({
                paymentMethod: method.payment_method_code,
                paymentName: method.payment_method_name,
                paymentImage: method.payment_image,
                totalFee: method.total_fee,
            }));

            setMethods(formattedMethods);
        } catch (err) {
            console.error('Failed to fetch payment methods:', err);
        }
    }

    return (
        <>
            {/* Payment Method Button */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Metode Pembayaran
                </label>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center justify-between bg-white"
                >
                    <div className="flex items-center gap-3">
                        {/* Show icon when selected */}
                        {selectedMethodData?.paymentImage && (
                            <img
                                src={selectedMethodData.paymentImage}
                                alt={selectedMethodData.paymentName}
                                className="w-8 h-8 object-contain flex-shrink-0"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}

                        <div className="text-left">
                            {selectedMethodData ? (
                                <>
                                    <p className="text-sm font-semibold text-gray-800">
                                        {selectedMethodData.paymentName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Klik untuk mengubah
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold text-gray-800">
                                        Pilih Metode Pembayaran
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Klik untuk memilih
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </button>

                {/* Info Tip */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                    <p className="text-xs text-blue-700 text-center">
                        💡 Pilih metode pembayaran yang paling nyaman untuk Anda
                    </p>
                </div>
            </div>

            {/* Payment Method Modal */}
            <PaymentMethodModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={onSelect}
                selectedMethod={selectedMethod}
                methods={methods}
            />
        </>
    );
}
