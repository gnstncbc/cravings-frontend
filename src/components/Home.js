import React from 'react';
import { Link } from 'react-router-dom';
// Ikonları kullanmak için react-icons gibi bir kütüphane eklemeniz gerekebilir.
// Örnek: npm install react-icons
// Veya FontAwesome kullanabilirsiniz:
// npm install @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faFutbol, faSmoking } from '@fortawesome/free-solid-svg-icons';

// Geçici olarak metin veya emoji kullanıldı. İkon kütüphanesi ekledikten sonra değiştirebilirsiniz.
const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
      <h1 className="text-4xl font-bold mb-12">Bir Aktivite Seçin</h1>
      <div className="flex space-x-8">

        {/* Futbol Topu İkonu (Placeholder) */}
        <Link to="/carpet" className="flex flex-col items-center p-6 bg-gray-800 rounded-2xl shadow-xl cursor-pointer hover:bg-gray-700 transition-colors">
          {/* <FontAwesomeIcon icon={faFutbol} size="4x" className="mb-4 text-blue-400" /> */}
          <span className="text-6xl mb-4" role="img" aria-label="futbol topu">⚽</span>
          <span className="text-xl font-semibold">Halı Saha</span>
          {/* Buraya tıklandığında ne olacağını belirleyebilirsiniz, şimdilik bir şey yapmıyor */}
        </Link>

        {/* Sigara İkonu - Craving Tracker'a Yönlendirme */}
        <Link to="/craving-tracker" className="flex flex-col items-center p-6 bg-gray-800 rounded-2xl shadow-xl hover:bg-gray-700 transition-colors">
          {/* <FontAwesomeIcon icon={faSmoking} size="4x" className="mb-4 text-red-400" /> */}
          <span className="text-6xl mb-4" role="img" aria-label="sigara">🚬</span>
          <span className="text-xl font-semibold">Sigara İsteği</span>
        </Link>

      </div>
       {/* İstekler Sayfasına Gitmek İçin Buton (Opsiyonel, ana sayfada da kalabilir) */}
       {/* <Link to="/requests" className="mt-12">
           <button className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-lg font-semibold rounded-xl transition-all">
               İstek Geçmişi
           </button>
       </Link> */}
      </div>
  );
};

export default Home;