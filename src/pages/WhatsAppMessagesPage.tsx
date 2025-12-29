import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { MessageCircle, Search, Trash2, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppMessage {
    id: string;
    name: string;
    phone: string;
    message: string;
    status: 'unread' | 'read' | 'replied';
    created_at: string;
}

export default function WhatsAppMessagesPage() {
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMessages(data || []);
        } catch (error: any) {
            console.error('Error fetching messages:', error);
            toast.error('Gagal mengambil pesan');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('whatsapp_messages')
                .update({ status: 'read' })
                .eq('id', id);

            if (error) throw error;

            setMessages(messages.map(msg => msg.id === id ? { ...msg, status: 'read' } : msg));
            toast.success('Pesan ditandai sudah dibaca');
        } catch (error) {
            toast.error('Gagal mengupdate status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus pesan ini?')) return;

        try {
            const { error } = await supabase
                .from('whatsapp_messages')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setMessages(messages.filter(msg => msg.id !== id));
            toast.success('Pesan dihapus');
        } catch (error) {
            toast.error('Gagal menghapus pesan');
        }
    };

    const handleReply = async (phone: string, id: string) => {
        if (!phone) {
            toast.error('Tidak ada nomor telepon');
            return;
        }

        // Update status to replied
        try {
            await supabase
                .from('whatsapp_messages')
                .update({ status: 'replied' })
                .eq('id', id);

            setMessages(messages.map(msg => msg.id === id ? { ...msg, status: 'replied' } : msg));
        } catch (error) {
            console.error("Failed to update status", error);
        }

        let formatted = phone.replace(/\D/g, '');
        if (formatted.startsWith('0')) formatted = '62' + formatted.slice(1);
        if (formatted.startsWith('8')) formatted = '62' + formatted;

        window.open(`https://wa.me/${formatted}`, '_blank');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'replied':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Replied</span>;
            case 'read':
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Read</span>;
            default: // unread
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> New</span>;
        }
    };

    const filteredMessages = messages.filter(msg =>
        msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Pesan WhatsApp</h1>
                <p className="text-gray-600">Daftar pesan masuk dari website</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari pesan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama & Kontak</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pesan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                // Skeleton Loading
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index} className="animate-pulse">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredMessages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Belum ada pesan masuk
                                    </td>
                                </tr>
                            ) : (
                                filteredMessages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(msg.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{msg.name}</div>
                                            <div className="text-sm text-gray-500">{msg.phone || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600 line-clamp-2 max-w-xs" title={msg.message}>
                                                {msg.message}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(msg.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {msg.phone && (
                                                    <button
                                                        onClick={() => handleReply(msg.phone, msg.id)}
                                                        className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-md hover:bg-green-100 transition-colors"
                                                        title="Reply via WhatsApp"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {msg.status === 'unread' && (
                                                    <button
                                                        onClick={() => handleMarkAsRead(msg.id)}
                                                        className="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-md hover:bg-blue-100 transition-colors"
                                                        title="Mark as Read"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md hover:bg-red-100 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
