import React from 'react';

function MatchControls({
    matches,
    selectedMatchId,
    onMatchSelected,
    onDeleteSelectedMatch,
    isLoadingMatches,
    isProcessingAction, // General disable flag (e.g. during sharing)
    onCopyLink,
    shareableLink,
    teamAScore,
    onTeamAScoreChange,
    teamBScore,
    onTeamBScoreChange,
    onSaveScore,
    isSavingScore
}) {
    const handleSelectChange = (e) => {
        const matchId = e.target.value;
        onMatchSelected(matchId);
    };

    const selectedMatchName = selectedMatchId
        ? matches.find(m => String(m.id) === String(selectedMatchId))?.matchName || 'Seçili Maç'
        : 'Seçili Maç';

    return (
        <div className='mt-2 space-y-2'>
            <h4 className='text-sm font-medium text-gray-400 mb-1'>Kayıtlı Kadroyu Yönet:</h4>
            <div className="flex gap-2 items-center">
                <select
                    value={selectedMatchId}
                    onChange={handleSelectChange}
                    className="flex-grow bg-gray-700 text-gray-100 p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    disabled={isLoadingMatches || matches.length === 0 || isProcessingAction}
                >
                    <option value="">
                        {isLoadingMatches ? "Yükleniyor..." : (matches.length === 0 ? "Kayıt Yok" : "-- Kadro Seç --")}
                    </option>
                    {matches.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.matchName || `Kayıt ${new Date(m.savedAt).toLocaleDateString('tr-TR')}`}
                        </option>
                    ))}
                </select>
                <button
                    onClick={onDeleteSelectedMatch}
                    className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white font-semibold disabled:opacity-50"
                    title="Seçili kadroyu sil"
                    disabled={!selectedMatchId || isLoadingMatches || isProcessingAction}
                >
                    Sil
                </button>
            </div>
            <div>
                <button
                    onClick={onCopyLink}
                    className="w-full bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded text-white font-semibold disabled:opacity-50"
                    disabled={!shareableLink || isProcessingAction}
                >
                    Paylaşım Linkini Kopyala
                </button>
            </div>

            {selectedMatchId && (
                <div className="mt-4 pt-3 border-t border-gray-700">
                    <h4 className='text-sm font-medium text-gray-400 mb-2'>Maç Skoru ({selectedMatchName}):</h4>
                    <div className="flex gap-3 items-center justify-between mb-2">
                        <div className='flex-1'>
                            <label htmlFor="teamAScore" className="block text-xs font-medium text-gray-300 mb-1">Takım A</label>
                            <input
                                type="number"
                                id="teamAScore"
                                min="0"
                                value={teamAScore}
                                onChange={e => onTeamAScoreChange(e.target.value)}
                                placeholder="A"
                                className="w-full bg-gray-700 p-2 rounded outline-none focus:ring-2 focus:ring-red-500 text-center"
                                disabled={isSavingScore || isProcessingAction}
                            />
                        </div>
                        <span className="text-gray-400 pt-5 text-xl font-bold">-</span>
                        <div className='flex-1'>
                            <label htmlFor="teamBScore" className="block text-xs font-medium text-gray-300 mb-1">Takım B</label>
                            <input
                                type="number"
                                id="teamBScore"
                                min="0"
                                value={teamBScore}
                                onChange={e => onTeamBScoreChange(e.target.value)}
                                placeholder="B"
                                className="w-full bg-gray-700 p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                disabled={isSavingScore || isProcessingAction}
                            />
                        </div>
                    </div>
                    <button
                        onClick={onSaveScore}
                        className='w-full bg-green-600 hover:bg-green-700 py-2 rounded text-white font-semibold disabled:opacity-50'
                        disabled={isSavingScore || !selectedMatchId || isProcessingAction}
                    >
                        {isSavingScore ? 'Kaydediliyor...' : 'Skorları Kaydet/Güncelle'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default MatchControls;