import { useState, useEffect } from 'react';
import { Save, Loader2, Info, Coins } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../components/DashboardLayout';
import { supabase, ZakatSettings } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { SettingsPageSkeleton } from '../components/SkeletonLoader';

export default function ZakatSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<ZakatSettings>({
    id: '',
    gold_price_per_gram: 1347143.00,
    nishab_gold_grams: 85.00,
    zakat_percentage: 0.025,
    calculation_note: '',
    gold_price_source: '',
    created_at: '',
    updated_at: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  usePageTitle('Pengaturan Zakat');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('zakat_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching zakat settings:', error);
      }

      if (data) {
        setSettings({
          ...data,
          gold_price_per_gram: parseFloat(data.gold_price_per_gram) || 1347143.00,
          nishab_gold_grams: parseFloat(data.nishab_gold_grams) || 85.00,
          zakat_percentage: parseFloat(data.zakat_percentage) || 0.025,
        });
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
        gold_price_per_gram: parseFloat(settings.gold_price_per_gram.toString()),
        nishab_gold_grams: parseFloat(settings.nishab_gold_grams.toString()),
        zakat_percentage: parseFloat(settings.zakat_percentage.toString()),
      };

      // Check if settings exist
      const { data: existing, error: fetchError } = await supabase
        .from('zakat_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing && existing.id) {
        // Update existing
        const { error } = await supabase
          .from('zakat_settings')
          .update(settingsToSave)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new - remove id to let database generate it
        const { id, ...settingsWithoutId } = settingsToSave;
        const { error } = await supabase
          .from('zakat_settings')
          .insert([settingsWithoutId]);

        if (error) throw error;
      }

      // Refresh settings after save
      setSettings(settingsToSave);
      toast.success('Pengaturan zakat berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving zakat settings:', error);
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

  if (loading) {
    return (
      <DashboardLayout>
        <SettingsPageSkeleton />
      </DashboardLayout>
    );
  }

  const monthlyNishab = settings.gold_price_per_gram * settings.nishab_gold_grams;
  const yearlyNishab = monthlyNishab * 12;

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Pengaturan Zakat</h2>
          <p className="text-gray-600">Kelola ketentuan dan perhitungan zakat</p>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Gold Price Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Coins className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Harga Emas & Nishab</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Harga Emas per Gram (Rp)
                  </label>
                  <input
                    type="number"
                    value={settings.gold_price_per_gram}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      gold_price_per_gram: parseFloat(e.target.value) || 0
                    }))}
                    placeholder="1347143"
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Harga emas saat ini: {formatCurrency(settings.gold_price_per_gram)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nishab (Gram Emas)
                  </label>
                  <input
                    type="number"
                    value={settings.nishab_gold_grams}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      nishab_gold_grams: parseFloat(e.target.value) || 0
                    }))}
                    placeholder="85"
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standar nishab: 85 gram emas
                  </p>
                </div>

                {/* Nishab Calculation Display */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">Perhitungan Nishab:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Nishab perbulan: <strong className="text-gray-800">{formatCurrency(monthlyNishab)}</strong></p>
                    <p>Nishab pertahun: <strong className="text-gray-800">{formatCurrency(yearlyNishab)}</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Zakat Percentage */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Persentase Zakat</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Persentase Zakat (dalam desimal)
                  </label>
                  <input
                    type="number"
                    value={settings.zakat_percentage}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      zakat_percentage: parseFloat(e.target.value) || 0
                    }))}
                    placeholder="0.025"
                    step="0.0001"
                    min="0"
                    max="1"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standar zakat: 2.5% (0.025) = {(settings.zakat_percentage * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Information Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Informasi & Catatan</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan Perhitungan
                  </label>
                  <textarea
                    value={settings.calculation_note || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, calculation_note: e.target.value }))}
                    placeholder="Perhitungan zakat mengacu pada pendapat Dewan Syariah..."
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Catatan ini akan ditampilkan di halaman kalkulator zakat
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sumber Harga Emas
                  </label>
                  <input
                    type="text"
                    value={settings.gold_price_source || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, gold_price_source: e.target.value }))}
                    placeholder="Raja Emas Indonesia dan Laku Emas"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Sumber referensi harga emas yang digunakan
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>   {/* Save Button */}
        <div className="flex justify-end mt-6">
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

