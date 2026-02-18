
import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, User, ProposalStatus } from '../types';
import { Send, AlertTriangle, CheckCheck, MessageSquare, ChevronLeft, CheckCircle2, Paperclip, Calendar, Image as ImageIcon, X, Phone, MoreVertical, ShieldCheck, DollarSign } from 'lucide-react';
import { Backend } from '../services/mockBackend';
import ScheduleModal from './ScheduleModal';

interface ChatInterfaceProps {
    user: User;
    chats: ChatSession[];
    onSendMessage: (chatId: number, text: string) => void;
    onRefresh?: () => void;
    onComplete?: (proposalId: number) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, chats, onSendMessage, onRefresh, onComplete }) => {
    const [activeChatId, setActiveChatId] = useState<number>(0);
    const [newMessage, setNewMessage] = useState('');
    const [showList, setShowList] = useState(true);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Polling rápido para chat (3 segundos)
    useEffect(() => {
        if (!onRefresh) return;
        const interval = setInterval(onRefresh, 3000);
        return () => clearInterval(interval);
    }, [onRefresh]);

    // Seleciona o primeiro chat se nada selecionado e estiver em desktop
    useEffect(() => {
        if (chats.length > 0 && activeChatId === 0 && window.innerWidth >= 768) {
            setActiveChatId(chats[0].id);
        }
    }, [chats, activeChatId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChatId, chats]);

    const activeChat = chats.find(c => c.id === activeChatId);
    const otherParticipant = activeChat?.participants.find(p => p.id !== user.id);
    const isCompleted = activeChat?.proposalStatus === ProposalStatus.COMPLETED;
    const isContractor = activeChat && user.id === activeChat.contractorId;

    const handleSendText = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newMessage.trim()) return;
        Backend.sendMessage(activeChatId, user.id, newMessage, 'text');
        setNewMessage('');
        onRefresh?.();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const url = await Backend.uploadImage(file); 
            await Backend.sendMessage(activeChatId, user.id, 'Imagem enviada', 'image', { mediaUrl: url });
            onRefresh?.();
        } catch(e) {
            console.error("Fail upload");
        }
    };

    const handleSendSchedule = async (date: string, time: string) => {
        const text = `Proposta de Visita: ${date.split('-').reverse().join('/')} às ${time}`;
        await Backend.sendMessage(activeChatId, user.id, text, 'schedule', { 
            scheduleData: { date, time, status: 'PENDING' } 
        });
        onRefresh?.();
    };

    const handleAcceptSchedule = async (msgId: number) => {
        await Backend.updateMessageStatus(activeChatId, msgId, 'CONFIRMED');
        await Backend.sendMessage(activeChatId, user.id, 'Agendamento Confirmado!', 'text');
        onRefresh?.();
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
            <div className="flex flex-col items-center justify-center h-[70vh] text-textMuted animate-fade-in-up px-8 text-center bg-white rounded-[2.5rem] border border-gray-100 shadow-xl m-4">
                <div className="w-28 h-28 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
                    <MessageSquare size={48} className="text-gray-300" />
                    <div className="absolute top-0 right-0 w-8 h-8 bg-primary rounded-full animate-bounce"></div>
                </div>
                <h3 className="text-2xl font-black text-textMain mb-2">Sua caixa de entrada está vazia</h3>
                <p className="font-medium text-sm max-w-xs">Quando você fechar um job ou receber uma proposta, o chat aparecerá aqui para você negociar.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row animate-fade-in-up bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative">
            
            {/* --- SIDEBAR (LISTA DE CHATS) --- */}
            <div className={`w-full md:w-[320px] bg-white border-r border-gray-100 flex-col z-20 ${showList ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-6 pb-4 border-b border-gray-50 bg-white">
                    <h2 className="text-2xl font-black text-textMain tracking-tight">Mensagens</h2>
                    <p className="text-xs text-textMuted font-bold mt-1">{chats.length} conversas ativas</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    {chats.map(chat => {
                        const other = chat.participants.find(p => p.id !== user.id);
                        const isActive = activeChatId === chat.id;
                        const isDone = chat.proposalStatus === ProposalStatus.COMPLETED;
                        
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
                                <div className="relative shrink-0">
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
                                    <p className="text-[10px] text-textMuted font-bold uppercase tracking-wider truncate mb-0.5 opacity-70">{chat.proposalTitle}</p>
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
                                    
                                    <div className="relative">
                                        <img src={otherParticipant?.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isCompleted ? 'bg-green-500' : 'bg-green-500'}`}></div>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-textMain text-sm leading-tight">{otherParticipant?.name}</h3>
                                        <div className="flex items-center gap-1.5">
                                            {isCompleted ? (
                                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide bg-green-50 px-1.5 rounded-md">Concluído</span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-1.5 rounded-md">Negociando</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isContractor && !isCompleted && onComplete && (
                                        <button 
                                            onClick={() => onComplete(activeChat.proposalId)}
                                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            <CheckCircle2 size={16} /> Finalizar
                                        </button>
                                    )}
                                    <button className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-textMuted transition-colors">
                                        <Phone size={18} />
                                    </button>
                                    <button className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-textMuted transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Aviso de Segurança (Fixo abaixo do header, mas com padding-top para não colidir) */}
                        <div className="pt-24 px-6 pb-2">
                            {isCompleted ? (
                                <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 flex items-center justify-center gap-2 text-center shadow-sm">
                                    <CheckCircle2 size={14} className="text-green-600" />
                                    <p className="text-[10px] text-green-800 font-bold uppercase tracking-wide leading-tight">
                                        Serviço finalizado! Pagamento processado com sucesso.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-center justify-center gap-2 text-center shadow-sm">
                                    <ShieldCheck size={14} className="text-amber-600" />
                                    <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wide leading-tight">
                                        Pagamento seguro: Só clique em "Finalizar" após a conclusão do serviço.
                                    </p>
                                </div>
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
                            {activeChat.messages.map((msg, idx) => {
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
                                        disabled={isCompleted}
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
                                    
                                    <button 
                                        type="button" 
                                        onClick={() => setIsScheduleOpen(true)}
                                        disabled={isCompleted}
                                        className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-textMuted rounded-full transition-colors flex items-center justify-center active:scale-95 disabled:opacity-50"
                                        title="Agendar Visita"
                                    >
                                        <Calendar size={20} />
                                    </button>
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
                                        placeholder={isCompleted ? "Este job foi finalizado." : "Digite sua mensagem..."}
                                        disabled={isCompleted}
                                        rows={1}
                                        className="w-full bg-transparent px-4 py-3 text-sm font-medium text-textMain outline-none resize-none disabled:opacity-50 max-h-32"
                                        style={{ minHeight: '44px' }}
                                    />
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim() || isCompleted}
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
        </div>
    );
};

export default ChatInterface;
