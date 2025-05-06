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

// --- API Base URL ---
// Nginx proxy'nize veya doğrudan backend adresinize göre ayarlayın
// const API_BASE_URL = '/api'; // Örnek: Nginx proxy'si varsa
const API_BASE_URL = 'http://localhost:8080/api'; // Örnek: Local test
// const API_BASE_URL = 'https://gnstncbc.com/api';

// --- API Client (Axios Instance) ---
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});


// --- Yardımcı Bileşenler ---

// PlayerMarker (Konumlandırma stili güncellenecek - props'tan alacak)
function PlayerMarker({ id, name, team, isDragging, isOverlay, style: markerStyle, ...props }) {
    const stringId = String(id);
    const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
        id: stringId,
        data: { type: 'player', player: { id: stringId, name } }
    });

    // Dnd-kit transform'u uygula
    const dndKitStyle = {
        transform: CSS.Translate.toString(transform),
        ...markerStyle // Gelen temel stilleri (position, left, top vb.) koru
    };

    // Overlay veya sürüklenme durumuna göre ek stiller
    const style = isOverlay
        ? { ...dndKitStyle, cursor: 'grabbing', zIndex: 100 }
        : { ...dndKitStyle, touchAction: 'none', opacity: isCurrentlyDragging ? 0.5 : 1 };

    const teamColor = team === 'A' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
    const baseColor = team ? teamColor : 'bg-gray-600 hover:bg-gray-500';

    return (
        <div
            ref={setNodeRef}
            style={style} // Hesaplanan stil kullanılır
            className={`p-1 px-2 rounded shadow text-center text-sm font-semibold cursor-grab ${baseColor} text-white ${isCurrentlyDragging ? 'ring-2 ring-yellow-400' : ''} ${isOverlay ? 'ring-2 ring-offset-2 ring-yellow-500' : ''}`}
            {...listeners}
            {...attributes}
        >
            {name}
        </div>
    );
}

// PlayerPool (Değişiklik yok)
function PlayerPool({ id, players, loading }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div
            ref={setNodeRef}
            id={id}
            className={`bg-gray-800 p-4 rounded-lg space-y-2 min-h-[200px] h-full overflow-y-auto ${isOver ? 'outline outline-2 outline-green-500' : ''}`}
        >
            <h3 className="text-lg font-semibold mb-2 text-center">Müsait Oyuncular</h3>
             {loading ? ( <p className="text-gray-500 text-center text-sm">Oyuncular yükleniyor...</p> )
             : players.length === 0 ? ( <p className="text-gray-500 text-center text-sm">Tüm oyuncular sahada veya oyuncu yok.</p> )
             : ( players.map(player => ( <PlayerMarker key={player.id} id={player.id} name={player.name} team={null} /> ))
            )}
        </div>
    );
}

// PitchDisplay (Render stili güncellendi)
function PitchDisplay({ pitchId, teamId, playersOnThisPitch, pitchRef }) {
    const { setNodeRef, isOver } = useDroppable({ id: pitchId });
    const teamBorderColor = teamId === 'A' ? 'border-red-500' : 'border-blue-500';
    const teamBgColor = teamId === 'A' ? 'bg-red-900' : 'bg-blue-900';

    return (
        <div ref={pitchRef} className={`flex-1 h-[500px] ${teamBgColor} bg-opacity-20 rounded-lg border-2 ${teamBorderColor} relative overflow-hidden`}>
            <h2 className={`text-center font-bold text-xl my-2 ${teamId === 'A' ? 'text-red-400' : 'text-blue-400'}`}>TAKIM {teamId}</h2>
            <div ref={setNodeRef} className={`absolute inset-0 z-10 ${isOver ? `${teamId === 'A' ? 'bg-red-500' : 'bg-blue-500'} bg-opacity-10` : ''}`}></div>

            {/* Saha Çizgileri */}
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white bg-opacity-30 transform -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-white border-opacity-30 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-0"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-b border-white border-opacity-30 z-0"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/5 h-1/4 border-l border-r border-t border-white border-opacity-30 z-0"></div>
            <div className="absolute top-0 left-1/2 w-1/4 h-4 border-b border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>
            <div className="absolute bottom-0 left-1/2 w-1/4 h-4 border-t border-l border-r border-white border-opacity-30 transform -translate-x-1/2 z-0"></div>

            {/* Sahadaki Oyuncuları Yerleştir (YÜZDE KULLANARAK) */}
            {Object.entries(playersOnThisPitch).map(([playerId, playerData]) => (
                <PlayerMarker
                    key={playerId}
                    id={playerId}
                    name={playerData.name}
                    team={teamId}
                    style={{
                        position: 'absolute',
                        // Yüzdesel değerleri kullan
                        left: `${playerData.xPercent}%`,
                        top: `${playerData.yPercent}%`,
                        // Ortalamak için transform kullan
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20
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
    // State yapısı artık yüzdeleri tutacak: { playerId: { name, xPercent, yPercent } }
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
    const [searchParams, setSearchParams] = useSearchParams(); // setSearchParams KORUNDU

    // SKORLAR İÇİN YENİ STATE'LER
    const [teamAScore, setTeamAScore] = useState('');
    const [teamBScore, setTeamBScore] = useState('');
    const [isSavingScore, setIsSavingScore] = useState(false);
    // --- Ref Tanımlamaları ---
    const pitchRefA = useRef(null);
    const pitchRefB = useRef(null);

    // --- API Fonksiyonları ---
    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        try {
            const response = await apiClient.get('/players');
            setAllPlayers(response.data.map(p => ({ ...p, id: String(p.id) })) || []);
        } catch (error) { console.error("Oyuncular yüklenirken hata:", error); toast.error("Oyuncular yüklenemedi."); setAllPlayers([]); }
        finally { setIsLoadingPlayers(false); }
    }, []);

    const fetchMatches = useCallback(async () => {
        setIsLoadingMatches(true);
        try {
            const response = await apiClient.get('/matches');
            setMatches(response.data.map(m => ({ ...m, id: String(m.id) })) || []);
        } catch (error) { console.error("Maçlar yüklenirken hata:", error); toast.error("Kayıtlı maçlar yüklenemedi."); setMatches([]); }
        finally { setIsLoadingMatches(false); }
    }, []);

    // Maç Yükleme (Yüzde ve SKOR değerlerini state'e yazacak)
    const loadMatchLineup = useCallback(async (matchId) => {
        if (!matchId) {
            setShareableLink(null);
            // SKORLARI TEMİZLE
            setTeamAScore('');
            setTeamBScore('');
            return;
        }
        toast.info("Kadro ve skor bilgileri yükleniyor...");
        let matchDetails; // Hata durumunda erişmek için dışarıda tanımla
        try {
            const response = await apiClient.get(`/matches/${matchId}`);
            matchDetails = response.data; // MatchDetailDTO (xpercent, ypercent ve skorları içermeli)
            const newPitchA = {};
            if (matchDetails.lineupA) {
                Object.entries(matchDetails.lineupA).forEach(([playerId, posData]) => {
                    // Backend'den gelen yüzde değerlerini al (KULLANICININ İSTEDİĞİ GİBİ KORUNDU: xpercent, ypercent)
                    newPitchA[String(playerId)] = { name: posData.playerName, xPercent: posData.xpercent, yPercent: posData.ypercent };
                });
            }
            const newPitchB = {};
            if (matchDetails.lineupB) {
                Object.entries(matchDetails.lineupB).forEach(([playerId, posData]) => {
                    // Backend'den gelen yüzde değerlerini al (KULLANICININ İSTEDİĞİ GİBİ KORUNDU: xpercent, ypercent)
                    newPitchB[String(playerId)] = { name: posData.playerName, xPercent: posData.xpercent, yPercent: posData.ypercent };
                });
            }
            setPlayersOnPitchA(newPitchA);
            setPlayersOnPitchB(newPitchB);

            // SKORLARI AYARLA (Backend'den teamAScore ve teamBScore olarak gelmesi beklenir)
            setTeamAScore(matchDetails.teamAScore !== null && matchDetails.teamAScore !== undefined ? String(matchDetails.teamAScore) : '');
            setTeamBScore(matchDetails.teamBScore !== null && matchDetails.teamBScore !== undefined ? String(matchDetails.teamBScore) : '');

            toast.success(`"${matchDetails.matchName || 'İsimsiz Kadro'}" yüklendi.`);
            const link = `${window.location.origin}${window.location.pathname}?matchId=${matchId}`;
            setShareableLink(link);
            // URL'yi de güncelle (isteğe bağlı, sayfa yenilenmeden)
            setSearchParams({ matchId: matchId }, { replace: true });
        } catch (error) {
            console.error("Maç yüklenirken hata:", error.response?.data || error.message, "Detay:", matchDetails);
            toast.error("Seçilen kadro/skor yüklenirken bir hata oluştu. Backend'den gelen veriyi kontrol edin.");
            setShareableLink(null); setPlayersOnPitchA({}); setPlayersOnPitchB({});
            // SKORLARI TEMİZLE hata durumunda
            setTeamAScore('');
            setTeamBScore('');
            setSelectedMatchId("");
            setSearchParams({}, { replace: true }); // URL'den matchId'yi kaldır
        }
    }, [setSearchParams]); // setSearchParams bağımlılıklara eklendi

    // --- Component Mount ve URL Okuma Effect ---
    useEffect(() => {
        const matchIdFromUrl = searchParams.get('matchId');
        fetchPlayers(); // Oyuncuları her zaman çek
        fetchMatches().then(() => { // Maçları çektikten SONRA URL'deki maçı yükle
            if (matchIdFromUrl) {
                const foundMatchInList = matches.find(m => m.id === matchIdFromUrl); // Önce maçın listede olup olmadığını kontrol et
                if (foundMatchInList || matches.length === 0) { // Eğer maç listede varsa veya liste henüz boşsa (ilk yükleme)
                    console.log(`URL'den maç ID'si bulundu: ${matchIdFromUrl}, yükleniyor...`);
                    setSelectedMatchId(matchIdFromUrl); // Dropdown'ı ayarla
                    loadMatchLineup(matchIdFromUrl);   // Kadroyu ve skorları yükle
                } else {
                    // Eğer maçId URL'de var ama maç listesinde yoksa (belki silinmiş bir maç)
                    console.warn(`URL'deki maç ID (${matchIdFromUrl}) kayıtlı maçlar arasında bulunamadı.`);
                    setSearchParams({}, {replace: true}); // Hatalı URL'yi temizle
                    clearPitch(); // Her şeyi temizle
                }
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPlayers, fetchMatches, searchParams]); // loadMatchLineup buradan çıkarıldı, çünkü fetchMatches().then() içinde çağrılıyor.

    // --- Dropdown'ı URL'ye Göre Ayarlama Effect ---
    // Bu useEffect, maç listesi (matches) veya isLoadingMatches değiştiğinde URL'deki ID'yi kontrol eder.
    useEffect(() => {
        const matchIdFromUrl = searchParams.get('matchId');
        if (matchIdFromUrl && !isLoadingMatches && matches.length > 0) { // Maçlar yüklendi ve en az bir maç var
            if (matches.some(m => m.id === matchIdFromUrl)) {
                if (selectedMatchId !== matchIdFromUrl) { // State zaten güncel değilse
                    setSelectedMatchId(matchIdFromUrl);
                    // loadMatchLineup çağrılmıyor, çünkü ilk useEffect'teki fetchMatches().then() içinde
                    // veya kullanıcı dropdown'dan seçtiğinde zaten çağrılıyor.
                }
                if (!shareableLink) {
                    const link = `${window.location.origin}${window.location.pathname}?matchId=${matchIdFromUrl}`;
                    setShareableLink(link);
                }
            } else {
                // Maç ID URL'de var ama maç listesi yüklendikten sonra bu ID listede bulunamadı.
                // Bu durum, URL'de geçersiz bir ID olduğu anlamına gelir.
                if (selectedMatchId === matchIdFromUrl || selectedMatchId === "") { // Eğer state de bu geçersiz ID'ye ayarlıysa veya boşsa
                    console.warn(`Dropdown senkronizasyonu: URL'deki maç ID (${matchIdFromUrl}) kayıtlı maçlar arasında bulunamadı. Temizleniyor.`);
                    clearPitch(); // Her şeyi temizle (URL'yi de temizler)
                }
            }
        } else if (!matchIdFromUrl && selectedMatchId) {
             // URL'de matchId yok ama state'te var (örneğin kullanıcı 'Temizle' dedi veya elle sildi)
             // Bu durumda bir şey yapmaya gerek yok, clearPitch zaten hallediyor.
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matches, isLoadingMatches, searchParams, selectedMatchId]); // selectedMatchId eklendi, shareableLink çıkarıldı


    // --- Hesaplanan Değişkenler ---
    const activePlayerBaseData = activeId ? allPlayers.find(p => String(p.id) === String(activeId)) : null;
    const playersOnPitchIds = useRef(new Set()).current;
    playersOnPitchIds.clear();
    Object.keys(playersOnPitchA).forEach(id => playersOnPitchIds.add(id));
    Object.keys(playersOnPitchB).forEach(id => playersOnPitchIds.add(id));
    const availablePlayers = allPlayers.filter(p => !playersOnPitchIds.has(String(p.id)));


    // --- DND Sensörleri ---
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // --- DND Olay Yöneticileri ---
    function handleDragStart(event) {
        setActiveId(String(event.active.id));
    }

    // handleDragEnd (YÜZDE HESAPLAMASI EKLENDİ - KULLANICININ KODU KORUNDU)
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
            draggedPlayerData = { id: draggedPlayerData.id, name: draggedPlayerData.name };
        }


        const sourcePitch = playersOnPitchA[draggedId] ? 'A' : playersOnPitchB[draggedId] ? 'B' : null;
        const targetPitch = overId === 'pitchAreaA' ? 'A' : overId === 'pitchAreaB' ? 'B' : null;
        const targetPool = overId === 'playerPool';

        const updatePitchState = (team, updateFn) => {
            if (team === 'A') setPlayersOnPitchA(updateFn); else if (team === 'B') setPlayersOnPitchB(updateFn);
        };
        const removeFromPitch = (team, playerId) => updatePitchState(team, prev => { const { [playerId]: _, ...rest } = prev; return rest; });
        const addToPitch = (team, playerId, data) => updatePitchState(team, prev => ({ ...prev, [playerId]: data }));


        // --- Senaryolar ---

        // 1. Sahadan Havuza
        if (sourcePitch && targetPool) {
            removeFromPitch(sourcePitch, draggedId);
            toast.info(`${draggedPlayerData.name} kadrodan çıkarıldı (Kaydetmeyi unutma).`);
        }
        // 2. Sahadan Sahaya (Transfer veya Yer Değiştirme)
        else if (sourcePitch && targetPitch) {
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

                if (sourcePitch !== targetPitch) { // Takım değiştirme
                    removeFromPitch(sourcePitch, draggedId);
                    addToPitch(targetPitch, draggedId, updatedPlayerData);
                    toast.info(`${draggedPlayerData.name} Takım ${targetPitch}'e geçti (Kaydetmeyi unutma).`);
                } else { // Yer değiştirme
                    addToPitch(sourcePitch, draggedId, updatedPlayerData);
                }
            } else {
                console.warn("Pitch dimensions not available for percentage calculation during transfer/move.");
            }
        }
        // 3. Havuzdan Sahaya
        else if (!sourcePitch && targetPitch) {
            const targetPitchRef = targetPitch === 'A' ? pitchRefA : pitchRefB;
            const pitchRect = targetPitchRef?.current?.getBoundingClientRect();
            let dropXPercent = 50, dropYPercent = 50; // Fallback: Sahanın ortası (%)

            if (pitchRect && pitchRect.width > 0 && pitchRect.height > 0) {
                // Kullanıcının delta'ya dayalı mantığı korundu
                let initialPixelX = pitchRect.width / 2 + delta.x;
                let initialPixelY = pitchRect.height / 2 + delta.y;

                initialPixelX = Math.max(0, Math.min(initialPixelX, pitchRect.width));
                initialPixelY = Math.max(0, Math.min(initialPixelY, pitchRect.height));

                dropXPercent = (initialPixelX / pitchRect.width) * 100;
                dropYPercent = (initialPixelY / pitchRect.height) * 100;

                dropXPercent = Math.max(0, Math.min(100, dropXPercent));
                dropYPercent = Math.max(0, Math.min(100, dropYPercent));

            } else {
                console.warn("Saha boyutları (pitchRect) alınamadı, fallback %50/%50 kullanılıyor.");
            }

            const newPlayerData = { name: draggedPlayerData.name, xPercent: dropXPercent, yPercent: dropYPercent };
            addToPitch(targetPitch, draggedId, newPlayerData);
            toast.success(`${draggedPlayerData.name} Takım ${targetPitch}'e eklendi (Kaydetmeyi unutma).`);
        }
    }

    // --- Diğer Fonksiyonlar ---
    const handleAddPlayer = async (e) => {
        e.preventDefault();
        const name = newPlayerName.trim();
        if (!name) return;
        if (allPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) { toast.warn(`${name} zaten listede var.`); return; }
        try {
            const response = await apiClient.post('/players', { name });
            const addedPlayer = { ...response.data, id: String(response.data.id) };
            setAllPlayers(prev => [...prev, addedPlayer].sort((a, b) => a.name.localeCompare(b.name)));
            setNewPlayerName('');
            toast.success(`${addedPlayer.name} başarıyla eklendi.`);
        } catch (error) { console.error("Oyuncu eklenirken hata:", error.response?.data || error.message); toast.error(`Hata: ${error.response?.data?.message || "Oyuncu eklenemedi."}`); }
    };

    const handleDeletePlayer = async (playerIdToDelete) => {
        const player = allPlayers.find(p => String(p.id) === String(playerIdToDelete));
        if (!player) return;
        if (window.confirm(`${player.name} silinsin mi? Bu işlem geri alınamaz!`)) {
            try {
                await apiClient.delete(`/players/${playerIdToDelete}`);
                setAllPlayers(prev => prev.filter(p => String(p.id) !== String(playerIdToDelete)));
                setPlayersOnPitchA(prev => { const { [playerIdToDelete]: _, ...rest } = prev; return rest; });
                setPlayersOnPitchB(prev => { const { [playerIdToDelete]: _, ...rest } = prev; return rest; });
                toast.info(`${player.name} silindi.`);
            } catch (error) { console.error("Oyuncu silinirken hata:", error.response?.data || error.message); toast.error(`${player.name} silinirken bir hata oluştu.`); }
        }
    };

    // handleSaveMatch (YÜZDE DEĞERLERİNİ GÖNDERECEK - KULLANICININ KODU KORUNDU)
    const handleSaveMatch = async () => {
        setIsSavingMatch(true);
        const payload = { matchName: `Kadro ${new Date().toLocaleDateString('tr-TR')}`, location: "Bilinmiyor", lineupA: {}, lineupB: {} };

        Object.entries(playersOnPitchA).forEach(([playerId, data]) => {
            // Backend'in xPercent, yPercent beklediğini varsayıyoruz (KULLANICININ KODU KORUNDU)
            payload.lineupA[playerId] = { xPercent: data.xPercent, yPercent: data.yPercent };
        });
        Object.entries(playersOnPitchB).forEach(([playerId, data]) => {
            // Backend'in xPercent, yPercent beklediğini varsayıyoruz (KULLANICININ KODU KORUNDU)
            payload.lineupB[playerId] = { xPercent: data.xPercent, yPercent: data.yPercent };
        });

        const userMatchName = prompt("Kaydedilecek kadro için bir isim girin (opsiyonel):", payload.matchName);
         if (userMatchName === null) { // Kullanıcı prompt'ta iptal'e basarsa
            setIsSavingMatch(false);
            return;
        }
        payload.matchName = userMatchName.trim() || payload.matchName;


        try {
            const response = await apiClient.post('/matches', payload);
            const savedMatch = response.data; // Backend'den dönen kaydedilmiş maç objesi
            toast.success(`Kadro "${savedMatch.matchName || 'İsimsiz'}" başarıyla kaydedildi!`);
            fetchMatches().then(() => { // Maç listesini güncelle
                 // Yeni kaydedilen maçı seçili yap ve URL'yi güncelle
                setSelectedMatchId(String(savedMatch.id));
                setSearchParams({ matchId: String(savedMatch.id) }, { replace: true });
                // Yeni maç için skor alanları boş olmalı, loadMatchLineup bunu handle edecek
                // Eğer backend yeni maç için skor döndürmezse (ki dönmemeli), skorlar boş olacak.
                setTeamAScore(''); 
                setTeamBScore('');
                const link = `${window.location.origin}${window.location.pathname}?matchId=${savedMatch.id}`;
                setShareableLink(link);
            });
        } catch (error) {
            console.error("Maç kaydedilirken hata:", error.response?.data || error.message);
            toast.error(`Hata: ${error.response?.data?.message || "Kadro kaydedilemedi."}`);
        } finally {
            setIsSavingMatch(false);
        }
    };

    // SKOR KAYDETME/GÜNCELLEME FONKSİYONU
    const handleSaveOrUpdateScore = async () => {
        if (!selectedMatchId) {
            toast.warn("Lütfen önce skorlarını gireceğiniz bir maç seçin.");
            return;
        }

        const scoreA_text = String(teamAScore).trim();
        const scoreB_text = String(teamBScore).trim();

        if (scoreA_text === '' || scoreB_text === '') {
            toast.error("Lütfen her iki takım için de skor girin.");
            return;
        }

        const scoreA = parseInt(scoreA_text, 10);
        const scoreB = parseInt(scoreB_text, 10);

        if (isNaN(scoreA) || isNaN(scoreB)) {
            toast.error("Lütfen geçerli sayısal skor değerleri girin.");
            return;
        }

        if (scoreA < 0 || scoreB < 0) {
            toast.error("Skorlar negatif olamaz.");
            return;
        }

        setIsSavingScore(true);
        try {
            // Backend'e POST veya PUT isteği
            // Genellikle skor güncelleme için PUT daha uygun olabilir ama POST da iş görür.
            // Backend endpoint'i: /api/matches/{matchId}/score
            await apiClient.post(`/matches/${selectedMatchId}/score`, {
                teamAScore: scoreA,
                teamBScore: scoreB
            });
            toast.success("Skorlar başarıyla kaydedildi!");
            // Skorlar kaydedildikten sonra, eğer maç listesinde skor gösteriliyorsa
            // fetchMatches() çağrılabilir veya mevcut maçın detayları güncellenebilir.
            // Şimdilik sadece başarı mesajı veriyoruz. State zaten güncel.
        } catch (error) {
            console.error("Skorlar kaydedilirken hata:", error.response?.data || error.message);
            toast.error(`Hata: ${error.response?.data?.message || "Skorlar kaydedilemedi."}`);
        } finally {
            setIsSavingScore(false);
        }
    };

    const clearPitch = useCallback(() => {
        setPlayersOnPitchA({}); setPlayersOnPitchB({});
        setSelectedMatchId(""); setShareableLink(null);
        // SKORLARI TEMİZLE
        setTeamAScore('');
        setTeamBScore('');
        toast.info("Mevcut saha ve skorlar temizlendi (Kaydedilmedi).");
        setSearchParams({}, { replace: true }); // URL'yi de temizle
    }, [setSearchParams]);


    const handleDeleteMatch = async (matchIdToDelete) => {
        if (!matchIdToDelete) { toast.warn("Lütfen silmek için bir kadro seçin."); return; }
        const matchToDelete = matches.find(m => String(m.id) === String(matchIdToDelete));
        const matchNameToDelete = matchToDelete?.matchName || `ID: ${matchIdToDelete}`;
        if (window.confirm(`"${matchNameToDelete}" isimli kadroyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`)) {
            try {
                await apiClient.delete(`/matches/${matchIdToDelete}`);
                toast.success(`"${matchNameToDelete}" kadrosu başarıyla silindi.`);
                // Silme işleminden sonra her şeyi temizle ve maç listesini güncelle
                clearPitch(); // Bu selectedMatchId'yi, sahayı, skorları ve URL'yi temizler
                fetchMatches(); // Maç listesini yeniden yükle
            } catch (error) { 
                console.error("Maç silinirken hata:", error.response?.data || error.message); 
                toast.error(`Hata: ${error.response?.data?.message || "Kadro silinirken bir hata oluştu."}`); 
            }
        }
    };

    const copyToClipboard = () => {
        if (shareableLink) {
            navigator.clipboard.writeText(shareableLink)
                .then(() => toast.success("Paylaşım linki panoya kopyalandı!"))
                .catch(err => { console.error('Link kopyalanamadı: ', err); toast.error("Link otomatik kopyalanamadı."); });
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
                            {/* Maç Yükleme, Silme ve Paylaşma */}
                            <div className='mt-2 space-y-2'>
                                <h4 className='text-sm font-medium text-gray-400 mb-1'>Kayıtlı Kadroyu Yönet:</h4>
                                <div className="flex gap-2 items-center">
                                    <select 
                                        value={selectedMatchId} 
                                        onChange={(e) => { 
                                            const mid = e.target.value; 
                                            // setSelectedMatchId(mid); // loadMatchLineup içinde zaten set ediliyor veya clearPitch'te
                                            if (mid) { 
                                                loadMatchLineup(mid); 
                                                // setSelectedMatchId(mid) burada da olabilir ama loadMatchLineup içinde de set ediliyor.
                                                // Tutarlılık için loadMatchLineup'ın set etmesini bekleyebiliriz ya da burada da set edebiliriz.
                                                // Ancak URL'den yükleme ile tutarlı olması için setSelectedMatchId'yi burada da çağıralım.
                                                setSelectedMatchId(mid);
                                            } else { 
                                                clearPitch(); 
                                            }
                                        }} 
                                        className="flex-grow bg-gray-700 text-gray-100 p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" 
                                        disabled={isLoadingMatches || matches.length === 0}
                                    >
                                        <option value="">{isLoadingMatches ? "Yükleniyor..." : (matches.length === 0 ? "Kayıt Yok" : "-- Kadro Seç / Yükle --")}</option>
                                        {matches.map(match => (<option key={match.id} value={match.id}>{match.matchName || `Kayıt ${new Date(match.savedAt).toLocaleDateString('tr-TR')}`}</option>))}
                                    </select>
                                    <button onClick={() => handleDeleteMatch(selectedMatchId)} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" title="Seçili kadroyu sil" disabled={!selectedMatchId || isLoadingMatches}>Sil</button>
                                </div>
                                <div>
                                    <button onClick={copyToClipboard} className="w-full bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!shareableLink} title={shareableLink ? "Bu kadronun linkini kopyala" : "Link oluşturmak için kadro yükleyin"}>
                                        Paylaşım Linkini Kopyala
                                    </button>
                                </div>

                                {/* SKOR GİRİŞ ALANI (SADECE MAÇ SEÇİLİYSE GÖSTER) */}
                                {selectedMatchId && (
                                    <div className="mt-4 pt-3 border-t border-gray-700">
                                        <h4 className='text-sm font-medium text-gray-400 mb-2'>Maç Skoru ({matches.find(m=> String(m.id) === String(selectedMatchId))?.matchName || 'Seçili Maç'}):</h4>
                                        <div className="flex gap-3 items-center justify-between mb-2">
                                            <div className='flex-1'>
                                                <label htmlFor="teamAScore" className="block text-xs font-medium text-gray-300 mb-1">Takım A</label>
                                                <input
                                                    type="number"
                                                    id="teamAScore"
                                                    min="0"
                                                    value={teamAScore}
                                                    onChange={(e) => setTeamAScore(e.target.value)}
                                                    placeholder="Skor A"
                                                    className="w-full bg-gray-700 text-gray-100 p-2 rounded outline-none focus:ring-2 focus:ring-red-500 text-center"
                                                    disabled={isSavingScore}
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
                                                    onChange={(e) => setTeamBScore(e.target.value)}
                                                    placeholder="Skor B"
                                                    className="w-full bg-gray-700 text-gray-100 p-2 rounded outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                    disabled={isSavingScore}
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleSaveOrUpdateScore} 
                                            className='w-full bg-green-600 hover:bg-green-700 py-2 rounded text-white font-semibold transition-colors duration-200 disabled:opacity-50' 
                                            disabled={isSavingScore || !selectedMatchId}
                                        >
                                            {isSavingScore ? 'Skor Kaydediliyor...' : 'Skorları Kaydet/Güncelle'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
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