import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function WhatsAppFloatingButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingSettings, setFetchingSettings] = useState(true);

    useEffect(() => {
        // Fetch Admin WhatsApp Number
        const fetchSettings = async () => {
            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('whatsapp_phone')
                    .limit(1)
                    .single();

                if (data?.whatsapp_phone) {
                    setAdminPhone(data.whatsapp_phone);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setFetchingSettings(false);
            }
        };

        fetchSettings();
    }, []);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!adminPhone) {
            toast.error('Nomor WhatsApp Admin belum dikonfigurasi.');
            return;
        }

        if (!name || !message) {
            toast.error('Nama dan Pesan wajib diisi.');
            return;
        }

        setLoading(true);

        try {
            // Validate Phone Number if provided
            if (phone) {
                const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-whatsapp', {
                    body: { phone }
                });

                if (validationError) throw validationError;

                if (!validationData.valid) {
                    toast.error(validationData.message || 'Nomor WhatsApp tidak valid.');
                    setLoading(false);
                    return;
                }
            }

            // 1. Save to Database
            const { error } = await supabase
                .from('whatsapp_messages')
                .insert({
                    name,
                    phone: phone || null, // Ensure empty string is saved as null
                    message,
                    status: 'unread'
                });

            if (error) throw error;

            // 2. Open WhatsApp
            let formattedPhone = adminPhone.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
            if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

            const text = `Halo, saya ${name}.${phone ? ` (${phone})` : ''}\n\n${message}`;
            const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;

            window.open(url, '_blank');

            // 3. Reset & Close
            toast.success('Pesan terkirim! Membuka WhatsApp...');
            setName('');
            setPhone('');
            setMessage('');
            setIsOpen(false);

        } catch (error: any) {
            console.error('Error sending message:', error);
            toast.error('Gagal mengirim pesan: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetchingSettings || !adminPhone) return null; // Don't show if not configured

    return (
        <div className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-8">
            {/* Form Popup */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 mb-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="bg-[#25D366] p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5" />
                            <span className="font-semibold">Hubungi Kami</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-4">
                        <form onSubmit={sendMessage} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nama</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Nama Anda"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Pesan</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    rows={3}
                                    placeholder="Tulis pesan Anda..."
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-2 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Kirim Pesan
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'bg-gray-600 rotate-90' : 'bg-[#25D366] hover:bg-[#20bd5a]'} text-white p-3.5 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center hover:scale-105`}
                aria-label="Chat WhatsApp"
            >
                {isOpen ? <X className="w-8 h-8" /> : (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
