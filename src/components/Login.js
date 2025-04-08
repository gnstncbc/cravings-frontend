import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_API_URL;

const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        const loginData = { username, password };

        try {
            const response = await fetch(`${API_URL}/users/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            if (response.ok) {
                const user = await response.json();
                localStorage.setItem("user", JSON.stringify(user)); // Kullanıcıyı sakla
                toast.success("Giriş başarılı!");
                navigate("/"); // Ana sayfaya yönlendir
            } else {
                toast.error("Kullanıcı adı veya şifre hatalı!");
            }
        } catch (error) {
            toast.error("Bağlantı hatası! Sunucuya ulaşılamadı.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8">
                <h2 className="text-3xl font-semibold mb-6 text-center">Giriş Yap</h2>

                <input
                    type="text"
                    placeholder="Kullanıcı Adı"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg p-3 mt-2 text-white"
                />
                <input
                    type="password"
                    placeholder="Şifre"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg p-3 mt-2 text-white"
                />

                <button
                    onClick={handleLogin}
                    className="w-full bg-blue-500 hover:bg-blue-600 py-3 mt-4 rounded-xl"
                >
                    Giriş Yap
                </button>

                <p className="mt-4 text-center">
                    Hesabın yok mu?{" "}
                    <a href="/register" className="text-blue-400 hover:text-blue-500">
                        Kayıt Ol
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Login;