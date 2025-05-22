import React from 'react';
import { Link } from 'react-router-dom';

function ActionButtons({
    onSharePitches,
    onClearPitch,
    onSaveMatch,
    onAlignPlayers,
    onSwitchTeams,
    isSharing,
    isSavingMatch,
    isAligningPlayers,
    isSwitchingTeams,
    hasPlayersOnPitch,
    selectedMatchId
}) {
    return (
        <div className="space-y-2">
            <button
                onClick={onSharePitches}
                disabled={!hasPlayersOnPitch || isSharing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSharing ? 'Paylaşılıyor...' : 'Kadroyu Paylaş'}
            </button>
            
            <button
                onClick={onAlignPlayers}
                disabled={!hasPlayersOnPitch || isAligningPlayers}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isAligningPlayers ? 'Hizalanıyor...' : 'Oyuncuları Hizala'}
            </button>

            <button
                onClick={onSwitchTeams}
                disabled={!hasPlayersOnPitch || isSwitchingTeams}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSwitchingTeams ? 'Değiştiriliyor...' : 'Takımları Değiştir'}
            </button>

            <button
                onClick={onSaveMatch}
                disabled={!hasPlayersOnPitch || isSavingMatch}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSavingMatch ? 'Kaydediliyor...' : 'Kadroyu Kaydet'}
            </button>

            <button
                onClick={onClearPitch}
                disabled={!hasPlayersOnPitch}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Sahayı Temizle
            </button>

            {selectedMatchId && (
                <Link
                    to={`/poll/${selectedMatchId}`}
                    className='w-full block text-center bg-green-600 hover:bg-green-700 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50'
                    aria-disabled={!selectedMatchId}
                    style={!selectedMatchId ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                    title={!selectedMatchId ? "Oylama başlatmak için bir maç seçili olmalı" : "Maç sonucu için oylama başlat"}
                >
                    Maç Sonucu Oylaması
                </Link>
            )}
        </div>
    );
}

export default ActionButtons;