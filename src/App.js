import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./components/Home"; // Ana sayfa (ikon seçimi)
import Requests from "./components/Requests"; // İstekler listesi
import CravingTracker from "./components/CravingTracker"; // Yeni takip sayfası
import Carpet from "./components/Carpet/Carpet.js"; // Halı saha sayfası
import PollPage from "./components/PollPage/PollPage.js"; // Oylama sayfası
import LoginPage from "./components/Auth/LoginPage";
import RegisterPage from "./components/Auth/RegisterPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import { Link } from "react-router-dom";

// Basic Navbar for navigation and auth status
const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    return (
        <nav className="bg-gray-800 text-white p-4 shadow-md sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link to="/" className="text-xl font-bold hover:text-blue-300">Ana Sayfa</Link>
                    {isAuthenticated && (
                        <Link to="/carpet" className="hover:text-blue-300">Kadro Oluşturucu</Link>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    {isAuthenticated ? (
                        <>
                            <span className="text-sm">Hoşgeldin, {user?.firstname || user?.username || 'Kullanıcı'}!</span>
                            <button 
                                onClick={logout} 
                                className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                            >
                                Çıkış Yap
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:text-blue-300">Giriş Yap</Link>
                            <Link to="/register" className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-medium transition-colors">Kayıt Ol</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

const AppContent = () => {
    const { isLoading } = useAuth(); // Access isLoading from AuthContext

    // Display a global loading indicator if AuthContext is still figuring out auth state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
                <p className="text-xl">Uygulama Yükleniyor...</p>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <div className="pt-2"> {/* Add some padding if navbar is sticky/fixed */}
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Protected Routes */}
                    <Route 
                        path="/carpet" 
                        element={
                            
                                <Carpet />
                            
                        } 
                    />
                    <Route 
                        path="/poll/:matchId" 
                        element={
                            <ProtectedRoute>
                                <PollPage />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Example of a route that requires a specific role, e.g., ADMIN */}
                    {/* <Route 
                        path="/admin/dashboard" 
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } 
                    /> */}

                    {/* These routes also likely need protection. Add ProtectedRoute as needed. */}
                    <Route path="/craving-tracker" element={<CravingTracker />} />
                    <Route path="/requests" element={<Requests />} />

                    {/* Catch-all for undefined routes - optional */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </>
    );
};

const App = () => {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
};

export default App;