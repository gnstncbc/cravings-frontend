import React, { useState, useEffect } from 'react';
import { apiClient } from '../Carpet/api';

const POSITIONS = ['Kaleci', 'Bek', 'Stoper', 'Orta Saha', 'Forvet'];

const TeamGenerator = ({ isOpen, onClose, players, onTeamsGenerated, onStateChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [playerPositions, setPlayerPositions] = useState({});
    const [generatedTeams, setGeneratedTeams] = useState(null);
    const [filterPosition, setFilterPosition] = useState('');

    // Sync state to parent
    useEffect(() => {
        if (onStateChange) {
            onStateChange({ selectedPlayers, playerPositions });
        }
    }, [selectedPlayers, playerPositions, onStateChange]);

    const filteredPlayers = players.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPosition = !filterPosition || playerPositions[player.id] === filterPosition;
        return matchesSearch && matchesPosition;
    });

    const handlePlayerSelect = (player) => {
        setSelectedPlayers(prev => {
            if (prev.find(p => p.id === player.id)) {
                return prev.filter(p => p.id !== player.id);
            }
            return [...prev, player];
        });
    };

    const handlePositionChange = (playerId, position) => {
        setPlayerPositions(prev => ({
            ...prev,
            [playerId]: position
        }));
    };

    const generateTeams = () => {
        if (selectedPlayers.length < 2) return;

        // Group players by their positions
        const playersByPosition = {};
        selectedPlayers.forEach(player => {
            const position = playerPositions[player.id] || getRandomPosition(selectedPlayers);
            if (!playersByPosition[position]) {
                playersByPosition[position] = [];
            }
            playersByPosition[position].push({ ...player, position });
        });

        // Initialize teams
        const teamA = [];
        const teamB = [];

        // First, count how many players will be in each team for positions that need special handling
        const teamAMidfielders = Math.ceil(playersByPosition['Orta Saha']?.length / 2) || 0;
        const teamBMidfielders = Math.floor(playersByPosition['Orta Saha']?.length / 2) || 0;
        const teamAForwards = Math.ceil(playersByPosition['Forvet']?.length / 2) || 0;
        const teamBForwards = Math.floor(playersByPosition['Forvet']?.length / 2) || 0;

        // Distribute players by position
        Object.entries(playersByPosition).forEach(([position, players]) => {
            // Shuffle players in this position
            const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

            // Distribute players evenly between teams
            shuffledPlayers.forEach((player, index) => {
                const team = index % 2 === 0 ? teamA : teamB;

                if (position === 'Bek') {
                    const existingBeks = team.filter(p => p.position === 'Bek');
                    const xCoordinate = existingBeks.length % 2 === 0 ? 80 : 20;
                    team.push({ ...player, xCoordinate });
                } else if (position === 'Orta Saha') {
                    const existingMidfielders = team.filter(p => p.position === 'Orta Saha');
                    let xCoordinate;

                    if (team === teamA) {
                        if (teamAMidfielders === 1) {
                            xCoordinate = 50;
                        } else {
                            xCoordinate = existingMidfielders.length === 0 ? 70 : 30;
                        }
                    } else {
                        if (teamBMidfielders === 1) {
                            xCoordinate = 50;
                        } else {
                            xCoordinate = existingMidfielders.length === 0 ? 70 : 30;
                        }
                    }

                    team.push({ ...player, xCoordinate });
                } else if (position === 'Forvet') {
                    const existingForwards = team.filter(p => p.position === 'Forvet');
                    let xCoordinate;

                    if (team === teamA) {
                        if (teamAForwards === 1) {
                            xCoordinate = 50;
                        } else if (teamAForwards === 2) {
                            xCoordinate = existingForwards.length === 0 ? 70 : 30;
                        } else {
                            // For 3 forwards: 30, 50, 70
                            if (existingForwards.length === 0) xCoordinate = 30;
                            else if (existingForwards.length === 1) xCoordinate = 50;
                            else xCoordinate = 70;
                        }
                    } else {
                        if (teamBForwards === 1) {
                            xCoordinate = 50;
                        } else if (teamBForwards === 2) {
                            xCoordinate = existingForwards.length === 0 ? 70 : 30;
                        } else {
                            // For 3 forwards: 30, 50, 70
                            if (existingForwards.length === 0) xCoordinate = 30;
                            else if (existingForwards.length === 1) xCoordinate = 50;
                            else xCoordinate = 70;
                        }
                    }

                    team.push({ ...player, xCoordinate });
                } else {
                    team.push(player);
                }
            });
        });

        const finalTeams = {
            teamA,
            teamB
        };

        setGeneratedTeams(finalTeams);
        onTeamsGenerated(finalTeams.teamA, finalTeams.teamB);
        window.scrollTo(0, 0);
    };

    const getRandomPosition = (team) => {
        const existingPositions = team.map(p => playerPositions[p.id]);
        const availablePositions = POSITIONS.filter(p => !existingPositions.includes(p));
        return availablePositions[Math.floor(Math.random() * availablePositions.length)] || POSITIONS[0];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex justify-between items-center">
                        <div>
                            {/* <h2 className="text-2xl font-bold text-white">Otomatik Kadro Oluşturucu</h2> */}
                            <p className="text-2xl font-bold text-blue-400 mt-2">Seçili Oyuncu: {selectedPlayers.length}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mt-4 flex flex-col md:flex-row gap-2 md:gap-4 w-full">
                        <input
                            type="text"
                            placeholder="Oyuncu ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 min-w-0 px-4 py-2 bg-gray-700 text-white rounded-lg"
                        />
                        <select
                            value={filterPosition}
                            onChange={(e) => setFilterPosition(e.target.value)}
                            className="flex-1 min-w-0 px-4 py-2 bg-gray-700 text-white rounded-lg"
                        >
                            <option value="">Tüm Pozisyonlar</option>
                            {POSITIONS.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setSelectedPlayers([])}
                            className="flex-1 min-w-0 bg-red-600 hover:bg-red-700 text-white rounded-lg px-2 py-1 text-sm font-semibold"
                        >
                            Oyuncuları Temizle
                        </button>
                        <button
                            onClick={() => setPlayerPositions({})}
                            className="flex-1 min-w-0 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg px-2 py-1 text-sm font-semibold"
                        >
                            Pozisyonları Temizle
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 stable-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-white mb-4">Oyuncular</h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto stable-scrollbar pr-2">
                                {filteredPlayers.map(player => (
                                    <div
                                        key={player.id}
                                        className={`p-2 rounded-lg cursor-pointer ${selectedPlayers.find(p => p.id === player.id)
                                                ? 'bg-blue-600'
                                                : 'bg-gray-600 hover:bg-gray-500'
                                            }`}
                                        onClick={() => handlePlayerSelect(player)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-white">{player.name}</span>
                                            <select
                                                value={playerPositions[player.id] || ''}
                                                onChange={(e) => handlePositionChange(player.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-gray-800 text-white rounded px-2 py-1 text-sm"
                                            >
                                                <option value="">Pozisyon Seç</option>
                                                {POSITIONS.map(pos => (
                                                    <option key={pos} value={pos}>{pos}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-700 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-white mb-4">Seçili Oyuncular</h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto stable-scrollbar pr-2">
                                {selectedPlayers.map(player => (
                                    <div
                                        key={player.id}
                                        className="bg-gray-600 p-2 rounded-lg flex justify-between items-center"
                                    >
                                        <span className="text-white">{player.name}</span>
                                        <span className="text-gray-300">
                                            {playerPositions[player.id] || 'Pozisyon Seçilmedi'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {generatedTeams && (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-700 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-white mb-4">Takım A</h3>
                                <div className="space-y-2">
                                    {generatedTeams.teamA.map(player => (
                                        <div key={player.id} className="bg-gray-600 p-2 rounded-lg">
                                            <div className="text-white">{player.name}</div>
                                            <div className="text-gray-300 text-sm">{player.position}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-700 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-white mb-4">Takım B</h3>
                                <div className="space-y-2">
                                    {generatedTeams.teamB.map(player => (
                                        <div key={player.id} className="bg-gray-600 p-2 rounded-lg">
                                            <div className="text-white">{player.name}</div>
                                            <div className="text-gray-300 text-sm">{player.position}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-700">
                    <div className="flex justify-center">
                        <button
                            onClick={generateTeams}
                            disabled={selectedPlayers.length < 2}
                            className={`px-6 py-2 rounded-lg font-semibold ${selectedPlayers.length < 2
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            Takımları Oluştur
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamGenerator; 