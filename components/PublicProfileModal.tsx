
import React, { useState, useEffect } from 'react';
import { User, PortfolioItem, Review, ServiceItem } from '../types';
import { Backend } from '../services/mockBackend';
import { X, MapPin, Star, ShieldCheck, Clock, Award, Briefcase, Grid, MessageSquare, ChevronRight, CheckCircle2, Loader2, ImageOff, DollarSign, Tag, Heart, Flag, Ban, AlertTriangle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'portfolio' | 'services' | 'reviews'>('portfolio');
  const [loading, setLoading] = useState(true);
  const [fullProfile, setFullProfile] = useState<{ user: User, portfolio: PortfolioItem[], reviews: Review[], services?: ServiceItem[] } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
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
        
        {/* Close Button Absolute */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
        >
            <X size={20} />
        </button>

        {/* Actions: Favorite, Report, Block */}
        <div className="absolute top-4 right-16 z-20 flex gap-2">
            {onToggleFavorite && (
                <button 
                    onClick={() => onToggleFavorite(professional.id)}
                    className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all ${isFavorite ? 'bg-white text-red-500 shadow-md' : 'bg-black/20 text-white hover:bg-black/30'}`}
                    title="Favoritar"
                >
                    <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
                </button>
            )}
            <button 
                onClick={() => setShowReportModal(true)}
                className="w-10 h-10 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
                title="Denunciar"
            >
                <Flag size={18} />
            </button>
            <button 
                onClick={handleBlock}
                className="w-10 h-10 bg-black/20 hover:bg-red-600/80 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
                title="Bloquear"
            >
                <Ban size={18} />
            </button>
        </div>

        {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                <p className="text-textMuted font-bold text-xs uppercase tracking-widest">Carregando Perfil...</p>
            </div>
        ) : (
        <>
            {/* Header Image & Avatar */}
            <div className="relative h-40 bg-gray-200 shrink-0">
                <img 
                    src={displayUser.coverUrl || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop"}
                    className="w-full h-full object-cover opacity-80"
                    alt="Capa"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60"></div>
            </div>

            <div className="px-6 relative flex-1 overflow-y-auto no-scrollbar pb-24 -mt-12">
                {/* Profile Info Card */}
                <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 mb-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-24 h-24 rounded-[1.5rem] border-4 border-white shadow-md overflow-hidden bg-white -mt-16">
                            <img src={displayUser.avatarUrl} className="w-full h-full object-cover" alt={displayUser.name} />
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                <span className="font-black text-sm text-yellow-700">{displayUser.rating || '5.0'}</span>
                                <span className="text-[10px] text-yellow-600 font-medium">({displayUser.reviewsCount || reviews.length})</span>
                            </div>
                            {displayUser.isSubscriber && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-widest text-primary bg-primaryContainer/30 px-2 py-0.5 rounded-full">
                                    <ShieldCheck size={12} /> Verificado
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-textMain leading-tight flex items-center gap-2">
                            {displayUser.name} 
                            <CheckCircle2 size={20} className="text-blue-500 fill-blue-50" />
                        </h2>
                        <p className="text-sm font-bold text-primary uppercase tracking-wide mb-2">{displayUser.specialty}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-textMuted mb-4">
                            <span className="flex items-center gap-1"><MapPin size={14}/> {displayUser.location || 'São Paulo, SP'}</span>
                            <span className="flex items-center gap-1"><Briefcase size={14}/> {displayUser.experienceYears || '3'} anos exp.</span>
                        </div>

                        <p className="text-sm text-textMain leading-relaxed opacity-80 font-medium">
                            {displayUser.bio || `Olá! Sou especialista em ${displayUser.specialty} com foco em qualidade e pontualidade. Estou disponível para atender sua região com as melhores ferramentas e técnicas.`}
                        </p>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                        <Award className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                        <span className="block font-black text-lg text-textMain">100%</span>
                        <span className="text-[9px] text-textMuted font-bold uppercase">Satisfação</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                        <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                        <span className="block font-black text-lg text-textMain">2h</span>
                        <span className="text-[9px] text-textMuted font-bold uppercase">Resp. Média</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                        <ShieldCheck className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <span className="block font-black text-lg text-textMain">Top</span>
                        <span className="text-[9px] text-textMuted font-bold uppercase">Garantia</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-100 mb-6">
                    <button 
                        onClick={() => setActiveTab('portfolio')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'portfolio' ? 'text-primary' : 'text-textMuted hover:text-textMain'}`}
                    >
                        <div className="flex items-center gap-2"><Grid size={16} /> Portfólio</div>
                        {activeTab === 'portfolio' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('services')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'services' ? 'text-primary' : 'text-textMuted hover:text-textMain'}`}
                    >
                        <div className="flex items-center gap-2"><Tag size={16} /> Serviços</div>
                        {activeTab === 'services' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('reviews')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'reviews' ? 'text-primary' : 'text-textMuted hover:text-textMain'}`}
                    >
                        <div className="flex items-center gap-2"><MessageSquare size={16} /> Avaliações</div>
                        {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="animate-fade-in-up">
                    {activeTab === 'portfolio' ? (
                        portfolio.length > 0 ? (
                            <div className="columns-2 gap-4 space-y-4">
                                {portfolio.map((item) => (
                                    <div key={item.id} className="break-inside-avoid rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative">
                                        <img src={item.imageUrl} className="w-full h-auto object-cover" alt="Portfolio" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                            <p className="text-white text-[10px] font-bold truncate">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 opacity-50">
                                <ImageOff className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-bold text-textMuted">Nenhuma foto ainda.</p>
                            </div>
                        )
                    ) : activeTab === 'services' ? (
                        <div className="space-y-3">
                            {services.length > 0 ? services.map((service) => (
                                <div key={service.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                                    <div>
                                        <h4 className="font-bold text-secondary text-sm">{service.title}</h4>
                                        {service.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="bg-green-50 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <DollarSign size={10} /> 
                                                {service.price} 
                                                <span className="opacity-70 font-medium ml-0.5">
                                                    {service.priceUnit === 'HOURLY' ? '/hora' : service.priceUnit === 'ESTIMATE' ? '(estimado)' : ''}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 opacity-50">
                                    <Tag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-textMuted">Nenhum serviço listado.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.length > 0 ? reviews.map((review) => (
                                <div key={review.id} className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primaryContainer text-primary flex items-center justify-center font-black text-xs">
                                                {review.reviewerName.charAt(0)}
                                            </div>
                                            <span className="font-bold text-sm text-textMain">{review.reviewerName}</span>
                                        </div>
                                        <div className="flex text-yellow-400">
                                            {[...Array(review.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                                        </div>
                                    </div>
                                    <p className="text-sm text-textMuted italic leading-relaxed">"{review.comment}"</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">{new Date(review.createdAt).toLocaleDateString()}</p>
                                </div>
                            )) : (
                                <div className="text-center py-8 opacity-50">
                                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-textMuted">Nenhuma avaliação ainda.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
        )}

        {/* Footer Action */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30">
            <button 
                onClick={onRequestQuote}
                disabled={loading}
                className="w-full h-16 bg-primary hover:bg-violet-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70"
            >
                Solicitar Orçamento <ChevronRight size={24} />
            </button>
        </div>

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
