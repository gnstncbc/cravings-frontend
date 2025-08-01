import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import html2canvas from "html2canvas";

import { apiClient } from "./api";
import { downloadImage } from "./utils";
import PlayerMarker from "./PlayerMarker";
import PlayerPool from "./PlayerPool";
import PitchDisplay from "./PitchDisplay";
import ActionButtons from "./ActionButtons";
import MatchControls from "./MatchControls";
import PlayerManagement from "./PlayerManagement";
import TeamGenerator from "../Scoreboard/TeamGenerator";

const Carpet = () => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [playersOnPitchA, setPlayersOnPitchA] = useState({});
  const [playersOnPitchB, setPlayersOnPitchB] = useState({});
  const [matches, setMatches] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [shareableLink, setShareableLink] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [teamAScore, setTeamAScore] = useState("");
  const [teamBScore, setTeamBScore] = useState("");
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isAligningPlayers, setIsAligningPlayers] = useState(false);
  const [isSwitchingTeams, setIsSwitchingTeams] = useState(false);
  const [isTeamGeneratorOpen, setIsTeamGeneratorOpen] = useState(false);
  const [isPredictionTooltipVisible, setIsPredictionTooltipVisible] =
    useState(false);
  const [teamGenState, setTeamGenState] = useState({
    selectedPlayers: [],
    playerPositions: {},
  });

  const [prediction, setPrediction] = useState(null);
  const [isCalculatingPrediction, setIsCalculatingPrediction] = useState(false);
  const debounceTimeoutRef = useRef(null);

  // YENİ: Takım kimyası için state'ler
  const [teamAChemistry, setTeamAChemistry] = useState({
    value: 0,
    isLoading: false,
  });
  const [teamBChemistry, setTeamBChemistry] = useState({
    value: 0,
    isLoading: false,
  });
  const [pairStatsA, setPairStatsA] = useState([]);
  const [pairStatsB, setPairStatsB] = useState([]);
  const chemistryTimeoutRef = useRef(null);
																	  

									 
														 
										 
										 
	  
  // YENİ STATE'LER SONU
  const [isChemistryVisible, setIsChemistryVisible] = useState(true);

  const pitchRefA = useRef(null);
  const pitchRefB = useRef(null);
  const pitchesContainerRef = useRef(null);
  
  const handleToggleChemistry = () => setIsChemistryVisible(prev => !prev);
  // ... (fetchPlayers, handleTeamGenStateChange, fetchMatches, clearPitch, loadMatchLineup, useEffects for loading...)
															
									   
					 
												 
																							  
								
						   

								   
														
																			  

																	  
															

							 
																  
									   

						   
														 
				
																				  
		 
		

													 

								   

					
											   
		
				

										   
	
						 

																																																   
  const fetchPlayers = useCallback(async () => {
    setIsLoadingPlayers(true);
    try {
      const r = await apiClient.get("/players");
      setAllPlayers(r.data.map((p) => ({ ...p, id: String(p.id) })) || []);
    } catch (e) {
      console.error("Oyuncular yüklenirken hata:", e);
      toast.error("Oyuncular yüklenemedi.");
      setAllPlayers([]);
    } finally {
      setIsLoadingPlayers(false);
    }
  }, []);

  const handleTeamGenStateChange = useCallback((newState) => {
    setTeamGenState(newState);
  }, []);
			
																		  
																
			
																						  
										   

  const fetchMatches = useCallback(async () => {
    setIsLoadingMatches(true);
    try {
      const r = await apiClient.get("/matches");
      setMatches(r.data.map((m) => ({ ...m, id: String(m.id) })) || []);
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
    setTeamAScore("");
    setTeamBScore("");
    setPrediction(null);
    // YENİ: Kimya state'lerini de temizle
    setTeamAChemistry({ value: 0, isLoading: false });
    setTeamBChemistry({ value: 0, isLoading: false });
    setPairStatsA([]);
    setPairStatsB([]);
    toast.info("Saha temizlendi.");
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const loadMatchLineup = useCallback(
    async (matchId) => {
      if (!matchId) {
        setShareableLink(null);
        setTeamAScore("");
        setTeamBScore("");
        return;
      }
      let matchDetails;
      try {
        const response = await apiClient.get(`/matches/${matchId}`);
        matchDetails = response.data;
        const newPitchA = {};
        if (matchDetails.lineupA) {
          Object.entries(matchDetails.lineupA).forEach(
            ([playerId, posData]) => {
              newPitchA[String(playerId)] = {
                name: posData.playerName,
                xPercent: posData.xpercent,
                yPercent: posData.ypercent,
              };
            }
          );
        }
        const newPitchB = {};
        if (matchDetails.lineupB) {
          Object.entries(matchDetails.lineupB).forEach(
            ([playerId, posData]) => {
              newPitchB[String(playerId)] = {
                name: posData.playerName,
                xPercent: posData.xpercent,
                yPercent: posData.ypercent,
              };
            }
          );
        }
        setPlayersOnPitchA(newPitchA);
        setPlayersOnPitchB(newPitchB);
        setTeamAScore(
          matchDetails.teamAScore != null ? String(matchDetails.teamAScore) : ""
        );
        setTeamBScore(
          matchDetails.teamBScore != null ? String(matchDetails.teamBScore) : ""
        );
        setShareableLink(
          `${window.location.origin}${window.location.pathname}?matchId=${matchId}`
        );
        setSearchParams({ matchId }, { replace: true });
      } catch (error) {
        console.error(
          "Maç yüklenirken hata:",
          error.response?.data || error.message,
          "Detay:",
          matchDetails
        );
        toast.error("Seçilen kadro/skor yüklenirken bir hata oluştu.");
        clearPitch();
      }
    },
    [setSearchParams, clearPitch]
  );

  useEffect(() => {
    const matchIdFromUrl = searchParams.get("matchId");
    fetchPlayers();
    fetchMatches().then(() => {
      if (matchIdFromUrl) {
        setSelectedMatchId(matchIdFromUrl);
      }
    });
  }, [fetchPlayers, fetchMatches, searchParams]);

  useEffect(() => {
    const matchIdFromUrl = searchParams.get("matchId");
    if (matchIdFromUrl && !isLoadingMatches && matches.length > 0) {
      const matchExists = matches.some((m) => m.id === matchIdFromUrl);
      if (matchExists) {
        if (
          selectedMatchId !== matchIdFromUrl ||
          (Object.keys(playersOnPitchA).length === 0 &&
            Object.keys(playersOnPitchB).length === 0 &&
            !shareableLink)
        ) {
          loadMatchLineup(matchIdFromUrl);
        }
        if (!shareableLink) {
          setShareableLink(
            `${window.location.origin}${window.location.pathname}?matchId=${matchIdFromUrl}`
          );
        }
      } else {
        toast.warn(
          "URL'deki maç ID'si geçersiz veya bulunamadı. Saha temizleniyor."
        );
        clearPitch();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, isLoadingMatches, searchParams, loadMatchLineup, clearPitch]);

  // YENİ: Takım kimyasını hesaplayan useEffect
  useEffect(() => {
    const calculateChemistry = async (
      playerIds,
      setChemistry,
      setPairStats
    ) => {
      if (playerIds.length < 2) {
        setChemistry({ value: 0, isLoading: false });
        setPairStats([]);
        return;
				 
									
      }
		  

      setChemistry((prev) => ({ ...prev, isLoading: true }));
      try {
        const response = await apiClient.post("/players/chemistry", {
          playerIds,
        });
        const data = response.data;
        setChemistry({ value: data.teamChemistry, isLoading: false });
        setPairStats(data.playerPairStats || []);
      } catch (error) {
        console.error("Takım kimyası hesaplanırken hata:", error);
        // toast.error("Takım kimyası hesaplanamadı.");
        setChemistry({ value: 0, isLoading: false });
        setPairStats([]);
      }
    };

    // Değişiklikleri biriktirip tek bir API çağrısı yapmak için debounce
    clearTimeout(chemistryTimeoutRef.current);
    chemistryTimeoutRef.current = setTimeout(() => {
      const teamAPlayerIds = Object.keys(playersOnPitchA).map(Number);
      const teamBPlayerIds = Object.keys(playersOnPitchB).map(Number);
				   
														
														
						
				 
									
	   
		  

      calculateChemistry(teamAPlayerIds, setTeamAChemistry, setPairStatsA);
      calculateChemistry(teamBPlayerIds, setTeamBChemistry, setPairStatsB);
    }, 750); // 750ms bekle
							 
							 
						
						
						  
														
														
						
						
									 
											 
						 

    return () => clearTimeout(chemistryTimeoutRef.current);
  }, [playersOnPitchA, playersOnPitchB]);
  // YENİ useEffect SONU
								   
							  
							  
				   
		  
						  
			  
																		
										 
								 
									   
															
											
													
												 
												   
												   
					   
				   
				 
			 
								 
									   
															
											
													
												 
												   
												   
					   
				   
				 
			 
										  
										  
						  
																					 
			  
						  
																					 
			  
							 
																						
			  
															
						  
						  
										 
													 
						
						   
			  
																			  
						 
		  
		
								   
	 

  // ... (handleDragStart, handleDragEnd, handleAddPlayer, handleDeletePlayer, handleSaveMatch, handleSaveOrUpdateScore, handleDeleteMatch, copyToClipboard, handleShareBothPitches, alignClosePlayers, switchTeams, handleTeamGeneratorClose, handleTeamGeneratorTeams, fetchPrediction, useEffect for prediction... mevcut fonksiyonlar burada) ...
														 
					 
								 
							  
											   
		  
		 
												  

  function handleDragStart(event) {
    setActiveId(String(event.active.id));
																	  
																		  
						   
				
													
															
															  
								 
			   
											   
			 
								 
								
																								  
				 
  }
				 
					   
																				   
			  
						 
		  
	   
															 
																			  

  function handleDragEnd(event) {
    const { active, over, delta } = event;
    if (!active || !over) {
      setActiveId(null);
      return;
    }
    const draggedId = String(active.id);
    setActiveId(null);
    const overId = over.id;
				   
		  

    let draggedPlayerData = allPlayers.find((p) => String(p.id) === draggedId);
    if (!draggedPlayerData) {
      const playerOnA = playersOnPitchA[draggedId];
      const playerOnB = playersOnPitchB[draggedId];
      if (playerOnA)
        draggedPlayerData = { id: draggedId, name: playerOnA.name };
      else if (playerOnB)
        draggedPlayerData = { id: draggedId, name: playerOnB.name };
      else {
        console.error(
          "handleDragEnd: Sürüklenen oyuncu verisi bulunamadı.",
          draggedId
        );
        toast.error("Oyuncu bilgisi bulunamadı!");
        return;
      }
    } else {
      draggedPlayerData = {
        id: String(draggedPlayerData.id),
        name: draggedPlayerData.name,
      };
    }

    const sourcePitch = playersOnPitchA[draggedId]
      ? "A"
      : playersOnPitchB[draggedId]
      ? "B"
      : null;
    const targetPitch =
      overId === "pitchAreaA" ? "A" : overId === "pitchAreaB" ? "B" : null;
    const targetPool = overId === "playerPool";

    const updatePitchState = (team, updateFn) => {
      if (team === "A") setPlayersOnPitchA(updateFn);
      else if (team === "B") setPlayersOnPitchB(updateFn);
    };
    const removeFromPitch = (team, playerId) =>
      updatePitchState(team, (prev) => {
        const { [playerId]: _, ...rest } = prev;
        return rest;
      });
    const addToPitch = (team, playerId, data) =>
      updatePitchState(team, (prev) => ({ ...prev, [playerId]: data }));

    if (sourcePitch && targetPool) {
      removeFromPitch(sourcePitch, draggedId);
      toast.info(`${draggedPlayerData.name} çıkarıldı.`);
    } else if (sourcePitch && targetPitch) {
      if (sourcePitch !== targetPitch) {
        const { rect: overRect } = over;
        const activeTranslatedRect = active.rect.current.translated;

        if (!overRect || !activeTranslatedRect) {
          console.error(
            "Takım değiştirirken pozisyon hesaplanamadı: 'over' veya 'active' nesneleri eksik.",
            { over, active }
          );
          toast.error("Oyuncu pozisyonu hesaplanırken bir hata oluştu.");
          return;
        }

        const draggedItemCenterX =
          activeTranslatedRect.left + activeTranslatedRect.width / 2;
        const draggedItemCenterY =
          activeTranslatedRect.top + activeTranslatedRect.height / 2;
        const finalPixelX_relative = draggedItemCenterX - overRect.left;
        const finalPixelY_relative = draggedItemCenterY - overRect.top;
										  
						
							 

        const dropXPercent = (finalPixelX_relative / overRect.width) * 100;
        const dropYPercent = (finalPixelY_relative / overRect.height) * 100;
													  
													  
					   
																		
							
																		
			   
						  
																		
						
			  
													   
				   
		  
			  
							  
											 
										 
		   
	   

        const newPlayerData = {
          name: draggedPlayerData.name,
          xPercent: Math.max(0, Math.min(100, dropXPercent)),
          yPercent: Math.max(0, Math.min(100, dropYPercent)),
        };
						 
																			  
												 

        removeFromPitch(sourcePitch, draggedId);
        addToPitch(targetPitch, draggedId, newPlayerData);
        toast.info(`${draggedPlayerData.name} Takım ${targetPitch}'e geçti.`);
      } else {
        const currentPositionData =
          playersOnPitchA[draggedId] || playersOnPitchB[draggedId];
													
						
			
												  
																		   

        if (!currentPositionData) return;
												 
																
											  
										   
											
																		

        const pitchRef = sourcePitch === "A" ? pitchRefA : pitchRefB;
        const pitchRect = pitchRef.current?.getBoundingClientRect();
																										  
								  
				 
																				
					  
			 

        if (!pitchRect || pitchRect.width <= 0) {
          console.warn(
            "Aynı takım içinde sürüklerken saha boyutları alınamadı."
          );
          return;
        }

        const currentPixelX =
          (currentPositionData.xPercent / 100) * pitchRect.width;
        const currentPixelY =
          (currentPositionData.yPercent / 100) * pitchRect.height;
        const finalPixelX = currentPixelX + delta.x;
        const finalPixelY = currentPixelY + delta.y;

        const xPercent = (finalPixelX / pitchRect.width) * 100;
        const yPercent = (finalPixelY / pitchRect.height) * 100;
																  
																  
			  

        const updatedPlayerData = {
          name: currentPositionData.name,
          xPercent: Math.max(0, Math.min(100, xPercent)),
          yPercent: Math.max(0, Math.min(100, yPercent)),
        };
																		

        addToPitch(sourcePitch, draggedId, updatedPlayerData);
      }
    } else if (!sourcePitch && targetPitch) {
      let dropXPercent = 50,
        dropYPercent = 50;
      const activeTranslatedRect = active.rect.current.translated;
      if (
        over &&
        over.rect &&
        over.rect.width > 0 &&
        over.rect.height > 0 &&
        activeTranslatedRect
      ) {
        const draggedItemCenterX_viewport =
          activeTranslatedRect.left + activeTranslatedRect.width / 2;
        const draggedItemCenterY_viewport =
          activeTranslatedRect.top + activeTranslatedRect.height / 2;
        const pitchOriginX_viewport = over.rect.left;
        const pitchOriginY_viewport = over.rect.top;
        let finalPixelX_relative =
          draggedItemCenterX_viewport - pitchOriginX_viewport;
        let finalPixelY_relative =
          draggedItemCenterY_viewport - pitchOriginY_viewport;
        dropXPercent = (finalPixelX_relative / over.rect.width) * 100;
        dropYPercent = (finalPixelY_relative / over.rect.height) * 100;
      } else {
        console.warn(
          "Saha boyutları (over.rect) alınamadı, fallback %50/%50 kullanılıyor."
        );
      }
      const newPlayerData = {
        name: draggedPlayerData.name,
        xPercent: Math.max(0, Math.min(100, dropXPercent)),
        yPercent: Math.max(0, Math.min(100, dropYPercent)),
      };

																	
														
																
							  
																  
						 
																			

													  
								
													   
							  
			
			   
																		 
									  
			   
														

													  
																	
											
						
																	 
				  
								
											  
						  
																   
					
					   
			 
						   
						  
																	 
				   
			  
		   
		 

														  
		
      addToPitch(targetPitch, draggedId, newPlayerData);
									 
					   
    }
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const nameToAdd = newPlayerName.trim();
    if (!nameToAdd) return;
    if (
      allPlayers.some((p) => p.name.toLowerCase() === nameToAdd.toLowerCase())
    ) {
      toast.warn(`${nameToAdd} zaten listede.`);
      return;
    }
    try {
      const response = await apiClient.post("/players", { name: nameToAdd });
      const addedPlayer = { ...response.data, id: String(response.data.id) };
      setAllPlayers((prev) =>
        [...prev, addedPlayer].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewPlayerName("");
      toast.success(`${addedPlayer.name} eklendi.`);
    } catch (error) {
      toast.error(
        `Hata: ${error.response?.data?.message || "Oyuncu eklenemedi."}`
      );
    }
  };

  const handleDeletePlayer = async (playerId) => {
    const playerToDelete = allPlayers.find(
      (pl) => String(pl.id) === String(playerId)
    );
    if (!playerToDelete) return;
    if (
      window.confirm(
        `${playerToDelete.name} adlı oyuncuyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
      )
    ) {
      try {
        await apiClient.delete(`/players/${playerId}`);
        setAllPlayers((prev) =>
          prev.filter((pl) => String(pl.id) !== String(playerId))
        );
        setPlayersOnPitchA((prev) => {
          const { [playerId]: _, ...rest } = prev;
          return rest;
        });
        setPlayersOnPitchB((prev) => {
          const { [playerId]: _, ...rest } = prev;
          return rest;
        });
        toast.info(`${playerToDelete.name} silindi.`);
      } catch (error) {
        toast.error(
          `${playerToDelete.name} silinemedi: ${
            error.response?.data?.message || "Sunucu hatası"
          }`
        );
      }
    }
  };

  const handleSaveMatch = async () => {
    setIsSavingMatch(true);
    const defaultMatchName = `Kadro ${new Date().toLocaleDateString("tr-TR")}`;
																	   
    const payload = {
      matchName: defaultMatchName,
      location: "Bilinmiyor",
      lineupA: {},
      lineupB: {},
    };
    Object.entries(playersOnPitchA).forEach(([pId, data]) => {
      payload.lineupA[pId] = {
															  
															  
			  

																  
		  
											   
							   
							  
																	 
			 
				   
						
								  
								   
								
			
											   
																		  
											   
																		  
														 
														
									  
																   
									  
																   
																		  
																		   
				 
						 
																						  
			  
		  
								
										 
        xPercent: data.xPercent,
        yPercent: data.yPercent,
      };
    });
    Object.entries(playersOnPitchB).forEach(([pId, data]) => {
      payload.lineupB[pId] = {
        xPercent: data.xPercent,
        yPercent: data.yPercent,
																							
		
													  
																								 
				 
																										 
															
				
														  
																		  
												
								
																			
						
									  
													
									
																			
							
							 
				 
							 
																							 
			 
		 
		
														  
      };
    });

    const userMatchName = prompt("Kadro adı:", defaultMatchName);
    if (userMatchName === null) {
      setIsSavingMatch(false);
      return;
    }
    payload.matchName = userMatchName.trim() || defaultMatchName;

										 
						 
											 
							 
		  
																				 
		 
												   
				
	   
    try {
      const response = await apiClient.post("/matches", payload);
      const savedMatch = response.data;
      toast.success(`"${savedMatch.matchName || "İsimsiz Kadro"}" kaydedildi!`);
      fetchMatches().then(() => {
        setSelectedMatchId(String(savedMatch.id));
        setSearchParams({ matchId: String(savedMatch.id) }, { replace: true });
        setTeamAScore("");
        setTeamBScore("");
        setShareableLink(
          `${window.location.origin}${window.location.pathname}?matchId=${savedMatch.id}`
        );
      });
    } catch (error) {
      toast.error(
        `Hata: ${error.response?.data?.message || "Kadro kaydedilemedi."}`
      );
    } finally {
      setIsSavingMatch(false);
    }
  };

  const handleSaveOrUpdateScore = async () => {
    if (!selectedMatchId) {
      toast.warn("Lütfen önce bir maç seçin veya mevcut dizilişi kaydedin.");
		
      return;
    }
    const scoreAStr = String(teamAScore).trim();
    const scoreBStr = String(teamBScore).trim();
    if (scoreAStr === "" || scoreBStr === "") {
      toast.error("Lütfen her iki takımın skorunu da girin.");
      return;
    }
    const scoreA = parseInt(scoreAStr, 10);
    const scoreB = parseInt(scoreBStr, 10);
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
      await apiClient.post(`/matches/${selectedMatchId}/score`, {
        teamAScore: scoreA,
        teamBScore: scoreB,
      });
      toast.success("Skorlar başarıyla kaydedildi!");
      fetchMatches();
    } catch (error) {
      toast.error(
        `Skorlar kaydedilemedi: ${
          error.response?.data?.message || "Sunucu hatası"
        }`
      );
    } finally {
      setIsSavingScore(false);
    }
									
									
  };
		 

  const handleDeleteMatch = async (matchIdToDelete) => {
    if (!matchIdToDelete) {
      toast.warn("Silmek için bir kadro seçin.");
      return;
    }
    const matchInfo = matches.find(
      (ma) => String(ma.id) === String(matchIdToDelete)
    );
    const matchNameToConfirm =
      matchInfo?.matchName || `ID: ${matchIdToDelete} olan kayıt`;
    if (
      window.confirm(
        `"${matchNameToConfirm}" adlı kadroyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
      )
    ) {
      try {
        await apiClient.delete(`/matches/${matchIdToDelete}`);
        toast.success(`"${matchNameToConfirm}" silindi.`);
        clearPitch();
        fetchMatches();
      } catch (error) {
        toast.error(
          `Hata: ${error.response?.data?.message || "Kadro silinemedi."}`
        );
      }
    }
  };

  const copyToClipboard = () => {
    if (shareableLink) {
      navigator.clipboard
        .writeText(shareableLink)
        .then(() => toast.success("Paylaşım linki panoya kopyalandı!"))
													  
																				   
							  
							  
							 
																							  
			  
			
        .catch(() =>
          toast.error("Link kopyalanamadı. Lütfen manuel olarak kopyalayın.")
																			  
        );
    }
								 
	   
  };

  const handleShareBothPitches = async () => {
    if (!pitchesContainerRef.current) {
      toast.error("Sahalar görüntülenemedi.");
				
	   
												  
												  
												 
																	
      return;
    }
											 
											 
										   
																		 
    if (isSharing) return;
    setIsSharing(true);
    toast.info("Kadro ekran görüntüsü hazırlanıyor...");
												
				
	   

    const targetElement = pitchesContainerRef.current;
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);
							   
			
														  
						
					   
					 
									  
																
			  
		   
				 
								 
	   
	 

    await document.fonts.ready;
							 
													  
				
	   
									 
														  
		
								
																	  
		  
						
																												  
		  
		 
			  
																  
															  
						 
						   
						  
						
																			  
			  
		  
	   
	 

    try {
      const canvas = await html2canvas(targetElement, {
        logging: false,
        backgroundColor: "#111827",
        onclone: (documentClone) => {
          documentClone
            .querySelectorAll(".player-marker-capture")
            .forEach((marker) => {
              const playerName =
                marker.getAttribute("data-player-name") || marker.innerText;
              marker.innerHTML = "";
              marker.style.fontSize = "13px";
              marker.style.fontWeight = "600";
              marker.style.padding = "4px 8px";
              marker.style.display = "flex";
              marker.style.alignItems = "center";
              marker.style.justifyContent = "center";
              marker.style.textAlign = "center";
              marker.style.boxSizing = "border-box";

              const span = document.createElement("span");
              span.innerText = playerName;
              span.style.paddingBottom = "10px";
              marker.appendChild(span);
            });
          Array.from(
            documentClone.querySelectorAll(
              ".ring-2, .ring-yellow-400, .ring-offset-2, .ring-yellow-500"
            )
          ).forEach((el) =>
            el.classList.remove(
              "ring-2",
              "ring-yellow-400",
              "ring-offset-2",
              "ring-yellow-500"
            )
          );
        },
      });
      window.scrollTo(originalScrollX, originalScrollY);

      const padding = 20;
      const paddedCanvas = document.createElement("canvas");
      paddedCanvas.width = canvas.width + 2 * padding;
      paddedCanvas.height = canvas.height + 2 * padding;
      const ctx = paddedCanvas.getContext("2d");
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, paddedCanvas.width, paddedCanvas.height);
      ctx.drawImage(canvas, padding, padding);

      const imageBase64 = paddedCanvas.toDataURL("image/png");
      const currentMatch = selectedMatchId
        ? matches.find((m) => String(m.id) === String(selectedMatchId))
        : null;
      const matchNameForFile =
        currentMatch?.matchName ||
        (selectedMatchId ? "Kayitli_Kadro" : "Guncel_Kadro");
      const scoreDisplay =
        selectedMatchId && (teamAScore !== "" || teamBScore !== "")
          ? ` (A ${teamAScore || "?"}-${teamBScore || "?"} B)`
          : "";
      const shareTitle = `${
        currentMatch?.matchName || (selectedMatchId ? "Kayıtlı" : "Güncel")
      } Kadro${scoreDisplay}`;
      const fileName = `Kadrolar_${matchNameForFile.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.png`;

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [new File([""], "dummy.png", { type: "image/png" })],
        })
      ) {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const imageFile = new File([blob], fileName, { type: "image/png" });
        try {
          await navigator.share({
            title: currentMatch?.matchName || "Kadro",
            text: shareTitle,
            files: [imageFile],
          });
          toast.success("Paylaşım arayüzü açıldı.");
        } catch (shareError) {
          if (shareError.name === "AbortError") {
            toast.info("Paylaşım iptal edildi.");
          } else {
            toast.error("Paylaşım hatası. Resim indiriliyor...");
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
    const alignmentThreshold = 10;
											  
					 
						  
												 
																				  
				   
								
									  
							  
									   
									 
									  
				   
				 
			  
			
														   

    const alignPlayersInTeam = (players) => {
      const playerEntries = Object.entries(players);
      const updatedPlayers = { ...players };
														   
												   
								   
																	 
												 

      const xGroups = {};
      playerEntries.forEach(([id, data]) => {
        const xPos =
          Math.round(data.xPercent / alignmentThreshold) * alignmentThreshold;
        if (!xGroups[xPos]) xGroups[xPos] = [];
        xGroups[xPos].push({ id, data });
      });
																 
							 
																	   
																   
					
							   
																				  
								 
															   
							
			   
				 

      Object.values(xGroups).forEach((group) => {
        if (group.length > 1) {
								 
								
																		   
			  
			
          const avgX =
            group.reduce((sum, { data }) => sum + data.xPercent, 0) /
            group.length;
          group.forEach(({ id }) => {
            updatedPlayers[id] = {
              ...updatedPlayers[id],
              xPercent: avgX,
            };
          });
																
								  
													  
														 
					   
																		  
													   
				
			 
				 
																			 
												 
        }
      });
																   
																		  
														   
				 
							 
	   
	 

      const yGroups = {};
      playerEntries.forEach(([id, data]) => {
        const yPos =
          Math.round(data.yPercent / alignmentThreshold) * alignmentThreshold;
        if (!yGroups[yPos]) yGroups[yPos] = [];
        yGroups[yPos].push({ id, data });
      });

      Object.values(yGroups).forEach((group) => {
        if (group.length > 1) {
          const avgY =
            group.reduce((sum, { data }) => sum + data.yPercent, 0) /
            group.length;
          group.forEach(({ id }) => {
            updatedPlayers[id] = {
              ...updatedPlayers[id],
              yPercent: avgY,
            };
          });
        }
      });

      return updatedPlayers;
    };
						
																				   
												   
											 
			

    setPlayersOnPitchA((prev) => alignPlayersInTeam(prev));
    setPlayersOnPitchB((prev) => alignPlayersInTeam(prev));
    setIsAligningPlayers(false);
    toast.success("Oyuncular hizalandı!");
							   
										  
										
										   
									
  };
				  
			 
			

  const switchTeams = () => {
    setIsSwitchingTeams(true);
    const tempTeamA = { ...playersOnPitchA };
    const tempTeamB = { ...playersOnPitchB };
												   
											 
			

    const updatePositions = (players) => {
      const updatedPlayers = {};
      Object.entries(players).forEach(([id, data]) => {
																		   
							   
										  
        updatedPlayers[id] = {
          ...data,
          xPercent: 100 - data.xPercent,
          yPercent: data.yPercent,
        };
      });
      return updatedPlayers;
    };

    setPlayersOnPitchA(updatePositions(tempTeamB));
    setPlayersOnPitchB(updatePositions(tempTeamA));
    setIsSwitchingTeams(false);
    toast.success("Takımlar yer değiştirdi!");
  };

  const handleTeamGeneratorClose = () => {
    setIsTeamGeneratorOpen(false);
								  
											 
  };

  const handleTeamGeneratorTeams = (teamA, teamB) => {
    const newPitchA = {};
    const newPitchB = {};
											   

    const defaultPositions = {
      Kaleci: { x: 50, y: 90 },
      Bek: { x: 80, y: 70 },
      Stoper: { x: 50, y: 70 },
      "Orta Saha": { x: 50, y: 50 },
      Forvet: { x: 50, y: 30 },
									   
    };
			
							   
		

    teamA.forEach((player) => {
      const position = player.position || "Orta Saha";
      const pos = defaultPositions[position];
      newPitchA[player.id] = {
        name: player.name,
        xPercent:
          position === "Bek" ||
          position === "Orta Saha" ||
          position === "Forvet"
            ? player.xCoordinate
            : pos.x,
        yPercent: pos.y,
      };
    });

    teamB.forEach((player) => {
      const position = player.position || "Orta Saha";
      const pos = defaultPositions[position];
      newPitchB[player.id] = {
        name: player.name,
        xPercent:
          position === "Bek" ||
          position === "Orta Saha" ||
          position === "Forvet"
            ? player.xCoordinate
            : pos.x,
        yPercent: pos.y,
      };
    });

													   
    setPlayersOnPitchA(newPitchA);
    setPlayersOnPitchB(newPitchB);
    setIsTeamGeneratorOpen(false);
  };

  const fetchPrediction = useCallback(async () => {
    const teamAPlayerIds = Object.keys(playersOnPitchA);
    const teamBPlayerIds = Object.keys(playersOnPitchB);
								  
									   
								  
		

    if (teamAPlayerIds.length === 0 && teamBPlayerIds.length === 0) {
      setPrediction(null);
      return;
    }
							  
					 
									
										  
									
									  
						  
							
		   
		 

    setIsCalculatingPrediction(true);
    try {
      const response = await apiClient.post("/matches/predict", {
        teamAPlayerIds: teamAPlayerIds.map(Number),
        teamBPlayerIds: teamBPlayerIds.map(Number),
      });
      setPrediction(response.data);
    } catch (error) {
      console.error("Prediction error:", error);
      setPrediction(null);
    } finally {
      setIsCalculatingPrediction(false);
    }
  }, [playersOnPitchA, playersOnPitchB]);

  useEffect(() => {
    clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPrediction();
    }, 500);

    return () => {
      clearTimeout(debounceTimeoutRef.current);
    };
  }, [playersOnPitchA, playersOnPitchB, fetchPrediction]);

  const activePlayerBaseData = activeId
    ? allPlayers.find((p) => String(p.id) === String(activeId))
    : null;
  const playersOnPitchIds = useRef(new Set()).current;
  playersOnPitchIds.clear();
  Object.keys(playersOnPitchA).forEach((id) => playersOnPitchIds.add(id));
  Object.keys(playersOnPitchB).forEach((id) => playersOnPitchIds.add(id));
  const availablePlayers = allPlayers.filter(
    (p) => !playersOnPitchIds.has(String(p.id))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
													   
													   
			
									  
					   
  );
							 
				 
										   
	   
										  

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCorners}
    >
												
			 
		  
									 
					  
							   
											 
				 
					
							   
												 
				 
			 
							
															   
			 
		  
			  
				   
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
						
        <ToastContainer
          autoClose={2500}
          hideProgressBar
          theme="dark"
          position="top-center"
        />
						
        {isSharing && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-[200]">
								  
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
								  
            <p className="text-white text-lg">Görüntü hazırlanıyor...</p>
				   
          </div>
        )}
						
        <div className="flex justify-between items-center mb-4">
							 
          <h1 className="text-2xl md:text-3xl font-bold text-center flex-grow">
            Halı Saha Kadro Oluşturucu
          </h1>
						  
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
							 
          <div
            className="lg:w-1/4 flex flex-col gap-4"
            style={{ minWidth: "250px" }}
          >
								  
            <PlayerPool
              id="playerPool"
              players={availablePlayers}
              loading={isLoadingPlayers}
            />

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-3">
									   
              <ActionButtons
                onSharePitches={handleShareBothPitches}
                onClearPitch={clearPitch}
                onSaveMatch={handleSaveMatch}
                onAlignPlayers={alignClosePlayers}
                onSwitchTeams={switchTeams}
                onOpenTeamGenerator={() => setIsTeamGeneratorOpen(true)}
                onQuickGenerateTeams={() => {
                  const { selectedPlayers, playerPositions } = teamGenState;
                  if (!selectedPlayers || selectedPlayers.length < 2) return;
                  const playersByPosition = {};
                  selectedPlayers.forEach((player) => {
                    const position = playerPositions[player.id] || "Orta Saha";
                    if (!playersByPosition[position]) {
                      playersByPosition[position] = [];
                    }
                    playersByPosition[position].push({ ...player, position });
                  });
                  const teamA = [];
                  const teamB = [];
                  const teamAMidfielders =
                    Math.ceil(playersByPosition["Orta Saha"]?.length / 2) || 0;
                  const teamBMidfielders =
                    Math.floor(playersByPosition["Orta Saha"]?.length / 2) || 0;
                  const teamAForwards =
                    Math.ceil(playersByPosition["Forvet"]?.length / 2) || 0;
                  const teamBForwards =
                    Math.floor(playersByPosition["Forvet"]?.length / 2) || 0;
                  Object.entries(playersByPosition).forEach(
                    ([position, players]) => {
                      const shuffledPlayers = [...players].sort(
                        () => Math.random() - 0.5
                      );
                      shuffledPlayers.forEach((player, index) => {
                        const team = index % 2 === 0 ? teamA : teamB;
                        if (position === "Bek") {
                          const existingBeks = team.filter(
                            (p) => p.position === "Bek"
                          );
                          const xCoordinate =
                            existingBeks.length % 2 === 0 ? 80 : 20;
                          team.push({ ...player, xCoordinate });
                        } else if (position === "Orta Saha") {
                          const existingMidfielders = team.filter(
                            (p) => p.position === "Orta Saha"
                          );
                          let xCoordinate;
                          if (team === teamA) {
                            if (teamAMidfielders === 1) {
                              xCoordinate = 50;
                            } else {
                              xCoordinate =
                                existingMidfielders.length === 0 ? 70 : 30;
                            }
                          } else {
                            if (teamBMidfielders === 1) {
                              xCoordinate = 50;
                            } else {
                              xCoordinate =
                                existingMidfielders.length === 0 ? 70 : 30;
                            }
                          }
                          team.push({ ...player, xCoordinate });
                        } else if (position === "Forvet") {
                          const existingForwards = team.filter(
                            (p) => p.position === "Forvet"
                          );
                          let xCoordinate;
                          if (team === teamA) {
                            if (teamAForwards === 1) {
                              xCoordinate = 50;
                            } else if (teamAForwards === 2) {
                              xCoordinate =
                                existingForwards.length === 0 ? 70 : 30;
                            } else {
                              if (existingForwards.length === 0)
                                xCoordinate = 30;
                              else if (existingForwards.length === 1)
                                xCoordinate = 50;
                              else xCoordinate = 70;
                            }
                          } else {
                            if (teamBForwards === 1) {
                              xCoordinate = 50;
                            } else if (teamBForwards === 2) {
                              xCoordinate =
                                existingForwards.length === 0 ? 70 : 30;
                            } else {
                              if (existingForwards.length === 0)
                                xCoordinate = 30;
                              else if (existingForwards.length === 1)
                                xCoordinate = 50;
                              else xCoordinate = 70;
                            }
                          }
                          team.push({ ...player, xCoordinate });
                        } else {
                          team.push(player);
                        }
                      });
                    }
                  );
                  handleTeamGeneratorTeams(teamA, teamB);
                }}
                isSharing={isSharing}
                isSavingMatch={isSavingMatch}
                isAligningPlayers={isAligningPlayers}
                isSwitchingTeams={isSwitchingTeams}
                hasPlayersOnPitch={
                  Object.keys(playersOnPitchA).length > 0 ||
                  Object.keys(playersOnPitchB).length > 0
                }
                selectedMatchId={selectedMatchId}
                canQuickGenerate={
                  teamGenState.selectedPlayers &&
                  teamGenState.selectedPlayers.length >= 2
                }
                isChemistryVisible={isChemistryVisible}
                onToggleChemistry={handleToggleChemistry}
              />
			 
		  
			  

              <MatchControls
                matches={matches}
                selectedMatchId={selectedMatchId}
                onMatchSelected={(matchId) => {
                  setSelectedMatchId(matchId);
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

          <div className="lg:w-3/4 flex flex-col gap-4">
								  
            <div
              ref={pitchesContainerRef}
              className="flex flex-col sm:flex-row gap-4"
            >
									   
              <PitchDisplay
                pitchId="pitchAreaA"
                teamId="A"
                playersOnThisPitch={playersOnPitchA}
                pitchRef={pitchRefA}
                pairStats={pairStatsA} // YENİ: Prop'u iletiyoruz
                isChemistryVisible={isChemistryVisible}
              />
									   
              <PitchDisplay
                pitchId="pitchAreaB"
                teamId="B"
							   
																						
							  
											
											
												   
																						 
												   
																						  
												
																					  
												
																					   
																	 
														
																		   
															 
								   
																			 
																				 
															 
																		
																	 
										 
														  
																				  
																			 
																		  
																			   
																		   
										 
													   
															
																	   
															  
												  
														  
																						   
										   
											   
																	   
															  
												  
														  
																						   
										   
										
																			 
																	   
																			
																		
										 
													   
															
																	
															  
																		   
														  
																						
												  
																			   
																 
																					
																 
																   
										   
											   
																	
															  
																		   
														  
																						
												  
																			   
																 
																					
																 
																   
										   
										
																			 
											
														 
									 
									
							   
							 
																  
						  
											 
													 
															 
														   
										   
																	 
                playersOnThisPitch={playersOnPitchB}
                pitchRef={pitchRefB}
                pairStats={pairStatsB} // YENİ: Prop'u iletiyoruz
										  
														  
																   
						 
                isChemistryVisible={isChemistryVisible}
																 
              />
									
            </div>

            {/* YENİ: Takım Kimyası Göstergesi */}
            {isChemistryVisible && (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											
                                <div className="bg-gray-800 p-3 rounded-lg text-center">
												 
                                    <h4 className="text-sm font-bold text-red-400">TAKIM A KİMYASI</h4>
									
					   
												 
                                    {teamAChemistry.isLoading ? (
                                        <div className="h-8 flex items-center justify-center">
														   
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-400"></div>
														
                                        </div>
                                    ) : (
																		   
                                        <p className="text-3xl font-bold text-white">{teamAChemistry.value.toFixed(1)}%</p>
																	   
						  
														  
							 
														
																	
																   
												
											  
							 
						 
																				   
							   
                                    )}
                                </div>
					
											  
					  
											
                                <div className="bg-gray-800 p-3 rounded-lg text-center">
												 
                                    <h4 className="text-sm font-bold text-blue-400">TAKIM B KİMYASI</h4>
									
					   
												 
                                    {teamBChemistry.isLoading ? (
                                        <div className="h-8 flex items-center justify-center">
														   
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-400"></div>
														
                                        </div>
                                    ) : (
																		   
                                        <p className="text-3xl font-bold text-white">{teamBChemistry.value.toFixed(1)}%</p>
																	   
						  
														  
							 
														
																	
																   
												
											  
							 
						 
																				   
							   
                                    )}
                                </div>
					
											  
                            </div>
										 
					
                        )}
            {/* YENİ BÖLÜM SONU */}

								   
											
														
												  
															 
												  
														
												   
					
					 

            <div
              className="relative px-1 h-8"
              onMouseEnter={() => setIsPredictionTooltipVisible(true)}
              onMouseLeave={() => setIsPredictionTooltipVisible(false)}
            >
									   
              {prediction && (
                <>
												 
                  {isPredictionTooltipVisible && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 text-sm font-medium text-white bg-gray-700 rounded-lg shadow-xl z-50 text-left">
														   
                      <p className="font-bold mb-1">Nasıl Hesaplanır? 🧐</p>
											  
															   
					   
								  
											
								  
															
											
											  
															   
					   
						

										  
																			
																				
                      <p className="font-normal text-xs">
																
                        <p className="font-bold">Oyuncu Puanı:</p>
                        Her oyuncuya, geçmiş galibiyet oranına göre bir "Güç
																							 
                        Puanı" verilir. (Yeni oyunculara varsayılan bir puan
                        atanır).
                        <br />
                        <p className="font-bold">Takım Gücü:</p>
																						 
                        Takımdaki oyuncuların güç puanları toplanarak takımın
                        toplam gücü bulunur.
                        <br />
                        <p className="font-bold">Kazanma Olasılığı:</p>
                        Takımınızın gücü, iki takımın toplam gücüne oranlanarak
																						
                        kazanma yüzdesi hesaplanır.
                      </p>
																							  
                    </div>
                  )}
												 
                  <div className="w-full bg-gray-800 rounded-lg overflow-hidden flex text-sm font-bold shadow-lg h-full border-2 border-gray-700">
													  
                    <div
                      className="bg-red-600 text-white flex items-center justify-center transition-all duration-700 ease-out pl-2"
                      style={{ width: `${prediction.teamAWinPercentage}%` }}
															
								 
															  
																		  
																		   
													  
													
								   
                    >
														   
                      {prediction.teamAWinPercentage > 15 &&
                        `TAKIM A: ${prediction.teamAWinPercentage.toFixed(0)}%`}
						  
                    </div>
							 
							  
                    <div
                      className="bg-white text-black flex items-center justify-center transition-all duration-700 ease-out pr-2"
                      style={{ width: `${prediction.teamBWinPercentage}%` }}
																					 
																																
									
								
																		   
																	 
																		  
                    >
														   
                      {prediction.teamBWinPercentage > 15 &&
                        `TAKIM B: ${prediction.teamBWinPercentage.toFixed(0)}%`}
															  
																		  
																		   
													  
													
								   
							 
																						 
								   
						  
                    </div>
												   
                  </div>
											  
                </>
              )}
									
            </div>
							   
          </div>
						  
        </div>

					  
												  
																			 
																			  
				   
									 
						  
														   
																																														   
																						   
																	
																			   
																							  
																						  
											 
										  
																			   
																								
														  
										  
																					   
																									 
																 
									 
								  
									   
							 
																																						   
								  
																																			 
																					   
							   
																	   
																							
									
								  
																																		   
																					   
							   
																	   
																							
									
								 
						   
					   
						
					 
				  

        <footer className="mt-8 text-center text-gray-400 text-sm">
          Güneş Tan Cebeci | 2025
        </footer>
						
        <TeamGenerator
          isOpen={isTeamGeneratorOpen}
          onClose={handleTeamGeneratorClose}
          players={allPlayers}
          onTeamsGenerated={(teamA, teamB) => {
            handleTeamGeneratorTeams(teamA, teamB);
            setTeamGenState((prev) => ({
              ...prev,
              generatedTeams: { teamA, teamB },
            }));
          }}
          onStateChange={handleTeamGenStateChange}
        />
					 
      </div>
				   
      <DragOverlay
        dropAnimation={null}
        zIndex={100}
        modifiers={[snapCenterToCursor]}
      >
						
        {activeId && activePlayerBaseData ? (
          <PlayerMarker
            id={`overlay-${activeId}`}
            name={activePlayerBaseData.name}
            team={
              playersOnPitchA[activeId]
                ? "A"
                : playersOnPitchB[activeId]
                ? "B"
                : null
            }
            isOverlay
          />
        ) : null}
					 
      </DragOverlay>
				
    </DndContext>
  );
};

export default Carpet;
