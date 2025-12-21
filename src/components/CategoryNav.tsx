import * as LucideIcons from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, ProgramMendadakItem } from '../lib/supabase';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { getHoverColor } from '../utils/colorUtils';

const iconMap: Record<string, React.ReactNode> = {
  heart: <LucideIcons.Heart className="w-8 h-8" />,
  'hand-heart': <LucideIcons.HandHeart className="w-8 h-8" />,
  building: <LucideIcons.Building className="w-8 h-8" />,
  coins: <LucideIcons.Coins className="w-8 h-8" />,
  calendar: <LucideIcons.Calendar className="w-8 h-8" />,
};

export default function CategoryNav() {
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const hoverColor = getHoverColor(primaryColor);
  const [programItems, setProgramItems] = useState<ProgramMendadakItem[]>([]);
  const [title, setTitle] = useState('Program Mendadak');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    fetchProgramSettings();
  }, []);

  const fetchProgramSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('layout_settings')
        .select('program_mendadak_enabled, program_mendadak_title, program_mendadak_items')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching program settings:', error);
      }

      const items = data?.program_mendadak_items
        ? (Array.isArray(data.program_mendadak_items)
          ? data.program_mendadak_items
          : JSON.parse(data.program_mendadak_items))
        : [];

      if (items.length > 0) {
        setProgramItems(items);
      } else {
        // Fallback default items
        setProgramItems([
          { name: 'Infaq', icon: 'heart', url: '/infaq' },
          { name: 'Sedekah', icon: 'hand-heart', url: '/donasi' },
          { name: 'Wakaf', icon: 'building', url: '/wakaf' },
          { name: 'Zakat', icon: 'coins', url: '/zakat' },
          { name: 'Fidyah', icon: 'calendar', url: '/fidyah' },
        ]);
      }

      if (data) {
        setEnabled(data.program_mendadak_enabled ?? true);
        setTitle(data.program_mendadak_title || 'Program Unggulan');
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback on error
      setProgramItems([
        { name: 'Infaq', icon: 'heart', url: '/infaq' },
        { name: 'Sedekah', icon: 'hand-heart', url: '/donasi' },
        { name: 'Wakaf', icon: 'building', url: '/wakaf' },
        { name: 'Zakat', icon: 'coins', url: '/zakat' },
        { name: 'Fidyah', icon: 'calendar', url: '/fidyah' },
      ]);
      setTitle('Program Unggulan');
    }
  };

  const getIcon = (iconName: string) => {
    // Try to get icon from iconMap first
    if (iconMap[iconName]) {
      return iconMap[iconName];
    }

    // Try to get icon dynamically from lucide-react
    const IconComponent = (LucideIcons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())];
    if (IconComponent) {
      return <IconComponent className="w-8 h-8" />;
    }

    // Fallback to heart icon
    return <LucideIcons.Heart className="w-8 h-8" />;
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="bg-white py-8 shadow-sm">
      <div className="w-full max-w-[480px] mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {title}
        </h2>
        <div
          className="grid gap-6 max-w-3xl mx-auto"
          style={{ gridTemplateColumns: `repeat(${Math.min(programItems.length, 4)}, minmax(0, 1fr))` }}
        >
          {programItems.map((item, index) => (
            <button
              key={index}
              onClick={() => item.url && navigate(item.url)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg transition-colors group"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${primaryColor}10`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors"
                style={{ backgroundColor: primaryColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverColor}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = primaryColor}
              >
                {getIcon(item.icon || 'heart')}
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
