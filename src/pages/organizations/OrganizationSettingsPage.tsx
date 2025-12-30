import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';
import DashboardLayout from '../../components/DashboardLayout';
import { useOrganization } from '../../context/OrganizationContext';
import {
    Building2,
    Users,
    Settings as SettingsIcon,
    Trash2,
    Save,
    UserPlus,
    ExternalLink,
    Copy,
    Check
} from 'lucide-react';
import { uploadToS3 } from '../../utils/s3Storage';

interface Member {
    id: string; // organization_member id
    user_id: string;
    role: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
        avatar_url: string;
    };
}

export default function OrganizationSettingsPage() {
    usePageTitle('Pengaturan Organisasi');
    const navigate = useNavigate();
    const { selectedOrganization, refreshOrganizations } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'members'>('members');

    // General State
    const [orgName, setOrgName] = useState('');
    const [orgSlug, setOrgSlug] = useState('');
    const [orgDescription, setOrgDescription] = useState('');
    const [orgLocation, setOrgLocation] = useState('');
    const [orgWhatsapp, setOrgWhatsapp] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');

    // Members State
    const [members, setMembers] = useState<Member[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [copied, setCopied] = useState(false);

    const publicUrl = selectedOrganization ? `${window.location.origin}/org/${selectedOrganization.slug}` : '';

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        toast.success('Link profil disalin');
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (!selectedOrganization) {
            navigate('/dashboard');
            return;
        }

        // ACCESS CONTROL: Only owner or admin can access settings
        if (selectedOrganization.role === 'member') {
            toast.error('Akses Ditolak', {
                description: 'Hanya Admin atau Owner yang dapat mengelola organisasi.'
            });
            navigate('/dashboard');
            return;
        }

        // Init General Stats
        setOrgName(selectedOrganization.name || '');
        setOrgSlug(selectedOrganization.slug || '');
        setOrgDescription(selectedOrganization.description || '');
        setOrgLocation(selectedOrganization.location || '');
        setOrgWhatsapp(selectedOrganization.whatsapp_no || '');
        setLogoPreview(selectedOrganization.logo_url || '');

        // Fetch Members
        fetchMembers();
    }, [selectedOrganization, navigate]);

    const fetchMembers = async () => {
        if (!selectedOrganization) return;
        setLoadingMembers(true);
        try {
            const { data, error } = await supabase
                .from('organization_members')
                .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
                .eq('organization_id', selectedOrganization.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMembers(data as unknown as Member[]);
        } catch (error) {
            console.error('Error fetching members:', error);
            toast.error('Gagal memuat daftar anggota');
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleUpdateGeneral = async () => {
        if (!selectedOrganization) return;
        setLoading(true);
        try {
            let logoUrl = logoPreview;
            if (logoFile) {
                const s3Url = await uploadToS3(logoFile, 'organizations', selectedOrganization.logo_url);
                if (s3Url) logoUrl = s3Url;
            }

            const { error } = await supabase
                .from('organizations')
                .update({
                    name: orgName,
                    slug: orgSlug,
                    description: orgDescription,
                    location: orgLocation,
                    whatsapp_no: orgWhatsapp,
                    logo_url: logoUrl
                })
                .eq('id', selectedOrganization.id);

            if (error) throw error;
            toast.success('Informasi organisasi diperbarui');
            refreshOrganizations(); // Refresh global context
        } catch (error: any) {
            toast.error('Gagal memperbarui: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrganization || !inviteEmail) return;

        setLoading(true);
        try {
            // 1. Find user by email (Public profiles query)
            const { data: userProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('email', inviteEmail)
                .single();

            if (profileError || !userProfile) {
                toast.error('User tidak ditemukan', {
                    description: 'Pastikan email sudah terdaftar di aplikasi ini.'
                });
                return;
            }

            // 2. Check if already member
            const existingMember = members.find(m => m.user_id === userProfile.id);
            if (existingMember) {
                toast.error('User sudah menjadi anggota');
                return;
            }

            // 3. Add to organization_members
            const { error: inviteError } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: selectedOrganization.id,
                    user_id: userProfile.id,
                    role: inviteRole
                });

            if (inviteError) throw inviteError;

            toast.success(`Berhasil menambahkan ${userProfile.full_name || inviteEmail} sebagai ${inviteRole}`);
            setInviteEmail('');
            setInviteRole('member');
            fetchMembers();

        } catch (error: any) {
            console.error('Invite error:', error);
            toast.error('Gagal menambahkan anggota: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        if (!selectedOrganization) return;
        try {
            const { error } = await supabase
                .from('organization_members')
                .update({ role: newRole })
                .eq('id', memberId)
                .eq('organization_id', selectedOrganization.id);

            if (error) throw error;
            toast.success('Role anggota diperbarui');
            fetchMembers();
        } catch (error: any) {
            toast.error('Gagal memperbarui role: ' + error.message);
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Hapus ${memberName} dari organisasi?`)) return;
        if (!selectedOrganization) return;

        try {
            const { error } = await supabase
                .from('organization_members')
                .delete()
                .eq('id', memberId)
                .eq('organization_id', selectedOrganization.id); // Extra safety

            if (error) throw error;

            toast.success('Anggota dihapus');
            fetchMembers();
        } catch (error: any) {
            toast.error('Gagal menghapus: ' + error.message);
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

    if (!selectedOrganization) return null;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                            <img src={logoPreview} alt={orgName} className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="w-8 h-8 text-gray-400" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{selectedOrganization.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <a
                                href={`/org/${selectedOrganization.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>/org/{selectedOrganization.slug}</span>
                            </a>
                            <button
                                onClick={handleCopyLink}
                                className="p-1 hover:bg-gray-100 rounded text-gray-400 group relative"
                                title="Salin URL Profil"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 group-hover:text-gray-600" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'members'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <Users className="w-4 h-4" />
                            Anggota
                        </button>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'general'
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            <SettingsIcon className="w-4 h-4" />
                            Umum
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {activeTab === 'general' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="space-y-4 max-w-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Organisasi</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 relative">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className="w-8 h-8 text-gray-400" />
                                        )}
                                    </div>
                                    <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                    <label htmlFor="logo-upload" className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 cursor-pointer">
                                        Ganti Logo
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Organisasi</label>
                                <input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug URL (donasiku.com/org/...)</label>
                                <input
                                    type="text"
                                    value={orgSlug}
                                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Hati-hati: Mengubah slug akan mengubah link profil publik organisasi Anda.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                                <input
                                    type="text"
                                    value={orgLocation}
                                    onChange={(e) => setOrgLocation(e.target.value)}
                                    placeholder="Contoh: Jakarta, Indonesia"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor WhatsApp Kontak</label>
                                <input
                                    type="text"
                                    value={orgWhatsapp}
                                    onChange={(e) => setOrgWhatsapp(e.target.value)}
                                    placeholder="Contoh: 628123456789"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Gunakan format internasional (tanpa + atau 0), contoh: 628123456789</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Deskripsi</label>
                                <textarea
                                    value={orgDescription}
                                    onChange={(e) => setOrgDescription(e.target.value)}
                                    placeholder="Tuliskan profil singkat yayasan Anda..."
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Muncul di profil publik organisasi.</p>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handleUpdateGeneral}
                                    disabled={loading}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div className="space-y-6">
                        {/* Add Member Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Undang Anggota Baru</h3>
                            <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Pengguna</label>
                                    <input
                                        type="email"
                                        placeholder="masukkan.email@user.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        required
                                    />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                    >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 mb-[1px] w-full md:w-auto justify-center"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Undang
                                </button>
                            </form>
                            <p className="text-xs text-gray-500 mt-2">* User harus sudah terdaftar di aplikasi Donasiku</p>
                        </div>

                        {/* Member List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Daftar Anggota</h3>
                            </div>
                            {loadingMembers ? (
                                <div className="p-6 text-center text-gray-500">Memuat anggota...</div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {members.map((member) => (
                                        <li key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                    {member.profiles?.avatar_url ? (
                                                        <img src={member.profiles.avatar_url} alt={member.profiles.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-600 font-bold">{member.profiles?.full_name?.charAt(0) || '?'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{member.profiles?.full_name || 'Tidak ada nama'}</p>
                                                    <p className="text-xs text-gray-500">{member.profiles?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {member.role === 'owner' ? (
                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 capitalize">
                                                        {member.role}
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                                        className={`px-2 py-1 text-xs font-semibold rounded-full border-none outline-none focus:ring-1 focus:ring-orange-500 capitalize cursor-pointer ${member.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                            }`}
                                                    >
                                                        <option value="member">Member</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                )}
                                                {member.role !== 'owner' && (
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id, member.profiles?.full_name)}
                                                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                        title="Hapus Anggota"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}
