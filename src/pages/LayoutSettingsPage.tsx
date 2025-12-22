import { useState, useEffect } from 'react';
import {
  Layout,
  Image,
  List,


  Plus,
  Trash2,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Heart,
  HandHeart,
  Building,
  Coins,
  DollarSign,
  Gift,
  Users,
  Home,
  School,
  Building2,
  Baby,
  Shield,
  BookOpen,
  Calendar,
  Clock,
  Star,
  Award,
  Target,
  Zap,
  Flame,
  Droplet,
  Sun,
  Moon,
  Cloud,
  TreePine,
  Leaf,
  Flower2,
  Sparkles,
  Bell,
  Mail,
  Phone,
  MessageCircle,
  Share2,
  ThumbsUp,
  Smile,
  Camera,
  Video,
  Music,
  Film,
  Gamepad2,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Wallet,
  Banknote,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Briefcase,
  Folder,
  Archive,
  Database,
  Server,
  Globe,
  MapPin,
  Navigation,
  Compass,
  Plane,
  Car,
  Bike,
  Ship,
  Train,
  Bus,
  Truck,
  Megaphone,
  Menu,
  LogOut,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText as FileTextIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import ImageUpload from '../components/ImageUpload';

import { supabase, LayoutSettings } from '../lib/supabase';
import { SettingsPageSkeleton } from '../components/SkeletonLoader';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

// List of available icons from lucide-react
const availableIcons = [
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'hand-heart', label: 'Hand Heart', icon: HandHeart },
  { value: 'building', label: 'Building', icon: Building },
  { value: 'coins', label: 'Coins', icon: Coins },
  { value: 'dollar-sign', label: 'Dollar Sign', icon: DollarSign },
  { value: 'gift', label: 'Gift', icon: Gift },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'school', label: 'School', icon: School },
  { value: 'building-2', label: 'Building 2', icon: Building2 },
  { value: 'baby', label: 'Baby', icon: Baby },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'book-open', label: 'Book Open', icon: BookOpen },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'clock', label: 'Clock', icon: Clock },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'award', label: 'Award', icon: Award },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'flame', label: 'Flame', icon: Flame },
  { value: 'droplet', label: 'Droplet', icon: Droplet },
  { value: 'sun', label: 'Sun', icon: Sun },
  { value: 'moon', label: 'Moon', icon: Moon },
  { value: 'cloud', label: 'Cloud', icon: Cloud },
  { value: 'tree-pine', label: 'Tree Pine', icon: TreePine },
  { value: 'leaf', label: 'Leaf', icon: Leaf },
  { value: 'flower-2', label: 'Flower', icon: Flower2 },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'bell', label: 'Bell', icon: Bell },
  { value: 'mail', label: 'Mail', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'message-circle', label: 'Message Circle', icon: MessageCircle },
  { value: 'share-2', label: 'Share', icon: Share2 },
  { value: 'thumbs-up', label: 'Thumbs Up', icon: ThumbsUp },
  { value: 'smile', label: 'Smile', icon: Smile },
  { value: 'camera', label: 'Camera', icon: Camera },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'music', label: 'Music', icon: Music },
  { value: 'film', label: 'Film', icon: Film },
  { value: 'gamepad-2', label: 'Gamepad', icon: Gamepad2 },
  { value: 'shopping-bag', label: 'Shopping Bag', icon: ShoppingBag },
  { value: 'shopping-cart', label: 'Shopping Cart', icon: ShoppingCart },
  { value: 'credit-card', label: 'Credit Card', icon: CreditCard },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
  { value: 'banknote', label: 'Banknote', icon: Banknote },
  { value: 'trending-up', label: 'Trending Up', icon: TrendingUp },
  { value: 'bar-chart-3', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie-chart', label: 'Pie Chart', icon: PieChart },
  { value: 'activity', label: 'Activity', icon: Activity },
  { value: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'file-text', label: 'File Text', icon: FileTextIcon },
  { value: 'folder', label: 'Folder', icon: Folder },
  { value: 'archive', label: 'Archive', icon: Archive },
  { value: 'database', label: 'Database', icon: Database },
  { value: 'server', label: 'Server', icon: Server },
  { value: 'globe', label: 'Globe', icon: Globe },
  { value: 'map-pin', label: 'Map Pin', icon: MapPin },
  { value: 'navigation', label: 'Navigation', icon: Navigation },
  { value: 'compass', label: 'Compass', icon: Compass },
  { value: 'plane', label: 'Plane', icon: Plane },
  { value: 'car', label: 'Car', icon: Car },
  { value: 'bike', label: 'Bike', icon: Bike },
  { value: 'ship', label: 'Ship', icon: Ship },
  { value: 'train', label: 'Train', icon: Train },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'truck', label: 'Truck', icon: Truck },
];

const SortableProgramItem = ({
  id,
  item,
  index,
  isExpanded,
  toggleItem,
  updateItem,
  removeItem,
  availableIcons
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white mb-3">
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => toggleItem(index + 1000)}
      >
        <div className="flex items-center gap-2 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab hover:text-[var(--primary-color)] text-gray-400 p-1" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-5 h-5" />
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          <div className="flex items-center gap-2">
            {/* Show Icon Preview if possible */}
            <span className="font-semibold text-gray-700">{item.name || `Item ${index + 1}`}</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); removeItem(index); }}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Name</label>
              <input
                value={item.name || ''}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Name"
              />
            </div>
            <div className="w-1/3">
              <label className="text-xs text-gray-500 block mb-1">Icon</label>
              <select
                value={item.icon || 'heart'}
                onChange={(e) => updateItem(index, 'icon', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm font-sans"
              >
                {availableIcons.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">URL</label>
            <input
              value={item.url || ''}
              onChange={(e) => updateItem(index, 'url', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="/url"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default function LayoutSettingsPage() {
  usePageTitle('Pengaturan Layout');
  const primaryColor = usePrimaryColor();
  const [loading, setLoading] = useState(true);
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]); // Store all campaigns for selection
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const [settings, setSettings] = useState<LayoutSettings>({
    id: '',
    hero_slider_enabled: true,
    hero_slider_items: [],
    program_mendadak_enabled: true,
    program_mendadak_title: 'Program Mendadak',
    program_mendadak_description: '',
    program_mendadak_image: '',
    program_mendadak_button_text: 'Donasi Sekarang',
    program_mendadak_button_link: '/donasi',
    program_mendadak_items: [],
    campaign_list_enabled: true,
    campaign_list_layout: 'list',
    campaign_list_title: 'Rekomendasi',
    campaign_list_limit: 10,
    footer_enabled: true,
    footer_content: {},
    created_at: '',
    updated_at: '',
    promo_slider_enabled: true,
    promo_slider_items: [],
    cta_slider_enabled: true,
    cta_slider_items: []
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      // Fetch available campaigns for selection
      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, image_url, organization_name')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (campaignsData) {
        setAllCampaigns(campaignsData);
      }

      const { data, error } = await supabase
        .from('layout_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching layout settings:', error);
      }

      if (data) {
        // Parse items where necessary
        const heroItems = Array.isArray(data.hero_slider_items)
          ? data.hero_slider_items
          : (typeof data.hero_slider_items === 'string' ? JSON.parse(data.hero_slider_items || '[]') : []);

        const rawProgramItems = Array.isArray(data.program_mendadak_items)
          ? data.program_mendadak_items
          : (typeof data.program_mendadak_items === 'string' ? JSON.parse(data.program_mendadak_items || '[]') : []);

        // Ensure IDs for Sortable
        const programItems = rawProgramItems.map((item: any) => ({
          ...item,
          id: item.id || Math.random().toString(36).substr(2, 9)
        }));

        const promoItems = Array.isArray(data.promo_slider_items)
          ? data.promo_slider_items
          : (typeof data.promo_slider_items === 'string' ? JSON.parse(data.promo_slider_items || '[]') : []);

        const ctaItems = Array.isArray(data.cta_slider_items)
          ? data.cta_slider_items
          : (typeof data.cta_slider_items === 'string' ? JSON.parse(data.cta_slider_items || '[]') : []);

        setSettings({
          ...data,
          hero_slider_items: heroItems,
          program_mendadak_items: programItems,
          promo_slider_items: promoItems,
          cta_slider_items: ctaItems,
          // Defaults for new columns if null
          promo_slider_enabled: data.promo_slider_enabled ?? true,
          cta_slider_enabled: data.cta_slider_enabled ?? true,
          cta_primary_label: data.cta_primary_label || 'Donasi Sekarang',
          cta_primary_link: data.cta_primary_link || '/donasi',
          cta_secondary_label: data.cta_secondary_label || 'Hubungi Admin',
          cta_secondary_link: data.cta_secondary_link || 'https://wa.me/',

          // Campaign Slider Defaults
          campaign_slider_enabled: data.campaign_slider_enabled ?? true,
          campaign_slider_title: data.campaign_slider_title || 'Pilihan Donasiku',
          campaign_slider_ids: Array.isArray(data.campaign_slider_ids) ? data.campaign_slider_ids : [],

          // Campaign Slider 2 Defaults
          campaign_slider_2_enabled: data.campaign_slider_2_enabled ?? true,
          campaign_slider_2_title: data.campaign_slider_2_title || 'Pilihan Donasiku',
          campaign_slider_2_ids: Array.isArray(data.campaign_slider_2_ids) ? data.campaign_slider_2_ids : [],
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSettings((prev) => {
        const items = prev.program_mendadak_items || [];
        const oldIndex = items.findIndex((item: any) => item.id === active.id);
        const newIndex = items.findIndex((item: any) => item.id === over?.id);

        return {
          ...prev,
          program_mendadak_items: arrayMove(items, oldIndex, newIndex),
        };
      });
    }
  };

  const updateProgramItem = (index: number, field: string, value: any) => {
    setSettings(prev => {
      const newItems = [...(prev.program_mendadak_items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, program_mendadak_items: newItems };
    });
  };

  const removeProgramItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      program_mendadak_items: (prev.program_mendadak_items || []).filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (section?: string) => {
    try {
      setSavingSection(section || 'global');

      const settingsToSave = {
        ...settings,
        // Ensure arrays are sent (Supabase handles them for JSONB columns)
        hero_slider_items: settings.hero_slider_items || [],
        program_mendadak_items: settings.program_mendadak_items || [],
        promo_slider_items: settings.promo_slider_items || [],
        cta_slider_items: settings.cta_slider_items || [],
        // Explicitly set enabled flags
        promo_slider_enabled: settings.promo_slider_enabled,
        cta_slider_enabled: settings.cta_slider_enabled,
        cta_primary_label: settings.cta_primary_label,
        cta_primary_link: settings.cta_primary_link,
        cta_secondary_label: settings.cta_secondary_label,
        cta_secondary_link: settings.cta_secondary_link,
        campaign_slider_enabled: settings.campaign_slider_enabled,
        campaign_slider_title: settings.campaign_slider_title,
        campaign_slider_ids: settings.campaign_slider_ids || [],

        campaign_slider_2_enabled: settings.campaign_slider_2_enabled,
        campaign_slider_2_title: settings.campaign_slider_2_title,
        campaign_slider_2_ids: settings.campaign_slider_2_ids || []
      };

      // Check if settings exist
      const { data: existing, error: fetchError } = await supabase
        .from('layout_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing && existing.id) {
        // Update existing
        const { error } = await supabase
          .from('layout_settings')
          .update(settingsToSave)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new - remove id to let database generate it
        const { id, ...settingsWithoutId } = settingsToSave;
        const { error } = await supabase
          .from('layout_settings')
          .insert([settingsWithoutId]);

        if (error) throw error;
      }

      // Refresh settings after save
      await fetchSettings();
      toast.success('Pengaturan layout berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving layout settings:', error);
      toast.error('Gagal menyimpan pengaturan: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingSection(null);
    }
  };

  // Helper functions for sliders
  const addSliderItem = (type: 'hero' | 'promo' | 'cta') => {
    if (type === 'hero') {
      setSettings(prev => ({
        ...prev,
        hero_slider_items: [
          ...prev.hero_slider_items,
          { image: '', title: '', subtitle: '', description: '', buttonText: 'Donasi Sekarang', buttonLink: '/donasi' }
        ]
      }));
      toggleItem(settings.hero_slider_items.length, true); // hero index 0-999
    } else if (type === 'promo') {
      setSettings(prev => ({
        ...prev,
        promo_slider_items: [
          ...(prev.promo_slider_items || []),
          { image: '', title: '', subtitle: '', buttonText: 'Lihat Detail', buttonLink: '/', theme: 'pink' }
        ]
      }));
      toggleItem(2000 + (settings.promo_slider_items || []).length, true); // promo index 2000+
    } else {
      setSettings(prev => ({
        ...prev,
        cta_slider_items: [
          ...(prev.cta_slider_items || []),
          { image: '', title: '', subtitle: '', buttonText: 'Donasi', buttonLink: '/donasi', theme: 'pink' }
        ]
      }));
      toggleItem(3000 + (settings.cta_slider_items || []).length, true); // cta index 3000+
    }
  };

  const removeSliderItem = (type: 'hero' | 'promo' | 'cta', index: number) => {
    if (type === 'hero') {
      setSettings(prev => ({
        ...prev,
        hero_slider_items: prev.hero_slider_items.filter((_, i) => i !== index)
      }));
    } else if (type === 'promo') {
      setSettings(prev => ({
        ...prev,
        promo_slider_items: (prev.promo_slider_items || []).filter((_, i) => i !== index)
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        cta_slider_items: (prev.cta_slider_items || []).filter((_, i) => i !== index)
      }));
    }
  };

  const updateSliderItem = (type: 'hero' | 'promo' | 'cta', index: number, field: string, value: any) => {
    if (type === 'hero') {
      setSettings(prev => {
        const newItems = [...prev.hero_slider_items];
        newItems[index] = { ...newItems[index], [field]: value };
        return { ...prev, hero_slider_items: newItems };
      });
    } else if (type === 'promo') {
      setSettings(prev => {
        const newItems = [...(prev.promo_slider_items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        return { ...prev, promo_slider_items: newItems };
      });
    } else {
      setSettings(prev => {
        const newItems = [...(prev.cta_slider_items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        return { ...prev, cta_slider_items: newItems };
      });
    }
  };

  const toggleItem = (index: number, forceState?: boolean) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (forceState !== undefined) {
        if (forceState) newSet.add(index);
        else newSet.delete(index);
      } else {
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
      }
      return newSet;
    });
  };

  const isItemExpanded = (index: number) => expandedItems.has(index);

  // Helper Save Button Component
  const CardSaveButton = ({ section }: { section?: string }) => {
    const isSaving = savingSection === section;

    return (
      <div className="flex justify-end mt-6">
        <button
          onClick={() => handleSave(section)}
          disabled={isSaving}
          className="px-6 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 md:ml-0 transition-all duration-300">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                {/* Title removed from here */}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Page Title (Moved from Header) */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Pengaturan Layout</h1>
            <p className="text-sm text-gray-600">Kelola tampilan halaman utama</p>
          </div>

          {loading ? (
            <SettingsPageSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">

              {/* Left Column: General Sections */}
              <div className="space-y-6 order-2 lg:order-1">

                {/* Program Mendadak Settings */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Layout className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Program Mendadak (Icons)</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.program_mendadak_enabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, program_mendadak_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                  {settings.program_mendadak_enabled && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        <input
                          type="text"
                          value={settings.program_mendadak_title || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, program_mendadak_title: e.target.value }))}
                          placeholder="Title"
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Items</label>
                        <div className="space-y-3">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={(settings.program_mendadak_items || []).map((item: any) => item.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {(settings.program_mendadak_items || []).map((item, index) => {
                                const itemIndex = index + 1000;
                                const isExpanded = isItemExpanded(itemIndex);
                                // Ensure item has ID for fallback if random ID generation failed?
                                // But we added IDs in fetchSettings.
                                // If adding new item, we must ensure ID there too.
                                return (
                                  <SortableProgramItem
                                    key={item.id || index}
                                    id={item.id}
                                    item={item}
                                    index={index}
                                    isExpanded={isExpanded}
                                    toggleItem={toggleItem}
                                    updateItem={updateProgramItem}
                                    removeItem={removeProgramItem}
                                    availableIcons={availableIcons}
                                  />
                                );
                              })}
                            </SortableContext>
                          </DndContext>
                          <button
                            onClick={() => {
                              const newItems = [...(settings.program_mendadak_items || []), {
                                id: Math.random().toString(36).substr(2, 9),
                                icon: 'heart',
                                name: '',
                                url: ''
                              }];
                              setSettings(prev => ({ ...prev, program_mendadak_items: newItems }));
                              toggleItem(1000 + newItems.length - 1, true);
                            }}
                            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-gray-600"
                          >
                            <Plus className="w-4 h-4" /> Tambah Program
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <CardSaveButton section="program" />
                </div>

                {/* Campaign List Settings */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <List className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1"><h3 className="text-lg font-bold text-gray-800">Daftar Campaign</h3></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.campaign_list_enabled} onChange={(e) => setSettings(prev => ({ ...prev, campaign_list_enabled: e.target.checked }))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                  {settings.campaign_list_enabled && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        <input type="text" value={settings.campaign_list_title || ''} onChange={(e) => setSettings(prev => ({ ...prev, campaign_list_title: e.target.value }))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Layout</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2"><input type="radio" checked={settings.campaign_list_layout === 'list'} onChange={() => setSettings(prev => ({ ...prev, campaign_list_layout: 'list' }))} /> List</label>
                          <label className="flex items-center gap-2"><input type="radio" checked={settings.campaign_list_layout === 'grid'} onChange={() => setSettings(prev => ({ ...prev, campaign_list_layout: 'grid' }))} /> Grid</label>
                        </div>
                      </div>
                    </div>
                  )}
                  <CardSaveButton section="campaign_list" />
                </div>

                {/* Footer Settings */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileTextIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1"><h3 className="text-lg font-bold text-gray-800">Footer</h3></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.footer_enabled} onChange={(e) => setSettings(prev => ({ ...prev, footer_enabled: e.target.checked }))} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                  {settings.footer_enabled && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi (Bawah Logo)</label>
                        <textarea
                          rows={3}
                          value={settings.footer_content?.description || ''}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            footer_content: { ...prev.footer_content, description: e.target.value }
                          }))}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                          placeholder="Deskripsi singkat yayasan..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                          <textarea
                            rows={3}
                            value={settings.footer_content?.address || ''}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              footer_content: { ...prev.footer_content, address: e.target.value }
                            }))}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                            placeholder="Alamat lengkap..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">No. Telepon</label>
                          <input
                            type="text"
                            value={settings.footer_content?.phone || ''}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              footer_content: { ...prev.footer_content, phone: e.target.value }
                            }))}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                            placeholder="628..."
                          />
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Link Cepat</label>
                        <div className="space-y-3">
                          {(settings.footer_content?.quick_links || []).map((link: any, index: number) => (
                            <div key={index} className="flex gap-2 items-start">
                              <div className="w-1/3">
                                <input
                                  type="text"
                                  value={link.label}
                                  onChange={(e) => {
                                    const newLinks = [...(settings.footer_content?.quick_links || [])];
                                    newLinks[index] = { ...newLinks[index], label: e.target.value };
                                    setSettings(prev => ({
                                      ...prev,
                                      footer_content: { ...prev.footer_content, quick_links: newLinks }
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                  placeholder="Label"
                                />
                              </div>
                              <div className="w-1/3">
                                <input
                                  type="text"
                                  value={link.url}
                                  onChange={(e) => {
                                    const newLinks = [...(settings.footer_content?.quick_links || [])];
                                    newLinks[index] = { ...newLinks[index], url: e.target.value };
                                    setSettings(prev => ({
                                      ...prev,
                                      footer_content: { ...prev.footer_content, quick_links: newLinks }
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                  placeholder="URL"
                                />
                              </div>
                              <div className="w-1/4">
                                <select
                                  value={link.icon || 'Link'}
                                  onChange={(e) => {
                                    const newLinks = [...(settings.footer_content?.quick_links || [])];
                                    newLinks[index] = { ...newLinks[index], icon: e.target.value };
                                    setSettings(prev => ({
                                      ...prev,
                                      footer_content: { ...prev.footer_content, quick_links: newLinks }
                                    }));
                                  }}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                >
                                  <option value="Link">Link</option>
                                  <option value="Home">Home</option>
                                  <option value="Heart">Heart</option>
                                  <option value="HelpCircle">Help</option>
                                  <option value="Phone">Phone</option>
                                  <option value="Info">Info</option>
                                  <option value="FileText">File</option>
                                  <option value="Mail">Mail</option>
                                  <option value="Gift">Gift</option>
                                </select>
                              </div>
                              <button
                                onClick={() => {
                                  const newLinks = (settings.footer_content?.quick_links || []).filter((_: any, i: number) => i !== index);
                                  setSettings(prev => ({
                                    ...prev,
                                    footer_content: { ...prev.footer_content, quick_links: newLinks }
                                  }));
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newLinks = [...(settings.footer_content?.quick_links || []), { label: '', url: '' }];
                              setSettings(prev => ({
                                ...prev,
                                footer_content: { ...prev.footer_content, quick_links: newLinks }
                              }));
                            }}
                            className="text-sm text-theme-orange font-medium flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-4 h-4" /> Tambah Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <CardSaveButton section="footer" />
                </div>
              </div>


              {/* Campaign Slider Settings (NEW) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">Campaign Slider (Pilihan Donasiku)</h3>
                    <p className="text-xs text-gray-500">Atur judul dan pilih campaign yang muncul.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.campaign_slider_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, campaign_slider_enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                  </label>
                </div>
                {settings.campaign_slider_enabled && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title Section</label>
                      <input
                        type="text"
                        value={settings.campaign_slider_title || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, campaign_slider_title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                        placeholder="Contoh: Pilihan Donasiku"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Campaign ({settings.campaign_slider_ids?.length || 0})</label>
                      <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-lg p-2 space-y-1">
                        {allCampaigns.map(campaign => {
                          const isSelected = (settings.campaign_slider_ids || []).includes(campaign.id);
                          return (
                            <div
                              key={campaign.id}
                              onClick={() => {
                                setSettings(prev => {
                                  const currentIds = prev.campaign_slider_ids || [];
                                  if (isSelected) {
                                    return { ...prev, campaign_slider_ids: currentIds.filter(id => id !== campaign.id) };
                                  } else {
                                    return { ...prev, campaign_slider_ids: [...currentIds, campaign.id] };
                                  }
                                });
                              }}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              {campaign.image_url && <img src={campaign.image_url} className="w-8 h-8 rounded object-cover" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{campaign.title}</p>
                                <p className="text-xs text-gray-500 truncate">{campaign.organization_name}</p>
                              </div>
                            </div>
                          )
                        })}
                        {allCampaigns.length === 0 && <p className="text-sm text-gray-500 p-2 text-center">Belum ada campaign published.</p>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Klik untuk memilih/menghapus campaign.</p>
                    </div>
                  </div>
                )}
                <CardSaveButton section="campaign_slider" />
              </div>

              {/* Campaign Slider 2 Settings (NEW) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">Campaign Slider 2 (Bawah)</h3>
                    <p className="text-xs text-gray-500">Atur judul dan pilih campaign untuk slider kedua.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.campaign_slider_2_enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, campaign_slider_2_enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                  </label>
                </div>
                {settings.campaign_slider_2_enabled && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title Section</label>
                      <input
                        type="text"
                        value={settings.campaign_slider_2_title || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, campaign_slider_2_title: e.target.value }))}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[var(--primary-color)]"
                        placeholder="Contoh: Pilihan Donasiku"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Campaign ({settings.campaign_slider_2_ids?.length || 0})</label>
                      <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-lg p-2 space-y-1">
                        {allCampaigns.map(campaign => {
                          const isSelected = (settings.campaign_slider_2_ids || []).includes(campaign.id);
                          return (
                            <div
                              key={campaign.id}
                              onClick={() => {
                                setSettings(prev => {
                                  const currentIds = prev.campaign_slider_2_ids || [];
                                  if (isSelected) {
                                    return { ...prev, campaign_slider_2_ids: currentIds.filter(id => id !== campaign.id) };
                                  } else {
                                    return { ...prev, campaign_slider_2_ids: [...currentIds, campaign.id] };
                                  }
                                });
                              }}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              {campaign.image_url && <img src={campaign.image_url} className="w-8 h-8 rounded object-cover" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{campaign.title}</p>
                                <p className="text-xs text-gray-500 truncate">{campaign.organization_name}</p>
                              </div>
                            </div>
                          )
                        })}
                        {allCampaigns.length === 0 && <p className="text-sm text-gray-500 p-2 text-center">Belum ada campaign published.</p>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Klik untuk memilih/menghapus campaign.</p>
                    </div>
                  </div>
                )}
                <CardSaveButton section="campaign_slider_2" />
              </div>

              {/* Right Column: Slider Settings */}
              <div className="space-y-6 order-1 lg:order-2">

                {/* Hero Slider Settings */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Image className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Hero Slider (Top)</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.hero_slider_enabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, hero_slider_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                  {settings.hero_slider_enabled && (
                    <div className="space-y-4 mt-4">
                      {settings.hero_slider_items.map((item, index) => {
                        const isExpanded = isItemExpanded(index);
                        return (
                          <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleItem(index)}
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                <h4 className="font-semibold text-gray-700">Slide {index + 1}</h4>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeSliderItem('hero', index); }} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            {isExpanded && (
                              <div className="p-4 space-y-3">
                                <ImageUpload
                                  label="Gambar"
                                  value={item.image}
                                  onChange={(url) => updateSliderItem('hero', index, 'image', url)}
                                  folder="hero-slider"
                                  height="h-48"
                                  placeholder="Upload gambar"
                                />
                                <input value={item.title} onChange={(e) => updateSliderItem('hero', index, 'title', e.target.value)} placeholder="Judul" className="w-full px-4 py-2 border rounded-lg" />
                                <input value={item.subtitle || ''} onChange={(e) => updateSliderItem('hero', index, 'subtitle', e.target.value)} placeholder="Subtitle" className="w-full px-4 py-2 border rounded-lg" />
                                <textarea value={item.description || ''} onChange={(e) => updateSliderItem('hero', index, 'description', e.target.value)} placeholder="Description" className="w-full px-4 py-2 border rounded-lg" />
                                <div className="grid grid-cols-2 gap-2">
                                  <input value={item.buttonText || ''} onChange={(e) => updateSliderItem('hero', index, 'buttonText', e.target.value)} placeholder="Button Text" className="w-full px-4 py-2 border rounded-lg" />
                                  <input value={item.buttonLink || ''} onChange={(e) => updateSliderItem('hero', index, 'buttonLink', e.target.value)} placeholder="Link" className="w-full px-4 py-2 border rounded-lg" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => addSliderItem('hero')} className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-600"><Plus className="w-4 h-4" /> Tambah Slide</button>
                    </div>
                  )}
                  <CardSaveButton section="hero_slider" />
                </div>

                {/* Promo / Spesial Buat Kamu Slider Settings */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Slider "Spesial Buat Kamu"</h3>
                      <p className="text-xs text-gray-500">Slider promosi/khusus (Tengah)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.promo_slider_enabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, promo_slider_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                  {settings.promo_slider_enabled && (
                    <div className="space-y-4 mt-4">
                      {(settings.promo_slider_items || []).map((item, index) => {
                        const itemIndex = index + 2000;
                        const isExpanded = isItemExpanded(itemIndex);
                        return (
                          <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleItem(itemIndex)}
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                <h4 className="font-semibold text-gray-700">{item.title || `Promo ${index + 1}`}</h4>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeSliderItem('promo', index); }} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            {isExpanded && (
                              <div className="p-4 space-y-3">
                                <ImageUpload
                                  label="Gambar Background"
                                  value={item.image}
                                  onChange={(url) => updateSliderItem('promo', index, 'image', url)}
                                  folder="promo-slider"
                                  height="h-32"
                                  placeholder="Upload gambar"
                                />
                                <input value={item.title || ''} onChange={(e) => updateSliderItem('promo', index, 'title', e.target.value)} placeholder="Judul Promo" className="w-full px-4 py-2 border rounded-lg" />
                                <input value={item.subtitle || ''} onChange={(e) => updateSliderItem('promo', index, 'subtitle', e.target.value)} placeholder="Subtitle" className="w-full px-4 py-2 border rounded-lg" />

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Button Text</label>
                                    <input value={item.buttonText || ''} onChange={(e) => updateSliderItem('promo', index, 'buttonText', e.target.value)} placeholder="Cek Sekarang" className="w-full px-4 py-2 border rounded-lg" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Link</label>
                                    <input value={item.buttonLink || ''} onChange={(e) => updateSliderItem('promo', index, 'buttonLink', e.target.value)} placeholder="/link" className="w-full px-4 py-2 border rounded-lg" />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Tema Warna</label>
                                  <select
                                    value={item.theme || 'pink'}
                                    onChange={(e) => updateSliderItem('promo', index, 'theme', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                  >
                                    <option value="pink">Pink (Baby/Love)</option>
                                    <option value="green">Green (Zakat/Help)</option>
                                    <option value="blue">Blue (General)</option>
                                    <option value="orange">Orange (Primary)</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => addSliderItem('promo')} className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-600"><Plus className="w-4 h-4" /> Tambah Promo</button>
                    </div>
                  )}
                  <CardSaveButton section="promo_slider" />
                </div>

                {/* CTA Slider Settings (NEW) */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Slider CTA (Bawah)</h3>
                      <p className="text-xs text-gray-500">Slider ajakan donasi / urgent (Pink Theme)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.cta_slider_enabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, cta_slider_enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                  {settings.cta_slider_enabled && (
                    <div className="space-y-4 mt-4">
                      {(settings.cta_slider_items || []).map((item, index) => {
                        const itemIndex = index + 3000;
                        const isExpanded = isItemExpanded(itemIndex);
                        return (
                          <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleItem(itemIndex)}
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                                <h4 className="font-semibold text-gray-700">{item.title || `Slide ${index + 1}`}</h4>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeSliderItem('cta', index); }} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            {isExpanded && (
                              <div className="p-4 space-y-3">
                                <ImageUpload
                                  label="Gambar Background"
                                  value={item.image}
                                  onChange={(url) => updateSliderItem('cta', index, 'image', url)}
                                  folder="cta-slider"
                                  height="h-32"
                                  placeholder="Upload gambar"
                                />
                                <input value={item.title || ''} onChange={(e) => updateSliderItem('cta', index, 'title', e.target.value)} placeholder="Judul CTA" className="w-full px-4 py-2 border rounded-lg" />
                                <input value={item.subtitle || ''} onChange={(e) => updateSliderItem('cta', index, 'subtitle', e.target.value)} placeholder="Subtitle" className="w-full px-4 py-2 border rounded-lg" />

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Button Text</label>
                                    <input value={item.buttonText || ''} onChange={(e) => updateSliderItem('cta', index, 'buttonText', e.target.value)} placeholder="Donasi Sekarang" className="w-full px-4 py-2 border rounded-lg" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Link</label>
                                    <input value={item.buttonLink || ''} onChange={(e) => updateSliderItem('cta', index, 'buttonLink', e.target.value)} placeholder="/donasi" className="w-full px-4 py-2 border rounded-lg" />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Tema Warna</label>
                                  <select
                                    value={item.theme || 'pink'}
                                    onChange={(e) => updateSliderItem('cta', index, 'theme', e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                  >
                                    <option value="pink">Pink (Baby/Love)</option>
                                    <option value="green">Green (Zakat/Help)</option>
                                    <option value="blue">Blue (General)</option>
                                    <option value="orange">Orange (Primary)</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => addSliderItem('cta')} className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-gray-600"><Plus className="w-4 h-4" /> Tambah CTA Slide</button>
                    </div>
                  )}
                  <CardSaveButton section="cta_slider" />
                </div>

                {/* Donation Stats / Bottom CTA Settings (NEW) */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Heart className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Section "Sudah Berbagi?"</h3>
                      <p className="text-xs text-gray-500">Atur tombol pemicu donasi (Paling Bawah)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Primary Button */}
                      <div className="space-y-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <label className="text-sm font-semibold text-gray-700 block">Tombol Utama (Warna)</label>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Label</label>
                          <input
                            value={settings.cta_primary_label || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, cta_primary_label: e.target.value }))}
                            placeholder="Donasi Sekarang"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Link</label>
                          <input
                            value={settings.cta_primary_link || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, cta_primary_link: e.target.value }))}
                            placeholder="/donasi"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Secondary Button */}
                      <div className="space-y-3 p-3 border border-gray-200 rounded-lg bg-white">
                        <label className="text-sm font-semibold text-gray-700 block">Tombol Kedua (Outline)</label>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Label</label>
                          <input
                            value={settings.cta_secondary_label || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, cta_secondary_label: e.target.value }))}
                            placeholder="Hubungi Admin"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Link</label>
                          <input
                            value={settings.cta_secondary_link || ''}
                            onChange={(e) => setSettings(prev => ({ ...prev, cta_secondary_link: e.target.value }))}
                            placeholder="https://wa.me/..."
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardSaveButton section="donation_stats" />
                </div>

              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
