import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Upload,
  Calendar,
  Save,
  Send
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase, Category } from '../lib/supabase';
import { uploadToS3 } from '../utils/s3Storage';
import { createSlug } from '../utils/slug';
import RichTextEditor from '../components/RichTextEditor';
import { useOrganization } from '../context/OrganizationContext';

export default function AddNewCampaignPage() {
  const navigate = useNavigate();
  const { selectedOrganization } = useOrganization();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

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
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  useEffect(() => {
    fetchCategories();
  }, []);

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
      if (data.length > 0 && !categoryId) {
        setCategoryId(data[0].id);
      }
    }
  };

  const getCategoryName = (id: string) => {
    const category = categories.find(c => c.id === id);
    return category ? category.name : '';
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

      const s3Url = await uploadToS3(imageFile, 'campaigns', imagePreview);
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
          // If bucket doesn't exist, use base64 as fallback
          if (uploadError.message.includes('Bucket not found') ||
            uploadError.message.includes('not found') ||
            uploadError.message.includes('does not exist')) {
            console.warn('Supabase storage bucket not found. Using base64 preview.');
            return imagePreview;
          }
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('campaigns')
          .getPublicUrl(filePath);


        return data.publicUrl;
      } catch (supabaseError) {
        console.error('Error uploading to Supabase:', supabaseError);
        // Final fallback: use base64 preview
        console.warn('Using base64 preview as fallback. Please set up S3 or Supabase Storage.');
        return imagePreview;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback to base64 preview
      return imagePreview;
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!title || !description) { // Changed description to content for validation
      toast.error('Judul dan Keterangan wajib diisi');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = imagePreview;

      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const presetAmountsNumeric = presetAmounts
        .filter(amt => amt.trim() !== '')
        .map(amt => parseFloat(amt.replace(/\./g, '')) || 0);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Anda harus login untuk membuat campaign');
        return;
      }

      // Generate slug from title if not manually edited
      const finalSlug = slug.trim() || createSlug(title);



      const campaignData = {
        title,
        slug: finalSlug,
        description: description.replace(/<[^>]*>/g, '').substring(0, 150), // Short description (stripped HTML)
        full_description: description, // Rich text content (HTML)
        image_url: imageUrl, // Main image
        target_amount: parseFloat(targetAmount.replace(/\./g, '')) || 0,
        current_amount: 0,
        category: getCategoryName(categoryId), // Store Name (Legacy)
        category_id: categoryId, // Store ID (Relation)
        is_urgent: false,
        is_verified: false, // Default to false
        status: publish ? 'published' : 'draft',
        user_id: user.id,
        target_location: location,
        gmaps_link: gmapsLink,
        form_type: formType,
        display_format: 'card',
        preset_amounts: presetAmountsNumeric,
        organization_name: selectedOrganization ? selectedOrganization.name : '', // Use selected Org name or empty
        organization_logo: selectedOrganization ? selectedOrganization.logo_url : '', // use selected org logo or empty
        organization_id: selectedOrganization ? selectedOrganization.id : null, // IMPORTANT: Link to org
        end_date: endDate ? new Date(endDate).toISOString() : null
      };

      const { error } = await supabase
        .from('campaigns')
        .insert([campaignData]);

      if (error) {
        toast.error('Gagal menyimpan campaign', {
          description: error.message
        });
      } else {
        toast.success(publish ? 'Campaign Berhasil Dipublish!' : 'Campaign Disimpan sebagai Draft', {
          description: publish
            ? 'Campaign Anda sekarang dapat dilihat oleh publik.'
            : 'Draft campaign Anda telah berhasil diperbarui.',
          duration: 5000,
        });
        navigate('/donasi/campaigns'); // Create separate page for list management later
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Terjadi kesalahan saat menyimpan campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/donasi/campaigns')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Add New Campaign</h1>
              <p className="text-sm text-gray-600 mt-1">Data Campaign / Add New</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Campaign Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title / Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masukkan judul campaign"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug <span className="text-gray-500 text-xs">(URL-friendly)</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="slug-otomatis-dari-judul"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Slug akan digunakan di URL campaign. Kosongkan untuk auto-generate dari judul.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image (650 x 350)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="block w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors flex items-center justify-center"
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">650 x 350</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Information / Keterangan <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Masukkan keterangan campaign. Anda bisa memformat teks, menambahkan heading, dan mengupload gambar."
                />
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-gray-500">
                    {description.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} WORDS
                  </span>
                </div>
              </div>
            </div>

            {/* Donation Details Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Donation Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target donasi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                      setTargetAmount(formatted);
                    }}
                    placeholder="1.000.000"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal berakhir donasi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location / Lokasi
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Bandung, Jawa Barat"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Gmaps
                  </label>
                  <input
                    type="text"
                    value={gmapsLink}
                    onChange={(e) => setGmapsLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                <span className="text-red-500">*</span>: Wajib diisi
              </p>
            </div>
          </div>

          {/* Right Column - Form Type and Publish Options */}
          <div className="space-y-6">
            {/* Form Type Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Form Type</h3>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setFormType('donation')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${formType === 'donation'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border-2 border-gray-200'
                    }`}
                >
                  Donation
                </button>
                <button
                  onClick={() => setFormType('zakat')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${formType === 'zakat'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border-2 border-gray-200'
                    }`}
                >
                  Zakat
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Preset Nominal</label>
                <div className="space-y-2">
                  {presetAmounts.map((amount, index) => (
                    <input
                      key={index}
                      type="text"
                      value={amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        handlePresetAmountChange(index, formatted);
                      }}
                      placeholder={index === presetAmounts.length - 1 ? "OTHER NOMINAL" : "Rp"}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Publish Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Publish</h3>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-xs text-orange-500 hover:text-orange-600 font-semibold"
                  >
                    {showAddCategory ? 'Batal' : '+ Tambah Kategori'}
                  </button>
                </div>

                {showAddCategory ? (
                  <div className="space-y-2 mb-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nama kategori baru"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Tambahkan Kategori
                    </button>
                  </div>
                ) : null}

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 capitalize"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleSave(false)}
                  disabled={loading}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save to Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

