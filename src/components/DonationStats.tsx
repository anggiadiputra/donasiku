import { useNavigate } from 'react-router-dom';

export default function DonationStats() {
  const navigate = useNavigate();

  return (
    <div className="bg-white py-8 border-t border-b border-gray-200">
      <div className="w-full max-w-[480px] mx-auto px-4">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Sudah berbagi hari ini ?
          </h3>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => navigate('/donasi')}
              className="bg-blue-700 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-800 transition-colors"
            >
              Donasi Sekarang
            </button>
            <button className="border-2 border-blue-700 text-blue-700 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors">
              Hubungi Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
