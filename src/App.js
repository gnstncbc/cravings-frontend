// src/App.js
// MODIFIED FILE
import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./components/Home";
import Requests from "./components/Requests";
import CravingTracker from "./components/CravingTracker";
import Carpet from "./components/Carpet/Carpet.js";
import PollPage from "./components/PollPage/PollPage.js";
import Scoreboard from "./components/Scoreboard/Scoreboard.js";
import LoginPage from "./components/Auth/LoginPage";
import RegisterPage from "./components/Auth/RegisterPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AdminPage from "./components/Admin/AdminPage"; // Import AdminPage
import { Link } from "react-router-dom";
import WebSocketTest from './components/WebSocketTest';
import PlayerDetailPage from './components/Player/PlayerDetailPage.js';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Basic Navbar for navigation and auth status
const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        // Navigation will be handled by the logout function in AuthContext
    };

    return (
        <nav className="bg-gray-800 text-white p-4 shadow-md sticky top-0 z-50">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <Link to="/" className="text-xl font-bold hover:text-blue-300">Ana Sayfa</Link>
                    {isAuthenticated && (
                        <>
                            <Link to="/carpet" className="hover:text-blue-300">Kadro Oluşturucu</Link>
                            <Link to="/scoreboard" className="hover:text-blue-300">Puan Durumu</Link>
                            {user?.roles?.includes('ADMIN') && ( // Show Admin link only if user is ADMIN
                                <Link to="/admin" className="text-yellow-400 hover:text-yellow-300">Admin Panel</Link>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    {isAuthenticated ? (
                        <>
                            <span className="text-sm">Hoşgeldin, {user?.firstname || user?.username || 'Kullanıcı'}!</span>
                            <button
                                onClick={handleLogout}
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
    const { isLoading } = useAuth();

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
            <div className="pt-2">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route
                        path="/carpet"
                        element={<Carpet />}
                    />
                    <Route
                        path="/scoreboard"
                        element={<Scoreboard />}
                    />
                    <Route
                        path="/poll/:matchId"
                        element={
                            <ProtectedRoute>
                                <PollPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}> {/* Protect Admin Route */}
                                <AdminPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="/craving-tracker" element={<CravingTracker />} />
                    <Route path="/requests" element={<Requests />} />
                    <Route path="/websocket-test" element={<WebSocketTest />} />
                    <Route path="/players/:playerId" element={<PlayerDetailPage />} />
                    {/* Fallback route for unmatched paths */}

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark" // Tailwind ile uyumlu olması için
                style={{ zIndex: 9999, position: 'fixed' }}
            />
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