// src/components/Admin/ReferralCodeAdminActions.js
// MODIFIED FILE
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../Carpet/api';
import { toast } from 'react-toastify';

const ReferralCodeAdminActions = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCodeInfo, setGeneratedCodeInfo] = useState(null); // Store full generated code object
    const [newCodeMaxUses, setNewCodeMaxUses] = useState(1); // For generation form

    const [referralCodes, setReferralCodes] = useState([]);
    const [isLoadingCodes, setIsLoadingCodes] = useState(false);
    
    // For inline editing maxUses
    const [editingCodeId, setEditingCodeId] = useState(null);
    const [editingMaxUsesValue, setEditingMaxUsesValue] = useState('');


    const fetchReferralCodes = useCallback(async () => {
        setIsLoadingCodes(true);
        try {
            const response = await apiClient.get('/admin/referral-codes');
            setReferralCodes(response.data || []);
        } catch (error) {
            console.error("Error fetching referral codes:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Referans kodları getirilemedi.");
            setReferralCodes([]);
        } finally {
            setIsLoadingCodes(false);
        }
    }, []);

    useEffect(() => {
        fetchReferralCodes();
    }, [fetchReferralCodes]);

    const handleGenerateCode = async () => {
        setIsGenerating(true);
        setGeneratedCodeInfo(null);
        try {
            // Pass maxUses in the request body
            const response = await apiClient.post('/admin/referral-codes/generate', { maxUses: newCodeMaxUses });
            if (response.data && response.data.code) {
                setGeneratedCodeInfo(response.data); // Store the whole object
                toast.success(`Yeni referans kodu (${response.data.code}) ${response.data.maxUses} kullanım için oluşturuldu.`);
                fetchReferralCodes(); // Refresh the list
                setNewCodeMaxUses(1); // Reset input
            } else {
                toast.error("Referans kodu oluşturuldu ancak detayları alınamadı.");
            }
        } catch (error) {
            console.error("Error generating referral code:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Referans kodu oluşturulurken bir hata oluştu.");
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (code) => {
        if (code) {
            navigator.clipboard.writeText(code)
                .then(() => toast.info("Referans kodu panoya kopyalandı!"))
                .catch(() => toast.error("Kod kopyalanamadı. Lütfen manuel olarak kopyalayın."));
        }
    };

    const handleToggleActive = async (codeId, currentIsActive) => {
        const endpoint = currentIsActive ? `/admin/referral-codes/${codeId}/deactivate` : `/admin/referral-codes/${codeId}/activate`;
        const actionText = currentIsActive ? "pasif hale getirildi" : "aktif hale getirildi";
        try {
            await apiClient.put(endpoint);
            toast.success(`Referans kodu başarıyla ${actionText}.`);
            fetchReferralCodes(); // Refresh list
        } catch (error) {
            toast.error(`Kod durumu güncellenirken hata: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleEditMaxUses = (code) => {
        setEditingCodeId(code.id);
        setEditingMaxUsesValue(String(code.maxUses));
    };

    const handleSaveMaxUses = async (codeId) => {
        const newMax = parseInt(editingMaxUsesValue, 10);
        if (isNaN(newMax) || newMax < 1) {
            toast.error("Geçerli bir maksimum kullanım sayısı girin (en az 1).");
            return;
        }
        
        // Find the current timesUsed for validation before sending to backend
        const currentCode = referralCodes.find(c => c.id === codeId);
        if (currentCode && newMax < currentCode.timesUsed) {
            toast.error(`Maksimum kullanım sayısı, mevcut kullanım sayısından (${currentCode.timesUsed}) az olamaz.`);
            return;
        }

        try {
            await apiClient.put(`/admin/referral-codes/${codeId}/max-uses`, { maxUses: newMax });
            toast.success("Maksimum kullanım sayısı güncellendi.");
            setEditingCodeId(null);
            fetchReferralCodes();
        } catch (error) {
            toast.error(`Maks. kullanım güncellenirken hata: ${error.response?.data?.message || error.message}`);
        }
    };


    return (
        <section className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100 border-b border-gray-700 pb-3">Referans Kodu Yönetimi</h2>
            
            {/* Generation Section */}
            <div className="mb-8 p-4 bg-gray-700 rounded-md">
                <h3 className="text-xl font-medium mb-3 text-gray-200">Yeni Kod Oluştur</h3>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-grow w-full sm:w-auto">
                        <label htmlFor="maxUses" className="block text-sm font-medium text-gray-300 mb-1">Maksimum Kullanım Sayısı:</label>
                        <input
                            type="number"
                            id="maxUses"
                            value={newCodeMaxUses}
                            onChange={(e) => setNewCodeMaxUses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                            className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={handleGenerateCode}
                        disabled={isGenerating}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-md transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center w-full sm:w-auto"
                    >
                        {isGenerating ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                </div>
                {generatedCodeInfo && (
                    <div className="mt-3 p-3 bg-gray-600 rounded-md text-sm">
                        <p className="text-gray-300">Son Oluşturulan: 
                            <strong className="text-yellow-400 break-all ml-1">{generatedCodeInfo.code}</strong>
                            (Maks: {generatedCodeInfo.maxUses}, Kullanılan: {generatedCodeInfo.timesUsed})
                            <button
                                onClick={() => copyToClipboard(generatedCodeInfo.code)}
                                title="Kodu Kopyala"
                                className="ml-2 p-1 bg-gray-500 hover:bg-gray-400 rounded text-white"
                            >
                                {/* Simple Copy Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.625v2.625a2.625 2.625 0 01-2.625 2.625H9.375a2.625 2.625 0 01-2.625-2.625V7.875c0-1.451 1.174-2.625 2.625-2.625H10.5a8.967 8.967 0 011.903.329M15.75 17.25L18 15m-2.25 2.25l-2.25-2.25" /></svg>
                            </button>
                        </p>
                    </div>
                )}
            </div>

            {/* Listing Section */}
            <h3 className="text-xl font-medium mb-4 text-gray-200">Mevcut Referans Kodları</h3>
            {isLoadingCodes ? (
                <div className="flex justify-center items-center h-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                    <p className="ml-3 text-gray-300">Kodlar yükleniyor...</p>
                </div>
            ) : referralCodes.length === 0 ? (
                <p className="text-gray-400 text-center">Henüz oluşturulmuş referans kodu yok.</p>
            ) : (
                <div className="overflow-x-auto shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Kod</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Durum</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Kullanım (Kull. / Maks.)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Oluşturan</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tarih</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Eylemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {referralCodes.map((code) => (
                                <tr key={code.id} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-400 font-semibold">
                                        {code.code}
                                        <button onClick={() => copyToClipboard(code.code)} className="ml-2 text-gray-400 hover:text-white" title="Kopyala">
                                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.625v2.625a2.625 2.625 0 01-2.625 2.625H9.375a2.625 2.625 0 01-2.625-2.625V7.875c0-1.451 1.174-2.625 2.625-2.625H10.5a8.967 8.967 0 011.903.329M15.75 17.25L18 15m-2.25 2.25l-2.25-2.25" /></svg>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${code.active ? 'bg-green-500 text-green-100' : 'bg-red-500 text-red-100'}`}>
                                            {code.active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200">
                                        {editingCodeId === code.id ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-300">{code.timesUsed} / </span>
                                                <input 
                                                    type="number"
                                                    value={editingMaxUsesValue}
                                                    onChange={(e) => setEditingMaxUsesValue(e.target.value)}
                                                    min={code.timesUsed > 0 ? code.timesUsed : 1} // Prevent setting below timesUsed
                                                    className="w-16 p-1 bg-gray-600 border border-gray-500 rounded-md text-white text-xs"
                                                />
                                            </div>
                                        ) : (
                                            `${code.timesUsed} / ${code.maxUses}`
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{code.createdByEmail}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">{new Date(code.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onClick={() => handleToggleActive(code.id, code.active)} className={`text-xs ${code.active ? 'text-yellow-500 hover:text-yellow-400' : 'text-green-500 hover:text-green-400'}`}>
                                            {code.active ? 'Pasif Et' : 'Aktif Et'}
                                        </button>
                                        {editingCodeId === code.id ? (
                                            <>
                                                <button onClick={() => handleSaveMaxUses(code.id)} className="text-xs text-blue-400 hover:text-blue-300">Kaydet</button>
                                                <button onClick={() => setEditingCodeId(null)} className="text-xs text-gray-400 hover:text-gray-300">İptal</button>
                                            </>
                                        ) : (
                                             <button onClick={() => handleEditMaxUses(code)} className="text-xs text-indigo-400 hover:text-indigo-300">
                                                Maks. Dznle
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default ReferralCodeAdminActions;