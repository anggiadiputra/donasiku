import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import DashboardLayout from '../../components/DashboardLayout';
import { ArrowLeft, Upload, Save, Building2, Users } from 'lucide-react';
import { createSlug } from '../../utils/slug';
import { uploadToS3 } from '../../utils/s3Storage';

export default function CreateOrganizationPage() {
    usePageTitle('Buat Organisasi Baru');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false); // Added

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [ownerEmail, setOwnerEmail] = useState(''); // Added
    const [ownerFullName, setOwnerFullName] = useState(''); // Added for new user
    const [foundUser, setFoundUser] = useState<{ id: string, full_name: string } | null>(null);
    const [isCheckingUser, setIsCheckingUser] = useState(false);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string>('');
    // Default to unverified as per user request (verification happens later)
    const [orgVerificationStatus, setOrgVerificationStatus] = useState<'verified' | 'unverified' | 'pending'>('unverified');

    // Check platform admin status
    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile?.role === 'admin') {
                    setIsPlatformAdmin(true);
                }
            }
        };
        checkAdmin();
    }, []);

    // Debounce check for owner email
    useEffect(() => {
        const checkEmail = async () => {
            if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
                setFoundUser(null);
                return;
            }

            setIsCheckingUser(true);
            const { data: targetUser } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('email', ownerEmail.trim())
                .single();

            setFoundUser(targetUser);
            setIsCheckingUser(false);
        };

        const timeoutId = setTimeout(checkEmail, 500);
        return () => clearTimeout(timeoutId);
    }, [ownerEmail]);

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        setName(newName);
        if (!slugManuallyEdited) {
            setSlug(createSlug(newName));
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

            // DETERMINE OWNER
            let newOwnerId = user.id; // Default to creator
            let assignCreatorAsMember = true;

            // If Platform Admin AND Owner Email provided
            if (isPlatformAdmin && ownerEmail.trim()) {
                if (foundUser) {
                    newOwnerId = foundUser.id;
                    assignCreatorAsMember = false; // Admin monitors from outside
                } else {
                    // Create New User via Edge Function
                    if (!ownerFullName.trim()) {
                        toast.error('Nama lengkap owner wajib diisi untuk user baru via email.');
                        setLoading(false);
                        return;
                    }

                    // Call Edge Function
                    const { data: invokeData, error: invokeError } = await supabase.functions.invoke('admin-create-user', {
                        body: {
                            email: ownerEmail.trim(),
                            full_name: ownerFullName.trim()
                        }
                    });

                    if (invokeError) {
                        console.error('Invite error:', invokeError);
                        toast.error('Gagal mengundang user baru: ' + invokeError.message);
                        setLoading(false);
                        return;
                    }

                    if (!invokeData?.user?.id) {
                        toast.error('Gagal mendapatkan ID user baru.');
                        setLoading(false);
                        return;
                    }

                    newOwnerId = invokeData.user.id;
                    assignCreatorAsMember = false;
                }
            }

            let logoUrl = logoPreview;
            if (logoFile) {
                const uploaded = await uploadLogo();
                if (uploaded) logoUrl = uploaded;
            }

            // 1. Create Organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name,
                    slug,
                    logo_url: logoUrl,
                    owner_id: newOwnerId,
                    verification_status: isPlatformAdmin ? orgVerificationStatus : 'unverified'
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // 2. Add Owner as Member
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: org.id,
                    user_id: newOwnerId,
                    role: 'owner'
                });

            if (memberError) {
                console.error('Failed to add member:', memberError);
                toast.warning('Organisasi dibuat tapi gagal set owner. Hubungi support.');
            } else {
                if (assignCreatorAsMember) {
                    toast.success('Organisasi berhasil dibuat!');
                    // Navigate to context switch or dashboard
                    // Since we are member, context will pick it up
                    navigate('/dashboard');
                    window.location.reload();
                } else {
                    toast.success(`Organisasi berhasil dibuat. Owner diset ke: ${ownerEmail}`);
                    // Admin is NOT member. Navigate back or to list.
                    // Context might NOT verify this org immediately in the "Switcher" unless we force fetch ALL.
                    navigate('/dashboard');
                    // No reload needed per se, but good for cleanup.
                }
            }

        } catch (error: any) {
            console.error('Error creating org:', error);
            toast.error('Gagal membuat organisasi: ' + error.message);
        } finally {
            setLoading(false);
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

                        {/* Owner Email - Admin Only */}
                        {isPlatformAdmin && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="text-sm font-semibold text-blue-800 mb-3">
                                    Delegasi Kepemilikan (Platform Admin)
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Penanggung Jawab (Owner)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={ownerEmail}
                                                onChange={(e) => setOwnerEmail(e.target.value)}
                                                placeholder="email.penanggung.jawab@example.com"
                                                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            {isCheckingUser && (
                                                <div className="absolute right-3 top-2.5">
                                                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* User Recognition State */}
                                    {ownerEmail.includes('@') && !isCheckingUser && (
                                        <div className={`p-3 rounded-md text-sm ${foundUser ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
                                            {foundUser ? (
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4" />
                                                    <span>User Terdaftar: <strong>{foundUser.full_name}</strong></span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4" />
                                                        <span>User Baru (Akan didaftarkan otomatis)</span>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold uppercase text-orange-800 mb-1">
                                                            Nama Lengkap Penanggung Jawab
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={ownerFullName}
                                                            onChange={(e) => setOwnerFullName(e.target.value)}
                                                            placeholder="Nama Lengkap User Baru"
                                                            className="w-full px-3 py-1.5 border border-orange-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-xs text-blue-600">
                                        Jika diisi, user ini akan menjadi <strong>Owner</strong> dan Anda TIDAK akan masuk sebagai member.
                                        <br />
                                        Jika kosong, Anda akan menjadi Owner.
                                    </p>

                                    <div className="pt-2 border-t border-blue-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Status Verifikasi Awal
                                        </label>
                                        <select
                                            value={orgVerificationStatus}
                                            onChange={(e) => setOrgVerificationStatus(e.target.value as any)}
                                            className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="unverified">Belum Verifikasi</option>
                                            <option value="pending">Menunggu (Pending)</option>
                                            <option value="verified">Terverifikasi (Verified)</option>
                                        </select>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Platform Admin dapat langsung memverifikasi organisasi baru.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

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
