import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function NewsSection() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
          Doa-doa #OrangBaik
        </h2>

        <div className="relative max-w-2xl mx-auto">
          <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">👶</span>
              </div>
            </div>
            <p className="text-gray-700 italic mb-4">
              "Semoga dapat membantu kehidupan anak yatim piatu yang kurang mampu..."
            </p>
            <p className="font-semibold text-gray-800">Syarifudin</p>
            <p className="text-sm text-gray-500">Orang Baik</p>
          </div>

          <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
