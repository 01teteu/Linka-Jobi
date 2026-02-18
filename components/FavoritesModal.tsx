
import React from 'react';
import { User } from '../types';
import { X, Heart, MapPin, Star, Trash2, Search, ArrowRight, Lock } from 'lucide-react';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: User[];
  isSubscriber: boolean;
  onRemove: (proId: number) => void;
  onOpenSubscription: () => void;
}

const FavoritesModal: React.FC<FavoritesModalProps> = ({ isOpen, onClose, favorites, isSubscriber, onRemove, onOpenSubscription }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-scale-in flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-red-500 p-8 pt-10 pb-12 text-center relative shrink-0">
            <button 
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 bg-black/10 rounded-full flex items-center justify-center text-white hover:bg-black/20 transition-colors"
            >
                <X size={18} />
            </button>
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg text-red-500">
                <Heart size={32} fill="currentColor" strokeWidth={0} />
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">Meus<br/>Profissionais</h2>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white relative -mt-6 rounded-t-[2rem] p-6 overflow-y-auto">
            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-70">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Heart size={32} className="text-gray-300" />
                    </div>
                    <h3 className="font-bold text-textMain text-lg">Nenhum favorito ainda</h3>
                    <p className="text-textMuted text-sm max-w-[200px] mb-6">Explore o app e salve os profissionais que você mais gostou.</p>
                    <button 
                        onClick={onClose}
                        className="bg-gray-100 text-textMain px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
                    >
                        Explorar agora
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {favorites.map(pro => {
                        const isLocked = !isSubscriber;
                        
                        return (
                            <div key={pro.id} className="flex items-center gap-4 p-4 rounded-[1.5rem] border border-gray-100 hover:shadow-md transition-all group bg-white">
                                <div className="relative shrink-0">
                                    <img 
                                        src={pro.avatarUrl} 
                                        className={`w-14 h-14 rounded-2xl object-cover ${isLocked ? 'blur-[2px] grayscale' : ''}`}
                                        alt={pro.name}
                                    />
                                    {isLocked && (
                                        <div className="absolute inset-0 bg-black/10 rounded-2xl flex items-center justify-center">
                                            <Lock size={16} className="text-white drop-shadow-md" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-extrabold text-sm truncate ${isLocked ? 'blur-[3px] text-gray-400 select-none' : 'text-textMain'}`}>
                                            {isLocked ? 'Nome Oculto' : pro.name}
                                        </h4>
                                        <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-md">
                                            <Star size={8} className="text-yellow-500 fill-yellow-500" />
                                            <span className="text-[9px] font-black text-yellow-700">{pro.rating}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{pro.specialty}</p>
                                    <div className="flex items-center gap-1 text-[10px] text-textMuted font-medium truncate opacity-80">
                                        <MapPin size={10} /> {isLocked ? 'Localização Premium' : pro.location}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0 pl-2 border-l border-gray-100">
                                    <button 
                                        onClick={() => onRemove(pro.id)}
                                        className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                                        title="Remover Favorito"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => isLocked ? onOpenSubscription() : alert('Abrindo perfil...')}
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isLocked ? 'bg-amber-100 text-amber-600' : 'bg-primaryContainer text-primary hover:bg-primary hover:text-white'}`}
                                    >
                                        {isLocked ? <Lock size={14}/> : <ArrowRight size={16} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FavoritesModal;
