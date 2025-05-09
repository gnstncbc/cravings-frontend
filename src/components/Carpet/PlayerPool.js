import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import PlayerMarker from './PlayerMarker';

function PlayerPool({ id, players, loading }) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div ref={setNodeRef} id={id} className={`bg-gray-800 p-4 rounded-lg space-y-2 min-h-[200px] h-full overflow-y-auto ${isOver ? 'outline outline-2 outline-green-500' : ''}`}>
            <h3 className="text-lg font-semibold mb-2 text-center">Müsait Oyuncular</h3>
            {loading ? (
                <p className="text-gray-500 text-center text-sm">Oyuncular yükleniyor...</p>
            ) : players.length === 0 ? (
                <p className="text-gray-500 text-center text-sm">Tüm oyuncular sahada veya oyuncu yok.</p>
            ) : (
                players.map(player => (
                    <PlayerMarker key={player.id} id={player.id} name={player.name} team={null} />
                ))
            )}
        </div>
    );
}

export default PlayerPool;