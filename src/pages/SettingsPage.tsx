import { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  CreditCard,
  MessageSquare,
  Mail,
  Cloud,
  CheckCircle2,
  XCircle,
  Loader2,
  Save as SaveIcon,
  Upload,
  Image as ImageIcon,
  X,
  GripVertical,
  Building2,
  Wallet,
  QrCode,
  Store,
  Clock,
  Globe,
  Smartphone,
  Type
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DashboardLayout from '../components/DashboardLayout';
import { supabase, AppSettings } from '../lib/supabase';
import { uploadToS3ViaAPI } from '../utils/s3Storage';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { SettingsPageSkeleton } from '../components/SkeletonLoader';
// Card Save Button Component
interface CardSaveButtonProps {
  isSaving: boolean;
  onClick: () => void;
  primaryColor: string;
  label?: string;
}

const CardSaveButton = ({ isSaving, onClick, primaryColor, label = 'Simpan' }: CardSaveButtonProps) => (
  <div className="flex justify-end mt-6">
    <button
      onClick={onClick}
      disabled={isSaving}
      className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      style={{ backgroundColor: primaryColor }}
    >
      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />}
      {isSaving ? 'Menyimpan...' : label}
    </button>
  </div>
);

// Sortable Payment Method Item Component
interface SortablePaymentMethodProps {
  method: any;
  onToggle: (id: string, currentStatus: boolean) => void;
}

function SortablePaymentMethod({ method, onToggle }: SortablePaymentMethodProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: method.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get category icon (Lucide)
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'virtual_account':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'e_wallet':
        return <Wallet className="w-4 h-4 text-purple-600" />;
      case 'qris':
        return <QrCode className="w-4 h-4 text-green-600" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4 text-orange-600" />;
      case 'retail':
        return <Store className="w-4 h-4 text-red-600" />;
      case 'paylater':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'e_banking':
        return <Globe className="w-4 h-4 text-indigo-600" />;
      default:
        return <Smartphone className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      virtual_account: 'VA',
      e_wallet: 'E-Wallet',
      qris: 'QRIS',
      credit_card: 'Card',
      retail: 'Retail',
      paylater: 'Paylater',
      e_banking: 'E-Banking',
      other: 'Other'
    };
    return labels[category] || category;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2.5 rounded-lg transition-all ${method.is_active
        ? 'bg-white border border-green-200'
        : 'bg-white border border-gray-200'
        }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Category Icon */}
      <div className="flex-shrink-0">
        {getCategoryIcon(method.category)}
      </div>

      {/* Payment Method Info */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {method.payment_image && (
          <img
            src={method.payment_image}
            alt={method.payment_method_name}
            className="w-6 h-6 object-contain flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {method.payment_method_name}
            </p>
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {getCategoryLabel(method.category)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">
              {method.payment_method_code}
            </span>
            <span className="text-xs text-gray-500">
              {method.total_fee}
            </span>
          </div>
        </div>
      </div>

      {/* Toggle Switch */}
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={method.is_active}
          onChange={() => onToggle(method.id, method.is_active)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
      </label>
    </div>
  );
}

export default function SettingsPage() {
  const primaryColor = usePrimaryColor();
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [testingS3, setTestingS3] = useState(false);
  const [s3TestResult, setS3TestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [syncingPaymentMethods, setSyncingPaymentMethods] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<AppSettings>({
    id: '',
    app_name: 'Donasiku',
    logo_url: '',
    tagline: '',
    primary_color: '#f97316',
    payment_methods: ['bank_transfer', 'qris'],
    whatsapp_enabled: false,
    whatsapp_api_key: '',
    whatsapp_api_url: '',
    whatsapp_phone: '',
    email_enabled: false,
    email_template: '',
    email_smtp_host: '',
    email_smtp_port: 587,
    email_smtp_user: '',
    email_smtp_password: '',
    email_from: '',
    s3_endpoint: '',
    s3_region: 'auto',
    s3_bucket: '',
    s3_access_key_id: '',
    s3_secret_access_key: '',
    s3_public_url: '',
    s3_api_endpoint: '',
    created_at: '',
    updated_at: '',
    google_analytics_id: '',
    facebook_pixel_id: '',
    tiktok_pixel_id: ''
  });

  // Font Settings State
  const [fontSettings, setFontSettings] = useState({
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: 400,
  });

  const FONT_FAMILIES = [
    { value: 'Inter', label: 'Inter (Default)' },
    { value: 'system-ui', label: 'System UI' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Ubuntu', label: 'Ubuntu' },
    { value: '"Source Sans 3"', label: 'Source Sans Pro' },
    { value: '"Product Sans", sans-serif', label: 'Google Sans' },
  ];

  const FONT_SIZES = [12, 13, 14, 15, 16, 17, 18, 20];
  const FONT_WEIGHTS = [300, 400, 500, 600, 700];

  useEffect(() => {
    fetchSettings();
    fetchPaymentMethods();
    // Load font settings from localStorage
    const savedFontSettings = localStorage.getItem('fontSettings');
    if (savedFontSettings) {
      try {
        const parsed = JSON.parse(savedFontSettings);
        setFontSettings(parsed);
        applyFontSettings(parsed);
      } catch (error) {
        console.error('Error loading font settings:', error);
      }
    }
  }, []);

  usePageTitle('Pengaturan');

  const applyFontSettings = (fontSettings: any) => {
    document.documentElement.style.setProperty('--font-family', fontSettings.fontFamily);
    document.documentElement.style.setProperty('--font-size-base', `${fontSettings.fontSize}px`);
    document.documentElement.style.setProperty('--font-weight-normal', fontSettings.fontWeight.toString());
  };

  const saveFontSettings = async () => {
    setSavingSection('fonts');
    await new Promise(resolve => setTimeout(resolve, 800)); // UX delay
    localStorage.setItem('fontSettings', JSON.stringify(fontSettings));
    applyFontSettings(fontSettings);
    // alert('Pengaturan font disimpan!'); // Removed alert for cleaner UX, or keep it? LayoutSettings uses alert.
    // LayoutSettings used proper saving. I'll keep alert but after loading.
    toast.success('Pengaturan font berhasil disimpan!');
    setSavingSection(null);
  };

  // Apply primary color globally
  const applyPrimaryColor = (color: string) => {
    document.documentElement.style.setProperty('--primary-color', color);
    // Calculate hover color (slightly darker)
    const hoverColor = adjustColorBrightness(color, -20);
    document.documentElement.style.setProperty('--primary-color-hover', hoverColor);
  };

  // Helper function to adjust color brightness
  const adjustColorBrightness = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
      }

      if (data) {
        setSettings({
          ...data,
          payment_methods: Array.isArray(data.payment_methods)
            ? data.payment_methods
            : JSON.parse(data.payment_methods || '[]')
        });
        // Apply primary color from database
        if (data.primary_color) {
          applyPrimaryColor(data.primary_color);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        // .order('category', { ascending: true }) // Removed to respect manual sort_order
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching payment methods:', error);
        return;
      }

      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const syncPaymentMethods = async () => {
    try {
      setSyncingPaymentMethods(true);

      const { data, error } = await supabase.functions.invoke('sync-payment-methods');

      if (error) {
        console.error('Error syncing payment methods:', error);
        toast.error('Gagal sync payment methods: ' + error.message);
        return;
      }

      if (data.success) {
        toast.success(`Berhasil sync ${data.synced.length} payment methods!`);
        await fetchPaymentMethods(); // Refresh list
      } else {
        toast.error('Gagal sync payment methods');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setSyncingPaymentMethods(false);
    }
  };

  const togglePaymentMethod = (methodId: string, currentStatus: boolean) => {
    // Update local state ONLY (Manual Save Refactor)
    setPaymentMethods(prev =>
      prev.map(method =>
        method.id === methodId
          ? { ...method, is_active: !currentStatus }
          : method
      )
    );
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = paymentMethods.findIndex((m) => m.id === active.id);
    const newIndex = paymentMethods.findIndex((m) => m.id === over.id);

    // Reorder locally ONLY (Manual Save Refactor)
    const newOrder = arrayMove(paymentMethods, oldIndex, newIndex);
    setPaymentMethods(newOrder);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    try {
      setUploadingLogo(true);

      const s3Endpoint = import.meta.env.VITE_S3_API_ENDPOINT;


      if (!s3Endpoint) {
        console.error('❌ Missing VITE_S3_API_ENDPOINT');
        toast.error('❌ VITE_S3_API_ENDPOINT belum diset! Silakan refresh halaman atau cek .env');
        setUploadingLogo(false);
        return; // Stop here, do not fallback
      }

      // Upload to S3

      const logoUrl = await uploadToS3ViaAPI(file, 'logos');


      if (logoUrl) {
        setSettings(prev => ({ ...prev, logo_url: logoUrl }));
        toast.success('Logo berhasil diupload ke S3!');
      } else {
        console.error('❌ S3 Upload returned null/empty URL');
        throw new Error('Upload S3 gagal (URL kosong). Cek console browser untuk detail.');
      }
    } catch (error: any) {
      console.error('❌ Error handling logo upload:', error);
      toast.error('Upload Gagal: ' + (error.message || 'Unknown error'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const [testingFonnte, setTestingFonnte] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  const testFonnteConnection = async () => {
    // Get token from environment variable
    const FONNTE_TOKEN = import.meta.env.VITE_FONNTE_TOKEN;

    if (!FONNTE_TOKEN) {
      toast.error('FONNTE_TOKEN tidak ditemukan di environment variables. Pastikan sudah dikonfigurasi di .env');
      return;
    }

    if (!testPhoneNumber) {
      toast.error('Masukkan nomor HP untuk test terlebih dahulu');
      return;
    }

    try {
      setTestingFonnte(true);
      const formData = new FormData();
      formData.append("target", testPhoneNumber);
      formData.append("message", "✅ *Fonnte Integration Test*\n\nKoneksi Berhasil!\nNotifikasi WhatsApp berfungsi dengan baik.");

      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_TOKEN,
        },
        body: formData,
      });

      const res = await response.json();
      if (res.status) {
        toast.success('✅ Test Berhasil! Pesan WhatsApp terkirim ke ' + testPhoneNumber);
      } else {
        toast.error('❌ Test Gagal: ' + (res.reason || JSON.stringify(res)));
      }
    } catch (error: any) {
      console.error('Fonnte Test Error:', error);
      toast.error('❌ Error: ' + error.message);
    } finally {
      setTestingFonnte(false);
    }
  };

  const handleLogoRemove = () => {
    setSettings(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSave = async (section?: string) => {
    try {
      setSavingSection(section || 'global');

      if (section === 'payment_methods') {
        const updates = paymentMethods.map((method, index) => ({
          id: method.id,
          sort_order: index,
          is_active: method.is_active
        }));

        for (const update of updates) {
          await supabase
            .from('payment_methods')
            .update({
              sort_order: update.sort_order,
              is_active: update.is_active
            })
            .eq('id', update.id);
        }
        await fetchPaymentMethods();
        setSavingSection(null);
        toast.success('Metode pembayaran berhasil disimpan!');
        return;
      }

      const settingsToSave = {
        ...settings,
        payment_methods: settings.payment_methods
      };

      // Check if settings exist
      const { data: existing, error: fetchError } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing && existing.id) {
        // Update existing
        const { error } = await supabase
          .from('app_settings')
          .update(settingsToSave)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new - remove id to let database generate it
        const { id, ...settingsWithoutId } = settingsToSave;
        const { error } = await supabase
          .from('app_settings')
          .insert([settingsWithoutId]);

        if (error) throw error;
      }

      // Refresh settings after save
      await fetchSettings();

      // Save globally to localStorage for FOUC prevention
      if (settings.primary_color) {
        localStorage.setItem('primaryColor', settings.primary_color);
      }

      toast.success('Pengaturan berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan pengaturan: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingSection(null);
    }
  };



  const testS3Connection = async () => {
    try {
      setTestingS3(true);
      setS3TestResult(null);

      // Get S3 config from environment variables
      const s3Endpoint = import.meta.env.VITE_S3_ENDPOINT;
      const s3Bucket = import.meta.env.VITE_S3_BUCKET;
      const s3AccessKeyId = import.meta.env.VITE_S3_ACCESS_KEY_ID;
      const s3ApiEndpoint = import.meta.env.VITE_S3_API_ENDPOINT;

      // Check if S3 is configured
      if (!s3Endpoint || !s3Bucket || !s3AccessKeyId) {
        setS3TestResult({
          success: false,
          message: 'Konfigurasi S3 tidak lengkap di .env. Pastikan VITE_S3_ENDPOINT, VITE_S3_BUCKET, dan VITE_S3_ACCESS_KEY_ID sudah dikonfigurasi.'
        });
        return;
      }

      // Create a test file
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      // Test upload via API endpoint if configured
      if (s3ApiEndpoint) {
        const result = await uploadToS3ViaAPI(testFile, 'test', s3ApiEndpoint);
        if (result) {
          setS3TestResult({
            success: true,
            message: 'Koneksi S3 berhasil! File test berhasil di-upload ke: ' + result
          });
        } else {
          setS3TestResult({
            success: false,
            message: 'Koneksi S3 gagal. Pastikan backend API endpoint benar dan dapat diakses.'
          });
        }
      } else {
        // Basic validation check
        setS3TestResult({
          success: true,
          message: 'Konfigurasi S3 valid. Endpoint: ' + s3Endpoint + ', Bucket: ' + s3Bucket + '. Untuk test upload, konfigurasi VITE_S3_API_ENDPOINT di .env.'
        });
      }
    } catch (error: any) {
      setS3TestResult({
        success: false,
        message: 'Error testing S3: ' + (error.message || 'Unknown error')
      });
    } finally {
      setTestingS3(false);
    }
  };

  const testSmtpConnection = async () => {
    try {
      setTestingEmail(true);
      setEmailTestResult(null);

      // Invoke Edge Function for SMTP test
      const { data, error } = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          target_email: settings.email_from || 'admin@donasiku.com'
        }
      });

      if (error) {
        console.error('Supabase Function Error:', error);
        throw new Error(error.message || 'Gagal memanggil fungsi test SMTP');
      }

      if (data && !data.success) {
        throw new Error(data.message || 'SMTP connection failed');
      }

      setEmailTestResult({
        success: true,
        message: 'Koneksi SMTP berhasil! Email test telah dikirim.'
      });
    } catch (error: any) {
      console.error('SMTP Test Error:', error);
      setEmailTestResult({
        success: false,
        message: 'Gagal koneksi SMTP: ' + (error.message || 'Unknown error. Pastikan Secret SMTP sudah di-set di Supabase.')
      });
    } finally {
      setTestingEmail(false);
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Pengaturan Aplikasi</h2>
          <p className="text-gray-600">Kelola konfigurasi web app Anda</p>
        </div>

        {/* Settings Sections - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Application Name & Logo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Nama Aplikasi & Logo</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nama Aplikasi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Aplikasi
                </label>
                <input
                  type="text"
                  value={settings.app_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, app_name: e.target.value }))}
                  placeholder="Donasiku"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                />
                <p className="text-xs text-gray-500 mt-1">Nama aplikasi akan ditampilkan di seluruh aplikasi</p>
              </div>

              {/* Tagline Aplikasi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tagline Aplikasi
                </label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="Platform Kebaikan"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">Tagline akan ditampilkan di judul halaman home</p>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo Aplikasi
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleLogoUpload(file);
                    }
                  }}
                  className="hidden"
                />

                {settings.logo_url ? (
                  <div className="space-y-2">
                    <div className="relative inline-block">
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg p-2 bg-gray-50"
                      />
                      <button
                        onClick={handleLogoRemove}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Hapus logo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-gray-700"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mengupload...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Ganti Logo
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                    )}
                    <span className="text-sm text-gray-500">
                      {uploadingLogo ? 'Mengupload...' : 'Klik untuk upload logo'}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Format: PNG, JPG (Max 5MB)
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warna Utama
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={settings.primary_color || '#f97316'}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, primary_color: e.target.value }));
                    applyPrimaryColor(e.target.value);
                  }}
                  className="w-20 h-12 border-2 border-gray-200 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primary_color || '#f97316'}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, primary_color: e.target.value }));
                    if (e.target.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                      applyPrimaryColor(e.target.value);
                    }
                  }}
                  placeholder="#f97316"
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Warna utama akan digunakan di seluruh aplikasi</p>
            </div>

            <CardSaveButton
              isSaving={savingSection === 'app_identity'}
              onClick={() => handleSave('app_identity')}
              primaryColor={primaryColor}
            />
          </div>

          {/* Analytics Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Analytics Tracking</h3>
            </div>

            <div className="space-y-4">
              {/* Google Analytics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Analytics Measurement ID (G-XXXXXXXXXX)
                </label>
                <input
                  type="text"
                  value={settings.google_analytics_id || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, google_analytics_id: e.target.value }))}
                  placeholder="G-ABC1234567"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
              </div>

              {/* Facebook Pixel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facebook Pixel ID
                </label>
                <input
                  type="text"
                  value={settings.facebook_pixel_id || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, facebook_pixel_id: e.target.value }))}
                  placeholder="123456789012345"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
              </div>

              {/* TikTok Pixel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TikTok Pixel ID
                </label>
                <input
                  type="text"
                  value={settings.tiktok_pixel_id || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, tiktok_pixel_id: e.target.value }))}
                  placeholder="C123ABC456DEF789"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-800 mb-1">Cara Kerja Tracking</h4>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      Sistem akan otomatis menyuntikkan script tracking yang valid ke halaman website.
                      Event "Purchase" atau "Donate" akan dikirimkan otomatis saat transaksi berhasil.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CardSaveButton
              isSaving={savingSection === 'analytics'}
              onClick={() => handleSave('analytics')}
              primaryColor={primaryColor}
            />
          </div>

          {/* Font Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Type className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Pengaturan Font</h3>
                <p className="text-sm text-gray-600">Sesuaikan tampilan font di aplikasi</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Font Family */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Font Family
                </label>
                <select
                  value={fontSettings.fontFamily}
                  onChange={(e) => setFontSettings({ ...fontSettings, fontFamily: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-all"
                  style={{ fontFamily: fontSettings.fontFamily }}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Font Size: {fontSettings.fontSize}px
                </label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSettings({ ...fontSettings, fontSize: size })}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${fontSettings.fontSize === size
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Weight */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Font Weight: {fontSettings.fontWeight}
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {FONT_WEIGHTS.map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setFontSettings({ ...fontSettings, fontWeight: weight })}
                      className={`px-4 py-2 rounded-lg transition-all ${fontSettings.fontWeight === weight
                        ? 'bg-purple-600 text-white shadow-md font-semibold'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      style={{ fontWeight: weight }}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preview
                </label>
                <div
                  className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200"
                  style={{
                    fontFamily: fontSettings.fontFamily,
                    fontSize: `${fontSettings.fontSize}px`,
                    fontWeight: fontSettings.fontWeight,
                  }}
                >
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">Heading Text</h1>
                  <p className="text-gray-700 mb-2">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  </p>
                  <p className="text-sm text-gray-600">
                    Small text for descriptions and captions.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <CardSaveButton
                isSaving={savingSection === 'fonts'}
                onClick={saveFontSettings}
                primaryColor={primaryColor}
              />
            </div>
          </div>

          {/* WhatsApp Follow-up Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">WhatsApp Follow-up Template</h3>
                <p className="text-sm text-gray-600">Template pesan untuk follow-up donatur via WhatsApp</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Pesan</label>
                <div className="text-xs text-gray-500 mb-2 p-3 bg-gray-50 rounded border border-gray-200">
                  Gunakan variable berikut: <br />
                  <span className="inline-block mr-2"><code className="text-blue-600 font-bold">{'{name}'}</code> Nama Donatur</span>
                  <span className="inline-block mr-2"><code className="text-blue-600 font-bold">{'{amount}'}</code> Jumlah</span>
                  <span className="inline-block mr-2"><code className="text-blue-600 font-bold">{'{campaign}'}</code> Judul</span>
                  <span className="inline-block"><code className="text-blue-600 font-bold">{'{link}'}</code> Link Bayar</span>
                </div>
                <textarea
                  value={settings.whatsapp_template || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp_template: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder="Halo Kak {name}, terima kasih..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor WhatsApp Admin</label>
                <div className="text-xs text-gray-500 mb-2 p-3 bg-gray-50 rounded border border-gray-200">
                  Nomor ini akan menjadi tujuan pesan dari tombol WhatsApp melayang di halaman publik.
                </div>
                <input
                  type="text"
                  value={settings.whatsapp_phone || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder="Contoh: 628123456789"
                />
              </div>

              <CardSaveButton
                isSaving={savingSection === 'whatsapp'}
                onClick={() => handleSave('whatsapp')}
                primaryColor={primaryColor}
              />
            </div>
          </div>


          {/* Fonnte API Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Smartphone className="w-24 h-24 text-green-600" />
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Fonnte WhatsApp Gateway</h3>
                <p className="text-sm text-gray-600">Integrasi API untuk validasi nomor dan notifikasi otomatis</p>
              </div>
            </div>

            <div className="space-y-4 max-w-xl z-10 relative">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telepon untuk Test Koneksi</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="08123456789 atau 628123456789"
                  />
                  <button
                    onClick={testFonnteConnection}
                    disabled={testingFonnte || !testPhoneNumber}
                    className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm whitespace-nowrap flex items-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {testingFonnte ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Koneksi'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Masukkan nomor WhatsApp Anda untuk test koneksi. Token diambil dari <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">VITE_FONNTE_TOKEN</code> di file <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.env</code>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  💡 <strong>Note:</strong> Token Fonnte disimpan di environment variable <code className="bg-blue-100 px-1 py-0.5 rounded">.env</code> untuk keamanan.
                  Pastikan <code className="bg-blue-100 px-1 py-0.5 rounded">VITE_FONNTE_TOKEN</code> sudah dikonfigurasi.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-xl z-10 relative">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template Notifikasi Pembayaran Berhasil (Otomatis)</label>
                <div className="text-xs text-gray-500 mb-2 p-3 bg-gray-50 rounded border border-gray-200">
                  Pesan ini akan dikirim otomatis ke donatur via WhatsApp setelah pembayaran terverifikasi (SUCCESS).<br />
                  Gunakan variable: <code className="text-blue-600 font-bold">{'{name}'}</code>, <code className="text-blue-600 font-bold">{'{amount}'}</code>, <code className="text-blue-600 font-bold">{'{campaign}'}</code>.
                </div>
                <textarea
                  value={settings.whatsapp_success_template || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp_success_template: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  placeholder="Alhamdulillah, terima kasih Kak {name}. Donasi sebesar {amount} untuk {campaign} telah kami terima..."
                />
              </div>

              <CardSaveButton
                isSaving={savingSection === 'fonnte'}
                onClick={() => handleSave('fonnte')}
                primaryColor={primaryColor}
              />
            </div>
          </div>

          {/* Payment Methods Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Metode Pembayaran Duitku</h3>
                  <p className="text-sm text-gray-600">Kelola metode pembayaran yang tersedia untuk donator</p>
                </div>
              </div>
              <button
                onClick={syncPaymentMethods}
                disabled={syncingPaymentMethods}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                {syncingPaymentMethods ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <SettingsIcon className="w-4 h-4" />
                    Sync dari Duitku
                  </>
                )}
              </button>
            </div>

            {paymentMethods.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <p className="text-yellow-700 mb-3">
                  Belum ada payment methods. Klik tombol "Sync dari Duitku" untuk mengambil data payment methods dari Duitku API.
                </p>
                <button
                  onClick={syncPaymentMethods}
                  disabled={syncingPaymentMethods}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  {syncingPaymentMethods ? 'Syncing...' : 'Sync Sekarang'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Total Methods</p>
                    <p className="text-2xl font-bold text-blue-700">{paymentMethods.length}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 mb-1">Aktif</p>
                    <p className="text-2xl font-bold text-green-700">
                      {paymentMethods.filter(m => m.is_active).length}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Non-Aktif</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {paymentMethods.filter(m => !m.is_active).length}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-purple-600 mb-1">Kategori</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {new Set(paymentMethods.map(m => m.category)).size}
                    </p>
                  </div>
                </div>

                {/* Payment Methods List by Category - Scrollable */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-800 text-sm">Daftar Metode Pembayaran</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      🖱️ Drag & drop untuk mengatur urutan • Scroll untuk melihat lebih banyak
                    </p>
                  </div>

                  {/* Scrollable Container with Drag & Drop */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="max-h-96 overflow-y-auto bg-white">
                      <div className="p-4">
                        {/* Single Sortable List - All Payment Methods */}
                        <SortableContext
                          items={paymentMethods.map(m => m.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {paymentMethods.map((method) => (
                              <SortablePaymentMethod
                                key={method.id}
                                method={method}
                                onToggle={togglePaymentMethod}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </div>
                    </div>
                  </DndContext>

                  {/* Scroll Indicator */}
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      ↕️ Scroll untuk melihat lebih banyak
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="text-xs text-blue-700">
                    💡 <strong>Tip:</strong> Hanya payment methods yang aktif (toggle ON) yang akan ditampilkan ke donator.
                    Sync ulang untuk mendapatkan update terbaru dari Duitku.
                  </p>
                </div>

                <CardSaveButton
                  isSaving={savingSection === 'payment_methods'}
                  onClick={() => handleSave('payment_methods')}
                  primaryColor={primaryColor}
                />
              </div>
            )}
          </div>





          {/* Email Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Notifikasi Email</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, email_enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
            {settings.email_enabled && (
              <div className="space-y-4 mt-4">
                {/* SMTP Test Connection */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Test Koneksi SMTP</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Kirim email test ke <strong>{settings.email_from || 'admin'}</strong> menggunakan konfigurasi backend.
                      </p>
                    </div>
                    <button
                      onClick={testSmtpConnection}
                      disabled={testingEmail}
                      className="flex items-center gap-2 px-3 py-2 text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {testingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Test Koneksi
                        </>
                      )}
                    </button>
                  </div>

                  {emailTestResult && (
                    <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 text-sm ${emailTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                      {emailTestResult.success ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{emailTestResult.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Email Sukses Donasi</label>
                  <div className="text-xs text-gray-500 mb-2 p-3 bg-gray-50 rounded border border-gray-200">
                    Gunakan variable berikut: <br />
                    <span className="inline-block mr-2"><code className="text-blue-600 font-bold">{'{name}'}</code> Nama Donatur</span>
                    <span className="inline-block mr-2"><code className="text-blue-600 font-bold">{'{amount}'}</code> Jumlah</span>
                    <span className="inline-block mr-2"><code className="text-blue-600 font-bold">{'{campaign}'}</code> Judul</span>
                    <span className="inline-block mr-2"><code className="text-blue-600 font-bold">{'{date}'}</code> Tanggal</span>
                    <span className="inline-block"><code className="text-blue-600 font-bold">{'{invoice}'}</code> No Invoice</span>
                  </div>
                  <textarea
                    value={settings.email_template || ''}
                    onChange={(e) => setSettings({ ...settings, email_template: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                    placeholder={`Subject: Terima Kasih atas Donasi Anda\n\nHalo {name},\n\nTerima kasih atas donasi Anda sebesar {amount} untuk campaign {campaign}.\nSemoga berkah.\n\nSalam,\nDonasiku Team`}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Template ini akan dikirim ke email donatur setelah pembayaran berhasil.
                  </p>
                </div>

                <CardSaveButton
                  isSaving={savingSection === 'email'}
                  onClick={() => handleSave('email')}
                  primaryColor={primaryColor}
                />
              </div>
            )}
          </div>

          {/* S3 Compatible Storage */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">S3 Compatible Storage</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Konfigurasi S3 diambil dari file .env. Gunakan tombol di bawah untuk test koneksi.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Konfigurasi S3 dari .env:</strong>
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Endpoint: {import.meta.env.VITE_S3_ENDPOINT || 'Tidak dikonfigurasi'}</li>
                  <li>• Region: {import.meta.env.VITE_S3_REGION || 'Tidak dikonfigurasi'}</li>
                  <li>• Bucket: {import.meta.env.VITE_S3_BUCKET || 'Tidak dikonfigurasi'}</li>
                  <li>• Access Key ID: {import.meta.env.VITE_S3_ACCESS_KEY_ID ? '***' + import.meta.env.VITE_S3_ACCESS_KEY_ID.slice(-4) : 'Tidak dikonfigurasi'}</li>
                  <li>• API Endpoint: {import.meta.env.VITE_S3_API_ENDPOINT || 'Tidak dikonfigurasi'}</li>
                </ul>
              </div>

              {/* Test S3 Connection */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={testS3Connection}
                  disabled={testingS3}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: primaryColor }}
                >
                  {testingS3 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      Test Koneksi S3
                    </>
                  )}
                </button>

                {s3TestResult && (
                  <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${s3TestResult.success
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                    }`}>
                    {s3TestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{s3TestResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>
    </DashboardLayout>
  );
}
