import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_API_URL;

const Register = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const navigate = useNavigate();

    const handleRegister = async () => {
        const registerData = { username, password, email };

        try {
            const response = await fetch(`${API_URL}/users/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerData),
            });

            if (response.ok) {
                toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
                navigate("/login");
            } else {
                toast.error("Kayıt başarısız! Kullanıcı adı veya e-posta alınmış olabilir.");
            }
        } catch (error) {
            toast.error("Bağlantı hatası! Sunucuya ulaşılamadı.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8">
                <h2 className="text-3xl font-semibold mb-6 text-center">Kayıt Ol</h2>

                <input
                    type="text"
                    placeholder="Kullanıcı Adı"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg p-3 mt-2 text-white"
                />
                <input
                    type="email"
                    placeholder="E-posta"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    onClick={handleRegister}
                    className="w-full bg-green-500 hover:bg-green-600 py-3 mt-4 rounded-xl"
                >
                    Kayıt Ol
                </button>

                <p className="mt-4 text-center">
                    Zaten bir hesabın var mı?{" "}
                    <a href="/login" className="text-blue-400 hover:text-blue-500">
                        Giriş Yap
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Register;