import { useState, useEffect } from 'react';
import { Type, Save, RotateCcw } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

interface FontSettings {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
}

const FONT_FAMILIES = [
    { value: 'Inter', label: 'Inter (Default)' },
    { value: 'system-ui', label: 'System UI' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
];

const FONT_SIZES = [12, 13, 14, 15, 16, 17, 18, 20];
const FONT_WEIGHTS = [300, 400, 500, 600, 700];

const DEFAULT_SETTINGS: FontSettings = {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 400,
};

export default function FontSettingsPage() {
    const [settings, setSettings] = useState<FontSettings>(DEFAULT_SETTINGS);
    const [saved, setSaved] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('fontSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(parsed);
                applyFontSettings(parsed);
            } catch (error) {
                console.error('Error loading font settings:', error);
            }
        }
    }, []);

    // Apply font settings to document
    const applyFontSettings = (fontSettings: FontSettings) => {
        document.documentElement.style.setProperty('--font-family', fontSettings.fontFamily);
        document.documentElement.style.setProperty('--font-size-base', `${fontSettings.fontSize}px`);
        document.documentElement.style.setProperty('--font-weight-normal', fontSettings.fontWeight.toString());
    };

    // Save settings
    const handleSave = () => {
        localStorage.setItem('fontSettings', JSON.stringify(settings));
        applyFontSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // Reset to defaults
    const handleReset = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem('fontSettings');
        applyFontSettings(DEFAULT_SETTINGS);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Type className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Pengaturan Font</h1>
                            <p className="text-gray-600">Sesuaikan tampilan font di aplikasi</p>
                        </div>
                    </div>
                </div>

                {/* Save Status */}
                {saved && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Save className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-green-800">Pengaturan Disimpan!</p>
                            <p className="text-sm text-green-600">Font settings berhasil diperbarui</p>
                        </div>
                    </div>
                )}

                {/* Settings Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="space-y-6">
                        {/* Font Family */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-3">
                                Font Family
                            </label>
                            <select
                                value={settings.fontFamily}
                                onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                style={{ fontFamily: settings.fontFamily }}
                            >
                                {FONT_FAMILIES.map((font) => (
                                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-sm text-gray-500">
                                Pilih jenis font yang akan digunakan di seluruh aplikasi
                            </p>
                        </div>

                        {/* Font Size */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-3">
                                Font Size: {settings.fontSize}px
                            </label>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                                {FONT_SIZES.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setSettings({ ...settings, fontSize: size })}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${settings.fontSize === size
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                Ukuran font dasar (default: 16px)
                            </p>
                        </div>

                        {/* Font Weight */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-3">
                                Font Weight: {settings.fontWeight}
                            </label>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                {FONT_WEIGHTS.map((weight) => (
                                    <button
                                        key={weight}
                                        onClick={() => setSettings({ ...settings, fontWeight: weight })}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${settings.fontWeight === weight
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        style={{ fontWeight: weight }}
                                    >
                                        {weight}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                                Ketebalan font (300=Light, 400=Normal, 700=Bold)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preview Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Preview</h3>
                    <div
                        className="p-6 bg-gray-50 rounded-lg border border-gray-200"
                        style={{
                            fontFamily: settings.fontFamily,
                            fontSize: `${settings.fontSize}px`,
                            fontWeight: settings.fontWeight,
                        }}
                    >
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Heading Text</h1>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Subheading Text</h2>
                        <p className="text-gray-600 mb-4">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                            exercitation ullamco laboris.
                        </p>
                        <p className="text-sm text-gray-500">
                            Small text for descriptions and captions.
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        Simpan Pengaturan
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex-1 bg-white text-gray-700 px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Reset ke Default
                    </button>
                </div>

                {/* Info Card */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>💡 Tips:</strong> Pengaturan font ini akan disimpan di browser Anda dan berlaku untuk seluruh aplikasi.
                        Gunakan "Reset ke Default" untuk mengembalikan ke pengaturan awal.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
