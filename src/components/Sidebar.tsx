import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Heart,
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  HandHeart,
  Settings,
  ChevronDown,
  ChevronRight,
  Coins,
  Users,
  UserCog
} from 'lucide-react';
import { useAppSettings } from '../hooks/useAppSettings';
import { usePrimaryColor } from '../hooks/usePrimaryColor';

interface SubMenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  subMenu?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/dashboard'
  },
  {
    label: 'Donasi',
    icon: <Heart className="w-5 h-5" />,
    path: '/donasi/dashboard',
    subMenu: [
      {
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-4 h-4" />,
        path: '/donasi/dashboard'
      },
      {
        label: 'Campaigns',
        icon: <FolderKanban className="w-4 h-4" />,
        path: '/donasi/campaigns'
      },
      {
        label: 'Donatur',
        icon: <Users className="w-4 h-4" />,
        path: '/donasi/donaturs'
      },
      {
        label: 'Campaigner',
        icon: <UserCog className="w-4 h-4" />,
        path: '/donasi/campaigners'
      },
      {
        label: 'Analytics',
        icon: <BarChart3 className="w-4 h-4" />,
        path: '/donasi/analytics'
      },
      {
        label: 'Fundraising',
        icon: <HandHeart className="w-4 h-4" />,
        path: '/donasi/fundraising'
      },
      {
        label: 'Settings',
        icon: <Settings className="w-4 h-4" />,
        path: '/donasi/settings'
      },
    ]
  },
  {
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    path: '/settings'
  },
  {
    label: 'Zakat Settings',
    icon: <Coins className="w-5 h-5" />,
    path: '/zakat/settings'
  },
  {
    label: 'Infaq Settings',
    icon: <Heart className="w-5 h-5" />,
    path: '/infaq/settings'
  },
  {
    label: 'Fidyah Settings',
    icon: <HandHeart className="w-5 h-5" />,
    path: '/fidyah/settings'
  },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useAppSettings();
  const primaryColor = usePrimaryColor();
  // Initialize with Donasi menu always expanded
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/donasi/dashboard']);

  const appName = settings?.app_name || 'Donasiku';
  const logoUrl = settings?.logo_url;
  // Get first letter of app name for icon (fallback if no logo)
  const appInitial = appName.charAt(0).toUpperCase();

  // Auto-expand menu jika salah satu submenu aktif (kecuali Donasi yang sudah selalu expanded)
  useEffect(() => {
    const activeMenu = menuItems.find(menu =>
      menu.subMenu?.some(sub => location.pathname.startsWith(sub.path))
    );
    if (activeMenu && activeMenu.path !== '/donasi/dashboard') {
      setExpandedMenus(prev => {
        if (!prev.includes(activeMenu.path)) {
          return [...prev, activeMenu.path];
        }
        return prev;
      });
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const toggleMenu = (path: string) => {
    // Donasi menu should not be collapsible - always keep it expanded
    if (path === '/donasi/dashboard') {
      return; // Do nothing, keep it expanded
    }

    if (expandedMenus.includes(path)) {
      setExpandedMenus(expandedMenus.filter(p => p !== path));
    } else {
      setExpandedMenus([...expandedMenus, path]);
    }
  };

  const isExpanded = (path: string) => {
    return expandedMenus.includes(path);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Logo/App Name Header */}
      <div className="border-b-2 p-4 bg-white flex-shrink-0" style={{ borderColor: primaryColor }}>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border-2 border-gray-200">
              <img
                src={logoUrl}
                alt={appName}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  // Fallback to initial if image fails to load
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<span class="text-white font-bold text-xl">${appInitial}</span>`;
                    parent.className = "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0";
                    parent.setAttribute('style', `background-color: ${primaryColor}`);
                  }
                }}
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="text-white font-bold text-xl">{appInitial}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate">{appName}</h1>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const hasSubMenu = item.subMenu && item.subMenu.length > 0;
              const expanded = isExpanded(item.path);
              const isParentActive = hasSubMenu
                ? isActive(item.path) || item.subMenu?.some(sub => isActive(sub.path))
                : isActive(item.path);

              return (
                <div key={item.path}>
                  <button
                    onClick={() => {
                      if (hasSubMenu) {
                        toggleMenu(item.path);
                        navigate(item.path);
                      } else {
                        navigate(item.path);
                        onClose?.();
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isParentActive
                      ? 'font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    style={isParentActive ? {
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor
                    } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span style={isParentActive ? { color: primaryColor } : undefined} className={!isParentActive ? 'text-gray-500' : ''}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {hasSubMenu && (
                      <span style={isParentActive ? { color: primaryColor } : undefined} className={!isParentActive ? 'text-gray-500' : ''}>
                        {expanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </button>

                  {/* Sub Menu */}
                  {hasSubMenu && expanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subMenu?.map((subItem) => {
                        const active = isActive(subItem.path);
                        return (
                          <button
                            key={subItem.path}
                            onClick={() => {
                              navigate(subItem.path);
                              onClose?.();
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${active
                              ? 'font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            style={active ? {
                              backgroundColor: `${primaryColor}15`,
                              color: primaryColor
                            } : undefined}
                          >
                            <span style={active ? { color: primaryColor } : undefined} className={!active ? 'text-gray-500' : ''}>
                              {subItem.icon}
                            </span>
                            <span className="text-sm">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

