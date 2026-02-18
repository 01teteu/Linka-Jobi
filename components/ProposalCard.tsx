
import React, { useState } from 'react';
import { Proposal, ProposalStatus, UserRole } from '../types';
import { MapPin, CheckCircle2, X, MessageCircle, DollarSign, Clock, ArrowRight, Loader2 } from 'lucide-react';

interface ProposalCardProps {
  proposal: Proposal;
  userRole: UserRole;
  onAccept: (id: number) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, userRole, onAccept }) => {
  const isProfessional = userRole === UserRole.PROFESSIONAL;
  const [showConfirm, setShowConfirm] = useState(false);
  const [animationState, setAnimationState] = useState<'idle' | 'exiting' | 'entering' | 'success'>('idle');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = () => {
    // 1. Zoom Out do card de confirmação
    setAnimationState('exiting');
    
    setTimeout(() => {
        setIsSuccess(true);
        // 2. Zoom In (Pop) do card de sucesso
        setAnimationState('entering');
        
        setTimeout(() => {
            setAnimationState('success');
            
            // 3. Aguarda leitura e fecha
            setTimeout(() => {
                onAccept(proposal.id);
                setShowConfirm(false);
                setIsSuccess(false);
                setAnimationState('idle');
            }, 1800);
        }, 300);
    }, 200);
  };

  const closeConfirm = () => {
      setShowConfirm(false);
      setAnimationState('idle');
  };

  return (
    <>
      <div className="bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-card hover:shadow-float transition-all duration-300 mb-4 group relative overflow-hidden">
        
        {/* Header: Cliente e Categoria */}
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
                    <img src={proposal.contractorAvatar} className="w-full h-full object-cover" alt="Avatar" />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-secondary leading-tight">{proposal.contractorName.split(' ')[0]}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-secondaryMuted font-medium">
                        <Clock size={10} /> 
                        <span>Postado há 10 min</span>
                    </div>
                </div>
            </div>
            <div className="bg-secondary text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide shadow-sm">
                {proposal.areaTag}
            </div>
        </div>

        {/* Título */}
        <h4 className="font-display font-bold text-lg text-secondary leading-tight mb-3 px-1">{proposal.title}</h4>

        {/* Bloco de Resumo da Proposta (Descrição + Preço) */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-5 relative overflow-hidden">
            {/* Decoração de fundo */}
            <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>

            <div className="flex justify-between items-end mb-3 border-b border-gray-200 pb-3">
                <span className="text-[10px] font-black text-secondaryMuted uppercase tracking-widest">Orçamento Estimado</span>
                <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                    <DollarSign size={14} strokeWidth={3} />
                    <span className="font-black text-lg">{proposal.budgetRange}</span>
                </div>
            </div>
            
            <p className="text-secondary text-xs leading-relaxed font-medium italic text-gray-600">
                "{proposal.description}"
            </p>
            
            <div className="flex items-center gap-1 mt-3 text-[10px] text-primary font-bold uppercase tracking-wide">
                <MapPin size={12} /> {proposal.location}
            </div>
        </div>

        {/* Action Button */}
        {isProfessional && proposal.status === ProposalStatus.OPEN ? (
            <button 
                onClick={() => setShowConfirm(true)}
                className="w-full bg-primary hover:bg-primaryDark text-white h-12 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group-btn"
            >
                <MessageCircle size={18} className="group-btn-hover:scale-110 transition-transform"/> 
                Tenho Interesse / Chat
            </button>
        ) : (
            <div className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-center cursor-not-allowed border border-gray-200">
                {proposal.status === ProposalStatus.OPEN ? 'Aguardando' : 'Ocupado / Fechado'}
            </div>
        )}
      </div>

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-secondary/60 backdrop-blur-sm animate-fade-in-up">
            <div className={`bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[380px] flex flex-col transition-all duration-300 ease-out ${
                animationState === 'exiting' ? 'scale-90 opacity-0' : 
                animationState === 'entering' ? 'scale-105 opacity-100' : 
                'scale-100 opacity-100'
            }`}>
                
                {isSuccess ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce-soft">
                                <CheckCircle2 size={48} className="text-green-600" />
                            </div>
                            {/* Confetti particles CSS effect */}
                            <div className="absolute top-0 left-0 w-full h-full animate-ping opacity-20 bg-green-400 rounded-full"></div>
                        </div>
                        
                        <h3 className="text-3xl font-black text-secondary mb-2 animate-fade-in-up">Job Aceito!</h3>
                        <p className="text-sm text-secondaryMuted font-medium animate-fade-in-up delay-100">
                            Adicionado à sua <span className="text-primary font-bold">Agenda</span>.<br/>
                            Abrindo chat...
                        </p>
                    </div>
                ) : (
                <>
                    <div className="bg-primary p-8 text-white text-center relative">
                        <button onClick={closeConfirm} className="absolute top-4 right-4 bg-white/10 rounded-full p-2 hover:bg-white/20 transition-colors"><X size={16} /></button>
                        <h3 className="font-display text-2xl font-black mb-1">Iniciar Negociação</h3>
                        <p className="text-white/80 text-xs font-medium px-4">Você tem interesse neste serviço. Deseja abrir o chat com o cliente?</p>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="bg-gray-50 rounded-2xl p-4 mb-2 border border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-lg text-primary">
                                {proposal.contractorName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-secondaryMuted uppercase tracking-wide">Cliente</p>
                                <h4 className="font-bold text-secondary text-sm">{proposal.contractorName}</h4>
                            </div>
                        </div>
                        
                        <div className="mt-auto space-y-3">
                            <button onClick={handleConfirm} className="w-full bg-green-500 hover:bg-green-600 text-white h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 group">
                                <MessageCircle size={20} className="group-hover:scale-110 transition-transform" /> Iniciar Chat Agora
                            </button>
                            <button onClick={closeConfirm} className="w-full h-12 text-secondaryMuted font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded-xl transition-colors">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </>
                )}
            </div>
        </div>
      )}
    </>
  );
};

export default ProposalCard;
