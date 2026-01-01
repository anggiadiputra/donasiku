import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  Calendar,
  Save,
  Send,
  Flame,
  Plus,
  Edit2,
  Trash2,
  Megaphone
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase, Category, Campaign } from '../lib/supabase';
import { uploadToS3 } from '../utils/s3Storage';
import { createSlug } from '../utils/slug';

import RichTextEditor from '../components/RichTextEditor';
import CreateUpdateModal from '../components/CreateUpdateModal';

export default function EditCampaignPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState('1000000');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [gmapsLink, setGmapsLink] = useState('');
  const [formType, setFormType] = useState<'donation' | 'zakat'>('donation');
  const [presetAmounts, setPresetAmounts] = useState<string[]>(['', '', '', '', '']);
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);


  // Updates Management
  const [updates, setUpdates] = useState<any[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<any>(null);
  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchCampaign(id);
    }
  }, [id]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(createSlug(title));
    }
  }, [title, slugManuallyEdited]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (data) {
      setCategories(data);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Gagal menambahkan kategori', {
        description: 'Nama kategori tidak boleh kosong'
      });
      return;
    }

    try {
      const categorySlug = createSlug(newCategoryName);

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          slug: categorySlug,
          icon: 'tag',
          description: ''
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('Kategori sudah ada', {
            description: 'Kategori dengan nama ini sudah terdaftar'
          });
        } else {
          toast.error('Gagal menambahkan kategori', {
            description: error.message
          });
        }
        return;
      }

      if (data) {
        setCategories([...categories, data]);
        setCategoryId(data.id);
        setNewCategoryName('');
        setShowAddCategory(false);
        toast.success('Kategori ditambahkan', {
          description: `Kategori "${data.name}" berhasil dibuat`
        });
      }
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error('Terjadi kesalahan', {
        description: 'Gagal menambahkan kategori karena kesalahan sistem'
      });
    }
  };

  const fetchCampaign = async (campaignId: string) => {
    try {
      setFetching(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sesi berakhir', {
          description: 'Anda harus login kembali untuk mengedit campaign'
        });
        navigate('/login');
        return;
      }

      const query = supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId);

      // If we are in an organization context, we don't strictly require user_id match
      // RLS will handle the permissions.
      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching campaign:', error);
        toast.error('Gagal memuat data', {
          description: 'Campaign tidak ditemukan atau terjadi kesalahan saat mengambil data'
        });
        navigate('/donasi/campaigns');
        return;
      }

      if (data) {
        setCampaign(data);
        // Populate form with campaign data
        setTitle(data.title || '');
        setSlug(data.slug || createSlug(data.title || ''));
        setSlugManuallyEdited(!!data.slug);
        setDescription(data.description || data.full_description || '');
        setImagePreview(data.image_url || '');
        setTargetAmount((data.target_amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
        setEndDate(data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '');
        setLocation(data.target_location || '');
        setGmapsLink(data.gmaps_link || '');
        setFormType(data.form_type || 'donation');
        setCategoryId(data.category_id || '');
        setStatus(data.status || 'draft');
        setIsFeatured(!!data.is_featured);

        // Set preset amounts
        if (data.preset_amounts && Array.isArray(data.preset_amounts)) {
          const formattedAmounts = data.preset_amounts.map((amt: number) =>
            amt ? amt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
          );
          // Pad to 5 items
          while (formattedAmounts.length < 5) {
            formattedAmounts.push('');
          }
          setPresetAmounts(formattedAmounts.slice(0, 5));
        }
      }

      // Fetch updates
      fetchUpdates(campaignId);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Kesalahan Sistem', {
        description: 'Terjadi kesalahan saat memuat campaign'
      });
      navigate('/donasi/campaigns');
    } finally {
      setFetching(false);
    }
  };

  const fetchUpdates = async (campaignId: string) => {
    const { data: updatesData, error } = await supabase
      .from('campaign_updates')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (!error && updatesData) {
      setUpdates(updatesData);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kabar ini?')) return;

    try {
      const { error } = await supabase
        .from('campaign_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      toast.success('Kabar berhasil dihapus');
      if (campaign?.id) fetchUpdates(campaign.id);
    } catch (error: any) {
      console.error('Error deleting update:', error);
      toast.error('Gagal menghapus kabar: ' + error.message);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetAmountChange = (index: number, value: string) => {
    const newAmounts = [...presetAmounts];
    newAmounts[index] = value;
    setPresetAmounts(newAmounts);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      // Try S3 compatible storage first (if configured)

      const existingImageUrl = campaign?.image_url || null;
      const s3Url = await uploadToS3(imageFile, 'campaigns', existingImageUrl);
      if (s3Url) {

        return s3Url;
      }

      // Fallback to Supabase Storage

      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `campaigns/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('campaigns')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          if (uploadError.message.includes('Bucket not found') ||
            uploadError.message.includes('not found') ||
            uploadError.message.includes('does not exist')) {
            console.warn('Supabase storage bucket not found. Using existing image URL.');
            return campaign?.image_url || null;
          }
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('campaigns')
          .getPublicUrl(filePath);


        return data.publicUrl;
      } catch (supabaseError) {
        console.error('Error uploading to Supabase:', supabaseError);
        console.warn('Using existing image URL as fallback.');
        return campaign?.image_url || null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      return campaign?.image_url || null;
    }
  };

  const handleSave = async (publish: boolean = false) => {
    // Strip HTML tags for validation
    const textContent = description.replace(/<[^>]*>/g, '').trim();
    if (!title.trim() || !textContent) {
      toast.error('Data tidak lengkap', {
        description: 'Judul dan Keterangan wajib diisi sebelum menyimpan'
      });
      return;
    }

    if (!id || !campaign) {
      toast.error('Campaign tidak ditemukan', {
        description: 'ID Campaign tidak valid atau campaign telah dihapus'
      });
      navigate('/donasi/campaigns');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = campaign.image_url || '';

      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const presetAmountsNumeric = presetAmounts
        .filter(amt => amt.trim() !== '')
        .map(amt => parseFloat(amt.replace(/\./g, '')) || 0);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sesi berakhir', {
          description: 'Silakan login kembali untuk menyimpan perubahan'
        });
        navigate('/login');
        return;
      }

      // Generate slug if not provided
      const finalSlug = slug.trim() || createSlug(title);

      const { error } = await supabase
        .from('campaigns')
        .update({
          title,
          slug: finalSlug,
          description,
          full_description: description,
          image_url: imageUrl || '',
          target_amount: parseFloat(targetAmount.replace(/\./g, '')) || 0,
          category: categories.find(c => c.id === categoryId)?.slug || campaign.category || 'infaq',
          category_id: categoryId || null,
          target_location: location,
          gmaps_link: gmapsLink,
          form_type: formType,
          display_format: 'card',
          preset_amounts: presetAmountsNumeric,
          status: publish ? 'published' : status,
          is_featured: isFeatured,
          end_date: endDate || null,
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating campaign:', error);
        toast.error('Gagal memperbarui campaign', {
          description: error.message
        });
      } else {
        toast.success(publish ? 'Campaign Berhasil Dipublish!' : 'Perubahan Disimpan', {
          description: publish
            ? 'Campaign Anda sekarang aktif dan dapat dilihat oleh publik.'
            : 'Detail campaign telah berhasil diperbarui.',
          duration: 5000,
        });
        navigate('/donasi/campaigns');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan', {
        description: 'Gagal melakukan pembaruan campaign'
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">Memuat campaign...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Campaign tidak ditemukan</p>
            <button
              onClick={() => navigate('/donasi/campaigns')}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Kembali ke Campaigns
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/donasi/campaigns')}
              className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Campaign</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-gray-500">Campaigns</span>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-orange-600">Edit Details</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.open(`/campaign/${slug}`, '_blank')}
            className="px-5 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all flex items-center gap-2 border border-blue-100 hover:border-blue-200 shadow-sm"
          >
            Lihat Halaman
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Campaign Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow duration-300">
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Title / Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masukkan judul campaign"
                  className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-gray-800 placeholder:text-gray-400 font-medium"
                />
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Slug (URL Friendly)
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                    <span className="text-gray-400 text-sm font-medium">donasi.co/campaign/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugManuallyEdited(true);
                      }}
                      placeholder="slug-otomatis"
                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-gray-600 text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Campaign Image (650 x 350)
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="block w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-orange-500 hover:bg-orange-50/30 transition-all flex items-center justify-center overflow-hidden relative"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-semibold flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                            <Upload className="w-4 h-4" /> Ganti Gambar
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-gray-400 group-hover:text-orange-500">
                          <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Klik untuk upload gambar</p>
                        <p className="text-xs text-gray-400 mt-1">Rekomendasi ukuran: 650 x 350 px</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Information / Keterangan <span className="text-red-500">*</span>
                </label>
                <div className="rounded-xl overflow-hidden border border-gray-200 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Ceritakan detail campaign anda..."
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                    {description.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} Words
                  </span>
                </div>
              </div>
            </div>

            {/* Donation Details Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-shadow duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                Donation Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Target Donasi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
                    <input
                      type="text"
                      value={targetAmount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        setTargetAmount(formatted);
                      }}
                      placeholder="0"
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-semibold text-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Batas Waktu
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                    <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Lokasi
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Bandung, Jawa Barat"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Link Google Maps
                  </label>
                  <input
                    type="text"
                    value={gmapsLink}
                    onChange={(e) => setGmapsLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-blue-600"
                  />
                </div>
              </div>

              {/* Campaign Updates Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300 mt-6 md:mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Megaphone className="w-4 h-4" />
                    </span>
                    Kabar Terbaru
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedUpdate(null);
                      setShowUpdateModal(true);
                    }}
                    className="text-xs flex items-center gap-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-blue-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tulis Kabar
                  </button>
                </div>

                <div className="space-y-3">
                  {updates.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Megaphone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">Belum ada highlight berita</p>
                    </div>
                  ) : (
                    updates.map((update) => (
                      <div key={update.id} className="p-4 bg-white rounded-xl border border-gray-100 flex justify-between items-start group hover:border-blue-200 hover:shadow-sm transition-all duration-200">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                              {new Date(update.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm truncate">{update.title}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {update.content.replace(/<[^>]*>/g, '')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50 p-1 rounded-lg">
                          <button
                            onClick={() => {
                              setSelectedUpdate(update);
                              setShowUpdateModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-all shadow-sm"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUpdate(update.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-md transition-all shadow-sm"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form Type and Publish Options */}
          <div className="space-y-6">
            {/* Form Type Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                Tipe Konfigurasi
              </h3>

              <div className="flex bg-gray-50 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setFormType('donation')}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${formType === 'donation'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Donasi Umum
                </button>
                <button
                  onClick={() => setFormType('zakat')}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${formType === 'zakat'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Zakat
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Preset Nominal</label>
                <div className="space-y-3">
                  {presetAmounts.map((amount, index) => (
                    <div key={index} className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                        {index === presetAmounts.length - 1 ? 'Lainnya' : 'Rp'}
                      </span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          handlePresetAmountChange(index, formatted);
                        }}
                        placeholder={index === presetAmounts.length - 1 ? "Nominal Lainnya" : "0"}
                        className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-sm font-medium transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Featured Option */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-orange-500 transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    Jadikan Program Unggulan
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" />
                  </span>
                  <span className="text-xs text-gray-500">Tampilkan di posisi teratas rekomendasi (Maks 3)</span>
                </div>
              </label>
            </div>

            {/* Publish Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                Publishing
              </h3>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-gray-700">Kategori</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold bg-orange-50 px-2 py-1 rounded-md"
                  >
                    {showAddCategory ? 'Batal' : '+ Buat Baru'}
                  </button>
                </div>

                {showAddCategory && (
                  <div className="space-y-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nama kategori baru"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="w-full px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-colors text-xs"
                    >
                      Tambahkan Kategori
                    </button>
                  </div>
                )}

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all font-medium text-gray-700 bg-white"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-3">Status Saat Ini</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus('draft')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${status === 'draft' ? 'bg-gray-100 border-gray-400 text-gray-800' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    Draft
                  </button>
                  <button
                    onClick={() => setStatus('published')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${status === 'published' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    Published
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleSave(false)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {status === 'published' ? 'Update Detail' : 'Simpan sebagai Draft'}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 transform hover:-translate-y-0.5"
                >
                  <Send className="w-4 h-4" />
                  {status === 'published' ? 'Update & Tetap Publish' : 'Publish Sekarang'}
                </button>
              </div>
            </div>
          </div>

          {/* Campaign Updates Section */}


          <CreateUpdateModal
            isOpen={showUpdateModal}
            onClose={() => {
              setShowUpdateModal(false);
              setSelectedUpdate(null);
            }}
            campaignId={id || ''}
            initialData={selectedUpdate}
            onSuccess={() => id && fetchUpdates(id)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

