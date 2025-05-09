import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function PlayerMarker({ id, name, team, isDragging, isOverlay, style: markerStyle, ...props }) {
    const stringId = String(id);
    const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
        id: stringId,
        data: { type: 'player', player: { id: stringId, name } }
    });

    const dndKitStyle = {
        transform: CSS.Translate.toString(transform),
        ...markerStyle
    };

    const style = isOverlay
        ? { ...dndKitStyle, cursor: 'grabbing', zIndex: 100 }
        : { ...dndKitStyle, touchAction: 'none', opacity: isCurrentlyDragging ? 0.5 : 1 };

    const teamColor = team === 'A' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
    const baseColor = team ? teamColor : 'bg-gray-600 hover:bg-gray-500';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`player-marker-capture p-1 px-2 rounded shadow text-center text-sm font-semibold cursor-grab ${baseColor} text-white ${isCurrentlyDragging ? 'ring-2 ring-yellow-400' : ''} ${isOverlay ? 'ring-2 ring-offset-2 ring-yellow-500' : ''}`}
            {...listeners}
            {...attributes}
            data-player-name={name} // Used by html2canvas onclone
        >
            {name}
        </div>
    );
}

export default PlayerMarker;