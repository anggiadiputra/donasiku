import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../context/OrganizationContext';
import {
  Heart,
  Loader2,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import ImageUpload from '../components/ImageUpload';
import { supabase, InfaqSettings, Campaign } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { SettingsPageSkeleton } from '../components/SkeletonLoader';

export default function InfaqSettingsPage() {
  const navigate = useNavigate();
  const { selectedOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [settings, setSettings] = useState<InfaqSettings>({
    id: '',
    program_title: 'SEDEKAH MU',
    program_subtitle: '',
    program_description: '',
    program_image: '',
    preset_amounts: [25000, 50000, 100000, 250000],
    default_amount: 125000,
    note_text: '',
    quran_verse: '',
    quran_reference: '',
    target_campaign_id: '',
    created_at: '',
    updated_at: ''
  });

  useEffect(() => {
    if (selectedOrganization) {
      toast.error('Akses Terbatas: Pengaturan infaq hanya dapat diakses melalui Akun Personal');
      navigate('/dashboard');
      return;
    }
    fetchSettings();
  }, [selectedOrganization, navigate]);

  usePageTitle('Pengaturan Infaq');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('infaq_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching infaq settings:', error);
      }

      if (data) {
        setSettings({
          ...data,
          preset_amounts: Array.isArray(data.preset_amounts)
            ? data.preset_amounts
            : JSON.parse(data.preset_amounts || '[25000, 50000, 100000, 250000]'),
          default_amount: parseFloat(data.default_amount) || 125000,
          target_campaign_id: data.target_campaign_id || '',
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
        preset_amounts: settings.preset_amounts,
        target_campaign_id: settings.target_campaign_id === '' ? null : settings.target_campaign_id,
      };

      // Check if settings exist
      const { data: existing, error: fetchError } = await supabase
        .from('infaq_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing && existing.id) {
        // Update existing
        const { error } = await supabase
          .from('infaq_settings')
          .update(settingsToSave)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new - remove id to let database generate it
        const { id, ...settingsWithoutId } = settingsToSave;
        const { error } = await supabase
          .from('infaq_settings')
          .insert([settingsWithoutId]);

        if (error) throw error;
      }

      // Refresh settings after save
      setSettings(settingsToSave);
      toast.success('Pengaturan infaq berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving infaq settings:', error);
      toast.error('Gagal menyimpan pengaturan: ' + (error.message || 'Unknown error'));
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

  const addPresetAmount = () => {
    setSettings(prev => ({
      ...prev,
      preset_amounts: [...prev.preset_amounts, 0]
    }));
  };

  const updatePresetAmount = (index: number, value: number) => {
    const newAmounts = [...settings.preset_amounts];
    newAmounts[index] = value;
    setSettings(prev => ({ ...prev, preset_amounts: newAmounts }));
  };

  const removePresetAmount = (index: number) => {
    if (settings.preset_amounts.length > 1) {
      const newAmounts = settings.preset_amounts.filter((_, i) => i !== index);
      setSettings(prev => ({ ...prev, preset_amounts: newAmounts }));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <SettingsPageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Pengaturan Infaq</h2>
          <p className="text-gray-600">Kelola program dan pengaturan infaq</p>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Program Information */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-600" />
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
                    placeholder="SEDEKAH MU"
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
                    placeholder="Wujud Keimanan Pada Allah Semata dan Kepedulian Untuk Sesama"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi Program
                  </label>
                  <textarea
                    value={settings.program_description || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, program_description: e.target.value }))}
                    placeholder="Deskripsi lengkap program infaq..."
                    rows={6}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
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

          {/* Right Column: Settings & Content */}
          <div className="space-y-6">
            {/* Donation Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Pengaturan Donasi</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nominal Default (Rp)
                  </label>
                  <input
                    type="number"
                    value={settings.default_amount}
                    onChange={(e) => setSettings(prev => ({ ...prev, default_amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="125000"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nominal default: {formatCurrency(settings.default_amount)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Preset Amounts (Nominal Cepat)
                  </label>
                  <div className="space-y-2">
                    {settings.preset_amounts.map((amount, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => updatePresetAmount(index, parseFloat(e.target.value) || 0)}
                          placeholder="25000"
                          className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                        />
                        <span className="text-sm text-gray-600 w-32">
                          {formatCurrency(amount)}
                        </span>
                        {settings.preset_amounts.length > 1 && (
                          <button
                            onClick={() => removePresetAmount(index)}
                            className="text-red-500 hover:text-red-700 p-2"
                            title="Hapus preset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addPresetAmount}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Preset Amount
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold text-blue-800 mb-2 text-sm">Target Campaign Content</h4>
                  <p className="text-xs text-blue-600 mb-3">
                    Pilih campaign yang akan digunakan untuk menampilkan "Kabar Terbaru" dan "Pencairan Dana" di halaman Infaq.
                  </p>

                  <select
                    value={settings.target_campaign_id || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, target_campaign_id: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 bg-white text-sm"
                  >
                    <option value="">-- Tanpa Campaign (Sembunyikan News/Withdrawals) --</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quran Verse & Notes Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Ayat Al-Quran & Catatan</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ayat Al-Quran
                  </label>
                  <textarea
                    value={settings.quran_verse || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, quran_verse: e.target.value }))}
                    placeholder="Tuliskan ayat Al-Quran..."
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 font-arabic"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referensi Surah/Ayat
                  </label>
                  <input
                    type="text"
                    value={settings.quran_reference || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, quran_reference: e.target.value }))}
                    placeholder="QS. Al-Baqarah: 261"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan Tambahan
                  </label>
                  <textarea
                    value={settings.note_text || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, note_text: e.target.value }))}
                    placeholder="Catatan tambahan untuk ditampilkan..."
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button with Spacing */}
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

