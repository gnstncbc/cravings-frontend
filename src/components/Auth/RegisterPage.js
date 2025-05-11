import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const RegisterPage = () => {
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!firstname || !lastname || !email || !password || !confirmPassword) {
            toast.error("Lütfen tüm alanları doldurun.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Şifreler eşleşmiyor.");
            return;
        }
        if (password.length < 6) {
            toast.error("Şifre en az 6 karakter olmalıdır.");
            return;
        }
        // Basic email validation (more robust validation can be added)
        if (!/\S+@\S+\.\S+/.test(email)) {
            toast.error("Lütfen geçerli bir e-posta adresi girin.");
            return;
        }

        setIsLoading(true);
        const userData = { firstname, lastname, email, password, role: "USER" };
        const result = await register(userData);
        setIsLoading(false);

        if (result.success) {
            if (result.autologin) {
                toast.success("Kayıt başarılı! Otomatik olarak giriş yapıldı.");
                navigate('/');
            } else {
                toast.success("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
                navigate('/login');
            }
        } else {
            toast.error(result.message || "Kayıt başarısız. Lütfen tekrar deneyin.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <ToastContainer autoClose={3000} hideProgressBar theme="dark" position="top-center" />
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-6 text-white">Kayıt Ol</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="firstname" className="block text-sm font-medium text-gray-300 mb-1">Ad</label>
                        <input
                            type="text"
                            id="firstname"
                            value={firstname}
                            onChange={(e) => setFirstname(e.target.value)}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="lastname" className="block text-sm font-medium text-gray-300 mb-1">Soyad</label>
                        <input
                            type="text"
                            id="lastname"
                            value={lastname}
                            onChange={(e) => setLastname(e.target.value)}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">E-posta</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Şifre (en az 6 karakter)</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">Şifreyi Onayla</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-md transition-colors duration-200 disabled:opacity-70 flex items-center justify-center"
                        disabled={isLoading}
                    >
                         {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                Kayıt Olunuyor...
                            </>
                        ) : (
                            'Kayıt Ol'
                        )}
                    </button>
                </form>
                <p className="text-center mt-6 text-sm text-gray-400">
                    Zaten hesabın var mı? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Giriş Yap</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage; 