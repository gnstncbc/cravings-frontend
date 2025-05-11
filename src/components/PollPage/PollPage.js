import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiClient } from '../Carpet/api'; // Assuming api client is reusable
import { useAuth } from '../../contexts/AuthContext'; // For user context if needed for voting UI later

// Define VoteTypes to match backend enum (assuming these string values)
const VoteType = {
    TEAM_A_WINS: 'TEAM_A_WINS',
    TEAM_B_WINS: 'TEAM_B_WINS',
    DRAW: 'DRAW',
};

const PollPage = () => {
    const { matchId } = useParams();
    const [matchDetails, setMatchDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // For initial page load
    const [isVoting, setIsVoting] = useState(false); // Loading state for vote submission
    const [isLoadingResults, setIsLoadingResults] = useState(false); // For fetching poll results
    const [error, setError] = useState(null);
    const { user } = useAuth(); // Get user info, might be useful later for UI cues
    const [showResults, setShowResults] = useState(false); // New state for toggling results

    const fetchMatchDetails = useCallback(async (initialLoad = true) => {
        if (!matchId) return;
        if(initialLoad) setIsLoading(true);
        setError(null);
        try {
            // This fetches general match details, including lineups etc.
            // The poll results themselves will be fetched by fetchPollResults if needed.
            const response = await apiClient.get(`/matches/${matchId}`);
            setMatchDetails(response.data);
            // If initial load also returns poll stats, we can set showResults based on that
            // or if user already voted, perhaps show results by default.
            // For now, results are hidden by default until user clicks the button.
        } catch (e) {
            console.error("Maç detayları yüklenirken hata:", e);
            setError("Maç detayları yüklenemedi.");
            toast.error("Maç detayları yüklenemedi.");
        } finally {
            if(initialLoad) setIsLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        fetchMatchDetails(true); // Initial full load
    }, [fetchMatchDetails]);

    const handleVoteSubmit = async (voteType) => {
        if (!user) { // Ensure user is logged in to vote (backend also likely protects this)
            toast.error("Oy vermek için lütfen giriş yapın.");
            return;
        }
        if (isVoting || isLoadingResults) return; // Prevent multiple submissions
        setIsVoting(true);
        try {
            const response = await apiClient.post(`/polls/${matchId}/vote`, { voteType });
            setMatchDetails(response.data); // Update match details with the response from voting
            toast.success("Oyunuz başarıyla kaydedildi!");
            // After voting, the results might have changed, so if results are shown, refresh them.
            if (showResults) {
                // Data from vote submission should already contain updated vote counts as per DTO.
                // No need for an extra fetchPollResults here if DTO from vote is comprehensive.
            }
        } catch (e) {
            console.error("Oy verilirken hata:", e.response?.data || e.message);
            const errorMessage = e.response?.data?.message || e.response?.data?.error || "Oy verilirken bir hata oluştu.";
            // Check for specific error messages from backend, e.g., if user already voted
            if (errorMessage.toLowerCase().includes("already voted") || e.response?.status === 409) {
                 toast.warn("Bu maç için zaten oy kullandınız.");
            } else {
                 toast.error(errorMessage);
            }
        } finally {
            setIsVoting(false);
        }
    };

    const fetchPollResults = async (currentMatchId, updateShowResults = true) => {
        if (isLoadingResults) return;
        setIsLoadingResults(true);
        try {
            const response = await apiClient.get(`/polls/${currentMatchId}/results`);
            setMatchDetails(response.data); // Expecting MatchDetailDTO with updated pollStats
            if (updateShowResults) setShowResults(true); // Show results after fetching them
            // Check if vote counts are actually present after fetch
            if (typeof response.data?.teamAVotes !== 'number') { 
                toast.info("Oylama sonuçları henüz mevcut değil veya beklenmedik formatta.");
            }
        } catch (e) {
            console.error("Oylama sonuçları alınırken hata:", e);
            toast.error("Oylama sonuçları alınamadı.");
            if (updateShowResults) setShowResults(false); // Don't show results if fetch failed
        } finally {
            setIsLoadingResults(false);
        }
    };

    const toggleShowResults = () => {
        if (showResults) {
            setShowResults(false); // Just hide if already shown
        } else {
            fetchPollResults(matchId); // Fetch and then show
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="ml-4 text-lg">Yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <ToastContainer autoClose={3000} hideProgressBar theme="dark" position="top-center" />
                <p className="text-red-500 text-xl mb-4">{error}</p>
                <Link to="/carpet" className="text-blue-400 hover:text-blue-300">&larr; Kadro Oluşturucuya Dön</Link>
            </div>
        );
    }

    if (!matchDetails) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                 <ToastContainer autoClose={3000} hideProgressBar theme="dark" position="top-center" />
                <p className="text-xl mb-4">Maç bulunamadı.</p>
                <Link to="/carpet" className="text-blue-400 hover:text-blue-300">&larr; Kadro Oluşturucuya Dön</Link>
            </div>
        );
    }
    
    // Placeholder for displaying vote counts if they are part of matchDetails
    // const { teamAVotes, teamBVotes, drawVotes } = matchDetails.pollInfo || {};

    const renderTeamRoster = (lineup, teamName) => {
        if (!lineup || Object.keys(lineup).length === 0) {
            return <p className="text-gray-400">Bu takım için kayıtlı oyuncu yok.</p>;
        }
        return (
            <ul className="list-disc list-inside space-y-1">
                {Object.entries(lineup).map(([playerId, playerData]) => (
                    <li key={playerId} className="text-lg">
                        {playerData.playerName || `Oyuncu ID: ${playerId}`}
                    </li>
                ))}
            </ul>
        );
    };

    // Check if vote count data is available directly from matchDetails
    const teamAVotes = matchDetails.teamAVotes;
    const teamBVotes = matchDetails.teamBVotes;
    const drawVotes = matchDetails.drawVotes;
    const totalVotes = (teamAVotes || 0) + (teamBVotes || 0) + (drawVotes || 0);
    const areResultsAvailable = typeof teamAVotes === 'number' && typeof teamBVotes === 'number' && typeof drawVotes === 'number';

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
            <ToastContainer autoClose={3000} hideProgressBar theme="dark" position="top-center" />
            <div className='flex justify-between items-center mb-6'>
                <Link to="/carpet" className="text-blue-400 hover:text-blue-300">&larr; Kadro Oluşturucuya Dön</Link>
                <h1 className="text-3xl font-bold text-center flex-grow mr-[calc(1em+100px)]">Maç Oylaması</h1> 
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center">
                    {matchDetails.matchName || "İsimsiz Maç"}
                    {/* Display scores if available in matchDetails */}
                    {matchDetails.teamAScore != null && matchDetails.teamBScore != null && 
                        <span className="block text-lg text-gray-400">Skor: {matchDetails.teamAScore} - {matchDetails.teamBScore}</span>
                    }
                </h2>
                
                {/* Placeholder for displaying overall vote counts */}
                {/* 
                {matchDetails.pollInfo && (
                    <div className="mb-4 text-center text-gray-300">
                        <p>Takım A Oy: {teamAVotes || 0} | Beraberlik Oy: {drawVotes || 0} | Takım B Oy: {teamBVotes || 0}</p>
                    </div>
                )}
                */}

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-red-400">Takım A Kadrosu</h3>
                        {renderTeamRoster(matchDetails.lineupA, "A")}
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-blue-400">Takım B Kadrosu</h3> {/* Changed color to blue for B for contrast */}
                        {renderTeamRoster(matchDetails.lineupB, "B")}
                    </div>
                </div>

                <div className="mt-8 border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-semibold mb-4 text-center">Kim Kazanır? {(isVoting || isLoadingResults) && <span className='text-sm text-yellow-400'> (İşleniyor...)</span>}</h3>
                    <div className="flex flex-col sm:flex-row sm:justify-around gap-3 sm:gap-4">
                        <button 
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg text-base sm:text-lg transition-colors disabled:opacity-50"
                            onClick={() => handleVoteSubmit(VoteType.TEAM_A_WINS)}
                            disabled={isVoting || isLoadingResults } 
                        >
                            Takım A Kazanır
                        </button>
                        <button 
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg text-base sm:text-lg transition-colors disabled:opacity-50"
                            onClick={() => handleVoteSubmit(VoteType.DRAW)}
                            disabled={isVoting || isLoadingResults }
                        >
                            Berabere Biter
                        </button>
                        <button 
                            className="bg-[#fcfceb] hover:bg-[#c9c9b9] text-black font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-lg text-base sm:text-lg transition-colors disabled:opacity-50" // text-white for better contrast
                            onClick={() => handleVoteSubmit(VoteType.TEAM_B_WINS)}
                            disabled={isVoting || isLoadingResults }
                        >
                            Takım B Kazanır
                        </button>
                    </div>
                    <p className="text-center text-gray-400 mt-4 text-sm">Not: Oyuncular maç başına sadece bir oy kullanabilir.</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700">
                    <button 
                        onClick={toggleShowResults}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-md transition-colors duration-200 mb-4 disabled:opacity-50 flex items-center justify-center"
                        disabled={isLoadingResults}
                    >
                        {isLoadingResults ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                Yükleniyor...
                            </>
                        ) : (
                            showResults ? 'Sonuçları Gizle' : 'Sonuçları Göster'
                        )}
                    </button>

                    {showResults && areResultsAvailable && (
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h4 className="text-lg font-semibold mb-4 text-center text-white">Oylama Sonuçları (Toplam Oy: {totalVotes})</h4>
                            <div className="space-y-3">
                                {[ // Array to map over for cleaner bar rendering
                                    { label: 'Takım A Kazanır', votes: teamAVotes, color: 'bg-red-500', textColor: 'text-red-300' },
                                    { label: 'Berabere Biter', votes: drawVotes, color: 'bg-gray-500', textColor: 'text-gray-300' },
                                    { label: 'Takım B Kazanır', votes: teamBVotes, color: 'bg-[#fcfceb]', textColor: 'text-white-800' },
                                ].map((item, index) => {
                                    const percentage = totalVotes > 0 ? ((item.votes || 0) / totalVotes) * 100 : 0;
                                    return (
                                        <div key={index}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-sm font-medium ${item.textColor}`}>{item.label}</span>
                                                <span className={`text-sm font-semibold ${item.textColor}`}>
                                                    {item.votes || 0} Oy ({percentage.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-600 rounded-full h-5 overflow-hidden shadow-inner">
                                                <div 
                                                    className={`${item.color} h-5 rounded-full transition-all duration-500 ease-out`}
                                                    style={{ width: `${percentage}%` }}
                                                    title={`${percentage.toFixed(1)}%`}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {showResults && !areResultsAvailable && !isLoadingResults && (
                        <p className="text-center text-gray-400">Oylama sonuçları henüz mevcut değil veya yüklenemedi.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PollPage; 