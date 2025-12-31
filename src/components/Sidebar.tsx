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
  UserCog,
  MessageCircle,
  Banknote
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppSettings } from '../hooks/useAppSettings';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { useOrganization } from '../context/OrganizationContext';
import { Building2, User } from 'lucide-react';

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
    label: 'Pesan Masuk',
    icon: <MessageCircle className="w-5 h-5" />,
    path: '/dashboard/messages'
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
        label: 'Pencairan Dana',
        icon: <Banknote className="w-4 h-4" />,
        path: '/donasi/withdrawals'
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
  const { settings, loading } = useAppSettings();
  const primaryColor = usePrimaryColor();
  const { organizations, selectedOrganization, switchOrganization, canAccessPersonal } = useOrganization();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  // Initialize with Donasi menu always expanded
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/donasi/dashboard']);

  const appName = settings?.app_name || 'Donasiku';
  const logoUrl = settings?.logo_url;
  // Get first letter of app name for icon (fallback if no logo)
  const appInitial = appName.charAt(0).toUpperCase();

  const [finalMenuItems, setFinalMenuItems] = useState<MenuItem[]>(menuItems);
  const [userRole, setUserRole] = useState<'admin' | 'campaigner'>('campaigner');

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role as any || 'campaigner');
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    let items = [...menuItems];

    // Filter based on role
    items = items.map(item => {
      if (item.label === 'Donasi' && item.subMenu) {
        return {
          ...item,
          subMenu: item.subMenu.filter(sub => {
            // Admin only items
            const adminOnly = ['Campaigner', 'Analytics', 'Settings'];
            if (userRole !== 'admin' && adminOnly.includes(sub.label)) return false;
            return true;
          })
        };
      }

      // Global items for Admin
      const adminOnlyGlobal = ['Zakat Settings', 'Infaq Settings', 'Fidyah Settings'];
      if (userRole !== 'admin' && adminOnlyGlobal.includes(item.label)) return null;

      return item;
    }).filter((item): item is MenuItem => item !== null);

    if (selectedOrganization) {
      // Filter out global settings when in organization mode
      const globalSettingsPaths = [
        '/settings',
        '/zakat/settings',
        '/infaq/settings',
        '/fidyah/settings',
        '/donasi/settings'
      ];

      items = items
        .filter(i => !globalSettingsPaths.includes(i.path))
        .map(i => ({
          ...i,
          subMenu: i.subMenu ? i.subMenu.filter(s => !globalSettingsPaths.includes(s.path)) : undefined
        }));

      // ONLY show Org Settings if the user is owner or admin
      if (selectedOrganization.role === 'owner' || selectedOrganization.role === 'admin') {
        const orgSettingsItem: MenuItem = {
          label: 'Pengaturan Org',
          icon: <Settings className="w-5 h-5" />,
          path: '/organizations/settings'
        };

        // Find index of Dashboard
        const dashboardIndex = items.findIndex(i => i.path === '/dashboard');
        if (dashboardIndex !== -1) {
          // Insert after Dashboard
          items.splice(dashboardIndex + 1, 0, orgSettingsItem);
        } else {
          items.push(orgSettingsItem);
        }
      }
    }
    setFinalMenuItems(items);
  }, [selectedOrganization, userRole]);

  // Auto-expand menu jika salah satu submenu aktif (kecuali Donasi yang sudah selalu expanded)
  useEffect(() => {
    const activeMenu = finalMenuItems.find(menu =>
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
  }, [location.pathname, finalMenuItems]);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    // Fix: Dashboard link should not be active when viewing Messages (which starts with /dashboard)
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
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
          {loading ? (
            <>
              {/* Skeleton Logo */}
              <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse flex-shrink-0"></div>
              {/* Skeleton Name */}
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Organization Switcher */}
      <div className="px-4 py-3 border-b border-gray-100 relative">
        <button
          onClick={() => setShowOrgMenu(!showOrgMenu)}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedOrganization ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
            {selectedOrganization ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-medium text-gray-500">Mode Akun</p>
            <p className="text-sm font-bold text-gray-800 truncate">
              {selectedOrganization ? selectedOrganization.name : 'Personal Account'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOrgMenu ? 'rotate-180' : ''}`} />
        </button>

        {showOrgMenu && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="py-1">
              {canAccessPersonal && (
                <>
                  <button
                    onClick={() => {
                      switchOrganization(null);
                      setShowOrgMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 ${!selectedOrganization ? 'bg-gray-50 font-semibold' : ''}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <User className="w-3 h-3" />
                    </div>
                    <span>Personal Account</span>
                    {!selectedOrganization && <span className="ml-auto text-xs bg-gray-200 px-1.5 py-0.5 rounded">Aktif</span>}
                  </button>
                  {organizations.length > 0 && <div className="border-t border-gray-100 my-1"></div>}
                </>
              )}

              {organizations.map(org => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setShowOrgMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 ${selectedOrganization?.id === org.id ? 'bg-orange-50 font-semibold' : ''}`}
                >
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Building2 className="w-3 h-3" />
                  </div>
                  <span className="truncate">{org.name}</span>
                  {selectedOrganization?.id === org.id && <span className="ml-auto text-xs bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded">Aktif</span>}
                </button>
              ))}

              {canAccessPersonal && (
                <>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      navigate('/organizations/new'); // Correct path
                      setShowOrgMenu(false);
                      onClose?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-medium"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <span className="text-sm">+</span>
                    </div>
                    Buat Organisasi Baru
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <nav className="space-y-1">
            {finalMenuItems.map((item) => {
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

