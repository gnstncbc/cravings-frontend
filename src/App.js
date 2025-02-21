import React, { useState, useEffect } from "react";

const App = () => {
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [duration, setDuration] = useState(0);
    const [running, setRunning] = useState(false);
    const [intensity, setIntensity] = useState(5);
    const [mood, setMood] = useState("");
    const [notes, setNotes] = useState("");
    const [wifiSsid, setWifiSsid] = useState("Bilinmiyor");

    useEffect(() => {
        getWifiSsid();
    }, []);

    const getWifiSsid = async () => {
        setWifiSsid("Ev Wi-Fi");
    };

    const startTimer = () => {
        setStartTime(new Date());
        setRunning(true);
    };

    const stopTimer = () => {
        const end = new Date();
        setEndTime(end);
        setDuration(Math.floor((end - startTime) / 1000));
        setRunning(false);
    };

    const saveCraving = async () => {
        const craving = {
            startTime,
            endTime,
            duration,
            intensity,
            mood,
            notes,
            wifiSsid,
            createdAt: new Date(),
        };

        try {
            const response = await fetch("http://192.168.1.13:8080/cravings/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(craving),
            });

            if (response.ok) {
                alert("Sigara isteği kaydedildi!");
                resetForm();
            } else {
                alert("Kaydetme başarısız oldu!");
            }
        } catch (error) {
            console.error("Bağlantı hatası:", error);
            alert("Sunucuya bağlanılamadı!");
        }
    };

    const resetForm = () => {
        setStartTime(null);
        setEndTime(null);
        setDuration(0);
        setIntensity(5);
        setMood("");
        setNotes("");
        setRunning(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
                <h2 className="text-3xl font-semibold mb-6 text-gray-200">Sigara İsteği Takip</h2>

                <div className="text-center mb-4">
                    <p className="text-xl font-bold text-gray-100">
                        {running ? "Sayaç Çalışıyor..." : `Geçen Süre: ${duration} saniye`}
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
                                value={intensity}
                                onChange={(e) => setIntensity(Number(e.target.value))}
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

                        <div>
                            <label className="block text-sm font-medium text-gray-400">Wi-Fi SSID</label>
                            <input
                                type="text"
                                value={wifiSsid}
                                disabled
                                className="w-full bg-gray-700 rounded-lg p-3 mt-1 text-gray-400 cursor-not-allowed"
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
            </div>
        </div>
    );
};

export default App;
