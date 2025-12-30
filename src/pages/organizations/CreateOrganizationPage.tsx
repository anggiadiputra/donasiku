import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import DashboardLayout from '../../components/DashboardLayout';
import { ArrowLeft, Upload, Save, Building2 } from 'lucide-react';
import { createSlug } from '../../utils/slug';
import { uploadToS3 } from '../../utils/s3Storage';

export default function CreateOrganizationPage() {
    usePageTitle('Buat Organisasi Baru');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (!slugManuallyEdited) {
            setSlug(createSlug(newName));
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return null;
        try {
            // Try S3 first
            const s3Url = await uploadToS3(logoFile, 'organizations', logoPreview);
            if (s3Url) return s3Url;

            // Fallback to Supabase Storage
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `org-logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('organizations') // Ensure this bucket exists or use 'images'
                .upload(fileName, logoFile);

            if (uploadError) {
                // If bucket doesn't exist, try 'public' or similar, or just fail gracefully to base64
                console.warn('Supabase storage upload failed, using base64', uploadError);
                return logoPreview;
            }

            const { data } = supabase.storage.from('organizations').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (error) {
            console.error('Logo upload error:', error);
            return logoPreview;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !slug) {
            toast.error('Nama dan Slug wajib diisi');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Sesi habis, silakan login kembali');
                navigate('/login');
                return;
            }

            let logoUrl = logoPreview;
            if (logoFile) {
                const uploaded = await uploadLogo();
                if (uploaded) logoUrl = uploaded;
            }

            // 1. Create Organization
            // Note: The triggers we set up in SQL might auto-add the creator as owner.
            // Let's check the schema logic or do it manually if needed.
            // Looking at schema: The policies allow INSERT. 
            // We need to ensure the user is added as a member. 
            // It's safer to use a transaction or RPC, but let's try direct insert first.
            // If we don't have an auto-trigger, we must insert into organization_members manually.

            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name,
                    slug,
                    logo_url: logoUrl,
                    owner_id: user.id // We added this column in schema
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // 2. Add creator as Owner in organization_members
            // (If not handled by trigger)
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: org.id,
                    user_id: user.id,
                    role: 'owner'
                });

            if (memberError) {
                // If member insert fails, we might have an orphan org. 
                // In a real app, use Supabase RPC for atomic transaction.
                console.error('Failed to add member:', memberError);
                toast.warning('Organisasi dibuat tapi gagal menambahkan Anda sebagai member. Hubungi admin.');
            } else {
                toast.success('Organisasi berhasil dibuat!');
                // Force refresh context? Navigation should trigger re-fetch if implemented right
                navigate('/dashboard');
                window.location.reload(); // Simple way to refresh context
            }

        } catch (error: any) {
            console.error('Error creating org:', error);
            toast.error('Gagal membuat organisasi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Buat Organisasi Baru</h1>
                        <p className="text-sm text-gray-600">Buat wadah untuk kolaborasi campaign Anda</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Logo Upload */}
                        <div className="flex justify-center mb-6">
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="hidden"
                                    id="org-logo-upload"
                                />
                                <label
                                    htmlFor="org-logo-upload"
                                    className="block w-32 h-32 rounded-full border-2 border-dashed border-gray-300 cursor-pointer hover:border-orange-500 transition-colors overflow-hidden relative bg-gray-50"
                                >
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <Building2 className="w-8 h-8 mb-2" />
                                            <span className="text-xs">Upload Logo</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                                        <Upload className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Organisasi <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={handleNameChange}
                                placeholder="Contoh: Yayasan Peduli Kasih"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Slug URL <span className="text-red-500">*</span>
                            </label>
                            <div className="flex rounded-lg shadow-sm">
                                <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    donasiku.com/org/
                                </span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => {
                                        setSlug(e.target.value);
                                        setSlugManuallyEdited(true);
                                    }}
                                    className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-r-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    placeholder="yayasan-peduli-kasih"
                                    required
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                URL unik untuk profil organisasi Anda.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !name || !slug}
                                className="w-full flex justify-center items-center gap-2 px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? 'Membuat...' : 'Buat Organisasi'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
