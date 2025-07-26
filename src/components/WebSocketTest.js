import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import confetti from "canvas-confetti";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";
const WS_ENDPOINT = `${API_BASE_URL}/ws`;
const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

const RANDOM_COLORS = [
  "bg-red-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

const getRandomColorClass = () => {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
};

const getConsistentColorClass = (identifier) => {
  const colors = [
    "bg-red-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

function WebSocketTest() {
  const { token, user, isLoading: authLoading } = useAuth();
  const [isPlayerPoolModalOpen, setIsPlayerPoolModalOpen] = useState(false);
  const [selectedPlayersForDrafting, setSelectedPlayersForDrafting] = useState(
    []
  );
  const [stompClient, setStompClient] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [createRoomLoading, setCreateRoomLoading] = useState(false);
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState("");
  const [joinRoomLoading, setJoinRoomLoading] = useState(false);
  const [userColors, setUserColors] = useState({});
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [teamACaptain, setTeamACaptain] = useState("");
  const [teamBCaptain, setTeamBCaptain] = useState("");
  // Takım Seçimi State'leri
  const [selectionInProgress, setSelectionInProgress] = useState(false);
  const [availablePlayersForSelection, setAvailablePlayersForSelection] =
    useState([]);
  const [teamASelectedPlayers, setTeamASelectedPlayers] = useState({});
  const [teamBSelectedPlayers, setTeamBSelectedPlayers] = useState({});
  const [currentPlayerSelectionTurn, setCurrentPlayerSelectionTurn] =
    useState("");
  const [selectionStatusMessage, setSelectionStatusMessage] = useState("");
  const [allPlayersForSelection, setAllPlayersForSelection] = useState([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // *** YENİ EKLENEN STATE ***
  // Son seçilen oyuncunun ID'sini tutmak için state
  const [lastSelectedPlayerId, setLastSelectedPlayerId] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToBottomDesktop = () => {
    const chatContainer = document.querySelector(".desktop-chat-scroll");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
    scrollToBottomDesktop();
  }, [receivedMessages]);

  // Hata ayıklama için user objesini ve yüklenme durumunu takip edelim
  useEffect(() => {
    console.log(
      `[DEBUG] authLoading: ${authLoading}, user:`,
      user,
      `token: ${token ? "Mevcut" : "Yok"}`
    );
  }, [authLoading, user, token]);

  useEffect(() => {
    if (authLoading) {
      console.log("[DEBUG] AuthContext hala yükleniyor...");
      return;
    }

    if (!user?.email && token) {
      console.log(
        "[DEBUG] AuthContext'te user bilgisi henüz yüklenemedi ancak token mevcut. Tekrar denenecek."
      );
      return;
    }

    // WebSocket bağlantısını yöneten useEffect bloğu.
    // user objesi tamamen yüklendiğinde ve token varsa bağlantıyı başlatır.
    if (
      !authLoading &&
      user?.email &&
      token &&
      (!stompClient || !stompClient.connected)
    ) {
      console.log(
        "AuthContext'ten user bilgisi geldi ve geçerli. WebSocket bağlantısı başlatılıyor..."
      );
      const client = startConnection();

      // Cleanup fonksiyonu: component unmount edildiğinde veya bağımlılıklar değiştiğinde mevcut bağlantıyı keser.
      return () => {
        if (client && client.active) {
          console.log("[CLEANUP] WebSocket cleanup: Bağlantı kapatılıyor.");
          client.deactivate();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token]); // Bu effect sadece auth state'i değiştiğinde çalışmalı

  const startConnection = () => {
    // startConnection çağrıldığında user ve token'ın geçerliliğini kontrol et
    if (!token || !user?.email) {
      console.error("Start connection aborted: Missing token or user info.");
      toast.error(
        "JWT token veya kullanıcı bilgisi mevcut değil. WebSocket bağlantısı kurulamıyor."
      );
      return null;
    }

    // Eğer stompClient zaten bağlıysa, yeni bir bağlantı kurmaya çalışma
    if (stompClient && stompClient.connected) {
      toast.info("Zaten aktif bir bağlantı var.");
      return stompClient;
    }

    console.log(`Attempting to connect WebSocket for user: ${user.email}`);
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        // console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      console.log("STOMP bağlantısı başarılı!");
      toast.success("STOMP bağlantısı başarılı!");
      setIsConnected(true);
      setStompClient(client); // Bağlantı başarılı olunca client'ı state'e set et

      // Ortak selamlaşma kanalı (eğer backend'de hala kullanılıyorsa)
      client.subscribe("/topic/greetings", (message) => {
        setReceivedMessages((prevMessages) => [
          ...prevMessages,
          {
            sender: "Sistem",
            content: message.body,
            type: "system",
            colorClass: "bg-yellow-700",
          },
        ]);
      });

      // Oda oluşturma/katılma onayları
      client.subscribe("/user/queue/room-created", (message) => {
        const newRoomCode = message.body;
        setRoomCode(newRoomCode);
        toast.success(`Oda başarıyla oluşturuldu! Oda Kodu: ${newRoomCode}`);
        setReceivedMessages((prevMessages) => [
          ...prevMessages,
          {
            sender: "Sistem",
            content: `Yeni oda oluşturuldu: ${newRoomCode}`,
            type: "system",
            colorClass: "bg-yellow-700",
          },
        ]);
        setCreateRoomLoading(false);
      });
      client.subscribe("/user/queue/room-joined", (message) => {
        const joinedRoomCode = message.body;
        setRoomCode(joinedRoomCode);
        toast.success(
          `Odaya başarıyla katıldınız! Oda Kodu: ${joinedRoomCode}`
        );
        setReceivedMessages((prevMessages) => [
          ...prevMessages,
          {
            sender: "Sistem",
            content: `Odaya katıldınız: ${joinedRoomCode}`,
            type: "system",
            colorClass: "bg-yellow-700",
          },
        ]);
        setJoinRoomLoading(false);
      });
      client.subscribe("/user/queue/room-join-error", (message) => {
        const errorMessage = message.body;
        toast.error(`Odaya katılım başarısız: ${errorMessage}`);
        setJoinRoomLoading(false);
        setCreateRoomLoading(false);
      });
    };

    client.onDisconnect = () => {
      console.log("STOMP bağlantısı kesildi!");
      toast.info("STOMP bağlantısı kesildi!");
      setIsConnected(false);
      setRoomCode("");
      setJoinRoomCodeInput("");
      setReceivedMessages([]);
      setUsersInRoom([]);
      setTeamACaptain("");
      setTeamBCaptain("");
      setUserColors({});
      setSelectionInProgress(false);
      setAvailablePlayersForSelection([]);
      setTeamASelectedPlayers({});
      setTeamBSelectedPlayers({});
      setCurrentPlayerSelectionTurn("");
      setSelectionStatusMessage("");
      setAllPlayersForSelection([]);
      // Bağlantı kesildiğinde stompClient'ı null'a çek, cleanup useEffect'i bu durumu zaten yönetecek
      setStompClient(null);
    };

    client.onStompError = (frame) => {
      console.error("Broker Hatası: " + frame.headers["message"]);
      console.error("Detaylar: " + frame.body);
      toast.error(`Broker Hatası: ${frame.headers["message"]}`);
      toast.error(`Detaylar: ${frame.body}`);
    };

    client.activate();
    return client;
  };

  const endConnection = () => {
    if (stompClient && stompClient.connected) {
      stompClient.deactivate();
      // onDisconnect callback'i diğer state'leri temizleyecek
      setTimeout(() => {
        startConnection();
      }, 1000);
    } else {
      toast.warn("Kesilecek aktif bir bağlantı yok.");
    }
  };

  // Oda bazlı abonelikler ve güncellemeler için ayrı useEffect
  useEffect(() => {
    if (stompClient && stompClient.connected && roomCode && user?.email) {
      const currentUserEmail = user.email; // Gereksiz null check'i önlemek için değişkene al

      console.log(
        `Subscribing to /topic/chat/${roomCode} for user: ${currentUserEmail}`
      );
      const chatSubscription = stompClient.subscribe(
        `/topic/chat/${roomCode}`,
        (message) => {
          const chatMessage = JSON.parse(message.body);
          const isCurrentUser = chatMessage.sender === currentUserEmail;
          const messageType =
            chatMessage.sender === "Sistem"
              ? "system"
              : isCurrentUser
              ? "sent"
              : "received";

          // Kullanıcılara renk atama
          let assignedColorClass;
          if (messageType === "system") {
            assignedColorClass = "bg-yellow-700";
          } else if (isCurrentUser) {
            assignedColorClass = "bg-blue-600";
          } else {
            if (!userColors[chatMessage.sender]) {
              setUserColors((prevColors) => {
                // Sadece yeni kullanıcılar için renk ata
                if (!prevColors[chatMessage.sender]) {
                  return {
                    ...prevColors,
                    [chatMessage.sender]: getRandomColorClass(),
                  };
                }
                return prevColors;
              });
            }
            // assignedColorClass = userColors[chatMessage.sender] || getRandomColorClass(); // Fallback
            assignedColorClass = getConsistentColorClass(chatMessage.sender);
          }

          setReceivedMessages((prevMessages) => [
            ...prevMessages,
            {
              ...chatMessage,
              type: messageType,
              colorClass: assignedColorClass,
            },
          ]);
          console.log("Received message:", {
            ...chatMessage,
            type: messageType,
            colorClass: assignedColorClass,
          });
        }
      );

      console.log(`Subscribing to /topic/room-status/${roomCode}`);
      const roomStatusSubscription = stompClient.subscribe(
        `/topic/room-status/${roomCode}`,
        (message) => {
          const roomStatus = JSON.parse(message.body);
          console.log("Received room status (from topic):", roomStatus);
          
          // *** GÜNCELLENEN BÖLÜM BAŞLANGICI ***
          const newTeamA = roomStatus.teamASelectedPlayers || {};
          const newTeamB = roomStatus.teamBSelectedPlayers || {};

          setTeamASelectedPlayers((prevTeamA) => {
            const prevTeamAIds = Object.keys(prevTeamA);
            const newTeamAIds = Object.keys(newTeamA);
            const addedPlayerId = newTeamAIds.find(
              (id) => !prevTeamAIds.includes(id)
            );
            if (addedPlayerId) {
              setLastSelectedPlayerId(addedPlayerId);
            }
            return newTeamA;
          });

          setTeamBSelectedPlayers((prevTeamB) => {
            const prevTeamBIds = Object.keys(prevTeamB);
            const newTeamBIds = Object.keys(newTeamB);
            const addedPlayerId = newTeamBIds.find(
              (id) => !prevTeamBIds.includes(id)
            );
            if (addedPlayerId) {
              setLastSelectedPlayerId(addedPlayerId);
            }
            return newTeamB;
          });
          
          setUsersInRoom(roomStatus.usersInRoom || []);
          setTeamACaptain(roomStatus.teamACaptainEmail || "");
          setTeamBCaptain(roomStatus.teamBCaptainEmail || "");
          setSelectionInProgress(roomStatus.selectionInProgress || false);
          setAvailablePlayersForSelection(
            roomStatus.availablePlayersForSelection || []
          );
          setCurrentPlayerSelectionTurn(
            roomStatus.currentPlayerSelectionTurnEmail || ""
          );
          setSelectionStatusMessage(roomStatus.selectionStatusMessage || "");
          // *** GÜNCELLENEN BÖLÜM SONU ***
        }
      );

      console.log(`Subscribing to /user/queue/room-status/${roomCode}`);
      const userRoomStatusSubscription = stompClient.subscribe(
        `/user/queue/room-status/${roomCode}`,
        (message) => {
          const roomStatus = JSON.parse(message.body);
          console.log("Received room status (from user queue):", roomStatus);

          // *** GÜNCELLENEN BÖLÜM BAŞLANGICI ***
          const newTeamA = roomStatus.teamASelectedPlayers || {};
          const newTeamB = roomStatus.teamBSelectedPlayers || {};

          setTeamASelectedPlayers((prevTeamA) => {
            const prevTeamAIds = Object.keys(prevTeamA);
            const newTeamAIds = Object.keys(newTeamA);
            const addedPlayerId = newTeamAIds.find(
              (id) => !prevTeamAIds.includes(id)
            );
            if (addedPlayerId) {
              setLastSelectedPlayerId(addedPlayerId);
            }
            return newTeamA;
          });

          setTeamBSelectedPlayers((prevTeamB) => {
            const prevTeamBIds = Object.keys(prevTeamB);
            const newTeamBIds = Object.keys(newTeamB);
            const addedPlayerId = newTeamBIds.find(
              (id) => !prevTeamBIds.includes(id)
            );
            if (addedPlayerId) {
              setLastSelectedPlayerId(addedPlayerId);
            }
            return newTeamB;
          });

          setUsersInRoom(roomStatus.usersInRoom || []);
          setTeamACaptain(roomStatus.teamACaptainEmail || "");
          setTeamBCaptain(roomStatus.teamBCaptainEmail || "");
          setSelectionInProgress(roomStatus.selectionInProgress || false);
          setAvailablePlayersForSelection(
            roomStatus.availablePlayersForSelection || []
          );
          setCurrentPlayerSelectionTurn(
            roomStatus.currentPlayerSelectionTurnEmail || ""
          );
          setSelectionStatusMessage(roomStatus.selectionStatusMessage || "");
           // *** GÜNCELLENEN BÖLÜM SONU ***
        }
      );

      // Odaya girildiğinde mevcut durumu istemek için gecikmeli bir istek gönder
      setTimeout(() => {
        if (stompClient.connected) {
          stompClient.publish({
            destination: `/app/chat/requestRoomStatus/${roomCode}`,
          });
          console.log(`Requested room status for ${roomCode}`);
        }
      }, 500); // 500ms bekleme, aboneliklerin tamamlanmasını garantilemek için

      // Cleanup
      return () => {
        console.log(`Unsubscribing from /topic/chat/${roomCode}`);
        chatSubscription.unsubscribe();
        console.log(`Unsubscribing from /topic/room-status/${roomCode}`);
        roomStatusSubscription.unsubscribe();
        console.log(`Unsubscribing from /user/queue/room-status/${roomCode}`);
        userRoomStatusSubscription.unsubscribe();
      };
    } else {
      console.log(
        "Skipping subscription: STOMP Client not ready, not connected, no roomCode, or user/user email not available."
      );
    }
  }, [stompClient, roomCode, user]); // Sadece client veya oda değiştiğinde çalışsın

  // Tüm oyuncuları backend'den çekmek için useEffect
  useEffect(() => {
    const fetchAllPlayers = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/players`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAllPlayersForSelection(data);
      } catch (error) {
        console.error("Tüm oyuncular çekilirken hata:", error);
        toast.error("Oyuncu listesi yüklenemedi.");
      }
    };

    fetchAllPlayers();
  }, []);

  const sendMessage = () => {
    if (!stompClient || !stompClient.connected) {
      toast.warn("STOMP istemcisi bağlı değil, mesaj gönderilemedi.");
      return;
    }
    if (!roomCode) {
      toast.error(
        "Mesaj göndermek için önce bir oda oluşturmalı veya odaya katılmalısınız."
      );
      return;
    }
    if (!inputMessage.trim()) {
      toast.warn("Boş mesaj gönderilemez.");
      return;
    }
    stompClient.publish({
      destination: `/app/chat/sendMessage/${roomCode}`,
      body: JSON.stringify({ content: inputMessage }),
    });
    setInputMessage("");
  };

  const createRoom = () => {
    if (!stompClient || !stompClient.connected) {
      // YENİ: Bağlantı yoksa yeniden başlat
      const client = startConnection();
      if (!client) return; // Eğer hala başarısızsa dur
      setStompClient(client); // Yeni bağlantıyı state'e yaz
      toast.info(
        "WebSocket bağlantısı yeniden başlatıldı, lütfen tekrar deneyin."
      );

      return; // Şu anlık ilk seferde oluşturma yapmayacağız
      // toast.warn("Oda oluşturmak için önce WebSocket bağlantısını başlatın.");
      // return;
    }
    if (roomCode) {
      toast.info(
        `Zaten bir odadasınız: ${roomCode}. Yeni bir oda oluşturmak için mevcut bağlantıyı kesin.`
      );
      return;
    }

    // user?.roles?.includes('ADMIN') kontrolü, user'ın null/undefined olması durumunu da kapsar
    if (!user?.roles?.includes("ADMIN")) {
      toast.error(
        "Bu işlemi yapmak için yetkiniz bulunmamaktadır. Lütfen yöneticinizden bir oda kodu alın."
      );
      return;
    }

    setCreateRoomLoading(true);
    stompClient.publish({ destination: "/app/chat/createRoom" });
  };

  const handleJoinRoom = () => {
    // isDraftingFinished == false;
    if (!stompClient || !stompClient.connected) {
      toast.warn("Odaya katılmak için önce WebSocket bağlantısını başlatın.");
      return;
    }
    if (!joinRoomCodeInput.trim()) {
      toast.error("Lütfen katılmak istediğiniz oda kodunu girin.");
      return;
    }
    if (joinRoomCodeInput.trim() === roomCode) {
      toast.info(`Zaten bu odadasınız: ${roomCode}.`);
      return;
    }
    if (roomCode) {
      toast.info(
        `Zaten bir odadasınız: ${roomCode}. Başka bir odaya katılmak için mevcut bağlantıyı kesin.`
      );
      return;
    }

    setJoinRoomLoading(true);
    stompClient.publish({
      destination: `/app/chat/joinRoom/${joinRoomCodeInput.trim()}`,
    });
  };

  const handleSetCaptains = () => {
    if (!stompClient || !stompClient.connected) {
      toast.error("Kaptanları ayarlamak için bir odaya bağlı olmanız gerekir.");
      return;
    }
    if (!user?.roles?.includes("ADMIN")) {
      toast.error(
        "Kaptanları ayarlamak için yönetici yetkiniz bulunmamaktadır."
      );
      return;
    }
    if (!teamACaptain || !teamBCaptain) {
      toast.error("Lütfen her iki takım için de kaptan seçin.");
      return;
    }
    if (teamACaptain === teamBCaptain) {
      toast.error("Takım A ve Takım B kaptanları aynı kişi olamaz.");
      return;
    }
    stompClient.publish({
      destination: `/app/chat/setCaptains/${roomCode}`,
      body: JSON.stringify({
        teamACaptainEmail: teamACaptain,
        teamBCaptainEmail: teamBCaptain,
      }),
    });
    toast.success("Kaptanlar başarıyla ayarlandı!");
    setIsPlayerPoolModalOpen(true);
  };

  const handleStartSelection = () => {
    if (!stompClient || !stompClient.connected) {
      toast.error(
        "Takım seçme sürecini başlatmak için bir odaya bağlı olmanız gerekir."
      );
      return;
    }
    if (!user?.roles?.includes("ADMIN")) {
      toast.error(
        "Takım seçme sürecini başlatmak için yönetici yetkiniz bulunmamaktadır."
      );
      return;
    }
    if (!teamACaptain || !teamBCaptain) {
      toast.error(
        "Takım seçimi başlatılamadı. Önce takım kaptanlarını belirlemelisiniz."
      );
      return;
    }
    if (allPlayersForSelection.length === 0) {
      toast.error(
        "Seçilecek oyuncu bulunamadı. Lütfen oyuncu listesinin yüklendiğinden emin olun."
      );
      return;
    }
    if (selectionInProgress) {
      toast.warn("Takım seçme süreci zaten devam ediyor.");
      return;
    }
    if (selectedPlayersForDrafting.length < 2) {
      toast.error("En az 2 oyuncu seçmelisiniz.");
      return;
    }

    console.log("Starting team selection process...");
    console.log(`Room Code: ${roomCode}`);
    console.log(`Team A Captain: ${teamACaptain}`);
    console.log(`Team B Captain: ${teamBCaptain}`);

    stompClient.publish({
      destination: `/app/chat/startSelection/${roomCode}`,
      body: JSON.stringify({ playersToSelectFrom: selectedPlayersForDrafting }),
    });
    toast.info("Takım seçme süreci başlatılıyor...");
  };

  const handleSelectPlayer = (playerId) => {
    if (!stompClient || !stompClient.connected) {
      toast.error("Oyuncu seçmek için bir odaya bağlı olmanız gerekir.");
      return;
    }
    const isCurrentPlayerCaptain =
      user.email === teamACaptain || user.email === teamBCaptain;
    const isCurrentPlayerTurn = user.email === currentPlayerSelectionTurn;
    const canSelectPlayers = isCurrentPlayerCaptain && isCurrentPlayerTurn;

    if (!isCurrentPlayerCaptain) {
      toast.error("Sadece kaptanlar oyuncu seçimi yapabilir.");
      return;
    }
    if (!isCurrentPlayerTurn) {
      toast.error("Şu anda seçim sırası sizde değil.");
      return;
    }
    if (!selectionInProgress) {
      toast.error("Takım seçme süreci şu anda aktif değil.");
      return;
    }

    // console.log(`user.email: ${user.email}, teamACaptain: ${teamACaptain}, teamBCaptain: ${teamBCaptain}`);
    console.log(`currentPlayerSelectionTurn: ${currentPlayerSelectionTurn}`);

    stompClient.publish({
      destination: `/app/chat/selectPlayer/${roomCode}`,
      body: JSON.stringify({ playerId: String(playerId) }),
    });
  };

  const isCurrentPlayerCaptain =
    user?.email === teamACaptain || user?.email === teamBCaptain;
  const isCurrentPlayerTurn = user?.email === currentPlayerSelectionTurn;
  const canSelectPlayers =
    isCurrentPlayerCaptain && isCurrentPlayerTurn && selectionInProgress;
  const teamASelectedCount = Object.keys(teamASelectedPlayers).length;
  const teamBSelectedCount = Object.keys(teamBSelectedPlayers).length;

  // Mobile View specific variables
  const teamACaptainName = teamACaptain
    ? teamACaptain.split("@")[0]
    : "Belirlenmedi";
  const teamBCaptainName = teamBCaptain
    ? teamBCaptain.split("@")[0]
    : "Belirlenmedi";

  // *** YENİ DEĞİŞİKLİK ***
  // Takım seçimi bitti mi kontrolü
  const isDraftingFinished =
    teamASelectedCount === 7 && teamBSelectedCount === 7;

  // Havai fişek efekti
  const fireConfetti = () => {
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.6 },
    });
  };

  // useEffect'i koşulsuz çağır, koşulu içinde denetle
  useEffect(() => {
    if (isDraftingFinished) {
      fireConfetti();
      setLastSelectedPlayerId(null);
      toast.success("Takım seçimi tamamlandı! 🎉");
    }
  }, [isDraftingFinished]); // isDraftingFinished değiştiğinde çalıştır

  // Vurgulama mantığı güncellendi: Seçim bitmişse vurgulama yapılmaz
  const isTeamATurn =
    selectionInProgress &&
    !isDraftingFinished &&
    currentPlayerSelectionTurn === teamACaptain;
  const isTeamBTurn =
    selectionInProgress &&
    !isDraftingFinished &&
    currentPlayerSelectionTurn === teamBCaptain;
  // *** YENİ DEĞİŞİKLİK SONU ***

  if (authLoading) {
    return (
      <div className="text-center text-white p-10">
        Kullanıcı bilgileri yükleniyor...
      </div>
    );
  }
  if (!user || !user.email || !token) {
    return (
      <div className="text-center text-red-400 p-10">
        Giriş yapmadan bu sayfaya erişemezsiniz.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:flex flex-col p-4 flex-grow">
        <h1 className="text-3xl font-bold text-center mb-4">
          Takım Kurma Odası
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-grow">
          {/* Sol Panel: Oda Kontrolleri */}
          <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg flex flex-col space-y-4">
            <h2 className="text-xl font-semibold border-b border-gray-600 pb-2">
              Kontrol Paneli
            </h2>
            {!roomCode ? (
              <>
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Oda Oluştur (Admin)
                  </h3>
                  <button
                    onClick={createRoom}
                    disabled={
                      createRoomLoading || !user?.roles?.includes("ADMIN")
                    }
                    className={`w-full px-4 py-2 rounded-lg font-semibold transition duration-300 ${
                      !user?.roles?.includes("ADMIN")
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {createRoomLoading
                      ? "Oluşturuluyor..."
                      : "Yeni Oda Oluştur"}
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Odaya Katıl</h3>
                  <div className="flex">
                    <input
                      type="text"
                      value={joinRoomCodeInput}
                      onChange={(e) => setJoinRoomCodeInput(e.target.value)}
                      placeholder="Oda Kodu"
                      className="flex-grow p-2 bg-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleJoinRoom}
                      disabled={joinRoomLoading || !joinRoomCodeInput.trim()}
                      className={`px-4 py-2 rounded-r-lg font-semibold transition duration-300 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                      {joinRoomLoading ? "Katılıyor..." : "Katıl"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-lg font-semibold">
                  Oda Kodu:{" "}
                  <span className="text-yellow-400 font-mono">{roomCode}</span>
                </p>
                <button
                  onClick={endConnection}
                  className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
                >
                  Odadan Ayrıl
                </button>
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium mt-4">
                Odaki Kullanıcılar ({usersInRoom.length})
              </h3>
              <ul className="list-disc list-inside text-gray-300">
                {usersInRoom.map((userEmail, index) => (
                  <li key={index}>{userEmail.split("@")[0]}</li>
                ))}
              </ul>
            </div>

            {user?.roles?.includes("ADMIN") && roomCode && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium mt-4">Kaptan Seçimi</h3>
                <div>
                  <label
                    htmlFor="teamA_captain"
                    className="block text-sm font-medium text-gray-400"
                  >
                    Takım A Kaptanı
                  </label>
                  <select
                    id="teamA_captain"
                    value={teamACaptain}
                    onChange={(e) => setTeamACaptain(e.target.value)}
                    className="w-full p-2 bg-gray-700 rounded-lg mt-1"
                  >
                    <option value="">Seçiniz...</option>
                    {usersInRoom.map((userEmail) => (
                      <option key={userEmail} value={userEmail}>
                        {userEmail.split("@")[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="teamB_captain"
                    className="block text-sm font-medium text-gray-400"
                  >
                    Takım B Kaptanı
                  </label>
                  <select
                    id="teamB_captain"
                    value={teamBCaptain}
                    onChange={(e) => setTeamBCaptain(e.target.value)}
                    className="w-full p-2 bg-gray-700 rounded-lg mt-1"
                  >
                    <option value="">Seçiniz...</option>
                    {usersInRoom.map((userEmail) => (
                      <option key={userEmail} value={userEmail}>
                        {userEmail.split("@")[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSetCaptains}
                  disabled={!teamACaptain || !teamBCaptain}
                  className={`w-full px-4 py-2 rounded-lg font-semibold transition ${
                    !teamACaptain || !teamBCaptain
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Kaptanları Ayarla
                </button>
              </div>
            )}

            {user?.roles?.includes("ADMIN") &&
              roomCode &&
              teamACaptain &&
              teamBCaptain &&
              !selectionInProgress && (
                <button
                  onClick={handleStartSelection}
                  className="w-full mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
                >
                  Takım Seçimini Başlat
                </button>
              )}

            {isPlayerPoolModalOpen && (
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={() => setIsPlayerPoolModalOpen(false)}
              >
                <div
                  className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex justify-between items-center px-6 py-4 bg-gray-800 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">
                      Oyuncu Havuzu Seçimi
                    </h2>
                    <span className="text-sm text-gray-400">
                      Seçilen: {selectedPlayersForDrafting.length}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {allPlayersForSelection.map((player) => {
                      const isSelected = selectedPlayersForDrafting.some(
                        (p) => p.id === player.id
                      );
                      return (
                        <div
                          key={player.id}
                          onClick={() => {
                            setSelectedPlayersForDrafting((prev) => {
                              if (isSelected) {
                                return prev.filter((p) => p.id !== player.id);
                              } else {
                                return [...prev, player];
                              }
                            });
                          }}
                          className={`cursor-pointer border rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-200 ${
                            isSelected
                              ? "bg-green-600 border-green-400 text-white"
                              : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          <span className="truncate">{player.name}</span>
                          {isSelected && (
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={3}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 px-6 py-4 bg-gray-800 border-t border-gray-700">
                    <button
                      onClick={() => {
                        setSelectedPlayersForDrafting([]);
                      }}
                      className="text-sm px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300"
                    >
                      Sıfırla
                    </button>
                    <button
                      onClick={() => setIsPlayerPoolModalOpen(false)}
                      className="text-sm px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={() => setIsPlayerPoolModalOpen(false)}
                      className="text-sm px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold"
                    >
                      Seçimi Kaydet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Orta Panel: Seçim ve Takımlar */}
          <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg flex flex-col">
            <h2 className="text-xl font-semibold border-b border-gray-600 pb-2">
              Takım Seçimi
            </h2>
            {selectionInProgress ? (
              <>
                <p className="text-gray-300 mt-2">{selectionStatusMessage}</p>
                <p className="text-gray-300 mt-2">
                  Sıradaki:{" "}
                  <span className="font-bold text-green-400">
                    {currentPlayerSelectionTurn
                      ? currentPlayerSelectionTurn.split("@")[0]
                      : "Bekleniyor..."}
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-400">
                      Takım A ({teamASelectedCount}/7)
                    </h3>
                    {/* *** GÜNCELLENEN BÖLÜM BAŞLANGICI *** */}
                    <ul className="mt-2 space-y-1 text-gray-200">
                      {Object.values(teamASelectedPlayers).map((player) => (
                        <li
                          key={player.id}
                          className={`transition-all duration-500 rounded px-2 py-1 ${
                            player.id.toString() === lastSelectedPlayerId
                              ? "bg-green-600"
                              : "bg-transparent"
                          }`}
                        >
                          {player.name}
                        </li>
                      ))}
                    </ul>
                    {/* *** GÜNCELLENEN BÖLÜM SONU *** */}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-400">
                      Takım B ({teamBSelectedCount}/7)
                    </h3>
                    {/* *** GÜNCELLENEN BÖLÜM BAŞLANGICI *** */}
                    <ul className="mt-2 space-y-1 text-gray-200">
                      {Object.values(teamBSelectedPlayers).map((player) => (
                        <li
                          key={player.id}
                          className={`transition-all duration-500 rounded px-2 py-1 ${
                            player.id.toString() === lastSelectedPlayerId
                              ? "bg-green-600"
                              : "bg-transparent"
                          }`}
                        >
                          {player.name}
                        </li>
                      ))}
                    </ul>
                    {/* *** GÜNCELLENEN BÖLÜM SONU *** */}
                  </div>
                </div>

                <div className="mt-4 flex-grow overflow-y-auto">
                  <h3 className="text-lg font-semibold">
                    Seçilebilecek Oyuncular
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {availablePlayersForSelection.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handleSelectPlayer(player.id)}
                        disabled={!canSelectPlayers}
                        className={`p-2 rounded-md text-center transition ${
                          canSelectPlayers
                            ? "bg-gray-700 hover:bg-gray-600"
                            : "bg-gray-900 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : roomCode ? (
              <div>
                <p className="text-gray-300">
                  Takım A Kaptanı:{" "}
                  <span className="font-bold text-blue-400">
                    {teamACaptain ? teamACaptain.split("@")[0] : "Yok"}
                  </span>
                </p>
                <p className="text-gray-300">
                  Takım B Kaptanı:{" "}
                  <span className="font-bold text-red-400">
                    {teamBCaptain ? teamBCaptain.split("@")[0] : "Yok"}
                  </span>
                </p>
                <p className="mt-4 text-gray-400">
                  Takım seçimi henüz başlamadı.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-gray-400">
                Takım bilgilerini görmek için bir odaya katılın veya oluşturun.
              </p>
            )}
          </div>

          {/* Sağ Panel: Chat */}
          <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg flex flex-col h-[80vh]">
            <h2 className="text-xl font-semibold border-b border-gray-600 pb-2 mb-4">
              Sohbet
            </h2>
            <div className="flex-grow overflow-y-auto pr-2 stable-scrollbar desktop-chat-scroll">
              {receivedMessages.slice().map((msg, index) => {
                const isCurrentUserMsg = msg.sender === user?.email;
                const senderDisplayName = isCurrentUserMsg
                  ? "Sen"
                  : msg.sender.split("@")[0];
                const isSystemMessage = msg.sender === "Sistem";

                if (isSystemMessage) {
                  return (
                    <div key={index} className="flex justify-center my-2">
                      <div className="text-center text-xs text-yellow-400 bg-gray-700 rounded-full px-3 py-1">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className={`flex items-end mb-3 ${
                      isCurrentUserMsg ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isCurrentUserMsg && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${msg.colorClass}`}
                      >
                        <span className="text-white font-bold text-sm">
                          {msg.sender.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      {!isCurrentUserMsg && (
                        <p
                          className={`font-bold text-xs mb-1 text-left ${
                            msg.colorClass
                              ? msg.colorClass.replace("bg-", "text-")
                              : "text-gray-400"
                          }`}
                        >
                          {senderDisplayName}
                        </p>
                      )}
                      <div
                        className={`relative rounded-lg px-4 py-2 max-w-xs sm:max-w-md break-words ${
                          isCurrentUserMsg
                            ? "bg-blue-600 text-white"
                            : `${msg.colorClass || "bg-gray-700"} text-white`
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 flex">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder={
                  isConnected && roomCode
                    ? "Mesajınızı yazın..."
                    : "Bağlı değil"
                }
                className="flex-grow p-2 bg-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={!isConnected || !roomCode}
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !roomCode || !inputMessage.trim()}
                className={`px-4 py-2 rounded-r-lg font-semibold transition duration-300 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed`}
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="block md:hidden h-screen flex flex-col bg-gray-900">
        {!roomCode ? (
          // STAGE 1: Join Room Screen
          <div className="flex flex-col items-center justify-center h-full p-4">
            <h1 className="text-3xl font-bold text-center mb-8">
              Takım Kurma Odası
            </h1>
            <div className="w-full max-w-sm space-y-4">
              <div>
                <label htmlFor="join-room-mobile" className="sr-only">
                  Oda Kodu
                </label>
                <input
                  id="join-room-mobile"
                  type="text"
                  value={joinRoomCodeInput}
                  onChange={(e) => setJoinRoomCodeInput(e.target.value)}
                  placeholder="Oda Kodu Girin"
                  className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                />
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={joinRoomLoading || !joinRoomCodeInput.trim()}
                className="w-full px-4 py-3 rounded-lg font-semibold transition duration-300 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {joinRoomLoading ? "Katılıyor..." : "Odaya Katıl"}
              </button>
              {user?.roles?.includes("ADMIN") && (
                <button
                  onClick={createRoom}
                  disabled={createRoomLoading}
                  className="w-full px-4 py-3 rounded-lg font-semibold transition duration-300 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600"
                >
                  {createRoomLoading ? "Oluşturuluyor..." : "Yeni Oda Oluştur"}
                </button>
              )}
            </div>
          </div>
        ) : (
          // STAGE 2: In-Room Screen (Figma Design)
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-gray-800/80 backdrop-blur-sm shadow-lg flex-shrink-0">
              <p className="font-semibold">
                Oda:{" "}
                <span className="font-mono text-yellow-400">{roomCode}</span>
              </p>
              <button
                onClick={() => setIsDetailsModalOpen(true)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md font-semibold"
              >
                Detay
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col p-4 overflow-hidden">
              {/* Team Lists */}
              <div className="flex-shrink-0">
                <div
                  className={`p-4 bg-gray-800 rounded-lg mb-4 border-2 ${
                    isTeamATurn ? "border-blue-400" : "border-transparent"
                  } transition-all`}
                >
                  <h3 className="font-bold text-blue-400">
                    Takım A: {teamACaptainName} ({teamASelectedCount}/7)
                  </h3>
                  {/* *** GÜNCELLENEN BÖLÜM BAŞLANGICI *** */}
                  <p className="text-gray-300 text-sm break-words">
                    {Object.values(teamASelectedPlayers).length > 0
                      ? Object.values(teamASelectedPlayers).map(
                          (player, index) => (
                            <React.Fragment key={player.id}>
                              <span
                                className={`transition-all duration-300 rounded px-1 ${
                                  player.id.toString() ===
                                  lastSelectedPlayerId
                                    ? "bg-green-600"
                                    : ""
                                }`}
                              >
                                {player.name}
                              </span>
                              {index <
                              Object.values(teamASelectedPlayers).length -
                                1
                                ? ", "
                                : ""}
                            </React.Fragment>
                          )
                        )
                      : "Henüz oyuncu seçilmedi."}
                  </p>
                  {/* *** GÜNCELLENEN BÖLÜM SONU *** */}
                </div>
                <div
                  className={`p-4 bg-gray-800 rounded-lg mb-4 border-2 ${
                    isTeamBTurn ? "border-red-400" : "border-transparent"
                  } transition-all`}
                >
                  <h3 className="font-bold text-red-400">
                    Takım B: {teamBCaptainName} ({teamBSelectedCount}/7)
                  </h3>
                   {/* *** GÜNCELLENEN BÖLÜM BAŞLANGICI *** */}
                  <p className="text-gray-300 text-sm break-words">
                    {Object.values(teamBSelectedPlayers).length > 0
                      ? Object.values(teamBSelectedPlayers).map(
                          (player, index) => (
                            <React.Fragment key={player.id}>
                              <span
                                className={`transition-all duration-300 rounded px-1 ${
                                  player.id.toString() ===
                                  lastSelectedPlayerId
                                    ? "bg-green-600"
                                    : ""
                                }`}
                              >
                                {player.name}
                              </span>
                              {index <
                              Object.values(teamBSelectedPlayers).length -
                                1
                                ? ", "
                                : ""}
                            </React.Fragment>
                          )
                        )
                      : "Henüz oyuncu seçilmedi."}
                  </p>
                  {/* *** GÜNCELLENEN BÖLÜM SONU *** */}
                </div>
                <div className="text-gray-400 text-sm mb-2">
                  {availablePlayersForSelection.length > 0 ? (
                    <>
                      <span className="font-semibold text-gray-300">
                        Seçilebilecek Oyuncular:
                      </span>{" "}
                      {availablePlayersForSelection
                        .map((player) => player.name)
                        .join(", ")}
                    </>
                  ) : (
                    <span className="text-red-400"></span>
                  )}
                </div>
                <hr className="border-gray-700 mb-4" />
              </div>

              {/* Chat & Player Selection Area */}
              <div
                className="flex-grow overflow-y-auto pr-2 stable-scrollbar"
                id="mobile-chat-area"
              >
                <h2 className="text-xl font-semibold pb-2 mb-2 text-center text-gray-400">
                  Sohbet
                </h2>
                {receivedMessages.slice().map((msg, index) => {
                  const isCurrentUserMsg = msg.sender === user?.email;
                  const senderDisplayName = isCurrentUserMsg
                    ? "Sen"
                    : msg.sender.split("@")[0];
                  const isSystemMessage = msg.sender === "Sistem";

                  if (isSystemMessage) {
                    return (
                      <div key={index} className="flex justify-center my-2">
                        <div className="text-center text-xs text-yellow-400 bg-gray-700 rounded-full px-3 py-1">
                          {msg.content}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={index}
                      className={`flex items-end mb-3 ${
                        isCurrentUserMsg ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className="max-w-[80%]">
                        {!isCurrentUserMsg && (
                          <p
                            className={`font-bold text-xs mb-1 text-left ${
                              msg.colorClass
                                ? msg.colorClass.replace("bg-", "text-")
                                : "text-gray-400"
                            }`}
                          >
                            {senderDisplayName}
                          </p>
                        )}
                        <div
                          className={`relative rounded-lg px-3 py-2 break-words ${
                            isCurrentUserMsg
                              ? "bg-blue-600 text-white"
                              : `${msg.colorClass || "bg-gray-700"} text-white`
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="mt-4 flex-shrink-0">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder={
                    isConnected && roomCode
                      ? "Mesajınızı yazın..."
                      : "Bağlı değil"
                  }
                  className="w-full p-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!isConnected || !roomCode}
                />
              </div>
            </div>

            {/* Details Modal */}
            {isDetailsModalOpen && (
              <div
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                <div
                  className="bg-gray-800 rounded-lg p-6 w-full max-w-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">
                    Odadaki Aktif Kullanıcılar ({usersInRoom.length})
                  </h3>
                  <ul className="space-y-2 text-gray-300">
                    {usersInRoom.map((userEmail, index) => (
                      <li key={index} className="bg-gray-700 p-2 rounded-md">
                        {userEmail.split("@")[0]}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="w-full mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default WebSocketTest;