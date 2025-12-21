import { useState, useEffect } from 'react';
import {
    HandHeart,
    Loader2,
    Save,
    Info
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import ImageUpload from '../components/ImageUpload';
import RichTextEditor from '../components/RichTextEditor';
import { supabase, FidyahSettings, Campaign } from '../lib/supabase';

export default function FidyahSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);

    const [settings, setSettings] = useState<FidyahSettings>({
        id: '',
        program_title: 'Fidyah',
        program_subtitle: '',
        program_description: '',
        program_image: '',
        price_per_day: 45000,
        target_campaign_id: '',
        created_at: '',
        updated_at: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('fidyah_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (settingsError && settingsError.code !== 'PGRST116') {
                console.error('Error fetching fidyah settings:', settingsError);
            }

            if (settingsData) {
                setSettings({
                    ...settingsData,
                    price_per_day: parseFloat(settingsData.price_per_day) || 45000,
                });
            }

            // Fetch Campaigns for dropdown
            const { data: campaignsData } = await supabase
                .from('campaigns')
                .select('id, title')
                .order('created_at', { ascending: false });

            if (campaignsData) {
                setCampaigns(campaignsData as Campaign[]);
            }

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const settingsToSave = {
                ...settings,
                price_per_day: parseFloat(settings.price_per_day.toString()),
                target_campaign_id: settings.target_campaign_id === '' ? null : settings.target_campaign_id,
            };

            // Check if settings exist
            const { data: existing, error: fetchError } = await supabase
                .from('fidyah_settings')
                .select('id')
                .limit(1)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existing && existing.id) {
                // Update existing
                const { error } = await supabase
                    .from('fidyah_settings')
                    .update(settingsToSave)
                    .eq('id', existing.id);

                if (error) throw error;
            } else {
                // Insert new
                const { id, created_at, updated_at, ...settingsWithoutIdAndDates } = settingsToSave;
                const { error } = await supabase
                    .from('fidyah_settings')
                    .insert([settingsWithoutIdAndDates]);

                if (error) throw error;
            }

            await fetchData();
            alert('Pengaturan Fidyah berhasil disimpan!');
        } catch (error: any) {
            console.error('Error saving fidyah settings:', error);
            alert('Gagal menyimpan pengaturan: ' + (error.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div>
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Pengaturan Fidyah</h2>
                    <p className="text-gray-600">Kelola program dan tarif fidyah</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left Column: Program Information */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <HandHeart className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Informasi Program</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Judul Program
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.program_title}
                                        onChange={(e) => setSettings(prev => ({ ...prev, program_title: e.target.value }))}
                                        placeholder="Fidyah"
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Subtitle
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.program_subtitle || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, program_subtitle: e.target.value }))}
                                        placeholder="Tunaikan Kewajiban Fidyah Anda"
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                                    />
                                </div>



                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Deskripsi Program
                                    </label>
                                    <div className="bg-white">
                                        <RichTextEditor
                                            value={settings.program_description || ''}
                                            onChange={(value) => setSettings(prev => ({ ...prev, program_description: value }))}
                                            placeholder="Deskripsi lengkap tentang fidyah (bisa sertakan gambar)..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gambar Program (URL)
                                    </label>
                                    <ImageUpload
                                        value={settings.program_image || ''}
                                        onChange={(url) => setSettings(prev => ({ ...prev, program_image: url }))}
                                        folder="programs"
                                        label=""
                                        height="h-64"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Calculations & Campaign */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Info className="w-5 h-5 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Pengaturan Tarif</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tarif Fidyah per Hari (Rp)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.price_per_day}
                                        onChange={(e) => setSettings(prev => ({ ...prev, price_per_day: parseFloat(e.target.value) || 0 }))}
                                        placeholder="45000"
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tarif saat ini: {formatCurrency(settings.price_per_day)}
                                    </p>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h4 className="font-semibold text-blue-800 mb-2 text-sm">Target Campaign</h4>
                                    <p className="text-sm text-blue-600 mb-3">
                                        Pilih campaign yang akan digunakan untuk menampung donasi Fidyah. Informasi donatur dan update kabar akan diambil dari campaign ini.
                                    </p>

                                    <select
                                        value={settings.target_campaign_id || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, target_campaign_id: e.target.value }))}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white"
                                    >
                                        <option value="">-- Pilih Campaign --</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Simpan Pengaturan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
