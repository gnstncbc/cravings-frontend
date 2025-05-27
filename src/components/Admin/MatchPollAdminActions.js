// src/components/Admin/MatchPollAdminActions.js
// NEW FILE
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../Carpet/api';
import { toast } from 'react-toastify';

const MatchPollAdminActions = () => {
    const [matches, setMatches] = useState([]);
    const [isLoadingMatches, setIsLoadingMatches] = useState(true);
    const [selectedMatchId, setSelectedMatchId] = useState('');
    const [userVotes, setUserVotes] = useState([]);
    const [isLoadingVotes, setIsLoadingVotes] = useState(false);

    const fetchMatches = useCallback(async () => {
        setIsLoadingMatches(true);
        try {
            const response = await apiClient.get('/matches'); // This gets MatchSummaryDTO
            setMatches(response.data || []);
        } catch (error) {
            console.error("Error fetching matches:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to fetch matches.");
            setMatches([]);
        } finally {
            setIsLoadingMatches(false);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    const handleFetchUserVotes = async (matchId) => {
        if (!matchId) {
            setUserVotes([]);
            return;
        }
        setSelectedMatchId(matchId);
        setIsLoadingVotes(true);
        setUserVotes([]); // Clear previous votes
        try {
            const response = await apiClient.get(`/polls/${matchId}/user-votes`);
            setUserVotes(response.data || []);
            if (response.data.length === 0) {
                toast.info("No user votes found for this match.");
            }
        } catch (error) {
            console.error("Error fetching user votes:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to fetch user votes.");
        } finally {
            setIsLoadingVotes(false);
        }
    };


    return (
        <section className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100 border-b border-gray-700 pb-3">Match & Poll Admin Actions</h2>

            <div className="mb-6">
                <label htmlFor="match-select" className="block text-sm font-medium text-gray-300 mb-1">Select Match to View Votes:</label>
                <select
                    id="match-select"
                    value={selectedMatchId}
                    onChange={(e) => handleFetchUserVotes(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isLoadingMatches || matches.length === 0}
                >
                    <option value="">
                        {isLoadingMatches ? "Loading matches..." : (matches.length === 0 ? "No matches available" : "-- Select a Match --")}
                    </option>
                    {matches.map(match => (
                        <option key={match.id} value={match.id}>
                            {match.matchName || `Match ID: ${match.id}`} (Saved: {new Date(match.savedAt).toLocaleDateString()})
                        </option>
                    ))}
                </select>
            </div>

            {isLoadingVotes && (
                <div className="flex justify-center items-center h-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                    <p className="ml-3 text-gray-300">Loading votes...</p>
                </div>
            )}

            {!isLoadingVotes && selectedMatchId && userVotes.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-200">
                        User Votes for "{matches.find(m => String(m.id) === selectedMatchId)?.matchName || `Match ID: ${selectedMatchId}`}"
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vote</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {userVotes.map(vote => (
                                    <tr key={vote.userVoteId} className="hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{vote.userEmail}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{vote.userFirstname}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{vote.voteType.replace('_', ' ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
             {!isLoadingVotes && selectedMatchId && userVotes.length === 0 && !isLoadingMatches && (
                <p className="text-center text-gray-400 mt-4">No votes recorded for the selected match, or data is still loading.</p>
            )}
        </section>
    );
};

export default MatchPollAdminActions;