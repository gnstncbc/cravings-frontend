import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // 🆕 Yönlendirme için eklendi
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDuration } from "../utils/timeUtils";

const Home = () => {
    const [startTime, setStartTime] = useState(null);
    const [duration, setDuration] = useState(0);
    const [running, setRunning] = useState(false);
    const [intensity, setIntensity] = useState(5);
    const [mood, setMood] = useState("");
    const [notes, setNotes] = useState("");
    const API_URL = process.env.REACT_APP_API_URL;
    const navigate = useNavigate(); // 🆕 React Router yönlendirme

    useEffect(() => {
        getWifiSsid();
    }, []);

    const getWifiSsid = async () => {};

    const addThreeHours = (date) => {
        date.setHours(date.getHours() + 3);
        return date.toISOString();
    };    

    const startTimer = () => {
        const now = Date.now();
        setStartTime(now);
        setRunning(true);
        setDuration(0);
    };

    const stopTimer = () => {
        setRunning(false);
    };

    const saveCraving = async () => {
        const now = new Date();
        const craving = {
            startTime: addThreeHours(new Date(startTime)),
            endTime: addThreeHours(now),
            duration,
            intensity,
            mood,
            notes,
            createdAt: new Date(),
        };

        try {
            const response = await fetch(`${API_URL}/cravings/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(craving),
            });

            if (response.ok) {
                toast.success("Sigara isteği başarıyla kaydedildi! :)", { position: "top-center" });
                resetForm();
            } else {
                toast.error("Kaydetme başarısız oldu!", { position: "top-center" });
            }
        } catch (error) {
            console.error("Bağlantı hatası:", error);
            toast.error("Sunucuya bağlanılamadı!", { position: "top-center" });
        }
    };

    const resetForm = () => {
        setStartTime(null);
        setDuration(0);
        setRunning(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
            <button 
                onClick={() => navigate("/login")} 
                className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
                Giriş Yap
            </button>

            <ToastContainer autoClose={3000} hideProgressBar />
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
                <h2 className="text-3xl font-semibold mb-6 text-gray-200">Sigara İsteği Takip</h2>

                <div className="text-center mb-4">
                    <p className="text-xl font-bold text-gray-100">
                        {running ? `Geçen Süre: ${formatDuration(duration)}` : `Toplam Süre: ${formatDuration(duration)}`}
                    </p>
                </div>

                <button
                    onClick={running ? stopTimer : startTimer}
                    className={`w-full py-3 text-lg font-semibold rounded-xl transition-all focus:outline-none ${
                        running ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                        }`}
                >
                    {running ? "Durdur" : "Başlat"}
                </button>

                {!running && duration > 0 && (
                    <div className="mt-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Yoğunluk (1-10)</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                value={intensity}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    if (value === "") {
                                        setIntensity("");
                                        return;
                                    }
                                    if (/^0\d/.test(value)) {
                                        value = value.replace(/^0+/, "");
                                    }
                                    let num = Math.min(10, Math.max(1, Number(value)));
                                    setIntensity(num);
                                }}
                                min="1"
                                max="10"
                                className="w-full bg-gray-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400">Ruh Hali</label>
                            <input
                                type="text"
                                value={mood}
                                onChange={(e) => setMood(e.target.value)}
                                className="w-full bg-gray-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400">Notlar</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-gray-700 rounded-lg p-3 mt-1 text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            onClick={saveCraving}
                            className="w-full mt-4 py-3 bg-blue-500 hover:bg-blue-600 text-lg font-semibold rounded-xl transition-all focus:outline-none"
                        >
                            Kaydet
                        </button>
                    </div>
                )}

                <Link to="/requests">
                    <button className="mt-6 w-full py-3 bg-gray-700 hover:bg-gray-600 text-lg font-semibold rounded-xl transition-all">
                        İstekler
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default Home;