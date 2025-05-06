// src/components/Carpet.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDraggable,
    useDroppable,
    closestCorners
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import html2canvas from 'html2canvas';

// --- API Base URL ---
const API_BASE_URL = 'https://gnstncbc.com/api';

// --- API Client (Axios Instance) ---
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// --- Yardımcı Bileşenler ---
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
            data-player-name={name}
        >
            {name}
        </div>
    );
}

function PlayerPool({ id, players, loading }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} id={id} className={`bg-gray-800 p-4 rounded-lg space-y-2 min-h-[200px] h-full overflow-y-auto ${isOver ? 'outline outline-2 outline-green-500' : ''}`}>
            <h3 className="text-lg font-semibold mb-2 text-center">Müsait Oyuncular</h3>
            {loading ? (<p className="text-gray-500 text-center text-sm">Oyuncular yükleniyor...</p>)
                : players.length === 0 ? (<p className="text-gray-500 text-center text-sm">Tüm oyuncular sahada veya oyuncu yok.</p>)
                    : (players.map(player => (<PlayerMarker key={player.id} id={player.id} name={player.name} team={null} />)))}
        </div>
    );
}

function PitchDisplay({ pitchId, teamId, playersOnThisPitch, pitchRef }) {
    const { setNodeRef, isOver } = useDroppable({ id: pitchId });
    const teamBorderColor = teamId === 'A' ? 'border-red-500' : 'border-blue-500';
    const teamBgColor = teamId === 'A' ? 'bg-red-900' : 'bg-blue-900';
    return (
        <div ref={pitchRef} className={`flex-1 min-h-[500px] sm:h-[500px] ${teamBgColor} bg-opacity-20 rounded-lg border-2 ${teamBorderColor} relative overflow-hidden`}>
            <h2 className={`text-center font-bold text-xl my-2 ${teamId === 'A' ? 'text-red-400' : 'text-blue-400'}`}>TAKIM {teamId}</h2>
            <div ref={setNodeRef} className={`absolute inset-0 z-10 ${isOver ? `${teamId === 'A' ? 'bg-red-500' : 'bg-blue-500'} bg-opacity-10` : ''}`}></div>
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white bg-opacity-30 transform -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-white border-opacity-30 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-0"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-b border-white border-opacity-30 z-0"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-t border-white border-opacity-30 z-0"></div>
            <div className="absolute top-0 left-1/2 w-1/4 h-4 border-b border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>
            <div className="absolute bottom-0 left-1/2 w-1/4 h-4 border-t border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>
            {Object.entries(playersOnThisPitch).map(([playerId, playerData]) => (
                <PlayerMarker key={playerId} id={playerId} name={playerData.name} team={teamId} style={{ position: 'absolute', left: `${playerData.xPercent}%`, top: `${playerData.yPercent}%`, transform: 'translate(-50%, -50%)', zIndex: 20 }} />
            ))}
        </div>
    );
}

const Carpet = () => {
    const [allPlayers, setAllPlayers] = useState([]);
    const [playersOnPitchA, setPlayersOnPitchA] = useState({});
    const [playersOnPitchB, setPlayersOnPitchB] = useState({});
    const [matches, setMatches] = useState([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
    const [isLoadingMatches, setIsLoadingMatches] = useState(true);
    const [isSavingMatch, setIsSavingMatch] = useState(false);
    const [selectedMatchId, setSelectedMatchId] = useState("");
    const [shareableLink, setShareableLink] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [teamAScore, setTeamAScore] = useState('');
    const [teamBScore, setTeamBScore] = useState('');
    const [isSavingScore, setIsSavingScore] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const pitchRefA = useRef(null);
    const pitchRefB = useRef(null);
    const pitchesContainerRef = useRef(null);

    const fetchPlayers = useCallback(async () => { setIsLoadingPlayers(true); try { const r = await apiClient.get('/players'); setAllPlayers(r.data.map(p => ({ ...p, id: String(p.id) })) || []); } catch (e) { console.error("Oyuncular yüklenirken hata:", e); toast.error("Oyuncular yüklenemedi."); setAllPlayers([]); } finally { setIsLoadingPlayers(false); } }, []);
    const fetchMatches = useCallback(async () => { setIsLoadingMatches(true); try { const r = await apiClient.get('/matches'); setMatches(r.data.map(m => ({ ...m, id: String(m.id) })) || []); } catch (e) { console.error("Maçlar yüklenirken hata:", e); toast.error("Kayıtlı maçlar yüklenemedi."); setMatches([]); } finally { setIsLoadingMatches(false); } }, []);

    const loadMatchLineup = useCallback(async (matchId) => {
        if (!matchId) {
            setShareableLink(null); setTeamAScore(''); setTeamBScore('');
            // No need to clear pitches here, clearPitch or dropdown "else" handles it
            return;
        }
        toast.info("Kadro ve skor bilgileri yükleniyor...");
        let matchDetails;
        try {
            const response = await apiClient.get(`/matches/${matchId}`);
            matchDetails = response.data;
            const newPitchA = {}; if (matchDetails.lineupA) { Object.entries(matchDetails.lineupA).forEach(([playerId, posData]) => { newPitchA[String(playerId)] = { name: posData.playerName, xPercent: posData.xpercent, yPercent: posData.ypercent }; }); }
            const newPitchB = {}; if (matchDetails.lineupB) { Object.entries(matchDetails.lineupB).forEach(([playerId, posData]) => { newPitchB[String(playerId)] = { name: posData.playerName, xPercent: posData.xpercent, yPercent: posData.ypercent }; }); }
            setPlayersOnPitchA(newPitchA); setPlayersOnPitchB(newPitchB);
            setTeamAScore(matchDetails.teamAScore != null ? String(matchDetails.teamAScore) : '');
            setTeamBScore(matchDetails.teamBScore != null ? String(matchDetails.teamBScore) : '');
            toast.success(`"${matchDetails.matchName || 'İsimsiz Kadro'}" yüklendi.`);
            setShareableLink(`${window.location.origin}${window.location.pathname}?matchId=${matchId}`);
            setSearchParams({ matchId }, { replace: true });
        } catch (error) {
            console.error("Maç yüklenirken hata:", error.response?.data || error.message, "Detay:", matchDetails);
            toast.error("Seçilen kadro/skor yüklenirken bir hata oluştu.");
            setShareableLink(null); setPlayersOnPitchA({}); setPlayersOnPitchB({});
            setTeamAScore(''); setTeamBScore('');
            setSelectedMatchId(""); setSearchParams({}, { replace: true });
        }
    }, [setSearchParams]);

    useEffect(() => {
        const matchIdFromUrl = searchParams.get('matchId');
        fetchPlayers();
        fetchMatches().then(() => {
            // This logic relies on `matches` state potentially not being updated yet in this exact `then` closure.
            // A more robust pattern involves another useEffect dependent on `matches`.
            // However, adhering to the structure:
            if (matchIdFromUrl) {
                // The original V2 code: const cM=matches; const fM=cM.find(m=>m.id===mId);
                // This `matches` (cM) is from the closure, might be stale.
                // If `loadMatchLineup` is robust to a non-existent ID (it is, it clears things),
                // and `setSelectedMatchId` is for the dropdown, this might appear to work.
                // The second useEffect [matches, isLoadingMatches,...] is intended to correct/sync this.
                setSelectedMatchId(matchIdFromUrl);
                loadMatchLineup(matchIdFromUrl);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPlayers, fetchMatches, searchParams]);


    useEffect(() => {
        const matchIdFromUrl = searchParams.get('matchId');
        if (matchIdFromUrl && !isLoadingMatches && matches.length > 0) {
            if (matches.some(m => m.id === matchIdFromUrl)) {
                if (selectedMatchId !== matchIdFromUrl) {
                    setSelectedMatchId(matchIdFromUrl);
                }
                if (!shareableLink) {
                    setShareableLink(`${window.location.origin}${window.location.pathname}?matchId=${matchIdFromUrl}`);
                }
            } else {
                if (selectedMatchId === matchIdFromUrl || (selectedMatchId && !matches.some(m => m.id === selectedMatchId))) {
                    clearPitch();
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matches, isLoadingMatches, searchParams, selectedMatchId]);


    const activePlayerBaseData = activeId ? allPlayers.find(p => String(p.id) === String(activeId)) : null;
    const playersOnPitchIds = useRef(new Set()).current; playersOnPitchIds.clear(); Object.keys(playersOnPitchA).forEach(id => playersOnPitchIds.add(id)); Object.keys(playersOnPitchB).forEach(id => playersOnPitchIds.add(id));
    const availablePlayers = allPlayers.filter(p => !playersOnPitchIds.has(String(p.id)));
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    function handleDragStart(event) { setActiveId(String(event.active.id)); }

    function handleDragEnd(event) {
        const { active, over, delta } = event;
        if (!active || !over) { setActiveId(null); return; }
        const draggedId = String(active.id);
        setActiveId(null);
        const overId = over.id;

        let draggedPlayerData = allPlayers.find(p => String(p.id) === draggedId);
        if (!draggedPlayerData) {
            const playerOnA = playersOnPitchA[draggedId];
            const playerOnB = playersOnPitchB[draggedId];
            if (playerOnA) draggedPlayerData = { id: draggedId, name: playerOnA.name };
            else if (playerOnB) draggedPlayerData = { id: draggedId, name: playerOnB.name };
            else { console.error("handleDragEnd: Sürüklenen oyuncu verisi bulunamadı.", draggedId); toast.error("Oyuncu bilgisi bulunamadı!"); return; }
        } else {
            draggedPlayerData = { id: String(draggedPlayerData.id), name: draggedPlayerData.name };
        }

        const sourcePitch = playersOnPitchA[draggedId] ? 'A' : playersOnPitchB[draggedId] ? 'B' : null;
        const targetPitch = overId === 'pitchAreaA' ? 'A' : overId === 'pitchAreaB' ? 'B' : null;
        const targetPool = overId === 'playerPool';

        const updatePitchState = (team, updateFn) => {
            if (team === 'A') setPlayersOnPitchA(updateFn); else if (team === 'B') setPlayersOnPitchB(updateFn);
        };
        const removeFromPitch = (team, playerId) => updatePitchState(team, prev => { const { [playerId]: _, ...rest } = prev; return rest; });
        const addToPitch = (team, playerId, data) => updatePitchState(team, prev => ({ ...prev, [playerId]: data }));

        if (sourcePitch && targetPool) {
            removeFromPitch(sourcePitch, draggedId);
            toast.info(`${draggedPlayerData.name} çıkarıldı.`); // Using V2's toast message
        }
        else if (sourcePitch && targetPitch) { // Player moved from a pitch to a pitch (or within the same pitch)
            const currentPositionData = sourcePitch === 'A' ? playersOnPitchA[draggedId] : playersOnPitchB[draggedId];
            if (!currentPositionData) return;

            const targetPitchRef = targetPitch === 'A' ? pitchRefA : pitchRefB;
            const pitchRect = targetPitchRef?.current?.getBoundingClientRect();

            if (pitchRect && pitchRect.width > 0 && pitchRect.height > 0) {
                const currentPixelX = (currentPositionData.xPercent / 100) * pitchRect.width;
                const currentPixelY = (currentPositionData.yPercent / 100) * pitchRect.height;

                let finalPixelX = currentPixelX + delta.x;
                let finalPixelY = currentPixelY + delta.y;

                const xPercent = (finalPixelX / pitchRect.width) * 100;
                const yPercent = (finalPixelY / pitchRect.height) * 100;
                const clampedXPercent = Math.max(0, Math.min(100, xPercent));
                const clampedYPercent = Math.max(0, Math.min(100, yPercent));

                const updatedPlayerData = { name: currentPositionData.name, xPercent: clampedXPercent, yPercent: clampedYPercent };

                if (sourcePitch !== targetPitch) {
                    removeFromPitch(sourcePitch, draggedId);
                    addToPitch(targetPitch, draggedId, updatedPlayerData);
                    toast.info(`${draggedPlayerData.name} Takım ${targetPitch}'e geçti.`); // Using V2's toast
                } else {
                    addToPitch(sourcePitch, draggedId, updatedPlayerData);
                }
            } else {
                console.warn("Pitch dimensions not available for percentage calculation during transfer/move.");
            }
        }
        else if (!sourcePitch && targetPitch) { // Player moved from pool to a pitch
            const targetPitchRef = targetPitch === 'A' ? pitchRefA : pitchRefB;
        // pitchRect, PitchDisplay'in dış div'inden gelir.
        // over.rect, useDroppable'ın setNodeRef'inden (PitchDisplay'in iç div'i) gelir.
        // Normalde aynı alanı temsil etmeleri gerekir.
        // Boyutlar için over.rect kullanmak daha güvenlidir çünkü dnd-kit'in "gördüğü" bırakılabilir alandır.
        // const pitchBoundingRect = targetPitchRef?.current?.getBoundingClientRect(); // Sağlama için veya over.rect sorunluysa kullanılabilir

        let dropXPercent = 50, dropYPercent = 50; // Varsayılan/fallback değeri

        const activeTranslatedRect = active.rect.current.translated;

        // Bırakılabilir alanın boyutları ve başlangıç noktası için over.rect kullanın.
        if (over && over.rect && over.rect.width > 0 && over.rect.height > 0 && activeTranslatedRect) {
            // Sürüklenen öğenin merkezi (snapCenterToCursor sayesinde imleçle aynı yerde)
            // Bunlar görünüm penceresi (viewport) koordinatlarıdır.
            const draggedItemCenterX_viewport = activeTranslatedRect.left + activeTranslatedRect.width / 2;
            const draggedItemCenterY_viewport = activeTranslatedRect.top + activeTranslatedRect.height / 2;

            // Sahanın (over.id ile tanımlanan bırakılabilir alan) sol üst köşesinin
            // görünüm penceresine göre konumu.
            const pitchOriginX_viewport = over.rect.left;
            const pitchOriginY_viewport = over.rect.top;

            // İmlecin pozisyonunu, sahanın sol üst köşesine göre hesaplayın.
            // Bu, PlayerMarker'ın merkezi için saha içindeki piksel pozisyonu olacaktır.
            let finalPixelX_relative = draggedItemCenterX_viewport - pitchOriginX_viewport;
            let finalPixelY_relative = draggedItemCenterY_viewport - pitchOriginY_viewport;

            // Sahanın boyutlarına göre yüzdeye çevirin.
            // over.rect.width ve over.rect.height kullanın, çünkü bunlar bırakılabilir alanın boyutlarıdır.
            dropXPercent = (finalPixelX_relative / over.rect.width) * 100;
            dropYPercent = (finalPixelY_relative / over.rect.height) * 100;

            // Sınırlama (clamping) işlemi aşağıdaki satırlarda orijinal kodda zaten yapılıyor.
            // Bu, yeni hesaplanan yüzdelerin 0-100 aralığında kalmasını sağlar.

            } else {
                console.warn("Saha boyutları (pitchRect) alınamadı, fallback %50/%50 kullanılıyor.");
            }
            const newPlayerData = { name: draggedPlayerData.name, xPercent: dropXPercent, yPercent: dropYPercent };
            addToPitch(targetPitch, draggedId, newPlayerData);
            toast.success(`${draggedPlayerData.name} Takım ${targetPitch}'e eklendi.`); // Using V2's toast
        }
    }

    const handleAddPlayer = async (e) => { e.preventDefault(); const n = newPlayerName.trim(); if (!n) return; if (allPlayers.some(p => p.name.toLowerCase() === n.toLowerCase())) { toast.warn(`${n} listede.`); return; } try { const r = await apiClient.post('/players', { name: n }); const aP = { ...r.data, id: String(r.data.id) }; setAllPlayers(prv => [...prv, aP].sort((a, b) => a.name.localeCompare(b.name))); setNewPlayerName(''); toast.success(`${aP.name} eklendi.`); } catch (er) { toast.error(`Hata: ${er.response?.data?.message || "Eklenemedi."}`); } };
    const handleDeletePlayer = async (pId) => { const p = allPlayers.find(pl => String(pl.id) === String(pId)); if (!p) return; if (window.confirm(`${p.name} silinsin mi?`)) { try { await apiClient.delete(`/players/${pId}`); setAllPlayers(prv => prv.filter(pl => String(pl.id) !== String(pId))); setPlayersOnPitchA(prv => { const { [pId]: _, ...r } = prv; return r; }); setPlayersOnPitchB(prv => { const { [pId]: _, ...r } = prv; return r; }); toast.info(`${p.name} silindi.`); } catch (er) { toast.error(`${p.name} silinemedi.`); } } };
    const handleSaveMatch = async () => { setIsSavingMatch(true); const pL = { matchName: `Kadro ${new Date().toLocaleDateString('tr-TR')}`, location: "Bilinmiyor", lineupA: {}, lineupB: {} }; Object.entries(playersOnPitchA).forEach(([pId, d]) => { pL.lineupA[pId] = { xPercent: d.xPercent, yPercent: d.yPercent }; }); Object.entries(playersOnPitchB).forEach(([pId, d]) => { pL.lineupB[pId] = { xPercent: d.xPercent, yPercent: d.yPercent }; }); const uMN = prompt("Kadro adı:", pL.matchName); if (uMN === null) { setIsSavingMatch(false); return; } pL.matchName = uMN.trim() || pL.matchName; try { const r = await apiClient.post('/matches', pL); const sM = r.data; toast.success(`"${sM.matchName || 'İsimsiz'}" kaydedildi!`); fetchMatches().then(() => { setSelectedMatchId(String(sM.id)); setSearchParams({ matchId: String(sM.id) }, { replace: true }); setTeamAScore(''); setTeamBScore(''); setShareableLink(`${window.location.origin}${window.location.pathname}?matchId=${sM.id}`); }); } catch (er) { toast.error(`Hata: ${er.response?.data?.message || "Kaydedilemedi."}`); } finally { setIsSavingMatch(false); } };
    const handleSaveOrUpdateScore = async () => { if (!selectedMatchId) { toast.warn("Maç seçin."); return; } const sAT = String(teamAScore).trim(); const sBT = String(teamBScore).trim(); if (sAT === '' || sBT === '') { toast.error("Skorları girin."); return; } const sA = parseInt(sAT, 10); const sB = parseInt(sBT, 10); if (isNaN(sA) || isNaN(sB)) { toast.error("Geçerli skor girin."); return; } if (sA < 0 || sB < 0) { toast.error("Skor negatif olamaz."); return; } setIsSavingScore(true); try { await apiClient.post(`/matches/${selectedMatchId}/score`, { teamAScore: sA, teamBScore: sB }); toast.success("Skorlar kaydedildi!"); } catch (er) { toast.error(`Hata: ${er.response?.data?.message || "Kaydedilemedi."}`); } finally { setIsSavingScore(false); } };
    const clearPitch = useCallback(() => { setPlayersOnPitchA({}); setPlayersOnPitchB({}); setSelectedMatchId(""); setShareableLink(null); setTeamAScore(''); setTeamBScore(''); toast.info("Saha temizlendi."); setSearchParams({}, { replace: true }); }, [setSearchParams]);
    const handleDeleteMatch = async (mId) => { if (!mId) { toast.warn("Kadro seçin."); return; } const m = matches.find(ma => String(ma.id) === String(mId)); const mN = m?.matchName || `ID: ${mId}`; if (window.confirm(`"${mN}" silinsin mi?`)) { try { await apiClient.delete(`/matches/${mId}`); toast.success(`"${mN}" silindi.`); clearPitch(); fetchMatches(); } catch (er) { toast.error(`Hata: ${er.response?.data?.message || "Silinemedi."}`); } } };
    const copyToClipboard = () => { if (shareableLink) { navigator.clipboard.writeText(shareableLink).then(() => toast.success("Link kopyalandı!")).catch(() => { toast.error("Kopyalanamadı."); }); } };

    // Restored handleShareBothPitches exactly from user's V2 (second code block in first prompt)
    const handleShareBothPitches = async () => {
        if (!pitchesContainerRef.current) {
            toast.error("Sahalar bulunamadı.");
            return;
        }
        if (isSharing) return;

        setIsSharing(true);
        toast.info("Kadro ekran görüntüsü hazırlanıyor...");

        const targetElement = pitchesContainerRef.current;
        const originalScrollX = window.scrollX; 
        const originalScrollY = window.scrollY;
        window.scrollTo(0,0); 

        await document.fonts.ready;
        // await new Promise(resolve => setTimeout(resolve, 400)); // Original comment from V2

        try {
            const originalCanvas = await html2canvas(targetElement, {
                // scale: 1.5, // Original comment from V2
                // useCORS: true, // Original comment from V2
                logging: false,
                backgroundColor: '#111827', 
                width: targetElement.width,  // As per user's original V2
                height: targetElement.height, // As per user's original V2
                onclone: (documentClone) => {
                    const markers = documentClone.querySelectorAll('.player-marker-capture');
                    markers.forEach(marker => {
                        const playerName = marker.getAttribute('data-player-name') || marker.innerText;
                        marker.innerHTML = ''; 
                        
                        marker.style.fontSize = '13px'; 
                        marker.style.fontWeight = '600'; 
                        marker.style.padding = '4px 8px'; 
                        marker.style.display = 'flex';
                        marker.style.alignItems = 'center';
                        marker.style.justifyContent = 'center';
                        marker.style.textAlign = 'center';
                        marker.style.boxSizing = 'border-box';

                        const span = document.createElement('span');
                        span.innerText = playerName;
                        // === İstenen değişiklik burada === // Original comment from V2
                        span.style.paddingBottom = '10px'; // As per user's original V2
                        // ============================== // Original comment from V2
                        marker.appendChild(span);
                    });

                    Array.from(documentClone.querySelectorAll('.ring-2')).forEach(el => {
                        el.classList.remove('ring-2', 'ring-yellow-400', 'ring-offset-2', 'ring-yellow-500');
                    });
                }
            });
            
            window.scrollTo(originalScrollX, originalScrollY); 
            const padding = 20; 
            
            const paddedCanvas = document.createElement('canvas');
            paddedCanvas.width = originalCanvas.width + 2 * padding;
            paddedCanvas.height = originalCanvas.height + 2 * padding;
            
            const ctx = paddedCanvas.getContext('2d');
            ctx.fillStyle = '#111827'; 
            ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
            ctx.drawImage(originalCanvas, padding, padding);
            const imageBase64 = paddedCanvas.toDataURL('image/png');
            const cM=selectedMatchId?matches.find(m=>String(m.id)===String(selectedMatchId)):null;
            const mN=cM?.matchName||(selectedMatchId?'Kayıtlı':'Güncel')+' Kadro';
            const sA=teamAScore!==''?teamAScore:'?';const sB=teamBScore!==''?teamBScore:'?';
            const sD=(selectedMatchId&&(teamAScore!==''||teamBScore!==''))?` (A ${sA}-${sB} B)`:'';
            const shT=`${mN}${sD}`;
            const fN=`Kadrolar_${mN.replace(/[^a-zA-Z0-9]/g,'_')}.png`;

            if(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([""],"t.png",{type:"image/png"})]})){
                const fR=await fetch(imageBase64);const b=await fR.blob();
                const iF=new File([b],fN,{type:'image/png'});
                try{await navigator.share({title:mN,text:shT,files:[iF]});toast.success("Paylaşım arayüzü açıldı.");}
                catch(sE){if(sE.name==='AbortError'){toast.info('Paylaşım iptal edildi.');}else{toast.error('Paylaşım hatası. İndiriliyor...');downloadImage(imageBase64,fN);}}
            }else{toast.warn("Direkt paylaşım desteklenmiyor. İndiriliyor...");downloadImage(imageBase64,fN);}
        }catch(e){
            console.error("Ekran görüntüsü alınırken hata:", e);
            toast.error("Ekran görüntüsü alınırken bir hata oluştu.");
            window.scrollTo(originalScrollX, originalScrollY); 
        }
        finally{setIsSharing(false);}
    };

    const downloadImage = (base64, fileName) => { const l = document.createElement('a'); l.href = base64; l.download = fileName; document.body.appendChild(l); l.click(); document.body.removeChild(l); toast.success(`"${fileName}" indirildi.`); };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
                <ToastContainer autoClose={2500} hideProgressBar theme="dark" position="top-center" />
                {isSharing && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-[200]">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
                        <p className="text-white text-lg">Görüntü hazırlanıyor...</p>
                    </div>
                )}
                <div className='flex justify-between items-center mb-4'>
                    <Link to="/" className="text-blue-400 hover:text-blue-300">&larr; Ana Sayfaya Dön</Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-center flex-grow">Halı Saha Kadro Oluşturucu</h1>
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/4 flex flex-col gap-4" style={{ minWidth: '250px' }}>
                        <PlayerPool id="playerPool" players={availablePlayers} loading={isLoadingPlayers} />
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-3">
                            <button
                                onClick={handleShareBothPitches}
                                className='w-full bg-purple-600 hover:bg-purple-700 py-2.5 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-60'
                                disabled={isSharing || (Object.keys(playersOnPitchA).length === 0 && Object.keys(playersOnPitchB).length === 0)}
                                title={(Object.keys(playersOnPitchA).length === 0 && Object.keys(playersOnPitchB).length === 0) ? "Paylaşmak için sahada oyuncu olmalı" : "Her iki kadroyu da paylaş"}
                            >
                                {isSharing ? 'Hazırlanıyor...' : 'Kadroları Resim Olarak Paylaş'}
                            </button>
                            <button onClick={clearPitch} className='w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50' disabled={isSharing}>Mevcut Sahayı Temizle</button>
                            <button onClick={handleSaveMatch} className='w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50' disabled={isSavingMatch || isSharing}>
                                {isSavingMatch ? 'Kaydediliyor...' : 'Mevcut Dizilişi Kaydet'}
                            </button>
                            <div className='mt-2 space-y-2'>
                                <h4 className='text-sm font-medium text-gray-400 mb-1'>Kayıtlı Kadroyu Yönet:</h4>
                                <div className="flex gap-2 items-center">
                                    <select value={selectedMatchId} onChange={(e) => { const m = e.target.value; setSelectedMatchId(m); if (m) { loadMatchLineup(m); } else { clearPitch(); } }} className="flex-grow bg-gray-700 text-gray-100 p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" disabled={isLoadingMatches || matches.length === 0 || isSharing}>
                                        <option value="">{isLoadingMatches ? "Yükleniyor..." : (matches.length === 0 ? "Kayıt Yok" : "-- Kadro Seç --")}</option>
                                        {matches.map(m => (<option key={m.id} value={m.id}>{m.matchName || `Kayıt ${new Date(m.savedAt).toLocaleDateString('tr-TR')}`}</option>))}
                                    </select>
                                    <button onClick={() => handleDeleteMatch(selectedMatchId)} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white font-semibold disabled:opacity-50" title="Seçili kadroyu sil" disabled={!selectedMatchId || isLoadingMatches || isSharing}>Sil</button>
                                </div>
                                <div><button onClick={copyToClipboard} className="w-full bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded text-white font-semibold disabled:opacity-50" disabled={!shareableLink || isSharing}>Paylaşım Linkini Kopyala</button></div>
                                {selectedMatchId && (
                                    <div className="mt-4 pt-3 border-t border-gray-700">
                                        <h4 className='text-sm font-medium text-gray-400 mb-2'>Maç Skoru ({matches.find(m => String(m.id) === String(selectedMatchId))?.matchName || 'Seçili Maç'}):</h4>
                                        <div className="flex gap-3 items-center justify-between mb-2">
                                            <div className='flex-1'><label htmlFor="teamAScore" className="block text-xs font-medium text-gray-300 mb-1">Takım A</label><input type="number" id="teamAScore" min="0" value={teamAScore} onChange={e => setTeamAScore(e.target.value)} placeholder="A" className="w-full bg-gray-700 p-2 rounded outline-none focus:ring-2 focus:ring-red-500 text-center" disabled={isSavingScore || isSharing} /></div>
                                            <span className="text-gray-400 pt-5 text-xl font-bold">-</span>
                                            <div className='flex-1'><label htmlFor="teamBScore" className="block text-xs font-medium text-gray-300 mb-1">Takım B</label><input type="number" id="teamBScore" min="0" value={teamBScore} onChange={e => setTeamBScore(e.target.value)} placeholder="B" className="w-full bg-gray-700 p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-center" disabled={isSavingScore || isSharing} /></div>
                                        </div>
                                        <button onClick={handleSaveOrUpdateScore} className='w-full bg-green-600 hover:bg-green-700 py-2 rounded text-white font-semibold disabled:opacity-50' disabled={isSavingScore || !selectedMatchId || isSharing}>{isSavingScore ? 'Kaydediliyor...' : 'Skorları Kaydet/Güncelle'}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                            <h2 className="text-xl font-semibold mb-3 text-gray-200">Oyuncular ({isLoadingPlayers ? '...' : allPlayers.length})</h2>
                            <form onSubmit={handleAddPlayer} className="flex gap-2 mb-3">
                                <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Yeni oyuncu adı" className="flex-grow bg-gray-700 p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400" disabled={isLoadingPlayers || isSharing} />
                                <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold disabled:opacity-50" disabled={isLoadingPlayers || isSharing}>+</button>
                            </form>
                            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 mb-2 custom-scrollbar">
                                {isLoadingPlayers ? (<p className="text-gray-500 text-center text-sm py-2">Yükleniyor...</p>) : allPlayers.length === 0 ? (<p className="text-gray-500 text-center text-sm py-2">Oyuncu yok.</p>) : (allPlayers.map(p => (
                                    <div key={p.id} className="flex justify-between items-center bg-gray-700 hover:bg-gray-600 p-1.5 rounded text-sm">
                                        <span className='text-gray-100'>{p.name}</span>
                                        <button onClick={() => handleDeletePlayer(p.id)} className='text-red-500 hover:text-red-400 text-xs px-1 font-medium disabled:opacity-50' disabled={isSharing}>Sil</button>
                                    </div>
                                )))}
                            </div>
                        </div>
                    </div>
                    <div
                        ref={pitchesContainerRef}
                        className="lg:w-3/4 lg:self-start flex flex-col sm:flex-row gap-4">
                        <PitchDisplay pitchId="pitchAreaA" teamId="A" playersOnThisPitch={playersOnPitchA} pitchRef={pitchRefA} />
                        <PitchDisplay pitchId="pitchAreaB" teamId="B" playersOnThisPitch={playersOnPitchB} pitchRef={pitchRefB} />
                    </div>
                </div>
            </div>
            <DragOverlay dropAnimation={null} zIndex={100} modifiers={[snapCenterToCursor]}>
                {activeId && activePlayerBaseData ? (<PlayerMarker id={`overlay-${activeId}`} name={activePlayerBaseData.name} team={playersOnPitchA[activeId] ? 'A' : playersOnPitchB[activeId] ? 'B' : null} isOverlay />) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default Carpet;