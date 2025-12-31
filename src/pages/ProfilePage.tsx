import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import DashboardLayout from '../components/DashboardLayout';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { User, Camera, Save, Loader2, Mail, Phone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToS3ViaAPI } from '../utils/s3Storage';
import VerifiedBadge from '../components/VerifiedBadge';

export default function ProfilePage() {
    usePageTitle('Profil Saya');
    const primaryColor = usePrimaryColor();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    // Form states
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [bio, setBio] = useState('');
    const [socialLinks, setSocialLinks] = useState<any>({
        website: '',
        instagram: '',
        facebook: '',
        twitter: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data) {
                setProfile(data);
                setFullName(data.full_name || '');
                setPhone(data.phone || '');
                setAvatarUrl(data.avatar_url || '');
                setBio(data.bio || '');
                setSocialLinks({
                    website: data.social_links?.website || '',
                    instagram: data.social_links?.instagram || '',
                    facebook: data.social_links?.facebook || '',
                    twitter: data.social_links?.twitter || ''
                });
            }
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            toast.error('Gagal mengambil data profil');
        } finally {
            setLoading(false);
        }
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar');
            return;
        }

        try {
            setUploading(true);

            // Upload to S3
            const filename = `avatars/${profile.id}-${Date.now()}.${file.name.split('.').pop()}`;
            const publicUrl = await uploadToS3ViaAPI(file, filename);

            if (publicUrl) {
                setAvatarUrl(publicUrl);
                toast.success('Foto profil berhasil diunggah');
            }
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error('Gagal mengunggah gambar');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSaving(true);

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: phone,
                    avatar_url: avatarUrl,
                    bio: bio,
                    social_links: socialLinks,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (error) throw error;

            toast.success('Profil berhasil diperbaharui');
            fetchProfile(); // Refresh context if needed
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error('Gagal memperbaharui profil: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header/Cover */}
                    <div className="h-32 bg-gray-100 relative" style={{ backgroundColor: `${primaryColor}10` }}>
                        <div className="absolute -bottom-12 left-8">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <User className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleImageClick}
                                    disabled={uploading}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-16 p-8">
                        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Pengaturan Profil</h2>
                                <p className="text-gray-500 text-sm">Kelola informasi diri dan foto profil Anda</p>
                            </div>
                            {profile?.verification_status && (
                                <div className={`px-4 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2 ${(profile.verification_status === 'verified' || profile.role === 'admin') ? 'bg-green-50 text-green-700 border-green-100' :
                                    profile.verification_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                        profile.verification_status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-gray-50 text-gray-600 border-gray-100'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full ${(profile.verification_status === 'verified' || profile.role === 'admin') ? 'bg-green-500' :
                                        profile.verification_status === 'pending' ? 'bg-yellow-500' :
                                            profile.verification_status === 'rejected' ? 'bg-red-500' :
                                                'bg-gray-400'
                                        }`}></div>
                                    Status Akun: {
                                        (profile.verification_status === 'verified' || profile.role === 'admin') ? (
                                            <span className="flex items-center gap-1">
                                                Terverifikasi
                                                <VerifiedBadge size="sm" />
                                            </span>
                                        ) :
                                            profile.verification_status === 'pending' ? 'Dalam Tinjauan' :
                                                profile.verification_status === 'rejected' ? 'Ditolak' :
                                                    'Belum Verifikasi'
                                    }
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
                                            placeholder="Masukkan nama lengkap"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Email</label>
                                    <div className="relative opacity-60">
                                        <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={profile?.email || ''}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400 italic">Email tidak dapat diubah secara langsung</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all"
                                            placeholder="Contoh: 08123456789"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role / Jabatan</label>
                                    <div className="relative opacity-60">
                                        <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={profile?.role || 'User'}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed uppercase"
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={saving || uploading}
                                    className="px-6 py-2.5 rounded-lg text-white font-semibold flex items-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
