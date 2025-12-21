import { Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppName } from '../hooks/useAppName';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

export default function Header() {
  const navigate = useNavigate();
  const { appName } = useAppName();
  const primaryColor = usePrimaryColor();

  // Get initials from app name (e.g., "Rumah Zakat" -> "RZ", "Donasiku" -> "DO")
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const activeColor = primaryColor || '#f97316'; // Fallback to orange

  return (
    <header className="sticky top-0 z-50 shadow-md transition-colors duration-300" style={{ backgroundColor: activeColor }}>
      <div className="w-full max-w-[480px] mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Left: Logo & Name */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
              <span className="font-bold text-sm" style={{ color: activeColor }}>
                {getInitials(appName)}
              </span>
            </div>
            <span className="text-white text-sm font-semibold tracking-wide">
              {appName}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">

            <button className="text-white p-1.5 hover:bg-white/20 rounded-full transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
