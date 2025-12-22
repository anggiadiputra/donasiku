import { Heart, Phone, MapPin, Home, HelpCircle, Info, Link, FileText, Mail, Gift } from 'lucide-react';
import { useLayoutSettings } from '../hooks/useLayoutSettings';
import { useAppName } from '../hooks/useAppName';

export default function Footer() {
  const { settings } = useLayoutSettings();
  const { appName, logoUrl } = useAppName();
  const footerData = settings?.footer_content || {};

  const iconMap: any = {
    Home: Home,
    Heart: Heart,
    HelpCircle: HelpCircle,
    Phone: Phone,
    Info: Info,
    Link: Link,
    FileText: FileText,
    Mail: Mail,
    Gift: Gift
  };

  // Check if footer is enabled globally
  if (settings && settings.footer_enabled === false) {
    return null;
  }

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 py-12 mt-12">
      <div className="w-full max-w-[480px] mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={appName}
                  className="w-8 h-8 rounded-full object-cover bg-white shadow-sm"
                />
              ) : (
                <Heart className="w-8 h-8 fill-primary text-primary" />
              )}
              <h3 className="text-2xl font-bold text-primary uppercase">{appName || 'DONASIKU'}</h3>
            </div>
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">
              {footerData.description || 'Donasiku merupakan platform penggalangan dana online yang dikelola yayasan anak untuk dan berevolusi dari lembaga sosial yang membantu dan penyelenggara panti asuhan.'}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-800">Kontak Kami</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <p className="text-gray-700 whitespace-pre-wrap">
                  {footerData.address || 'Alamat: JL Banyuringin Kecam Banaran Gede, Kec. Karang Lewas, Kab. Banyumas, Jawa Tengah 53157'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <p className="text-gray-700">Phone: {footerData.phone || '6281615502563'}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-800">Link Cepat</h4>
            <ul className="space-y-2">
              {(footerData.quick_links && footerData.quick_links.length > 0 ? footerData.quick_links : [
                { label: 'Beranda', url: '/', icon: 'Home' },
                { label: 'Cara Donasi', url: '#', icon: 'Heart' },
                { label: 'FAQ', url: '#', icon: 'HelpCircle' },
                { label: 'Hubungi Admin', url: '#', icon: 'Phone' }
              ]).map((link: any, index: number) => {
                const IconComponent = iconMap[link.icon || 'Link'] || Link;
                return (
                  <li key={index}>
                    <a href={link.url} className="text-primary hover:text-primary-hover transition-colors flex items-center gap-2">
                      <IconComponent className="w-4 h-4" />
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} {appName || 'Donasiku'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
