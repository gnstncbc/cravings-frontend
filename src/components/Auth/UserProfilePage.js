// src/components/Auth/UserProfilePage.js
// YENİ DOSYA
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const UserProfilePage = () => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="ml-4 text-lg">Yükleniyor...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        return <Navigate to="/login" replace />;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <p className="text-xl text-red-400">Kullanıcı bilgileri bulunamadı.</p>
            </div>
        );
    }

    const getRoleDisplayName = (role) => {
        if (role === 'ADMIN') return 'Yönetici';
        if (role === 'USER') return 'Kullanıcı';
        return role;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex pt-16 justify-center">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl mt-10 h-fit">
                <h1 className="text-3xl font-bold text-center mb-8 text-blue-400">Kullanıcı Profili</h1>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Ad:</label>
                        <p className="mt-1 text-lg p-3 bg-gray-700 rounded-md">{user.firstname || 'Belirtilmemiş'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Soyad:</label>
                        <p className="mt-1 text-lg p-3 bg-gray-700 rounded-md">{user.lastname || 'Belirtilmemiş'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">E-posta Adresi:</label>
                        <p className="mt-1 text-lg p-3 bg-gray-700 rounded-md">{user.email}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Kullanıcı Rolü:</label>
                        <p className="mt-1 text-lg p-3 bg-gray-700 rounded-md">
                            {user.roles && user.roles.length > 0 
                                ? user.roles.map(getRoleDisplayName).join(', ') 
                                : 'Belirtilmemiş'}
                        </p>
                    </div>
                </div>
                {/* Gelecekte buraya şifre değiştirme, profil düzenleme gibi özellikler eklenebilir */}
            </div>
        </div>
    );
};

export default UserProfilePage;