import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppName } from '../hooks/useAppName';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import ShareModal from './ShareModal';

export default function Header() {
  const navigate = useNavigate();
  const { appName, logoUrl } = useAppName();
  const primaryColor = usePrimaryColor();
  const [showShareModal, setShowShareModal] = useState(false);

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
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="w-8 h-8 rounded-full object-cover bg-white shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                <span className="font-bold text-sm" style={{ color: activeColor }}>
                  {getInitials(appName)}
                </span>
              </div>
            )}
            <span className="text-white text-sm font-semibold tracking-wide">
              {appName}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">

            <button
              onClick={() => setShowShareModal(true)}
              className="text-white p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={`${window.location.origin}${window.location.pathname}?utm_source=socialsharing_donor_web_app&utm_medium=share_campaign_copas&utm_campaign=share_detail_campaign`}
        shareText={`Donasi sekarang melalui aplikasi ${appName || 'Donasiku'}`}
      />
    </header>
  );
}
