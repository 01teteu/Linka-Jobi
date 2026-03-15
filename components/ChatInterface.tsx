
import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, User, ProposalStatus, UserRole } from '../types';
import { Send, AlertTriangle, CheckCheck, MessageSquare, ChevronLeft, CheckCircle2, Paperclip, Calendar, Image as ImageIcon, X, Phone, MoreVertical, ShieldCheck, DollarSign, Star, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Backend } from '../services/mockBackend';
import ScheduleModal from './ScheduleModal';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
    user: User;
    chats: ChatSession[];
    onRefresh?: () => void;
    onComplete?: (proposalId: number, professionalId?: number) => void;
    onHire?: (proposalId: number, professionalId: number) => void;
    onReview?: (proposalId: number, targetId: number, targetName: string) => void;
    initialChatId?: number | null;
    className?: string; // Allow external styling override
    onViewProfile?: (user: User) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, chats, onRefresh, onComplete, onHire, onReview, initialChatId, className, onViewProfile }) => {
    const [activeChatId, setActiveChatId] = useState<number>(initialChatId || 0);
    const [newMessage, setNewMessage] = useState('');
    const [showList, setShowList] = useState(true);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [localMessages, setLocalMessages] = useState<Message[]>([]);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);
    
    // Update activeChatId if initialChatId changes
    useEffect(() => {
        if (initialChatId) {
            setActiveChatId(initialChatId);
            setShowList(false); // On mobile, show chat directly
        }
    }, [initialChatId]);
    
    // Refs for accessing latest state in socket callbacks
    const chatsRef = useRef(chats);
    const userRef = useRef(user);
    const onReviewRef = useRef(onReview);

    useEffect(() => {
        chatsRef.current = chats;
        userRef.current = user;
        onReviewRef.current = onReview;
    }, [chats, user, onReview]);

    // Inicializa Socket
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        socketRef.current = io('/', {
            auth: { token }
        });

        socketRef.current.on('connect', () => {
            console.log("Connected to socket");
        });

        socketRef.current.on('new_message', (msg: Message) => {
            // Se a mensagem for deste chat, adiciona na lista local
            setLocalMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                let removed = false;
                const filtered = prev.filter(m => {
                    if (m.id >= 0) return true;
                    if (!removed && m.senderId === msg.senderId && m.type === msg.type) {
                        if (m.type === 'text' && m.text === msg.text) { removed = true; return false; }
                        if (m.type === 'image') { removed = true; return false; }
                        if (m.type === 'schedule') { removed = true; return false; }
                    }
                    return true;
                });
                return [...filtered, msg];
            });
            // Também dispara refresh global para atualizar lista lateral e unread counts
            onRefresh?.();
        });

        socketRef.current.on('proposal_update', (data: any) => {
            onRefresh?.();
            
            // Auto-prompt review for Professional when job is completed
            if (data.status === 'COMPLETED' && data.proposalId) {
                const pId = parseInt(data.proposalId);
                const chat = chatsRef.current.find(c => c.proposalId === pId);
                const currentUser = userRef.current;
                
                // If I am the professional in this chat
                if (chat && chat.professionalId === currentUser.id) {
                    const contractor = chat.participants.find(p => p.id === chat.contractorId);
                    if (contractor) {
                        onReviewRef.current?.(chat.proposalId, contractor.id, contractor.name);
                    }
                }
            }
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [onRefresh]); // Removed chats/user/onReview from dependency to avoid reconnects

    // Entra na sala do chat ativo
    useEffect(() => {
        if (activeChatId && socketRef.current) {
            socketRef.current.emit('join_chat', activeChatId);
        }
        return () => {
            if (activeChatId && socketRef.current) {
                socketRef.current.emit('leave_chat', activeChatId);
            }
        };
    }, [activeChatId]);

    // Atualiza mensagens locais quando chats mudar
    const prevChatIdRef = useRef<number>(0);
    useEffect(() => {
        const chat = chats.find(c => c.id === activeChatId);
        if (chat) {
            if (prevChatIdRef.current !== activeChatId) {
                setLocalMessages(chat.messages);
                prevChatIdRef.current = activeChatId;
            } else {
                setLocalMessages(prev => {
                    const optimisticMessages = prev.filter(m => m.id < 0);
                    let newMessages = [...chat.messages];
                    
                    optimisticMessages.forEach(opt => {
                        const exists = newMessages.some(m => 
                            m.senderId === opt.senderId && 
                            m.type === opt.type && 
                            (m.type === 'text' ? m.text === opt.text : true)
                        );
                        if (!exists) {
                            newMessages.push(opt);
                        }
                    });
                    
                    return newMessages;
                });
            }
        }
    }, [activeChatId, chats]);

    // Seleciona o primeiro chat se nada selecionado e estiver em desktop
    useEffect(() => {
        if (chats.length > 0 && activeChatId === 0 && window.innerWidth >= 768) {
            setActiveChatId(chats[0].id);
        }
    }, [chats, activeChatId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChatId, localMessages]);

    const activeChat = chats.find(c => c.id === activeChatId);
    const otherParticipant = activeChat?.participants.find(p => p.id !== user.id);
    
    // Status Logic
    const isCompleted = activeChat?.proposalStatus === ProposalStatus.COMPLETED;
    const isInProgress = activeChat?.proposalStatus === ProposalStatus.IN_PROGRESS;
    const isHiredHere = activeChat?.hiredProfessionalId === activeChat?.professionalId;
    // Se for suporte, nunca considerar como "job taken" por outro, pois é um chat direto
    const isJobTaken = !activeChat?.isSupport && isInProgress && !isHiredHere;
    
    const isContractor = activeChat && user.id === activeChat.contractorId;

    const handleHireClick = () => {
        setIsPaymentModalOpen(true);
    };

    const confirmHire = () => {
        if (activeChat && onHire) {
            onHire(activeChat.proposalId, activeChat.professionalId);
            setIsPaymentModalOpen(false);
        }
    };

    const handleSendText = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = newMessage.trim();
        if(!text) return;
        
        setNewMessage('');
        
        const tempMsg: Message = {
            id: -(Date.now()),
            senderId: user.id,
            text: text,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: 'text'
        };
        setLocalMessages(prev => [...prev, tempMsg]);

        // Envia via API (que vai disparar o evento socket de volta)
        try {
            await Backend.sendMessage(activeChatId, user.id, text, 'text');
        } catch (error) {
            setLocalMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const localUrl = URL.createObjectURL(file);
        const tempMsg: Message = {
            id: -(Date.now()),
            senderId: user.id,
            text: 'Imagem enviada',
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: 'image',
            mediaUrl: localUrl
        };
        setLocalMessages(prev => [...prev, tempMsg]);

        try {
            const url = await Backend.uploadImage(file); 
            await Backend.sendMessage(activeChatId, user.id, 'Imagem enviada', 'image', { mediaUrl: url });
            onRefresh?.();
        } catch(e) {
            setLocalMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            console.error("Fail upload");
        }
    };

    const handleSendSchedule = async (date: string, time: string) => {
        const text = `Proposta de Visita: ${date.split('-').reverse().join('/')} às ${time}`;
        const tempMsg: Message = {
            id: -(Date.now()),
            senderId: user.id,
            text: text,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: 'schedule',
            scheduleData: { date, time, status: 'PENDING' }
        };
        setLocalMessages(prev => [...prev, tempMsg]);

        try {
            await Backend.sendMessage(activeChatId, user.id, text, 'schedule', { 
                scheduleData: { date, time, status: 'PENDING' } 
            });
            onRefresh?.();
        } catch (error) {
            setLocalMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        }
    };

    const handleAcceptSchedule = async (msgId: number) => {
        const tempMsg: Message = {
            id: -(Date.now()),
            senderId: user.id,
            text: 'Agendamento Confirmado!',
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: 'text'
        };
        
        // Optimistically update the schedule message status
        setLocalMessages(prev => prev.map(m => 
            m.id === msgId && m.scheduleData ? { ...m, scheduleData: { ...m.scheduleData, status: 'CONFIRMED' } } : m
        ).concat(tempMsg));

        try {
            await Backend.updateMessageStatus(activeChatId, msgId, 'CONFIRMED');
            await Backend.sendMessage(activeChatId, user.id, 'Agendamento Confirmado!', 'text');
            onRefresh?.();
        } catch (error) {
            // Revert on error
            setLocalMessages(prev => prev.map(m => 
                m.id === msgId && m.scheduleData ? { ...m, scheduleData: { ...m.scheduleData, status: 'PENDING' } } : m
            ).filter(m => m.id !== tempMsg.id));
        }
    };

    const handleSelectChat = (id: number) => {
        setActiveChatId(id);
        setShowList(false);
    };

    // Renderiza conteúdo especial (Imagem, Agendamento)
    const renderMessageContent = (msg: Message, isMe: boolean) => {
        if (msg.type === 'image' && msg.mediaUrl) {
            return (
                <div className="rounded-lg overflow-hidden mt-1 mb-1 max-w-[240px] border-4 border-white/20 shadow-sm">
                    <img src={msg.mediaUrl} alt="Enviada" className="w-full h-auto object-cover" />
                </div>
            );
        }

        if (msg.type === 'schedule' && msg.scheduleData) {
            const { date, time, status } = msg.scheduleData;
            const isPending = status === 'PENDING';
            
            return (
                <div className={`p-3 rounded-xl shadow-sm mt-1 min-w-[220px] ${isMe ? 'bg-white/10 text-white border border-white/20' : 'bg-white text-textMain border border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-3 border-b border-dashed border-opacity-30 pb-2">
                        <Calendar size={16} className={isMe ? 'text-white' : 'text-primary'} />
                        <span className="font-black text-xs uppercase tracking-wide">Visita Técnica</span>
                    </div>
                    <div className="flex justify-between items-end mb-3">
                         <div>
                            <p className="text-[10px] uppercase font-bold opacity-70">Data</p>
                            <p className="font-bold">{date.split('-').reverse().join('/')}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] uppercase font-bold opacity-70">Hora</p>
                            <p className="font-black text-lg leading-none">{time}</p>
                         </div>
                    </div>
                    
                    {isPending ? (
                        <div className="mt-2">
                            {!isMe ? (
                                <button 
                                    onClick={() => handleAcceptSchedule(msg.id)}
                                    className="w-full bg-green-500 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wide hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                                >
                                    Confirmar Visita
                                </button>
                            ) : (
                                <div className="bg-white/20 rounded-lg p-2 text-center">
                                     <p className="text-[10px] font-bold italic opacity-90">Aguardando confirmação...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-2 bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-widest text-center py-2 rounded-lg border border-green-500/20 flex items-center justify-center gap-1">
                            <CheckCircle2 size={12} /> Confirmado
                        </div>
                    )}
                </div>
            );
        }

        return <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>;
    };

    if (chats.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center text-textMuted animate-fade-in-up px-8 text-center bg-white rounded-[2.5rem] border border-gray-100 shadow-xl m-4 ${className || "h-[70vh]"}`}>
                <div className="w-28 h-28 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
                    <MessageSquare size={48} className="text-gray-300" />
                    <div className="absolute top-0 right-0 w-8 h-8 bg-primary rounded-full animate-bounce"></div>
                </div>
                <h3 className="text-2xl font-black text-textMain mb-2">Nenhuma conversa encontrada</h3>
                <p className="font-medium text-sm max-w-xs">O histórico de mensagens aparecerá aqui.</p>
            </div>
        );
    }

    const containerClasses = className || "max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row animate-fade-in-up bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative";

    return (
        <div className={containerClasses}>
            
            {/* --- SIDEBAR (LISTA DE CHATS) --- */}
            <div className={`w-full md:w-[320px] bg-white border-r border-gray-100 flex-col z-20 ${showList ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-6 pb-4 border-b border-gray-50 bg-white">
                    <h2 className="text-2xl font-black text-textMain tracking-tight">Mensagens</h2>
                    <p className="text-xs text-textMuted font-bold mt-1">{chats.length} conversas ativas</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {chats.map(chat => {
                        // For Admin, show both participants in the title if possible, or just the one that isn't me (which is impossible if I'm admin and not in the chat, so show logic handles "me" vs "other")
                        const other = chat.participants.find(p => p.id !== user.id);
                        // If I am admin (999) and chat is between 1 and 2, 'other' will be 1 (first found).
                        
                        const isActive = activeChatId === chat.id;
                        const isDone = chat.proposalStatus === ProposalStatus.COMPLETED;
                        const isSupport = chat.isSupport;
                        
                        return (
                            <button 
                                key={chat.id}
                                onClick={() => handleSelectChat(chat.id)}
                                className={`w-full p-3 flex items-center gap-3 rounded-[1.2rem] transition-all duration-300 group border border-transparent ${
                                    isActive 
                                    ? 'bg-primary/5 border-primary/10 shadow-sm' 
                                    : 'hover:bg-gray-50 hover:border-gray-100'
                                }`}
                            >
                                <div 
                                    className="relative shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (other && onViewProfile) {
                                            onViewProfile({
                                                id: other.id,
                                                name: other.name,
                                                avatarUrl: other.avatar,
                                                role: chat.isSupport ? UserRole.ADMIN : (user.role === UserRole.CONTRACTOR ? UserRole.PROFESSIONAL : UserRole.CONTRACTOR)
                                            } as User);
                                        }
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform">
                                        <img src={other?.avatar || `https://ui-avatars.com/api/?name=${other?.name}&background=random`} className="w-full h-full object-cover" />
                                    </div>
                                    {isDone ? (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border-2 border-white p-0.5">
                                            <CheckCircle2 size={10} className="text-white"/>
                                        </div>
                                    ) : chat.unreadCount > 0 && (
                                        <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[9px] font-bold px-1.5 rounded-full border-2 border-white min-w-[18px] text-center">
                                            {chat.unreadCount}
                                        </div>
                                    )}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={`font-bold text-sm truncate ${isActive ? 'text-primary' : 'text-textMain'}`}>{other?.name}</h3>
                                        <span className="text-[9px] text-gray-400 font-medium">10:42</span>
                                    </div>
                                    {!isSupport && <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider truncate mb-0.5 opacity-70">{chat.proposalTitle}</p>}
                                    <p className={`text-xs truncate ${isActive ? 'text-textMain font-medium' : 'text-textMuted opacity-80'}`}>
                                        {chat.lastMessage || 'Iniciar conversa...'}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- JANELA DE CHAT --- */}
            <div className={`flex-1 flex flex-col bg-[#FDFDFD] relative ${!showList ? 'flex' : 'hidden md:flex'}`}>
                {activeChat ? (
                    <>
                        {/* Header Flutuante */}
                        <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4">
                            <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-[1.5rem] p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setShowList(true)} className="md:hidden w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                                        <ChevronLeft size={20} className="text-textMain" />
                                    </button>
                                    
                                    <div 
                                        className="relative cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                            if (otherParticipant && onViewProfile) {
                                                onViewProfile({
                                                    id: otherParticipant.id,
                                                    name: otherParticipant.name,
                                                    avatarUrl: otherParticipant.avatar,
                                                    role: activeChat?.isSupport ? UserRole.ADMIN : (user.role === UserRole.CONTRACTOR ? UserRole.PROFESSIONAL : UserRole.CONTRACTOR)
                                                } as User);
                                            }
                                        }}
                                    >
                                        <img src={otherParticipant?.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isCompleted ? 'bg-green-500' : 'bg-green-500'}`}></div>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-textMain text-sm leading-tight">{otherParticipant?.name}</h3>
                                        {activeChat.isSupport ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-1.5 rounded-md flex items-center gap-1">
                                                    <ShieldCheck size={10} /> Suporte Oficial
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                {isCompleted ? (
                                                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide bg-green-50 px-1.5 rounded-md">Concluído</span>
                                                ) : isInProgress ? (
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-1.5 rounded-md">Em Andamento</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wide bg-yellow-50 px-1.5 rounded-md">Negociando</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!activeChat.isSupport && isContractor && !isCompleted && !isInProgress && onHire && (
                                        <button 
                                            onClick={handleHireClick}
                                            className="group relative overflow-hidden bg-primary text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-xl hover:bg-primaryDark transition-all duration-300 active:scale-95 flex items-center gap-2 border border-primary/20"
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                Contratar <CheckCircle2 size={14} className="text-white" />
                                            </span>
                                        </button>
                                    )}

                                    {!activeChat.isSupport && isContractor && isInProgress && isHiredHere && onComplete && (
                                        <button 
                                            onClick={() => onComplete(activeChat.proposalId, activeChat.professionalId)}
                                            className="group relative overflow-hidden bg-zinc-900 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-xl hover:bg-black transition-all duration-300 active:scale-95 flex items-center gap-2 border border-zinc-800"
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                Finalizar Contrato <CheckCircle2 size={14} className="text-emerald-400" />
                                            </span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                                        </button>
                                    )}

                                    {!activeChat.isSupport && isCompleted && onReview && (
                                        <button 
                                            onClick={() => onReview(activeChat.proposalId, otherParticipant?.id || 0, otherParticipant?.name || 'Usuário')}
                                            className="group relative overflow-hidden bg-yellow-500 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-xl hover:bg-yellow-600 transition-all duration-300 active:scale-95 flex items-center gap-2 border border-yellow-400"
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                Avaliar <Star size={14} className="text-white" />
                                            </span>
                                        </button>
                                    )}
                                    <button className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-textMuted transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Proposal Details & Security Warning */}
                        <div className="pt-24 px-6 pb-2 space-y-3">
                            {!activeChat.isSupport && (
                                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                                    <button 
                                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                        className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                                <DollarSign size={16} className="text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-xs font-bold text-textMain uppercase tracking-wide">Detalhes da Proposta</h4>
                                                <p className="text-[10px] text-textMuted font-medium truncate max-w-[200px]">{activeChat.proposalTitle}</p>
                                            </div>
                                        </div>
                                        {isDetailsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                    </button>
                                    
                                    <AnimatePresence>
                                        {isDetailsOpen && (
                                            <motion.div
                                                key="chat-details"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <div className="p-4 border-t border-gray-100 bg-white space-y-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descrição</p>
                                                        <p className="text-xs text-textMain leading-relaxed">{activeChat.proposalDescription || "Sem descrição disponível."}</p>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Orçamento</p>
                                                            <p className="text-sm font-black text-green-600">{activeChat.proposalBudget ? `R$ ${activeChat.proposalBudget}` : "A combinar"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                activeChat.proposalStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                                activeChat.proposalStatus === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                                {activeChat.proposalStatus === 'COMPLETED' ? 'Concluído' :
                                                                 activeChat.proposalStatus === 'IN_PROGRESS' ? 'Em Andamento' : 'Em Negociação'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {!activeChat.isSupport && (
                                <>
                                    {/* Safety Tip */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-3 shadow-sm">
                                        <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] text-blue-800 font-bold uppercase tracking-wide mb-1">Dica de Segurança</p>
                                            <p className="text-xs text-blue-700 leading-relaxed">
                                                Antes de realizar serviços domiciliares, recomendamos marcar um encontro em local público para alinhar os detalhes. Isso garante maior segurança para ambas as partes.
                                            </p>
                                        </div>
                                    </div>

                                    {isCompleted ? (
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 flex items-center justify-center gap-2 text-center shadow-sm">
                                            <CheckCircle2 size={14} className="text-green-600" />
                                            <p className="text-[10px] text-green-800 font-bold uppercase tracking-wide leading-tight">
                                                Contrato fechado com {activeChat.participants.find(p => p.id === activeChat.professionalId)?.name || 'Profissional'}
                                            </p>
                                        </div>
                                    ) : isJobTaken ? (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-2.5 flex items-center justify-center gap-2 text-center shadow-sm">
                                            <AlertTriangle size={14} className="text-red-600" />
                                            <p className="text-[10px] text-red-800 font-bold uppercase tracking-wide leading-tight">
                                                Esta proposta já foi aceita por outro profissional. O chat está encerrado.
                                            </p>
                                        </div>
                                    ) : isInProgress && isHiredHere ? (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 flex items-center justify-center gap-2 text-center shadow-sm">
                                            <ShieldCheck size={14} className="text-blue-600" />
                                            <p className="text-[10px] text-blue-800 font-bold uppercase tracking-wide leading-tight">
                                                Trabalho em andamento! Só clique em "Finalizar" após a conclusão do serviço.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-center justify-center gap-2 text-center shadow-sm">
                                                <AlertTriangle size={14} className="text-amber-600" />
                                                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wide leading-tight">
                                                    {isContractor 
                                                        ? 'Aviso: O pedido permanece em aberto para outros profissionais. O trabalho só deve começar quando você clicar em "Contratar".'
                                                        : 'Aviso: O pedido permanece em aberto. Aguarde o cliente te contratar antes de iniciar o trabalho.'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Messages Area */}
                        <div 
                            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3"
                            style={{
                                backgroundImage: `radial-gradient(#E5E7EB 1px, transparent 1px)`,
                                backgroundSize: '20px 20px'
                            }}
                        >
                            {localMessages.map((msg, idx) => {
                                const isMe = msg.senderId === user.id;
                                if (msg.isSystem) return (
                                    <div key={idx} className="flex justify-center my-6">
                                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-gray-200">
                                            {msg.text}
                                        </span>
                                    </div>
                                );
                                
                                return (
                                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                                        <div className={`max-w-[85%] sm:max-w-[70%] p-4 shadow-sm relative group ${
                                            isMe 
                                            ? 'bg-gradient-to-br from-primary to-violet-600 text-white rounded-[20px] rounded-tr-none' 
                                            : 'bg-white text-textMain border border-gray-100 rounded-[20px] rounded-tl-none'
                                        }`}>
                                            {renderMessageContent(msg, isMe)}

                                            <div className={`text-[9px] mt-1.5 flex items-center gap-1 justify-end font-bold uppercase ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                                {msg.timestamp}
                                                {isMe && <CheckCheck className="w-3 h-3 opacity-80" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>

                        {/* Input Area Flutuante */}
                        <div className="p-4 sm:p-6 bg-transparent sticky bottom-0 z-20">
                            <form 
                                onSubmit={handleSendText} 
                                className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex items-end gap-2"
                            >
                                {/* Botões de Anexo */}
                                <div className="flex gap-1 p-1">
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isCompleted || isJobTaken}
                                        className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-textMuted rounded-full transition-colors flex items-center justify-center active:scale-95 disabled:opacity-50"
                                        title="Enviar Imagem"
                                    >
                                        <ImageIcon size={20} />
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleImageUpload}
                                    />
                                    
                                    {!activeChat.isSupport && (
                                        <button 
                                            type="button" 
                                            onClick={() => setIsScheduleOpen(true)}
                                            disabled={isCompleted || isJobTaken}
                                            className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-textMuted rounded-full transition-colors flex items-center justify-center active:scale-95 disabled:opacity-50"
                                            title="Agendar Visita"
                                        >
                                            <Calendar size={20} />
                                        </button>
                                    )}
                                </div>

                                {/* Text Input */}
                                <div className="flex-1 bg-gray-50 rounded-[1.5rem] border border-transparent focus-within:border-primary/20 focus-within:bg-white transition-all flex items-center mb-1">
                                    <textarea 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendText(e);
                                            }
                                        }}
                                        placeholder={activeChat.isSupport ? (user.role === UserRole.ADMIN ? "Digite sua mensagem..." : "Digite sua mensagem para o suporte...") : isCompleted ? "Este job foi finalizado." : isJobTaken ? "Proposta encerrada." : "Digite sua mensagem..."}
                                        disabled={isCompleted || isJobTaken}
                                        rows={1}
                                        className="w-full bg-transparent px-4 py-3 text-sm font-medium text-textMain outline-none resize-none disabled:opacity-50 max-h-32"
                                        style={{ minHeight: '44px' }}
                                    />
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim() || isCompleted || isJobTaken}
                                    className="w-12 h-12 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:bg-violet-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center shrink-0 mb-1"
                                >
                                    <Send className="w-5 h-5 ml-0.5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
                        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-6 rotate-3">
                            <MessageSquare size={40} className="text-primary/40" />
                        </div>
                        <h3 className="font-bold text-xl text-textMain mb-2">Selecione uma conversa</h3>
                        <p className="text-textMuted text-sm max-w-xs">Escolha um contato na lista ao lado para ver o histórico e negociar.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ScheduleModal 
                isOpen={isScheduleOpen} 
                onClose={() => setIsScheduleOpen(false)} 
                onConfirm={handleSendSchedule} 
            />

            {/* Payment Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <div key="payment-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative"
                        >
                            <div className="bg-primary/5 p-6 text-center border-b border-gray-100">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck size={32} className="text-primary" />
                                </div>
                                <h3 className="text-xl font-black text-textMain mb-1">Pagamento Seguro</h3>
                                <p className="text-sm text-textMuted">Garantia Linka Jobi</p>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-textMuted uppercase">Valor do Serviço</span>
                                        <span className="font-black text-textMain">R$ {activeChat?.proposalBudget || '0,00'}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-textMuted uppercase">Taxa de Serviço</span>
                                        <span className="font-bold text-textMain">R$ 0,00</span>
                                    </div>
                                    <div className="border-t border-gray-200 my-2 pt-2 flex justify-between items-center">
                                        <span className="text-sm font-black text-textMain uppercase">Total</span>
                                        <span className="text-xl font-black text-primary">R$ {activeChat?.proposalBudget || '0,00'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <Lock size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        Seu pagamento fica retido com segurança e só é liberado ao profissional após a conclusão do serviço e sua aprovação.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 pt-0 flex gap-3">
                                <button 
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl font-bold text-sm text-textMuted hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={confirmHire}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primaryDark transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Confirmar e Pagar <CheckCircle2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatInterface;
