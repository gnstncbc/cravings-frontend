import React, { useState, useMemo } from 'react';

// İki nokta arasındaki mesafeyi hesaplayan yardımcı fonksiyon
const getDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const ChemistryLines = ({ playersOnPitch, pairStats, pitchRef }) => {
    const [hoveredPair, setHoveredPair] = useState(null);

    const linesToDraw = useMemo(() => {
        if (!pitchRef.current || Object.keys(playersOnPitch).length < 2) {
            return [];
        }

        const pitchRect = pitchRef.current.getBoundingClientRect();
        const lines = [];

        const playerPositions = Object.entries(playersOnPitch).map(([id, data]) => ({
            id,
            x: (data.xPercent / 100) * pitchRect.width,
            y: (data.yPercent / 100) * pitchRect.height,
        }));

        playerPositions.forEach((player1, i) => {
            // Her oyuncunun diğer tüm oyunculara olan mesafesini hesapla
            const distances = playerPositions
                .filter(p => p.id !== player1.id)
                .map(player2 => ({
                    ...player2,
                    distance: getDistance(player1, player2),
                }))
                .sort((a, b) => a.distance - b.distance);

            // En yakın 2 komşuyu al
            const neighbors = distances.slice(0, 3);

            neighbors.forEach(player2 => {
                // Çizginin zaten ters yönde eklenip eklenmediğini kontrol et
                const isDuplicate = lines.some(line =>
                    (line.p1.id === player2.id && line.p2.id === player1.id)
                );

                if (!isDuplicate) {
                    const pairStat = pairStats.find(stat =>
                        (String(stat.player1Id) === player1.id && String(stat.player2Id) === player2.id) ||
                        (String(stat.player1Id) === player2.id && String(stat.player2Id) === player1.id)
                    );

                    let color = '#888888'; // Gri (veri yoksa)
                    let strokeWidth = 1.5;
                    let winPercentage = null;

                    if (pairStat) {
                        winPercentage = pairStat.winPercentage;
                        if (winPercentage > 60) {
                            color = '#22c55e'; // Yeşil
                            strokeWidth = 2.5;
                        } else if (winPercentage >= 40) {
                            color = '#facc15'; // Sarı
                            strokeWidth = 2;
                        } else {
                            color = '#ef4444'; // Kırmızı
                            strokeWidth = 2;
                        }
                    }

                    lines.push({
                        p1: player1,
                        p2: player2,
                        color,
                        strokeWidth,
                        winPercentage,
                    });
                }
            });
        });

        return lines;
    }, [playersOnPitch, pairStats, pitchRef]);

    if (!pitchRef.current) return null;

    return (
        <svg
            className="absolute top-0 left-0 w-full h-full"
            style={{ pointerEvents: 'none', zIndex: 15 }}
        >
            {linesToDraw.map((line, index) => (
                <g key={index}>
                    <line
                        x1={line.p1.x}
                        y1={line.p1.y}
                        x2={line.p2.x}
                        y2={line.p2.y}
                        stroke={line.color}
                        strokeWidth={line.strokeWidth}
                        strokeDasharray={line.winPercentage === null ? "4 4" : "none"} // Veri yoksa kesikli çizgi
                    />
                    {/* Hover için daha geniş, görünmez bir çizgi */}
                    <line
                        x1={line.p1.x}
                        y1={line.p1.y}
                        x2={line.p2.x}
                        y2={line.p2.y}
                        stroke="transparent"
                        strokeWidth="15"
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPair({
                            x: (line.p1.x + line.p2.x) / 2,
                            y: (line.p1.y + line.p2.y) / 2,
                            percentage: line.winPercentage,
                            games: line.winPercentage !== null ? pairStats.find(stat =>
                                (String(stat.player1Id) === line.p1.id && String(stat.player2Id) === line.p2.id) ||
                                (String(stat.player1Id) === line.p2.id && String(stat.player2Id) === line.p1.id)
                            )?.gamesPlayedTogether : null
                        })}
                        onMouseLeave={() => setHoveredPair(null)}
                    />
                </g>
            ))}
            {hoveredPair && hoveredPair.percentage !== null && (
                <foreignObject x={hoveredPair.x - 50} y={hoveredPair.y - 25} width="100" height="50">
                    <div xmlns="http://www.w3.org/1999/xhtml" className="bg-gray-900 bg-opacity-80 text-white text-xs font-bold p-2 rounded-md text-center shadow-lg">
                        <div>{hoveredPair.percentage.toFixed(1)}%</div>
                        <div className="text-gray-400">{hoveredPair.games} maç</div>
                    </div>
                </foreignObject>
            )}
        </svg>
    );
};

export default ChemistryLines;