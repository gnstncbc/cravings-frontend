// src/components/Carpet.js
import React, { useState, useEffect, useRef, useCallback } from 'react'; // useCallback eklendi
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios'; // Axios import edildi
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

// --- API Base URL ---
const API_BASE_URL = 'https://gnstncbc.com/api'; // Backend adresiniz (Gerekirse değiştirin)

// --- API Client (Axios Instance) ---
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});


// --- Yardımcı Bileşenler ---

// PlayerMarker (ID'nin string olmasını sağlayalım)
function PlayerMarker({ id, name, team, isDragging, isOverlay, style: markerStyle, ...props }) {
    const stringId = String(id); // ID'yi string yap
    const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
        id: stringId, // String ID kullan
        data: { type: 'player', player: { id: stringId, name } } // Data içinde de string ID
    });

    // Dnd-kit transform'u style objesine uygula
    const dndKitStyle = {
        transform: CSS.Translate.toString(transform),
        ...markerStyle // Mevcut stilleri koru
    };

    const style = isOverlay
        ? { ...dndKitStyle, cursor: 'grabbing', zIndex: 100 } // Overlay'e transform ekleyelim ve diğer stiller
        : { ...dndKitStyle, touchAction: 'none', opacity: isCurrentlyDragging ? 0.5 : 1 }; // Sürükleneni soluklaştır

    const teamColor = team === 'A' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
    const baseColor = team ? teamColor : 'bg-gray-600 hover:bg-gray-500';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-1 px-2 rounded shadow text-center text-sm font-semibold cursor-grab ${baseColor} text-white ${isCurrentlyDragging ? 'ring-2 ring-yellow-400' : ''} ${isOverlay ? 'ring-2 ring-offset-2 ring-yellow-500' : ''}`}
            {...listeners}
            {...attributes}
        >
            {name}
        </div>
    );
}

// PlayerPool (Loading state eklendi)
function PlayerPool({ id, players, loading }) { // loading prop eklendi
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            id={id}
            className={`bg-gray-800 p-4 rounded-lg space-y-2 min-h-[200px] h-full overflow-y-auto ${isOver ? 'outline outline-2 outline-green-500' : ''}`}
        >
            <h3 className="text-lg font-semibold mb-2 text-center">Müsait Oyuncular</h3>
             {loading ? (
                 <p className="text-gray-500 text-center text-sm">Oyuncular yükleniyor...</p>
             ) : players.length === 0 ? (
                 <p className="text-gray-500 text-center text-sm">Tüm oyuncular sahada veya oyuncu yok.</p>
             ) : (
                players.map(player => (
                    // PlayerMarker'a string ID gönderdiğimizden emin olalım
                    <PlayerMarker key={player.id} id={String(player.id)} name={player.name} team={null} />
                ))
            )}
        </div>
    );
}

// PitchDisplay (ID'nin string olmasını sağlayalım ve saha çizgileri güncellendi)
function PitchDisplay({ pitchId, teamId, playersOnThisPitch, pitchRef }) {
    const { setNodeRef, isOver } = useDroppable({ id: pitchId });

    const teamBorderColor = teamId === 'A' ? 'border-red-500' : 'border-blue-500';
    const teamBgColor = teamId === 'A' ? 'bg-red-900' : 'bg-blue-900';

    return (
        // Saha Konteyneri
        <div ref={pitchRef} className={`flex-1 h-[500px] ${teamBgColor} bg-opacity-20 rounded-lg border-2 ${teamBorderColor} relative overflow-hidden`}>
            {/* Takım Başlığı */}
            <h2 className={`text-center font-bold text-xl my-2 ${teamId === 'A' ? 'text-red-400' : 'text-blue-400'}`}>TAKIM {teamId}</h2>

            {/* Bırakılabilir Alan (Tüm saha) */}
            <div ref={setNodeRef} className={`absolute inset-0 z-10 ${isOver ? `${teamId === 'A' ? 'bg-red-500' : 'bg-blue-500'} bg-opacity-10` : ''}`}></div>

            {/* Saha Çizgileri (Görsel amaçlı, düşük z-index) */}
            {/* Orta Çizgi */}
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white bg-opacity-30 transform -translate-y-1/2 z-0"></div>
            {/* Orta Saha Yuvarlağı */}
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-white border-opacity-30 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-0"></div>
            {/* Üst Ceza Sahası */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-b border-white border-opacity-30 z-0"></div>
             {/* Üst Ceza Sahası Yayı - Basitleştirilmiş Dikdörtgen Alan*/}
             {/* <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-1/4 h-6 border border-white border-opacity-30 border-t-0 rounded-b-full z-0"></div> */}

             {/* Alt Ceza Sahası */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-t border-white border-opacity-30 z-0"></div>
             {/* Alt Ceza Sahası Yayı - Basitleştirilmiş Dikdörtgen Alan */}
             {/* <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-1/4 h-6 border border-white border-opacity-30 border-b-0 rounded-t-full z-0"></div> */}

             {/* Kaleler */}
            <div className="absolute top-0 left-1/2 w-1/4 h-4 border-b border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>
            <div className="absolute bottom-0 left-1/2 w-1/4 h-4 border-t border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>


            {/* Sahadaki Oyuncuları Yerleştir */}
            {Object.entries(playersOnThisPitch).map(([playerId, playerData]) => (
                <PlayerMarker
                    key={playerId}
                    id={playerId} // Bu zaten string olmalı (state'in key'i)
                    name={playerData.name}
                    team={teamId}
                    style={{
                        position: 'absolute',
                        left: `${playerData.x}px`,
                        top: `${playerData.y}px`,
                        transform: 'translate(-50%, -50%)', // İşaretçiyi X ve Y koordinatına ortala
                        zIndex: 20 // Oyuncular bırakma alanının üzerinde (z-10) olmalı
                    }}
                />
            ))}
        </div>
    );
}


// --- Ana Halı Saha Bileşeni ---
const Carpet = () => {
    // --- State Tanımlamaları ---
    const [allPlayers, setAllPlayers] = useState([]);
    const [playersOnPitchA, setPlayersOnPitchA] = useState({});
    const [playersOnPitchB, setPlayersOnPitchB] = useState({});
    const [matches, setMatches] = useState([]);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [activeId, setActiveId] = useState(null); // Sürüklenen öğenin ID'si (string olacak)
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
    const [isLoadingMatches, setIsLoadingMatches] = useState(true);
    const [isSavingMatch, setIsSavingMatch] = useState(false);
    const [selectedMatchId, setSelectedMatchId] = useState(""); // Dropdown için seçili ID

    // --- Ref Tanımlamaları ---
    const pitchRefA = useRef(null);
    const pitchRefB = useRef(null);

    // --- Veri Yükleme Fonksiyonları ---
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        try {
            const response = await apiClient.get('/players');
            setAllPlayers(response.data.map(p => ({ ...p, id: String(p.id) })) || []);
        } catch (error) {
            console.error("Oyuncular yüklenirken hata:", error);
            toast.error("Oyuncular yüklenemedi.");
            setAllPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, []);

    const fetchMatches = useCallback(async () => {
        setIsLoadingMatches(true);
        try {
            const response = await apiClient.get('/matches');
            setMatches(response.data.map(m => ({ ...m, id: String(m.id) })) || []);
        } catch (error) {
            console.error("Maçlar yüklenirken hata:", error);
            toast.error("Kayıtlı maçlar yüklenemedi.");
            setMatches([]);
        } finally {
            setIsLoadingMatches(false);
        }
    }, []);

    // --- Component Mount Effect ---
    useEffect(() => {
        fetchPlayers();
        fetchMatches();
    }, [fetchPlayers, fetchMatches]);

    // --- Hesaplanan Değişkenler ---
    const activePlayerBaseData = activeId ? allPlayers.find(p => p.id === activeId) : null;

    const playersOnPitchIds = useRef(new Set()).current;
    playersOnPitchIds.clear();
    Object.keys(playersOnPitchA).forEach(id => playersOnPitchIds.add(id));
    Object.keys(playersOnPitchB).forEach(id => playersOnPitchIds.add(id));

    const availablePlayers = allPlayers.filter(p => !playersOnPitchIds.has(p.id));

    // --- DND Sensörleri ---
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // --- DND Olay Yöneticileri ---
    function handleDragStart(event) {
        setActiveId(String(event.active.id));
    }

    function handleDragEnd(event) {
        const { active, over, delta } = event;
        const draggedId = String(active.id);

        setActiveId(null);

        if (!over || !active) {
            console.warn("handleDragEnd: Geçersiz 'over' veya 'active'.", over, active);
            return;
         }

        const overId = over.id;

        let draggedPlayerData = allPlayers.find(p => p.id === draggedId);
        if (!draggedPlayerData) {
            const playerOnA = playersOnPitchA[draggedId];
            const playerOnB = playersOnPitchB[draggedId];
            if (playerOnA) {
                draggedPlayerData = { id: draggedId, name: playerOnA.name };
            } else if (playerOnB) {
                 draggedPlayerData = { id: draggedId, name: playerOnB.name };
            } else {
                 console.error("handleDragEnd: Sürüklenen oyuncu verisi bulunamadı.", draggedId);
                 toast.error("Oyuncu bilgisi bulunamadı!");
                 return;
            }
        } else {
             draggedPlayerData = { id: draggedPlayerData.id, name: draggedPlayerData.name };
        }

        const sourcePitch = playersOnPitchA[draggedId] ? 'A' : playersOnPitchB[draggedId] ? 'B' : null;
        const targetPitch = overId === 'pitchAreaA' ? 'A' : overId === 'pitchAreaB' ? 'B' : null;
        const targetPool = overId === 'playerPool';

        const updatePitchState = (team, updateFn) => {
             if (team === 'A') setPlayersOnPitchA(updateFn);
             else if (team === 'B') setPlayersOnPitchB(updateFn);
        };
        const removeFromPitch = (team, playerId) => {
            updatePitchState(team, prev => { const { [playerId]: _, ...rest } = prev; return rest; });
        };
        const addToPitch = (team, playerId, data) => {
             updatePitchState(team, prev => ({ ...prev, [playerId]: data }));
        };

        // 1. Sahadan Havuza
        if (sourcePitch && targetPool) {
            removeFromPitch(sourcePitch, draggedId);
            toast.info(`${draggedPlayerData.name} kadrodan çıkarıldı (Kaydetmeyi unutma).`);
        }
        // 2. Sahadan Sahaya (Transfer veya Yer Değiştirme)
        else if (sourcePitch && targetPitch) {
            const currentPositionData = sourcePitch === 'A' ? playersOnPitchA[draggedId] : playersOnPitchB[draggedId];
            if (!currentPositionData) return; // Hata kontrolü zaten var

            let newX = currentPositionData.x + delta.x;
            let newY = currentPositionData.y + delta.y;
            const pitchRef = targetPitch === 'A' ? pitchRefA : pitchRefB;
            const pitchRect = pitchRef?.current?.getBoundingClientRect();
            if (pitchRect) {
                newX = Math.max(15, Math.min(newX, pitchRect.width - 15));
                newY = Math.max(15, Math.min(newY, pitchRect.height - 15));
            }
            const updatedPlayerData = { name: currentPositionData.name, x: newX, y: newY };

            if (sourcePitch !== targetPitch) {
                removeFromPitch(sourcePitch, draggedId);
                addToPitch(targetPitch, draggedId, updatedPlayerData);
                toast.info(`${draggedPlayerData.name} Takım ${targetPitch}'e geçti (Kaydetmeyi unutma).`);
            } else {
                addToPitch(sourcePitch, draggedId, updatedPlayerData);
            }
        }
        // 3. Havuzdan Sahaya
        else if (!sourcePitch && targetPitch) {
            const pitchRef = targetPitch === 'A' ? pitchRefA : pitchRefB;
            const pitchRect = pitchRef?.current?.getBoundingClientRect();
            let dropX = 100, dropY = 100;
            if (pitchRect) {
                dropX = pitchRect.width / 2 + delta.x;
                dropY = pitchRect.height / 2 + delta.y;
                dropX = Math.max(15, Math.min(dropX, pitchRect.width - 15));
                dropY = Math.max(15, Math.min(dropY, pitchRect.height - 15));
            }
            const newPlayerData = { name: draggedPlayerData.name, x: dropX, y: dropY };
            addToPitch(targetPitch, draggedId, newPlayerData);
            toast.success(`${draggedPlayerData.name} Takım ${targetPitch}'e eklendi (Kaydetmeyi unutma).`);
        }
    }

    // --- Diğer Fonksiyonlar ---
    const handleAddPlayer = async (e) => {
        e.preventDefault();
        const name = newPlayerName.trim();
        if (!name) return;
        if (allPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            toast.warn(`${name} zaten listede var.`);
            return;
        }
        try {
            const response = await apiClient.post('/players', { name });
            const addedPlayer = { ...response.data, id: String(response.data.id) };
            setAllPlayers(prev => [...prev, addedPlayer].sort((a, b) => a.name.localeCompare(b.name)));
            setNewPlayerName('');
            toast.success(`${addedPlayer.name} başarıyla eklendi.`);
        } catch (error) {
            console.error("Oyuncu eklenirken hata:", error.response?.data || error.message);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || "Oyuncu eklenemedi.";
            toast.error(`Hata: ${errorMsg}`);
        }
    };

    const handleDeletePlayer = async (playerIdToDelete) => {
        const player = allPlayers.find(p => p.id === playerIdToDelete);
        if (!player) return;
        if (window.confirm(`${player.name} silinsin mi? Bu işlem geri alınamaz!`)) {
            try {
                await apiClient.delete(`/players/${playerIdToDelete}`);
                setAllPlayers(prev => prev.filter(p => p.id !== playerIdToDelete));
                setPlayersOnPitchA(prev => { const { [playerIdToDelete]: _, ...rest } = prev; return rest; });
                setPlayersOnPitchB(prev => { const { [playerIdToDelete]: _, ...rest } = prev; return rest; });
                toast.info(`${player.name} silindi.`);
            } catch (error) {
                console.error("Oyuncu silinirken hata:", error.response?.data || error.message);
                toast.error(`${player.name} silinirken bir hata oluştu.`);
            }
        }
    };

    const handleSaveMatch = async () => {
        setIsSavingMatch(true);
        const payload = { matchName: `Kadro ${new Date().toLocaleDateString('tr-TR')}`, location: "Bilinmiyor", lineupA: {}, lineupB: {} };
        Object.entries(playersOnPitchA).forEach(([playerId, data]) => { payload.lineupA[playerId] = { x: data.x, y: data.y }; });
        Object.entries(playersOnPitchB).forEach(([playerId, data]) => { payload.lineupB[playerId] = { x: data.x, y: data.y }; });

        const userMatchName = prompt("Kaydedilecek kadro için bir isim girin (opsiyonel):", payload.matchName);
        if (userMatchName !== null) {
             payload.matchName = userMatchName.trim() || payload.matchName;
        }
        try {
            const response = await apiClient.post('/matches', payload);
            toast.success(`Kadro "${response.data.matchName || 'İsimsiz'}" başarıyla kaydedildi!`);
            fetchMatches();
        } catch (error) {
            console.error("Maç kaydedilirken hata:", error.response?.data || error.message);
            const errorMsg = error.response?.data?.message || "Kadro kaydedilemedi.";
            toast.error(`Hata: ${errorMsg}`);
        } finally {
            setIsSavingMatch(false);
        }
    };

    const loadMatchLineup = async (matchId) => {
        if (!matchId) return;
        toast.info("Kadro yükleniyor...");
        try {
            const response = await apiClient.get(`/matches/${matchId}`);
            const matchDetails = response.data;
            const newPitchA = {};
            if (matchDetails.lineupA) {
                Object.entries(matchDetails.lineupA).forEach(([playerId, posData]) => { newPitchA[String(playerId)] = { name: posData.playerName, x: posData.x, y: posData.y }; });
            }
            const newPitchB = {};
            if (matchDetails.lineupB) {
                Object.entries(matchDetails.lineupB).forEach(([playerId, posData]) => { newPitchB[String(playerId)] = { name: posData.playerName, x: posData.x, y: posData.y }; });
            }
            setPlayersOnPitchA(newPitchA);
            setPlayersOnPitchB(newPitchB);
            toast.success(`"${matchDetails.matchName || 'İsimsiz Kadro'}" yüklendi.`);
        } catch (error) {
            console.error("Maç yüklenirken hata:", error.response?.data || error.message);
            toast.error("Seçilen kadro yüklenirken bir hata oluştu.");
        }
    };

    const clearPitch = () => {
        setPlayersOnPitchA({});
        setPlayersOnPitchB({});
        toast.info("Mevcut saha temizlendi (Kaydedilmedi).");
    };

    const handleDeleteMatch = async (matchIdToDelete) => {
        if (!matchIdToDelete) {
            toast.warn("Lütfen silmek için bir kadro seçin.");
            return;
        }
        const matchToDelete = matches.find(m => m.id === matchIdToDelete);
        const matchNameToDelete = matchToDelete?.matchName || `ID: ${matchIdToDelete}`;
        if (window.confirm(`"${matchNameToDelete}" isimli kadroyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
            try {
                await apiClient.delete(`/matches/${matchIdToDelete}`);
                toast.success(`"${matchNameToDelete}" kadrosu başarıyla silindi.`);
                fetchMatches();
                setSelectedMatchId("");
                 // clearPitch(); // Opsiyonel: Silinen kadro yüklüyse sahayı temizle
            } catch (error) {
                console.error("Maç silinirken hata:", error.response?.data || error.message);
                const errorMsg = error.response?.data?.message || "Kadro silinirken bir hata oluştu.";
                toast.error(`Hata: ${errorMsg}`);
            }
        }
    };

    // --- JSX ---
    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
                <ToastContainer autoClose={2500} hideProgressBar theme="dark" position="top-center" />
                <div className='flex justify-between items-center mb-4'>
                    <Link to="/" className="text-blue-400 hover:text-blue-300">&larr; Ana Sayfaya Dön</Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-center flex-grow">Halı Saha Kadro Oluşturucu</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sol Taraf */}
                    <div className="lg:w-1/4 flex flex-col gap-4" style={{ minWidth: '250px' }}>
                        {/* Oyuncu Ekleme/Yönetme */}
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                            <h2 className="text-xl font-semibold mb-3 text-gray-200">Oyuncular ({isLoadingPlayers ? '...' : allPlayers.length})</h2>
                            <form onSubmit={handleAddPlayer} className="flex gap-2 mb-3">
                                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Yeni oyuncu adı" className="flex-grow bg-gray-700 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 placeholder-gray-400" disabled={isLoadingPlayers}/>
                                <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold text-white transition-colors duration-200 disabled:opacity-50" disabled={isLoadingPlayers}>+</button>
                            </form>
                            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 mb-2 custom-scrollbar">
                                {isLoadingPlayers ? (<p className="text-gray-500 text-center text-sm py-2">Yükleniyor...</p>)
                                : allPlayers.length === 0 ? (<p className="text-gray-500 text-center text-sm py-2">Oyuncu yok.</p>)
                                : ( allPlayers.map(player => (
                                        <div key={player.id} className="flex justify-between items-center bg-gray-700 hover:bg-gray-600 p-1.5 rounded text-sm transition-colors duration-150">
                                            <span className='text-gray-100'>{player.name}</span>
                                            <button onClick={() => handleDeletePlayer(player.id)} className='text-red-500 hover:text-red-400 text-xs px-1 font-medium'>Sil</button>
                                        </div>
                                )))}
                            </div>
                        </div>
                        {/* Müsait Oyuncular Havuzu */}
                        <div className="flex-grow">
                            <PlayerPool id="playerPool" players={availablePlayers} loading={isLoadingPlayers} />
                        </div>
                        {/* Kontroller */}
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-3">
                            <button onClick={clearPitch} className='w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded text-white font-semibold transition-colors duration-200'>Mevcut Sahayı Temizle</button>
                            <button onClick={handleSaveMatch} className='w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50' disabled={isSavingMatch}>
                                {isSavingMatch ? 'Kaydediliyor...' : 'Mevcut Dizilişi Kaydet'}
                            </button>
                            {/* Maç Yükleme ve Silme */}
                            <div className='mt-2'>
                                <h4 className='text-sm font-medium text-gray-400 mb-1'>Kayıtlı Kadroyu Yönet:</h4>
                                <div className="flex gap-2 items-center">
                                    <select value={selectedMatchId} onChange={(e) => { const mid = e.target.value; setSelectedMatchId(mid); if (mid) { loadMatchLineup(mid); } else { clearPitch(); }}} className="flex-grow bg-gray-700 text-gray-100 p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" disabled={isLoadingMatches || matches.length === 0}>
                                        <option value="">{isLoadingMatches ? "Yükleniyor..." : (matches.length === 0 ? "Kayıt Yok" : "-- Kadro Seç / Yükle --")}</option>
                                        {matches.map(match => (<option key={match.id} value={match.id}>{match.matchName || `Kayıt ${new Date(match.savedAt).toLocaleDateString('tr-TR')}`}</option>))}
                                    </select>
                                    <button onClick={() => handleDeleteMatch(selectedMatchId)} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Seçili kadroyu sil" disabled={!selectedMatchId || isLoadingMatches}>Sil</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Sağ Taraf */}
                    <div className="lg:w-3/4 flex flex-col sm:flex-row gap-4">
                        <PitchDisplay pitchId="pitchAreaA" teamId="A" playersOnThisPitch={playersOnPitchA} pitchRef={pitchRefA}/>
                        <PitchDisplay pitchId="pitchAreaB" teamId="B" playersOnThisPitch={playersOnPitchB} pitchRef={pitchRefB}/>
                    </div>
                </div>
            </div>
            {/* Sürüklenen Öğenin Görsel Kopyası */}
            <DragOverlay dropAnimation={null} zIndex={100} modifiers={[snapCenterToCursor]}>
                {activeId && activePlayerBaseData ? (
                    <PlayerMarker id={`overlay-${activeId}`} name={activePlayerBaseData.name} team={playersOnPitchA[activeId] ? 'A' : playersOnPitchB[activeId] ? 'B' : null} isOverlay/>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default Carpet;