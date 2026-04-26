
import React, { useState, useEffect } from 'react';
import { User, PortfolioItem, Review, ServiceItem } from '../types';
import { Backend } from '../services/mockBackend';
import { X, Star, MessageSquare, ChevronRight, Loader2, ImageOff, DollarSign, Tag, Heart, Flag, Ban, AlertTriangle } from 'lucide-react';
import { useToast } from './ToastContext';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  professional: User | null;
  onRequestQuote: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ isOpen, onClose, professional, onRequestQuote, isFavorite, onToggleFavorite }) => {
  const [loading, setLoading] = useState(true);
  const [fullProfile, setFullProfile] = useState<{ user: User, portfolio: PortfolioItem[], reviews: Review[], services?: ServiceItem[] } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && professional) {
        setLoading(true);
        Backend.getPublicProfile(professional.id)
            .then(data => setFullProfile(data))
            .catch(err => console.error("Erro ao carregar perfil público", err))
            .finally(() => setLoading(false));
    } else {
        setFullProfile(null);
        setIsBioExpanded(false);
        setFullscreenImage(null);
        setShowAllReviews(false);
    }
  }, [isOpen, professional]);

  const handleReport = async () => {
      if (!professional || !reportReason) return;
      try {
          await Backend.reportUser(professional.id, reportReason, reportDescription);
          showToast('Denúncia enviada com sucesso.', 'success');
          setShowReportModal(false);
          setReportReason('');
          setReportDescription('');
      } catch (error) {
          showToast('Erro ao enviar denúncia.', 'error');
      }
  };

  const handleBlock = async () => {
      if (!professional) return;
      if (confirm('Tem certeza que deseja bloquear este usuário? Você não verá mais mensagens dele.')) {
          try {
              await Backend.blockUser(professional.id);
              showToast('Usuário bloqueado.', 'success');
              onClose();
          } catch (error) {
              showToast('Erro ao bloquear usuário.', 'error');
          }
      }
  };

  if (!isOpen || !professional) return null;

  const displayUser = fullProfile?.user || professional;
  const portfolio = fullProfile?.portfolio || [];
  const reviews = fullProfile?.reviews || [];
  const services = displayUser.services || [];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in-up">
      <div className="bg-white w-full max-w-lg h-[92vh] sm:h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-scale-in">
        
        {/* Header Actions (Close, Favorite, Report, Block) */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
            {onToggleFavorite && (
                <button 
                    onClick={() => onToggleFavorite(professional.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isFavorite ? 'bg-white text-red-500 shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title="Favoritar"
                >
                    <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
                </button>
            )}
            <button 
                onClick={() => setShowReportModal(true)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-all"
                title="Denunciar"
            >
                <Flag size={18} />
            </button>
            <button 
                onClick={handleBlock}
                className="w-10 h-10 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-full flex items-center justify-center text-gray-500 transition-all"
                title="Bloquear"
            >
                <Ban size={18} />
            </button>
            <button 
                onClick={onClose}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-all ml-2"
            >
                <X size={20} />
            </button>
        </div>

        {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                <p className="text-textMuted font-bold text-xs uppercase tracking-widest">Carregando Perfil...</p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-white">
                {/* 1. Header */}
                <div className="flex flex-col items-center pt-16 px-6 pb-8">
                    {displayUser.avatarUrl ? (
                        <img src={displayUser.avatarUrl} alt={displayUser.name} className="w-32 h-32 rounded-full object-cover shadow-md mb-4" />
                    ) : (
                        <div className="w-32 h-32 rounded-full bg-primary text-white flex items-center justify-center text-5xl font-black shadow-md mb-4">
                            {displayUser.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h2 className="text-2xl font-black text-textMain text-center leading-tight">{displayUser.name}</h2>
                    <p className="text-sm font-bold text-primary uppercase tracking-wide mt-1">{displayUser.specialty || 'Profissional'}</p>
                    
                    <div className="flex items-center gap-1.5 mt-3 bg-gray-50 px-4 py-2 rounded-full">
                        <Star size={18} className="text-yellow-500 fill-yellow-500" />
                        <span className="font-black text-base text-textMain">{displayUser.rating || '5.0'}</span>
                        <span className="text-sm text-textMuted font-medium">({displayUser.reviewsCount || reviews.length} avaliações)</span>
                    </div>

                    <button 
                        onClick={onRequestQuote}
                        className="mt-6 w-full max-w-[280px] h-14 bg-primary hover:bg-primaryDark text-white rounded-2xl font-black text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <MessageSquare size={20} /> Contatar Profissional
                    </button>
                </div>

                {/* 2. Sobre */}
                <div className="px-6 py-8 border-t border-gray-100">
                    <h3 className="text-lg font-black text-textMain mb-3">Sobre</h3>
                    <div className="text-sm text-textMuted leading-relaxed">
                        <p className={isBioExpanded ? "" : "line-clamp-3"}>
                            {displayUser.bio || `Olá! Sou especialista em ${displayUser.specialty || 'serviços'} com foco em qualidade e pontualidade. Estou disponível para atender sua região com as melhores ferramentas e técnicas.`}
                        </p>
                        {displayUser.bio && displayUser.bio.length > 120 && (
                            <button onClick={() => setIsBioExpanded(!isBioExpanded)} className="text-primary font-bold mt-2 text-sm hover:underline">
                                {isBioExpanded ? 'Ver menos' : 'Ler mais'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Serviços */}
                <div className="py-8 border-t border-gray-100">
                    <h3 className="text-lg font-black text-textMain mb-4 px-6">Serviços</h3>
                    <div className="flex overflow-x-auto gap-4 px-6 pb-4 no-scrollbar">
                        {services.length > 0 ? services.map(service => (
                            <div key={service.id} className="min-w-[220px] bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col justify-between">
                                <h4 className="font-bold text-textMain text-sm mb-3 line-clamp-2">{service.title}</h4>
                                <div className="flex items-center gap-1.5">
                                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                                        <DollarSign size={16} />
                                    </div>
                                    <span className="text-textMain font-black text-base">
                                        {service.price} <span className="text-[10px] text-textMuted font-medium uppercase tracking-wider">{service.priceUnit === 'HOURLY' ? '/hora' : service.priceUnit === 'ESTIMATE' ? '(est.)' : ''}</span>
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="w-full text-center py-6 bg-gray-50 rounded-2xl mx-6">
                                <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-textMuted">Nenhum serviço listado.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Portfólio de fotos */}
                <div className="px-6 py-8 border-t border-gray-100">
                    <h3 className="text-lg font-black text-textMain mb-4">Portfólio</h3>
                    {portfolio.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {portfolio.slice(0, 4).map(item => (
                                <div key={item.id} className="aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-sm relative group" onClick={() => setFullscreenImage(item.imageUrl)}>
                                    <img src={item.imageUrl} alt={item.description || 'Portfolio item'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-2xl p-8 text-center">
                            <ImageOff className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-textMuted">Nenhuma foto adicionada ainda</p>
                        </div>
                    )}
                </div>

                {/* 5. Avaliações */}
                <div className="px-6 py-8 border-t border-gray-100">
                    <h3 className="text-lg font-black text-textMain mb-4">Avaliações</h3>
                    {reviews.length > 0 ? (
                        <div className="space-y-4">
                            {(showAllReviews ? reviews : reviews.slice(0, 3)).map(review => (
                                <div key={review.id} className="bg-white rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-50">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="font-bold text-sm text-textMain">{review.reviewerName}</span>
                                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg text-xs font-black text-yellow-700">
                                            <Star size={12} className="fill-yellow-500 text-yellow-500" /> {review.rating}
                                        </div>
                                    </div>
                                    <p className="text-sm text-textMuted leading-relaxed mb-3">"{review.comment}"</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(review.createdAt).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {reviews.length > 3 && !showAllReviews && (
                                <button onClick={() => setShowAllReviews(true)} className="w-full py-4 text-primary font-bold text-sm text-center rounded-xl hover:bg-primary/5 transition-colors mt-2">
                                    Ver todas as {reviews.length} avaliações
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-2xl p-8 text-center">
                            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-textMuted">Seja o primeiro a avaliar</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Sticky Bottom Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <button 
                onClick={onRequestQuote}
                disabled={loading}
                className="w-full h-14 bg-primary hover:bg-primaryDark text-white rounded-2xl font-black text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70"
            >
                <MessageSquare size={20} /> Contatar Profissional
            </button>
        </div>

        {/* Fullscreen Image Modal */}
        {fullscreenImage && (
            <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setFullscreenImage(null)}>
                <button className="absolute top-6 right-6 text-white p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md">
                    <X size={24} />
                </button>
                <img src={fullscreenImage} alt="Fullscreen" className="max-w-full max-h-[90vh] object-contain rounded-xl animate-scale-in shadow-2xl" />
            </div>
        )}

        {/* Report Modal Overlay */}
        {showReportModal && (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                    <div className="flex items-center gap-2 text-red-500 mb-4">
                        <AlertTriangle size={24} />
                        <h3 className="font-black text-lg">Denunciar Usuário</h3>
                    </div>
                    <p className="text-sm text-textMuted mb-4">Sua denúncia é anônima e será analisada pela nossa equipe.</p>
                    
                    <div className="space-y-3">
                        <select 
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-200 outline-none"
                        >
                            <option value="">Selecione o motivo...</option>
                            <option value="SPAM">Spam ou Propaganda</option>
                            <option value="OFFENSIVE">Conteúdo Ofensivo</option>
                            <option value="FRAUD">Suspeita de Fraude/Golpe</option>
                            <option value="FAKE">Perfil Falso</option>
                            <option value="OTHER">Outro</option>
                        </select>
                        <textarea 
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            placeholder="Descreva o ocorrido (opcional)..."
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-200 outline-none h-24 resize-none"
                        />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button 
                            onClick={() => setShowReportModal(false)}
                            className="flex-1 py-3 bg-gray-100 text-textMuted font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleReport}
                            disabled={!reportReason}
                            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default PublicProfileModal;
