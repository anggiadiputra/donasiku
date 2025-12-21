import { Heart, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 py-12 mt-12">
      <div className="w-full max-w-[480px] mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-8 h-8 fill-primary text-primary" />
              <h3 className="text-2xl font-bold text-primary">DONASIKU</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Donasiku merupakan platform penggalangan dana online yang dikelola
              yayasan anak untuk dan berevolusi dari lembaga sosial yang membantu
              dan penyelenggara panti asuhan.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-800">Kontak Kami</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <p className="text-gray-700">
                  Alamat: JL Banyuringin Kecam Banaran Gede, Kec. Karang Lewas,
                  Kab. Banyumas, Jawa Tengah 53157
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <p className="text-gray-700">Phone: 6281615502563</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-800">Link Cepat</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-primary hover:text-primary-hover transition-colors flex items-center gap-2">
                  <span>🏠</span> Beranda
                </a>
              </li>
              <li>
                <a href="#" className="text-primary hover:text-primary-hover transition-colors flex items-center gap-2">
                  <span>💝</span> Cara Donasi
                </a>
              </li>
              <li>
                <a href="#" className="text-primary hover:text-primary-hover transition-colors flex items-center gap-2">
                  <span>❓</span> FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-primary hover:text-primary-hover transition-colors flex items-center gap-2">
                  <span>📞</span> Hubungi Admin
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <div className="text-center space-y-4">
            <h4 className="font-bold text-gray-800">Tentang Kami</h4>
            <p className="text-gray-700 max-w-3xl mx-auto leading-relaxed">
              <span className="font-bold">Donasiku</span>
            </p>
            <p className="text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Donasiku merupakan platform penggalangan dana online yang dikelola
              oleh yayasan melalui program-program sosial dan berevolusi dari
              lembaga sosial yang membantu dan menyelenggarakan panti asuhan di
              berbagai wilayah Indonesia.
            </p>
          </div>
        </div>

        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            © 2024 Donasiku. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
