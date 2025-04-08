import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { FaTrash, FaDownload } from "react-icons/fa";
import { formatDuration } from "../utils/timeUtils";

const Requests = () => {
    const [cravings, setCravings] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_URL = process.env.REACT_APP_API_URL;

    useEffect(() => {
        fetch(`${API_URL}/cravings/all`)
            .then((response) => response.json())
            .then((data) => {
                setCravings(data.reverse()); // En son eklenen en üstte görünsün
                setLoading(false);
            })
            .catch((error) => {
                console.error("Veri çekme hatası:", error);
                setLoading(false);
            });
    }, []);

    const deleteCraving = async (id) => {
        const result = await Swal.fire({
            title: "Emin misiniz?",
            text: "Bu istek kalıcı olarak silinecektir!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Evet, sil!",
            cancelButtonText: "Vazgeç",
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_URL}/cravings/${id}`, {
                    method: "DELETE",
                });

                if (response.ok) {
                    setCravings(cravings.filter((craving) => craving.id !== id));
                    toast.success("Kayıt başarıyla silindi!", { position: "top-center" });
                } else {
                    toast.error("Silme işlemi başarısız oldu!", { position: "top-center" });
                }
            } catch (error) {
                console.error("Bağlantı hatası:", error);
                toast.error("Sunucuya bağlanılamadı!", { position: "top-center" });
            }
        }
    };

    const deleteAllCravings = async () => {
        const result = await Swal.fire({
            title: "Emin misiniz?",
            text: "Bu işlem tüm istekleri silecektir!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Evet, sil!",
            cancelButtonText: "Vazgeç",
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_URL}/cravings/deleteAll`, {
                    method: "DELETE",
                });

                if (response.ok) {
                    toast.success("Tüm istekler başarıyla silindi!", { position: "top-center" });
                    setCravings([]);
                } else {
                    toast.error("Silme işlemi başarısız oldu!", { position: "top-center" });
                }
            } catch (error) {
                console.error("Bağlantı hatası:", error);
                toast.error("Sunucuya bağlanılamadı!", { position: "top-center" });
            }
        }
    };

    const downloadAllCravings = () => {
        if (cravings.length === 0) {
            toast.warning("İndirilecek veri bulunamadı!", { position: "top-center" });
            return;
        }

        const csvContent = [
            "id,Start Time,Duration,Intensity,Mood,Notes"
        ];
        cravings.forEach(({ id, startTime, duration, intensity, mood, notes }) => {
            csvContent.push(`"${id}","${new Date(startTime).toLocaleString()}","${duration}","${intensity}","${mood || ''}","${notes || ''}"`);
        });

        const blob = new Blob([csvContent.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "cravings.csv";
        link.click();
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
            <div className="w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl p-6">
                <h2 className="text-2xl font-semibold mb-4 text-center text-gray-200">İstekler</h2>
                
                <Link to="/">
                    <button className="w-full mb-4 py-2 bg-gray-700 hover:bg-gray-600 text-lg font-semibold rounded-lg transition-all">
                        Ana Sayfa
                    </button>
                </Link>

                {loading ? (
                    <p className="text-center text-gray-400">Yükleniyor...</p>
                ) : cravings.length === 0 ? (
                    <p className="text-center text-gray-400">Henüz hiç kayıt yok.</p>
                ) : (
                    <ul className="space-y-4">
                        {cravings.map((craving) => (
                            <li key={craving.id} className="p-4 bg-gray-700 rounded-lg shadow-md flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-400">🕒 {new Date(craving.startTime).toLocaleString()}</p>
                                    <p className="text-lg font-semibold">⏳ {formatDuration(craving.duration)}</p>
                                    <p className="text-sm text-gray-300">🔹 Yoğunluk: {craving.intensity}/10</p>
                                    {craving.mood && <p className="text-sm text-gray-300">😊 Ruh Hali: {craving.mood}</p>}
                                    {craving.notes && <p className="text-sm text-gray-300">📝 Notlar: {craving.notes}</p>}
                                </div>
                                <button onClick={() => deleteCraving(craving.id)} className="text-red-500 hover:text-red-700">
                                    <FaTrash size={20} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {cravings.length > 0 && (
                    <div className="mt-6 flex flex-col space-y-4">
                        <button onClick={deleteAllCravings} className="w-full py-3 bg-red-500 hover:bg-red-600 text-lg font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
                            <FaTrash size={20} /> Tüm İstekleri Sil
                        </button>
                        <button onClick={downloadAllCravings} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-lg font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
                            <FaDownload size={20} /> Tüm İstekleri İndir
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Requests;
