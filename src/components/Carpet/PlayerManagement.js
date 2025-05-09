import React from 'react';

function PlayerManagement({
    allPlayers,
    isLoadingPlayers,
    newPlayerName,
    onNewPlayerNameChange,
    onAddPlayer,
    onDeletePlayer,
    isProcessingAction // General disable flag
}) {
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-3 text-gray-200">
                Oyuncular ({isLoadingPlayers ? '...' : allPlayers.length})
            </h2>
            <form onSubmit={onAddPlayer} className="flex gap-2 mb-3">
                <input
                    type="text"
                    value={newPlayerName}
                    onChange={e => onNewPlayerNameChange(e.target.value)}
                    placeholder="Yeni oyuncu adı"
                    className="flex-grow bg-gray-700 p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    disabled={isLoadingPlayers || isProcessingAction}
                />
                <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold disabled:opacity-50"
                    disabled={isLoadingPlayers || isProcessingAction || !newPlayerName.trim()}
                >
                    +
                </button>
            </form>
            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 mb-2 custom-scrollbar">
                {isLoadingPlayers ? (
                    <p className="text-gray-500 text-center text-sm py-2">Yükleniyor...</p>
                ) : allPlayers.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm py-2">Oyuncu yok.</p>
                ) : (
                    allPlayers.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-gray-700 hover:bg-gray-600 p-1.5 rounded text-sm">
                            <span className='text-gray-100'>{p.name}</span>
                            <button
                                onClick={() => onDeletePlayer(p.id)}
                                className='text-red-500 hover:text-red-400 text-xs px-1 font-medium disabled:opacity-50'
                                disabled={isProcessingAction}
                            >
                                Sil
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default PlayerManagement;