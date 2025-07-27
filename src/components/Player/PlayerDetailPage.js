import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../Carpet/api';
import { toast } from 'react-toastify';
import { FaTrophy, FaEquals, FaTimesCircle, FaChartPie, FaCalendarAlt } from 'react-icons/fa';

const PlayerDetailPage = () => {
    const { playerId } = useParams();
    const [playerData, setPlayerData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedMatchId, setExpandedMatchId] = useState(null);

    const fetchPlayerHistory = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/players/${playerId}/history`);
            setPlayerData(response.data);
        } catch (err) {
            console.error("Oyuncu geçmişi yüklenirken hata:", err);
            const errorMessage = err.response?.data?.message || "Oyuncu verileri yüklenemedi.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [playerId]);

    useEffect(() => {
        fetchPlayerHistory();
    }, [fetchPlayerHistory]);

    const getResultBadge = (result) => {
        switch (result) {
            case 'WIN':
                return <span className="px-2 py-1 text-xs font-bold text-white bg-green-600 rounded-full">GALİBİYET</span>;
            case 'LOSS':
                return <span className="px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full">MAĞLUBİYET</span>;
            case 'DRAW':
                return <span className="px-2 py-1 text-xs font-bold text-black bg-yellow-400 rounded-full">BERABERLİK</span>;
            default:
                return <span className="px-2 py-1 text-xs font-bold text-white bg-gray-500 rounded-full">SKOR YOK</span>;
        }
    };

    const toggleMatchDetails = (matchId) => {
        setExpandedMatchId(prevId => (prevId === matchId ? null : matchId));
    };

    if (isLoading) {
        return <div className="text-center text-white p-10">Oyuncu verileri yükleniyor...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500 p-10">Hata: {error}</div>;
    }

    if (!playerData) {
        return <div className="text-center text-white p-10">Oyuncu bulunamadı.</div>;
    }
    
    const renderLineup = (lineup) => (
        <ul className="list-disc list-inside text-sm text-gray-400">
            {Object.values(lineup).map(player => (
                <li key={player.playerId}>{player.playerName}</li>
            ))}
        </ul>
    );

    return (
        <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
                    <h1 className="text-4xl font-bold text-yellow-400 mb-2">{playerData.playerName}</h1>
                    <p className="text-gray-400">Oyuncu Performans Detayları</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800 p-4 rounded-lg flex items-center"><FaTrophy className="text-green-500 mr-4 text-2xl" /><div><p className="text-2xl font-bold">{playerData.winCount}</p><p className="text-sm text-gray-400">Galibiyet</p></div></div>
                    <div className="bg-gray-800 p-4 rounded-lg flex items-center"><FaEquals className="text-yellow-500 mr-4 text-2xl" /><div><p className="text-2xl font-bold">{playerData.drawCount}</p><p className="text-sm text-gray-400">Beraberlik</p></div></div>
                    <div className="bg-gray-800 p-4 rounded-lg flex items-center"><FaTimesCircle className="text-red-500 mr-4 text-2xl" /><div><p className="text-2xl font-bold">{playerData.loseCount}</p><p className="text-sm text-gray-400">Mağlubiyet</p></div></div>
                    <div className="bg-gray-800 p-4 rounded-lg flex items-center"><FaChartPie className="text-blue-500 mr-4 text-2xl" /><div><p className="text-2xl font-bold">%{playerData.winPercentage.toFixed(1)}</p><p className="text-sm text-gray-400">Galibiyet Oranı</p></div></div>
                </div>

                {/* Result Sequence */}
                <div className="mb-8 p-4 bg-gray-800 rounded-lg">
                    <h2 className="text-xl font-semibold mb-3">Sonuç Serisi (En sondan geriye)</h2>
                    <div className="flex flex-wrap gap-2">
                        {playerData.resultSequence.split(' - ').map((res, index) => (
                            <span key={index} className={`w-8 h-8 flex items-center justify-center font-bold rounded-full text-white ${
                                res === 'G' ? 'bg-green-600' : 
                                res === 'M' ? 'bg-red-600' : 
                                res === 'B' ? 'bg-yellow-500 text-black' : 
                                'bg-gray-600' // '-' ve '?' için varsayılan stil
                            }`}>
                                {res}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Match History */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">Maç Geçmişi ({playerData.totalGames} Maç)</h2>
                    <div className="space-y-4">
                        {playerData.matchHistory.map(match => (
                            <div key={match.matchId} className="bg-gray-800 p-4 rounded-lg shadow-md transition-all">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <div className="md:col-span-2">
                                        <p className="font-bold text-lg">{match.matchName}</p>
                                        <p className="text-sm text-gray-400 flex items-center"><FaCalendarAlt className="mr-2"/>{new Date(match.matchDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-mono">
                                            {match.teamAScore ?? '?'} - {match.teamBScore ?? '?'}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center justify-center">
                                        {getResultBadge(match.result)}
                                        <button onClick={() => toggleMatchDetails(match.matchId)} className="mt-2 text-xs text-blue-400 hover:underline">
                                            {expandedMatchId === match.matchId ? 'Kapat' : 'Kadro Detayları'}
                                        </button>
                                    </div>
                                </div>
                                {expandedMatchId === match.matchId && (
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <div className="flex justify-end mb-2">
                                            <Link to={`/?matchId=${match.matchId}`} className="text-sm text-yellow-400 hover:text-yellow-300">
                                                Bu maçı sahada gör &rarr;
                                            </Link>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-semibold mb-2">Takım A (Skor: {match.teamAScore})</h4>
                                                {renderLineup(match.lineupA)}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Takım B (Skor: {match.teamBScore})</h4>
                                                {renderLineup(match.lineupB)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetailPage;