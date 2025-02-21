import React, { useState } from "react";

const App = () => {
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [duration, setDuration] = useState(0);
    const [running, setRunning] = useState(false);
    const [intensity, setIntensity] = useState(5);
    const [mood, setMood] = useState("");
    const [notes, setNotes] = useState("");
    const [wifiSsid, setWifiSsid] = useState("Bilinmiyor");

    // Wi-Fi SSID'yi alma fonksiyonu (Sadece destekleyen tarayıcılarda çalışır)
    const getWifiSsid = async () => {
        if (navigator.connection && navigator.connection.type === "wifi") {
            setWifiSsid("Ev Wi-Fi"); // Tarayıcıdan gerçek SSID almak mümkün değil
        }
    };

    const startTimer = () => {
        setStartTime(new Date());
        setRunning(true);
        getWifiSsid();
    };

    const stopTimer = () => {
        const end = new Date();
        const elapsedSeconds = Math.floor((end - startTime) / 1000);
        setEndTime(end);
        setDuration(elapsedSeconds);
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
                setStartTime(null);
                setEndTime(null);
                setDuration(0);
                setIntensity(5);
                setMood("");
                setNotes("");
                setRunning(false);
            } else {
                alert("Kaydetme başarısız oldu!");
            }
        } catch (error) {
            console.error("Bağlantı hatası:", error);
            alert("Sunucuya bağlanılamadı!");
        }
    };

    return (
        <div>
            <h2>Sigara İsteği Takip</h2>
            
            <p>Geçen Süre: {running ? "Çalışıyor..." : `${duration} saniye`}</p>
            
            {running ? (
                <button onClick={stopTimer}>Durdur</button>
            ) : (
                <button onClick={startTimer}>Başlat</button>
            )}

            {!running && duration > 0 && (
                <div>
                    <h3>Bilgileri Gir</h3>
                    
                    <label>Yoğunluk (1-10):</label>
                    <input
                        type="number"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        min="1"
                        max="10"
                    />
                    <br />

                    <label>Ruh Hali:</label>
                    <input
                        type="text"
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                    />
                    <br />

                    <label>Notlar:</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                    <br />

                    <label>Wi-Fi SSID:</label>
                    <input
                        type="text"
                        value={wifiSsid}
                        disabled
                    />
                    <br />

                    <button onClick={saveCraving}>Kaydet</button>
                </div>
            )}
        </div>
    );
};

export default App;
