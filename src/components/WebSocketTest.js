import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../contexts/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const WS_URL_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const WS_ENDPOINT = `${WS_URL_BASE}/ws`;

const RANDOM_COLORS = [
    'bg-green-600',
    'bg-purple-600',
    'bg-indigo-600',
    'bg-pink-600',
    'bg-teal-600',
    'bg-red-600',
    'bg-orange-600',
    'bg-lime-600'
];

const getRandomColorClass = () => {
    return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
};

function WebSocketTest() {
    const { token, user, isLoading: authLoading } = useAuth();
    const [stompClient, setStompClient] = useState(null);
    const [inputMessage, setInputMessage] = useState('');
    const [receivedMessages, setReceivedMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [createRoomLoading, setCreateRoomLoading] = useState(false);
    const [joinRoomCodeInput, setJoinRoomCodeInput] = useState('');
    const [joinRoomLoading, setJoinRoomLoading] = useState(false);
    const [userColors, setUserColors] = useState({}); 
    
    const [usersInRoom, setUsersInRoom] = useState([]);
    const [teamACaptain, setTeamACaptain] = useState('');
    const [teamBCaptain, setTeamBCaptain] = useState('');

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [receivedMessages]);

    const startConnection = () => {
        if (!token) {
            toast.error("JWT token mevcut değil. WebSocket bağlantısı kurulamıyor.");
            return;
        }

        if (stompClient && stompClient.connected) {
            toast.info("Zaten aktif bir bağlantı var.");
            return;
        }

        const client = new Client({
            webSocketFactory: () => new SockJS(WS_ENDPOINT),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                // console.log('STOMP Debug:', str);
            },
        });

        client.onConnect = () => {
            console.log('STOMP bağlantısı başarılı!');
            toast.success('STOMP bağlantısı başarılı!');
            setIsConnected(true);

            client.subscribe('/topic/greetings', message => {
                setReceivedMessages(prevMessages => [...prevMessages, { sender: 'Sistem', content: message.body, type: 'system', colorClass: 'bg-yellow-700' }]);
            });

            client.subscribe('/user/queue/room-created', message => {
                const newRoomCode = message.body;
                setRoomCode(newRoomCode);
                toast.success(`Oda başarıyla oluşturuldu! Oda Kodu: ${newRoomCode}`);
                setReceivedMessages(prevMessages => [...prevMessages, { sender: 'Sistem', content: `Yeni oda oluşturuldu: ${newRoomCode}`, type: 'system', colorClass: 'bg-yellow-700' }]);
                setCreateRoomLoading(false);
            });

            client.subscribe('/user/queue/room-joined', message => {
                const joinedRoomCode = message.body;
                setRoomCode(joinedRoomCode);
                toast.success(`Odaya başarıyla katıldınız! Oda Kodu: ${joinedRoomCode}`);
                setReceivedMessages(prevMessages => [...prevMessages, { sender: 'Sistem', content: `Odaya katıldınız: ${joinedRoomCode}`, type: 'system', colorClass: 'bg-yellow-700' }]);
                setJoinRoomLoading(false);
            });

            client.subscribe('/user/queue/room-join-error', message => {
                const errorMessage = message.body;
                toast.error(`Odaya katılım başarısız: ${errorMessage}`);
                setJoinRoomLoading(false);
            });
        };

        client.onDisconnect = () => {
            console.log('STOMP bağlantısı kesildi!');
            toast.info('STOMP bağlantısı kesildi!');
            setIsConnected(false);
            setRoomCode('');
            setJoinRoomCodeInput('');
            setReceivedMessages([]);
            setUsersInRoom([]);
            setTeamACaptain('');
            setTeamBCaptain('');
            setUserColors({});
        };

        client.onStompError = (frame) => {
            console.error('Broker Hatası: ' + frame.headers['message']);
            console.error('Detaylar: ' + frame.body);
            toast.error(`Broker Hatası: ${frame.headers['message']}`);
            toast.error(`Detaylar: ${frame.body}`);
            setIsConnected(false);
        };

        client.activate();
        setStompClient(client);
    };

    const endConnection = () => {
        if (stompClient) {
            stompClient.deactivate();
            setStompClient(null);
            setIsConnected(false);
            setRoomCode('');
            setJoinRoomCodeInput('');
            setReceivedMessages([]);
            setUsersInRoom([]);
            setTeamACaptain('');
            setTeamBCaptain('');
            setUserColors({});
        } else {
            toast.warn("Kesilecek bir bağlantı yok.");
        }
    };

    useEffect(() => {
        return () => {
            if (stompClient) {
                console.log('WebSocketTest component unmount edildi, bağlantı kesildi.');
                stompClient.deactivate();
            }
        };
    }, [stompClient]);

    useEffect(() => {
        if (stompClient && stompClient.connected && roomCode && !authLoading) {
            const currentUserUsername = user?.username; 

            console.log(`Subscribing to /topic/chat/${roomCode} for user: ${currentUserUsername}`);
            const chatSubscription = stompClient.subscribe(`/topic/chat/${roomCode}`, message => {
                const chatMessage = JSON.parse(message.body);
                
                let messageType;
                let assignedColorClass;

                if (chatMessage.sender === 'Sistem') {
                    messageType = 'system';
                    assignedColorClass = 'bg-yellow-700';
                } else if (currentUserUsername && chatMessage.sender === currentUserUsername) {
                    messageType = 'sent'; 
                    assignedColorClass = 'bg-blue-600';
                } else {
                    messageType = 'received';
                    if (userColors[chatMessage.sender]) {
                        assignedColorClass = userColors[chatMessage.sender];
                    } else {
                        const newColor = getRandomColorClass();
                        assignedColorClass = newColor;
                        setUserColors(prevColors => ({
                            ...prevColors,
                            [chatMessage.sender]: newColor
                        }));
                    }
                }
                
                setReceivedMessages(prevMessages => [...prevMessages, { ...chatMessage, type: messageType, colorClass: assignedColorClass }]);
                console.log('Received message:', { ...chatMessage, type: messageType, colorClass: assignedColorClass }); 
            });

            // Oda durumu güncellemeleri için abonelik
            const roomStatusSubscription = stompClient.subscribe(`/topic/room-status/${roomCode}`, message => {
                const roomStatus = JSON.parse(message.body);
                console.log('Received room status (from topic):', roomStatus);
                setUsersInRoom(roomStatus.usersInRoom || []);
                setTeamACaptain(roomStatus.teamACaptainEmail || '');
                setTeamBCaptain(roomStatus.teamBCaptainEmail || '');
            });

            // YENİ: Kullanıcı odaya katıldıktan ve abonelikler kurulduktan sonra
            // kendi özel kuyruğundan güncel oda durumunu talep etsin.
            // Bu, 'room-joined' mesajını aldıktan sonra tetiklenmeli.
            const userRoomStatusSubscription = stompClient.subscribe(`/user/queue/room-status/${roomCode}`, message => {
                const roomStatus = JSON.parse(message.body);
                console.log('Received room status (from user queue):', roomStatus);
                setUsersInRoom(roomStatus.usersInRoom || []);
                setTeamACaptain(roomStatus.teamACaptainEmail || '');
                setTeamBCaptain(roomStatus.teamBCaptainEmail || '');
            });
            
            // Eğer stompClient bağlı ve oda kodu mevcutsa, oda durumunu talep et
            // Bu, abonelikler kurulduktan sonra çalışacak
            setTimeout(() => { // Kısa bir gecikme ekleyerek aboneliklerin tam olarak kurulmasını bekle
                if (stompClient && stompClient.connected && roomCode) {
                    stompClient.publish({ destination: `/app/chat/requestRoomStatus/${roomCode}` });
                    console.log(`Requested room status for ${roomCode}`);
                }
            }, 500); // 500ms gecikme

            return () => {
                console.log(`Unsubscribing from /topic/chat/${roomCode}`);
                if (chatSubscription) {
                    chatSubscription.unsubscribe();
                }
                console.log(`Unsubscribing from /topic/room-status/${roomCode}`);
                if (roomStatusSubscription) {
                    roomStatusSubscription.unsubscribe();
                }
                console.log(`Unsubscribing from /user/queue/room-status/${roomCode}`);
                if (userRoomStatusSubscription) {
                    userRoomStatusSubscription.unsubscribe();
                }
            };
        } else if (!authLoading) {
            console.log('Skipping subscription: STOMP Client not ready, not connected, no roomCode, or auth still loading.');
        }
    }, [stompClient, roomCode, user?.username, authLoading, userColors]); 

    const sendMessage = () => {
        if (!stompClient || !stompClient.connected) {
            toast.warn('STOMP istemcisi bağlı değil, mesaj gönderilemedi.');
            return;
        }
        if (!roomCode) {
            toast.error("Mesaj göndermek için önce bir oda oluşturmalı veya odaya katılmalısınız.");
            return;
        }
        if (!inputMessage.trim()) {
            toast.warn("Boş mesaj gönderilemez.");
            return;
        }

        stompClient.publish({
            destination: `/app/chat/sendMessage/${roomCode}`,
            body: JSON.stringify({ content: inputMessage })
        });

        setInputMessage('');
    };

    const createRoom = () => {
        if (!stompClient || !stompClient.connected) {
            toast.warn("Oda oluşturmak için önce WebSocket bağlantısını başlatın.");
            return;
        }
        if (roomCode) {
            toast.info(`Zaten bir odadasınız: ${roomCode}. Yeni bir oda oluşturmak için mevcut bağlantıyı kesin.`);
            return;
        }
        
        if (!user || !user.roles || !user.roles.includes('ADMIN')) {
            toast.error("Bu işlemi yapmak için yetkiniz bulunmamaktadır. Lütfen yöneticiden kod alın ve odaya katılın.");
            return;
        }

        setCreateRoomLoading(true);
        stompClient.publish({ destination: '/app/chat/createRoom' });
    };

    const handleJoinRoom = () => {
        if (!stompClient || !stompClient.connected) {
            toast.warn("Odaya katılmak için önce WebSocket bağlantısını başlatın.");
            return;
        }
        if (!joinRoomCodeInput.trim()) {
            toast.error("Lütfen katılmak istediğiniz oda kodunu girin.");
            return;
        }
        if (roomCode) {
            toast.info(`Zaten bir odadasınız: ${roomCode}. Başka bir odaya katılmak için mevcut bağlantıyı kesin.`);
            return;
        }
        setJoinRoomLoading(true);
        stompClient.publish({ destination: `/app/chat/joinRoom/${joinRoomCodeInput.trim()}` });
    };

    const handleSetCaptains = () => {
        if (!stompClient || !stompClient.connected || !roomCode) {
            toast.error("Kaptanları ayarlamak için bir odaya bağlı olmanız gerekir.");
            return;
        }
        if (!user || !user.roles || !user.roles.includes('ADMIN')) {
            toast.error("Kaptanları ayarlamak için yönetici yetkiniz bulunmamaktadır.");
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
            body: JSON.stringify({ teamACaptainEmail: teamACaptain, teamBCaptainEmail: teamBCaptain })
        });
        toast.success("Kaptanlar başarıyla ayarlandı!");
    };


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <ToastContainer position="top-right" autoClose={4000} />
            <h1 className="text-3xl font-bold mb-6 text-yellow-400">WebSocket Test Alanı</h1>

            <div className="flex space-x-4 mb-6">
                <button
                    onClick={startConnection}
                    disabled={isConnected}
                    className={`px-6 py-3 rounded-lg font-semibold transition duration-300 ${isConnected ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                    Bağlantıyı Başlat
                </button>
                <button
                    onClick={endConnection}
                    disabled={!isConnected}
                    className={`px-6 py-3 rounded-lg font-semibold transition duration-300 ${!isConnected ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                >
                    Bağlantıyı Kes
                </button>
            </div>

            <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                <h2 className="text-xl font-semibold mb-4 text-center">Oda Yönetimi</h2>
                <div className="flex flex-col space-y-4">
                    <button
                        onClick={createRoom}
                        disabled={!isConnected || roomCode || createRoomLoading || joinRoomLoading}
                        className={`px-4 py-2 rounded-lg font-semibold transition duration-300 ${(!isConnected || roomCode || createRoomLoading || joinRoomLoading) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        {createRoomLoading ? 'Oda Oluşturuluyor...' : 'Oda Oluştur'}
                    </button>

                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={joinRoomCodeInput}
                            onChange={e => setJoinRoomCodeInput(e.target.value)}
                            placeholder="Katılınacak Oda Kodu"
                            className="flex-grow p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!isConnected || roomCode || createRoomLoading || joinRoomLoading}
                        />
                        <button
                            onClick={handleJoinRoom}
                            disabled={!isConnected || roomCode || !joinRoomCodeInput.trim() || createRoomLoading || joinRoomLoading}
                            className={`px-4 py-2 rounded-lg font-semibold transition duration-300 ${(!isConnected || roomCode || !joinRoomCodeInput.trim() || createRoomLoading || joinRoomLoading) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                            {joinRoomLoading ? 'Katılınıyor...' : 'Odaya Katıl'}
                        </button>
                    </div>

                    {roomCode && (
                        <p className="text-center text-sm text-gray-300">Aktif Oda Kodu: <span className="font-bold text-yellow-300">{roomCode}</span></p>
                    )}
                </div>
            </div>
            
            {isConnected && roomCode && (
                <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-center">Oda Durumu</h2>
                    <div className="mb-4">
                        <h3 className="text-lg font-medium mb-2">Odadaki Kullanıcılar:</h3>
                        {usersInRoom.length > 0 ? (
                            <ul className="list-disc list-inside text-gray-300">
                                {usersInRoom.map((userEmail, index) => (
                                    <li key={index}>{userEmail.split('@')[0]}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400">Odada başka kullanıcı yok.</p>
                        )}
                    </div>

                    {user?.roles?.includes('ADMIN') && (
                        <div className="mt-4 border-t border-gray-700 pt-4">
                            <h3 className="text-lg font-medium mb-2">Kaptan Seçimi (Yönetici)</h3>
                            <div className="flex flex-col space-y-3">
                                <div>
                                    <label htmlFor="teamACaptain" className="block text-sm font-medium text-gray-400 mb-1">Takım A Kaptanı:</label>
                                    <select
                                        id="teamACaptain"
                                        value={teamACaptain}
                                        onChange={(e) => setTeamACaptain(e.target.value)}
                                        className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seçiniz</option>
                                        {usersInRoom.map((userEmail) => (
                                            <option key={userEmail} value={userEmail}>
                                                {userEmail.split('@')[0]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="teamBCaptain" className="block text-sm font-medium text-gray-400 mb-1">Takım B Kaptanı:</label>
                                    <select
                                        id="teamBCaptain"
                                        value={teamBCaptain}
                                        onChange={(e) => setTeamBCaptain(e.target.value)}
                                        className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seçiniz</option>
                                        {usersInRoom.map((userEmail) => (
                                            <option key={userEmail} value={userEmail}>
                                                {userEmail.split('@')[0]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handleSetCaptains}
                                    disabled={!teamACaptain || !teamBCaptain || teamACaptain === teamBCaptain}
                                    className={`px-4 py-2 rounded-lg font-semibold transition duration-300 ${(!teamACaptain || !teamBCaptain || teamACaptain === teamBCaptain) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                >
                                    Kaptanları Ayarla
                                </button>
                            </div>
                        </div>
                    )}

                    {(teamACaptain || teamBCaptain) && (
                        <div className="mt-4 border-t border-gray-700 pt-4">
                            <h3 className="text-lg font-medium mb-2">Seçili Kaptanlar:</h3>
                            <p className="text-gray-300">Takım A Kaptanı: <span className="font-bold text-blue-400">{teamACaptain ? teamACaptain.split('@')[0] : 'Yok'}</span></p>
                            <p className="text-gray-300">Takım B Kaptanı: <span className="font-bold text-red-400">{teamBCaptain ? teamBCaptain.split('@')[0] : 'Yok'}</span></p>
                        </div>
                    )}
                </div>
            )}
            
            <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
                <h2 className="text-xl font-semibold mb-4 text-center">Gelen Mesajlar</h2>
                <div className="h-96 overflow-y-auto bg-gray-700 p-4 rounded-lg border border-gray-600 flex flex-col space-y-2 stable-scrollbar">
                    {receivedMessages.map((msg, index) => {
                        const bubbleAlignmentClass = msg.type === 'sent' ? 'justify-end' : 'justify-start';
                        const bubbleColorAndShapeClass = 
                                msg.type === 'system'
                                ? 'bg-yellow-700 rounded-md text-white text-xxl font-bold'
                                : `${msg.colorClass} ${msg.type === 'sent' ? 'rounded-br-none' : 'rounded-bl-none'} text-white`;

                        return (
                            <div
                                key={index}
                                className={`flex ${bubbleAlignmentClass}`}
                            >
                                <div className={`p-3 rounded-lg max-w-[80%] ${bubbleColorAndShapeClass}`}>
                                    {msg.type !== 'system' && (
                                        <div className="font-bold text-sm mb-1">{msg.sender.split('@')[0]}</div>
                                    )}
                                    <div className="text-sm whitespace-pre-line">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
                <div className="flex flex-col space-y-4">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!isConnected || !roomCode}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && isConnected && roomCode && inputMessage.trim()) {
                                sendMessage();
                            }
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!isConnected || !roomCode || !inputMessage.trim()}
                        className={`px-4 py-2 rounded-lg font-semibold transition duration-300 ${(!isConnected || !roomCode || !inputMessage.trim()) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                    >
                        Mesaj Gönder
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WebSocketTest;