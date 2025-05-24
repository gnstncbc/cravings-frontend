import React, { useState, useEffect } from 'react';
import { apiClient } from '../Carpet/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Scoreboard = () => {
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState([
        { key: 'winCount', direction: 'desc' },
        { key: 'totalGames', direction: 'desc' }
    ]);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/players');
            setPlayers(response.data);
        } catch (error) {
            console.error('Error fetching players:', error);
            toast.error('Oyuncu istatistikleri yüklenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prevConfig => {
            // Mevcut sıralama konfigürasyonunun bir kopyasını al
            const newConfig = [...prevConfig];
            
            // Tıklanan sütunun mevcut konfigürasyonunu bul
            const existingSort = newConfig.findIndex(sort => sort.key === key);
            
            if (existingSort !== -1) {
                // Sütun zaten sıralama listesinde
                if (newConfig[existingSort].direction === 'desc') {
                    // Eğer descending ise, ascending yap
                    newConfig[existingSort].direction = 'asc';
                } else {
                    // Eğer ascending ise, sıralama listesinden çıkar
                    newConfig.splice(existingSort, 1);
                }
            } else {
                // Sütun sıralama listesinde değilse, en başa ekle
                newConfig.unshift({ key, direction: 'desc' });
            }
            
            return newConfig;
        });
    };

    const calculateWinLossRatio = (winCount, loseCount, drawCount) => {
        const totalGames = winCount + loseCount + drawCount;
        if (totalGames === 0) return 0;
        return (winCount / totalGames) * 100;
    };

    const getSortDirection = (key) => {
        const sort = sortConfig.find(sort => sort.key === key);
        return sort ? sort.direction : null;
    };

    const sortedPlayers = [...players].sort((a, b) => {
        for (const sort of sortConfig) {
            let comparison = 0;
            
            if (sort.key === 'winLoseRatio') {
                const ratioA = calculateWinLossRatio(a.winCount, a.loseCount, a.drawCount);
                const ratioB = calculateWinLossRatio(b.winCount, b.loseCount, b.drawCount);
                comparison = ratioA - ratioB;
            } else if (sort.key === 'totalGames') {
                const totalA = a.winCount + a.loseCount + a.drawCount;
                const totalB = b.winCount + b.loseCount + b.drawCount;
                comparison = totalA - totalB;
            } else {
                comparison = a[sort.key] - b[sort.key];
            }
            
            if (comparison !== 0) {
                return sort.direction === 'asc' ? comparison : -comparison;
            }
        }
        return 0;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="ml-4 text-lg">Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <ToastContainer autoClose={3000} hideProgressBar theme="dark" position="top-center" />
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-center mb-8">Oyuncu İstatistikleri</h1>
                
                <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-700">
                                    <th className="px-2 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        Oyuncu
                                    </th>
                                    <th 
                                        className="px-2 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('winCount')}
                                    >
                                        <span className="md:hidden">G</span>
                                        <span className="hidden md:inline">Galibiyet</span> {getSortDirection('winCount') && (getSortDirection('winCount') === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        className="px-2 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('drawCount')}
                                    >
                                        <span className="md:hidden">B</span>
                                        <span className="hidden md:inline">Beraberlik</span> {getSortDirection('drawCount') && (getSortDirection('drawCount') === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        className="px-2 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('loseCount')}
                                    >
                                        <span className="md:hidden">M</span>
                                        <span className="hidden md:inline">Mağlubiyet</span> {getSortDirection('loseCount') && (getSortDirection('loseCount') === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        className="px-2 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('totalGames')}
                                    >
                                        <span className="md:hidden">TM</span>
                                        <span className="hidden md:inline">Toplam Maç</span> {getSortDirection('totalGames') && (getSortDirection('totalGames') === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th 
                                        className="px-2 md:px-6 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:text-white"
                                        onClick={() => handleSort('winLoseRatio')}
                                    >
                                        <span className="md:hidden">%</span>
                                        <span className="hidden md:inline">Galibiyet Yüzdesi</span> {getSortDirection('winLoseRatio') && (getSortDirection('winLoseRatio') === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {sortedPlayers.map((player) => {
                                    const totalGames = player.winCount + player.loseCount + player.drawCount;
                                    const winPercentage = calculateWinLossRatio(player.winCount, player.loseCount, player.drawCount);
                                    
                                    return (
                                        <tr key={player.id} className="hover:bg-gray-700">
                                            <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                                                <div className="text-[11px] md:text-sm font-medium text-white">{player.name}</div>
                                            </td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                                                <div className="text-[11px] md:text-sm text-green-400">{player.winCount}</div>
                                            </td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                                                <div className="text-[11px] md:text-sm text-yellow-400">{player.drawCount}</div>
                                            </td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                                                <div className="text-[11px] md:text-sm text-red-400">{player.loseCount}</div>
                                            </td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                                                <div className="text-[11px] md:text-sm text-blue-400">{totalGames}</div>
                                            </td>
                                            <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                                                <div className="text-[11px] md:text-sm text-yellow-400">%{winPercentage.toFixed(1)}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <footer className="mt-8 text-center text-gray-400 text-sm">
                Güneş Tan Cebeci | 2025
            </footer>
        </div>
    );
};

export default Scoreboard; 