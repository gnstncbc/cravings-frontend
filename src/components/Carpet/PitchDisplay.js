import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import PlayerMarker from './PlayerMarker';

function PitchDisplay({ pitchId, teamId, playersOnThisPitch, pitchRef }) {
    const { setNodeRef, isOver } = useDroppable({ id: pitchId });
    const teamBorderColor = teamId === 'A' ? 'border-red-500' : 'border-blue-500';
    const teamBgColor = teamId === 'A' ? 'bg-red-900' : 'bg-blue-900';

    return (
        <div ref={pitchRef} className={`flex-1 min-h-[500px] sm:h-[500px] ${teamBgColor} bg-opacity-20 rounded-lg border-2 ${teamBorderColor} relative overflow-hidden`}>
            <h2 className={`text-center font-bold text-xl my-2 ${teamId === 'A' ? 'text-red-400' : 'text-blue-400'}`}>TAKIM {teamId}</h2>
            <div ref={setNodeRef} className={`absolute inset-0 z-10 ${isOver ? `${teamId === 'A' ? 'bg-red-500' : 'bg-blue-500'} bg-opacity-10` : ''}`}></div>
            {/* Pitch markings */}
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white bg-opacity-30 transform -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-white border-opacity-30 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-0"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-b border-white border-opacity-30 z-0"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-t border-white border-opacity-30 z-0"></div>
            <div className="absolute top-0 left-1/2 w-1/4 h-4 border-b border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>
            <div className="absolute bottom-0 left-1/2 w-1/4 h-4 border-t border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>

            {Object.entries(playersOnThisPitch).map(([playerId, playerData]) => (
                <PlayerMarker
                    key={playerId}
                    id={playerId}
                    name={playerData.name}
                    team={teamId}
                    style={{
                        position: 'absolute',
                        left: `${playerData.xPercent}%`,
                        top: `${playerData.yPercent}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20
                    }}
                />
            ))}
        </div>
    );
}

export default PitchDisplay;