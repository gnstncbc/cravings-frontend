import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    closestCorners
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import html2canvas from 'html2canvas';

import { apiClient } from './api';
import { downloadImage } from './utils';
import PlayerMarker from './PlayerMarker';
import PlayerPool from './PlayerPool';
import PitchDisplay from './PitchDisplay';
import ActionButtons from './ActionButtons';
import MatchControls from './MatchControls';
import PlayerManagement from './PlayerManagement';

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
    const [isAligningPlayers, setIsAligningPlayers] = useState(false);
    const [isSwitchingTeams, setIsSwitchingTeams] = useState(false);

    const pitchRefA = useRef(null);
    const pitchRefB = useRef(null);
    const pitchesContainerRef = useRef(null);

    const fetchPlayers = useCallback(async () => {
        setIsLoadingPlayers(true);
        try {
            const r = await apiClient.get('/players');
            setAllPlayers(r.data.map(p => ({ ...p, id: String(p.id) })) || []);
        } catch (e) {
            console.error("Oyuncular yüklenirken hata:", e);
            toast.error("Oyuncular yüklenemedi.");
            setAllPlayers([]);
        } finally {
            setIsLoadingPlayers(false);
        }
    }, []);

    const fetchMatches = useCallback(async () => {
        setIsLoadingMatches(true);
        try {
            const r = await apiClient.get('/matches');
            setMatches(r.data.map(m => ({ ...m, id: String(m.id) })) || []);
        } catch (e) {
            console.error("Maçlar yüklenirken hata:", e);
            toast.error("Kayıtlı maçlar yüklenemedi.");
            setMatches([]);
        } finally {
            setIsLoadingMatches(false);
        }
    }, []);

    const clearPitch = useCallback(() => {
        setPlayersOnPitchA({});
        setPlayersOnPitchB({});
        setSelectedMatchId("");
        setShareableLink(null);
        setTeamAScore('');
        setTeamBScore('');
        toast.info("Saha temizlendi.");
        setSearchParams({}, { replace: true });
    }, [setSearchParams]);

    const loadMatchLineup = useCallback(async (matchId) => {
        if (!matchId) {
            setShareableLink(null); setTeamAScore(''); setTeamBScore('');
            // clearPitch will be called by select onChange if matchId is empty
            return;
        }
        // toast.info("Kadro ve skor bilgileri yükleniyor...");
        let matchDetails;
        try {
            const response = await apiClient.get(`/matches/${matchId}`);
            matchDetails = response.data;
            const newPitchA = {}; if (matchDetails.lineupA) { Object.entries(matchDetails.lineupA).forEach(([playerId, posData]) => { newPitchA[String(playerId)] = { name: posData.playerName, xPercent: posData.xpercent, yPercent: posData.ypercent }; }); }
            const newPitchB = {}; if (matchDetails.lineupB) { Object.entries(matchDetails.lineupB).forEach(([playerId, posData]) => { newPitchB[String(playerId)] = { name: posData.playerName, xPercent: posData.xpercent, yPercent: posData.ypercent }; }); }
            setPlayersOnPitchA(newPitchA); setPlayersOnPitchB(newPitchB);
            setTeamAScore(matchDetails.teamAScore != null ? String(matchDetails.teamAScore) : '');
            setTeamBScore(matchDetails.teamBScore != null ? String(matchDetails.teamBScore) : '');
            // toast.success(`"${matchDetails.matchName || 'İsimsiz Kadro'}" yüklendi.`);
            setShareableLink(`${window.location.origin}${window.location.pathname}?matchId=${matchId}`);
            setSearchParams({ matchId }, { replace: true });
        } catch (error) {
            console.error("Maç yüklenirken hata:", error.response?.data || error.message, "Detay:", matchDetails);
            toast.error("Seçilen kadro/skor yüklenirken bir hata oluştu.");
            // Clear relevant state on error
            clearPitch(); // This will also clear selectedMatchId and searchParams
        }
    }, [setSearchParams, clearPitch]); // Added clearPitch to dependencies

    useEffect(() => {
        const matchIdFromUrl = searchParams.get('matchId');
        fetchPlayers();
        fetchMatches().then(() => {
            // Initial load based on URL; subsequent updates handled by the next useEffect
            if (matchIdFromUrl) {
                 // loadMatchLineup will be called by the next useEffect if matchIdFromUrl is valid
                 // and matches are loaded. Setting selectedMatchId here is okay.
                setSelectedMatchId(matchIdFromUrl);
                // Defer loading to the effect that depends on `matches` to ensure `matches` is populated.
            }
        });
    }, [fetchPlayers, fetchMatches, searchParams]); // Removed loadMatchLineup as it's better handled below

    useEffect(() => {
        const matchIdFromUrl = searchParams.get('matchId');
        if (matchIdFromUrl && !isLoadingMatches && matches.length > 0) {
            const matchExists = matches.some(m => m.id === matchIdFromUrl);
            if (matchExists) {
                // If the URL match ID is valid and different from current, or if lineup isn't loaded yet for it.
                if (selectedMatchId !== matchIdFromUrl || (Object.keys(playersOnPitchA).length === 0 && Object.keys(playersOnPitchB).length === 0 && !shareableLink)) {
                    loadMatchLineup(matchIdFromUrl); // This will also set selectedMatchId via its own logic
                }
                 if (!shareableLink) { // Ensure shareable link is set if match is loaded
                    setShareableLink(`${window.location.origin}${window.location.pathname}?matchId=${matchIdFromUrl}`);
                }
            } else {
                // Match ID from URL doesn't exist in fetched matches, so clear up.
                toast.warn("URL'deki maç ID'si geçersiz veya bulunamadı. Saha temizleniyor.");
                clearPitch();
            }
        } else if (!matchIdFromUrl && selectedMatchId) {
            // If URL has no matchId but something is selected, it means user cleared selection or navigated away
            // This case is mostly handled by clearPitch being called from MatchControls.
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matches, isLoadingMatches, searchParams, loadMatchLineup, clearPitch]);


    const activePlayerBaseData = activeId ? allPlayers.find(p => String(p.id) === String(activeId)) : null;
    const playersOnPitchIds = useRef(new Set()).current; // More stable ref for the set
    playersOnPitchIds.clear();
    Object.keys(playersOnPitchA).forEach(id => playersOnPitchIds.add(id));
    Object.keys(playersOnPitchB).forEach(id => playersOnPitchIds.add(id));
    const availablePlayers = allPlayers.filter(p => !playersOnPitchIds.has(String(p.id)));

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));

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
            toast.info(`${draggedPlayerData.name} çıkarıldı.`);
        }
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

                if (sourcePitch !== targetPitch) {
                    removeFromPitch(sourcePitch, draggedId);
                    addToPitch(targetPitch, draggedId, updatedPlayerData);
                    toast.info(`${draggedPlayerData.name} Takım ${targetPitch}'e geçti.`);
                } else {
                    addToPitch(sourcePitch, draggedId, updatedPlayerData);
                }
            } else {
                console.warn("Pitch dimensions not available for percentage calculation during transfer/move.");
            }
        }
        else if (!sourcePitch && targetPitch) {
            let dropXPercent = 50, dropYPercent = 50;
            const activeTranslatedRect = active.rect.current.translated;
            if (over && over.rect && over.rect.width > 0 && over.rect.height > 0 && activeTranslatedRect) {
                const draggedItemCenterX_viewport = activeTranslatedRect.left + activeTranslatedRect.width / 2;
                const draggedItemCenterY_viewport = activeTranslatedRect.top + activeTranslatedRect.height / 2;
                const pitchOriginX_viewport = over.rect.left;
                const pitchOriginY_viewport = over.rect.top;
                let finalPixelX_relative = draggedItemCenterX_viewport - pitchOriginX_viewport;
                let finalPixelY_relative = draggedItemCenterY_viewport - pitchOriginY_viewport;
                dropXPercent = (finalPixelX_relative / over.rect.width) * 100;
                dropYPercent = (finalPixelY_relative / over.rect.height) * 100;
            } else {
                console.warn("Saha boyutları (over.rect) alınamadı, fallback %50/%50 kullanılıyor.");
            }
            const newPlayerData = { name: draggedPlayerData.name, xPercent: Math.max(0,Math.min(100,dropXPercent)), yPercent: Math.max(0,Math.min(100,dropYPercent)) };
            addToPitch(targetPitch, draggedId, newPlayerData);
            // toast.success(`${draggedPlayerData.name} Takım ${targetPitch}'e eklendi.`);
        }
    }

    const handleAddPlayer = async (e) => {
        e.preventDefault();
        const nameToAdd = newPlayerName.trim();
        if (!nameToAdd) return;
        if (allPlayers.some(p => p.name.toLowerCase() === nameToAdd.toLowerCase())) {
            toast.warn(`${nameToAdd} zaten listede.`); return;
        }
        try {
            const response = await apiClient.post('/players', { name: nameToAdd });
            const addedPlayer = { ...response.data, id: String(response.data.id) };
            setAllPlayers(prev => [...prev, addedPlayer].sort((a, b) => a.name.localeCompare(b.name)));
            setNewPlayerName('');
            toast.success(`${addedPlayer.name} eklendi.`);
        } catch (error) {
            toast.error(`Hata: ${error.response?.data?.message || "Oyuncu eklenemedi."}`);
        }
    };

    const handleDeletePlayer = async (playerId) => {
        const playerToDelete = allPlayers.find(pl => String(pl.id) === String(playerId));
        if (!playerToDelete) return;
        if (window.confirm(`${playerToDelete.name} adlı oyuncuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
            try {
                await apiClient.delete(`/players/${playerId}`);
                setAllPlayers(prev => prev.filter(pl => String(pl.id) !== String(playerId)));
                setPlayersOnPitchA(prev => { const { [playerId]: _, ...rest } = prev; return rest; });
                setPlayersOnPitchB(prev => { const { [playerId]: _, ...rest } = prev; return rest; });
                toast.info(`${playerToDelete.name} silindi.`);
            } catch (error) {
                toast.error(`${playerToDelete.name} silinemedi: ${error.response?.data?.message || "Sunucu hatası"}`);
            }
        }
    };

    const handleSaveMatch = async () => {
        setIsSavingMatch(true);
        const defaultMatchName = `Kadro ${new Date().toLocaleDateString('tr-TR')}`;
        const payload = { matchName: defaultMatchName, location: "Bilinmiyor", lineupA: {}, lineupB: {} };
        Object.entries(playersOnPitchA).forEach(([pId, data]) => { payload.lineupA[pId] = { xPercent: data.xPercent, yPercent: data.yPercent }; });
        Object.entries(playersOnPitchB).forEach(([pId, data]) => { payload.lineupB[pId] = { xPercent: data.xPercent, yPercent: data.yPercent }; });

        const userMatchName = prompt("Kadro adı:", defaultMatchName);
        if (userMatchName === null) { setIsSavingMatch(false); return; }
        payload.matchName = userMatchName.trim() || defaultMatchName;

        try {
            const response = await apiClient.post('/matches', payload);
            const savedMatch = response.data;
            toast.success(`"${savedMatch.matchName || 'İsimsiz Kadro'}" kaydedildi!`);
            fetchMatches().then(() => { // Re-fetch matches to include the new one
                setSelectedMatchId(String(savedMatch.id));
                setSearchParams({ matchId: String(savedMatch.id) }, { replace: true });
                // Scores should be fresh for a newly saved lineup
                setTeamAScore('');
                setTeamBScore('');
                setShareableLink(`${window.location.origin}${window.location.pathname}?matchId=${savedMatch.id}`);
            });
        } catch (error) {
            toast.error(`Hata: ${error.response?.data?.message || "Kadro kaydedilemedi."}`);
        } finally {
            setIsSavingMatch(false);
        }
    };
    
    const handleSaveOrUpdateScore = async () => {
        if (!selectedMatchId) { toast.warn("Lütfen önce bir maç seçin veya mevcut dizilişi kaydedin."); return; }
        const scoreAStr = String(teamAScore).trim();
        const scoreBStr = String(teamBScore).trim();
        if (scoreAStr === '' || scoreBStr === '') { toast.error("Lütfen her iki takımın skorunu da girin."); return; }
        const scoreA = parseInt(scoreAStr, 10);
        const scoreB = parseInt(scoreBStr, 10);
        if (isNaN(scoreA) || isNaN(scoreB)) { toast.error("Lütfen geçerli sayısal skor değerleri girin."); return; }
        if (scoreA < 0 || scoreB < 0) { toast.error("Skorlar negatif olamaz."); return; }

        setIsSavingScore(true);
        try {
            await apiClient.post(`/matches/${selectedMatchId}/score`, { teamAScore: scoreA, teamBScore: scoreB });
            toast.success("Skorlar başarıyla kaydedildi!");
             // Optionally re-fetch matches if score update changes any match list display property
            fetchMatches();
        } catch (error) {
            toast.error(`Skorlar kaydedilemedi: ${error.response?.data?.message || "Sunucu hatası"}`);
        } finally {
            setIsSavingScore(false);
        }
    };

    const handleDeleteMatch = async (matchIdToDelete) => {
        if (!matchIdToDelete) { toast.warn("Silmek için bir kadro seçin."); return; }
        const matchInfo = matches.find(ma => String(ma.id) === String(matchIdToDelete));
        const matchNameToConfirm = matchInfo?.matchName || `ID: ${matchIdToDelete} olan kayıt`;
        if (window.confirm(`"${matchNameToConfirm}" adlı kadroyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            try {
                await apiClient.delete(`/matches/${matchIdToDelete}`);
                toast.success(`"${matchNameToConfirm}" silindi.`);
                clearPitch(); // Clear the pitch as the loaded match is now gone
                fetchMatches(); // Refresh the match list
            } catch (error) {
                toast.error(`Hata: ${error.response?.data?.message || "Kadro silinemedi."}`);
            }
        }
    };

    const copyToClipboard = () => {
        if (shareableLink) {
            navigator.clipboard.writeText(shareableLink)
                .then(() => toast.success("Paylaşım linki panoya kopyalandı!"))
                .catch(() => toast.error("Link kopyalanamadı. Lütfen manuel olarak kopyalayın."));
        }
    };

    const handleShareBothPitches = async () => {
        if (!pitchesContainerRef.current) { toast.error("Sahalar görüntülenemedi."); return; }
        if (isSharing) return;
        setIsSharing(true);
        toast.info("Kadro ekran görüntüsü hazırlanıyor...");

        const targetElement = pitchesContainerRef.current;
        const originalScrollX = window.scrollX; const originalScrollY = window.scrollY;
        window.scrollTo(0, 0); // Scroll to top to ensure full capture if element is off-screen

        await document.fonts.ready; // Ensure fonts are loaded

        try {
            const canvas = await html2canvas(targetElement, {
                logging: false,
                backgroundColor: '#111827', // Matches page background
                // width: targetElement.scrollWidth, // Use scrollWidth/Height for full content
                // height: targetElement.scrollHeight,
                onclone: (documentClone) => {
                    // Style player markers for screenshot
                    documentClone.querySelectorAll('.player-marker-capture').forEach(marker => {
                        const playerName = marker.getAttribute('data-player-name') || marker.innerText;
                        marker.innerHTML = ''; // Clear current content (like name) to re-style
                        marker.style.fontSize = '13px';
                        marker.style.fontWeight = '600';
                        marker.style.padding = '4px 8px'; // Adjusted padding
                        marker.style.display = 'flex';
                        marker.style.alignItems = 'center';
                        marker.style.justifyContent = 'center';
                        marker.style.textAlign = 'center';
                        marker.style.boxSizing = 'border-box';
                        // marker.style.border = '1px solid rgba(255,255,255,0.5)'; // Optional border
                        
                        const span = document.createElement('span');
                        span.innerText = playerName;
                        span.style.paddingBottom = '10px'; // Original V2 style, check if needed
                        marker.appendChild(span);
                    });
                    // Remove any dynamic rings/highlights not desired in screenshot
                    Array.from(documentClone.querySelectorAll('.ring-2, .ring-yellow-400, .ring-offset-2, .ring-yellow-500'))
                         .forEach(el => el.classList.remove('ring-2', 'ring-yellow-400', 'ring-offset-2', 'ring-yellow-500'));
                }
            });
            window.scrollTo(originalScrollX, originalScrollY); // Restore scroll position

            const padding = 20;
            const paddedCanvas = document.createElement('canvas');
            paddedCanvas.width = canvas.width + 2 * padding;
            paddedCanvas.height = canvas.height + 2 * padding;
            const ctx = paddedCanvas.getContext('2d');
            ctx.fillStyle = '#111827'; // Background for padding
            ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
            ctx.drawImage(canvas, padding, padding);

            const imageBase64 = paddedCanvas.toDataURL('image/png');
            const currentMatch = selectedMatchId ? matches.find(m => String(m.id) === String(selectedMatchId)) : null;
            const matchNameForFile = currentMatch?.matchName || (selectedMatchId ? 'Kayitli_Kadro' : 'Guncel_Kadro');
            const scoreDisplay = (selectedMatchId && (teamAScore !== '' || teamBScore !== ''))
                ? ` (A ${teamAScore || '?'}-${teamBScore || '?'} B)`
                : '';
            const shareTitle = `${currentMatch?.matchName || (selectedMatchId ? 'Kayıtlı' : 'Güncel')} Kadro${scoreDisplay}`;
            const fileName = `Kadrolar_${matchNameForFile.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([""], "dummy.png", { type: "image/png" })] })) {
                const response = await fetch(imageBase64);
                const blob = await response.blob();
                const imageFile = new File([blob], fileName, { type: 'image/png' });
                try {
                    await navigator.share({ title: (currentMatch?.matchName || 'Kadro'), text: shareTitle, files: [imageFile] });
                    toast.success("Paylaşım arayüzü açıldı.");
                } catch (shareError) {
                    if (shareError.name === 'AbortError') {
                        toast.info('Paylaşım iptal edildi.');
                    } else {
                        toast.error('Paylaşım hatası. Resim indiriliyor...');
                        downloadImage(imageBase64, fileName);
                    }
                }
            } else {
                toast.warn("Web Share API desteklenmiyor. Resim indiriliyor...");
                downloadImage(imageBase64, fileName);
            }
        } catch (e) {
            console.error("Ekran görüntüsü alınırken hata:", e);
            toast.error("Ekran görüntüsü alınırken bir hata oluştu.");
            window.scrollTo(originalScrollX, originalScrollY);
        } finally {
            setIsSharing(false);
        }
    };

    const alignClosePlayers = () => {
        setIsAligningPlayers(true);
        const alignmentThreshold = 10; // Percentage threshold for considering players close

        const alignPlayersInTeam = (players) => {
            const playerEntries = Object.entries(players);
            const updatedPlayers = { ...players };

            // Group players by their x position (horizontal alignment)
            const xGroups = {};
            playerEntries.forEach(([id, data]) => {
                const xPos = Math.round(data.xPercent / alignmentThreshold) * alignmentThreshold;
                if (!xGroups[xPos]) xGroups[xPos] = [];
                xGroups[xPos].push({ id, data });
            });

            // Align players in each x group
            Object.values(xGroups).forEach(group => {
                if (group.length > 1) {
                    const avgX = group.reduce((sum, { data }) => sum + data.xPercent, 0) / group.length;
                    group.forEach(({ id }) => {
                        updatedPlayers[id] = {
                            ...updatedPlayers[id],
                            xPercent: avgX
                        };
                    });
                }
            });

            // Group players by their y position (vertical alignment)
            const yGroups = {};
            playerEntries.forEach(([id, data]) => {
                const yPos = Math.round(data.yPercent / alignmentThreshold) * alignmentThreshold;
                if (!yGroups[yPos]) yGroups[yPos] = [];
                yGroups[yPos].push({ id, data });
            });

            // Align players in each y group
            Object.values(yGroups).forEach(group => {
                if (group.length > 1) {
                    const avgY = group.reduce((sum, { data }) => sum + data.yPercent, 0) / group.length;
                    group.forEach(({ id }) => {
                        updatedPlayers[id] = {
                            ...updatedPlayers[id],
                            yPercent: avgY
                        };
                    });
                }
            });

            return updatedPlayers;
        };

        setPlayersOnPitchA(prev => alignPlayersInTeam(prev));
        setPlayersOnPitchB(prev => alignPlayersInTeam(prev));
        setIsAligningPlayers(false);
        toast.success("Oyuncular hizalandı!");
    };

    const switchTeams = () => {
        setIsSwitchingTeams(true);
        const tempTeamA = { ...playersOnPitchA };
        const tempTeamB = { ...playersOnPitchB };

        // Update player positions to maintain their relative positions on the new side
        const updatePositions = (players) => {
            const updatedPlayers = {};
            Object.entries(players).forEach(([id, data]) => {
                updatedPlayers[id] = {
                    ...data,
                    xPercent: 100 - data.xPercent, // Mirror the x position
                    yPercent: data.yPercent // Keep the same y position
                };
            });
            return updatedPlayers;
        };

        setPlayersOnPitchA(updatePositions(tempTeamB));
        setPlayersOnPitchB(updatePositions(tempTeamA));
        setIsSwitchingTeams(false);
        toast.success("Takımlar yer değiştirdi!");
    };

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
                    {/* <Link to="/" className="text-blue-400 hover:text-blue-300">&larr; Ana Sayfaya Dön</Link> */}
                    <h1 className="text-2xl md:text-3xl font-bold text-center flex-grow">Halı Saha Kadro Oluşturucu</h1>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/4 flex flex-col gap-4" style={{ minWidth: '250px' }}>
                        <PlayerPool id="playerPool" players={availablePlayers} loading={isLoadingPlayers} />
                        
                        <div className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-3">
                            <ActionButtons
                                onSharePitches={handleShareBothPitches}
                                onClearPitch={clearPitch}
                                onSaveMatch={handleSaveMatch}
                                onAlignPlayers={alignClosePlayers}
                                onSwitchTeams={switchTeams}
                                isSharing={isSharing}
                                isSavingMatch={isSavingMatch}
                                isAligningPlayers={isAligningPlayers}
                                isSwitchingTeams={isSwitchingTeams}
                                hasPlayersOnPitch={Object.keys(playersOnPitchA).length > 0 || Object.keys(playersOnPitchB).length > 0}
                                selectedMatchId={selectedMatchId}
                            />
                            <MatchControls
                                matches={matches}
                                selectedMatchId={selectedMatchId}
                                onMatchSelected={(matchId) => {
                                    // setSelectedMatchId(matchId); // loadMatchLineup will handle setting this if successful
                                    if (matchId) {
                                        loadMatchLineup(matchId);
                                    } else {
                                        clearPitch();
                                    }
                                }}
                                onDeleteSelectedMatch={() => handleDeleteMatch(selectedMatchId)}
                                isLoadingMatches={isLoadingMatches}
                                isProcessingAction={isSharing || isSavingMatch || isSavingScore}
                                onCopyLink={copyToClipboard}
                                shareableLink={shareableLink}
                                teamAScore={teamAScore}
                                onTeamAScoreChange={setTeamAScore}
                                teamBScore={teamBScore}
                                onTeamBScoreChange={setTeamBScore}
                                onSaveScore={handleSaveOrUpdateScore}
                                isSavingScore={isSavingScore}
                            />
                        </div>
                        
                        <PlayerManagement
                            allPlayers={allPlayers}
                            isLoadingPlayers={isLoadingPlayers}
                            newPlayerName={newPlayerName}
                            onNewPlayerNameChange={setNewPlayerName}
                            onAddPlayer={handleAddPlayer}
                            onDeletePlayer={handleDeletePlayer}
                            isProcessingAction={isSharing}
                        />
                    </div>

                    <div
                        ref={pitchesContainerRef}
                        className="lg:w-3/4 lg:self-start flex flex-col sm:flex-row gap-4"
                    >
                        <PitchDisplay pitchId="pitchAreaA" teamId="A" playersOnThisPitch={playersOnPitchA} pitchRef={pitchRefA} />
                        <PitchDisplay pitchId="pitchAreaB" teamId="B" playersOnThisPitch={playersOnPitchB} pitchRef={pitchRefB} />
                    </div>
                </div>
                <footer className="mt-8 text-center text-gray-400 text-sm">
                Güneş Tan Cebeci | 2025
                </footer>
            </div>
            <DragOverlay dropAnimation={null} zIndex={100} modifiers={[snapCenterToCursor]}>
                {activeId && activePlayerBaseData ? (
                    <PlayerMarker
                        id={`overlay-${activeId}`}
                        name={activePlayerBaseData.name}
                        team={playersOnPitchA[activeId] ? 'A' : playersOnPitchB[activeId] ? 'B' : null}
                        isOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default Carpet;