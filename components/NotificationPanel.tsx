
import React from 'react';
import { Notification } from '../types';
import { Bell, MessageSquare, CheckCircle2, UserPlus, Info, X, Trash2 } from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, notifications, onMarkRead }) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute top-20 right-4 sm:right-6 w-80 sm:w-96 bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 z-[110] animate-scale-in origin-top-right overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 p-5 flex justify-between items-center border-b border-gray-100">
            <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary" />
                <h3 className="font-black text-textMain text-sm">Notificações</h3>
                {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{unreadCount} novas</span>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors">
                <X size={16} className="text-textMuted" />
            </button>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center opacity-50">
                    <Bell size={32} className="text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-textMain">Tudo limpo!</p>
                    <p className="text-xs text-textMuted">Nenhuma notificação por enquanto.</p>
                </div>
            ) : (
                <div>
                    {notifications.map(n => (
                        <div 
                            key={n.id} 
                            onClick={() => onMarkRead(n.id)}
                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 relative ${!n.read ? 'bg-blue-50/30' : ''}`}
                        >
                            {/* Icon based on Type */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                ${n.type === 'INVITE' ? 'bg-purple-100 text-purple-600' : ''}
                                ${n.type === 'MESSAGE' ? 'bg-blue-100 text-blue-600' : ''}
                                ${n.type === 'SUCCESS' ? 'bg-green-100 text-green-600' : ''}
                                ${n.type === 'SYSTEM' ? 'bg-gray-100 text-gray-600' : ''}
                            `}>
                                {n.type === 'INVITE' && <UserPlus size={18} />}
                                {n.type === 'MESSAGE' && <MessageSquare size={18} />}
                                {n.type === 'SUCCESS' && <CheckCircle2 size={18} />}
                                {n.type === 'SYSTEM' && <Info size={18} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className={`text-sm ${!n.read ? 'font-black text-primary' : 'font-bold text-textMain'}`}>{n.title}</h4>
                                    <span className="text-[9px] text-textMuted opacity-60">Hoje</span>
                                </div>
                                <p className={`text-xs mt-0.5 leading-relaxed ${!n.read ? 'text-textMain font-medium' : 'text-textMuted'}`}>{n.message}</p>
                            </div>

                            {/* Unread Dot */}
                            {!n.read && (
                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500"></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <button className="text-[10px] font-bold text-textMuted uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-1 w-full">
                    <Trash2 size={12} /> Limpar tudo
                </button>
            </div>
        )}
    </div>
  );
};

export default NotificationPanel;
