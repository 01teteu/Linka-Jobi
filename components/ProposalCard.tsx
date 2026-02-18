
import React, { useState } from 'react';
import { Proposal, ProposalStatus, UserRole } from '../types';
import { Tag, MapPin, CheckCircle2, X, Sparkles, MessageCircle, DollarSign } from 'lucide-react';

interface ProposalCardProps {
  proposal: Proposal;
  userRole: UserRole;
  onAccept: (id: number) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, userRole, onAccept }) => {
  const isProfessional = userRole === UserRole.PROFESSIONAL;
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = () => {
    setIsSuccess(true);
    setTimeout(() => {
        onAccept(proposal.id);
        setShowConfirm(false);
        setIsSuccess(false);
    }, 1500);
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-card hover:shadow-float transition-all mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center bg-primary/10">
              <Tag className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-secondary font-extrabold text-2xl mb-1">{proposal.areaTag}</h3>
              <div className="flex items-center gap-1.5 text-secondaryMuted text-[11px] font-bold uppercase tracking-widest">
                  <MapPin size={14} className="text-primary" />
                  {proposal.location}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-[2rem] mb-8 border border-gray-100">
            <p className="text-secondary text-base leading-relaxed font-medium mb-4">"{proposal.description}"</p>
            <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 w-fit">
                <DollarSign size={14} /> {proposal.budgetRange}
            </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <img src={proposal.contractorAvatar} className="w-12 h-12 rounded-full border-4 border-white shadow-sm" alt="Contractor" />
              <div className="text-left">
                  <p className="text-sm font-black text-secondary leading-none mb-1">{proposal.contractorName.split(' ')[0]}</p>
                  <p className="text-[10px] text-secondaryMuted font-bold uppercase tracking-wide">Postado agora</p>
              </div>
          </div>
          
          {isProfessional && proposal.status === ProposalStatus.OPEN ? (
             <button 
               onClick={() => setShowConfirm(true)}
               className="h-14 px-8 rounded-2xl text-xs font-black uppercase tracking-wider bg-primary text-white shadow-glow hover:scale-105 active:scale-95 transition-all"
             >
               Aceitar Job
             </button>
          ) : (
              <div className="bg-primary/5 text-primary px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-primary/10">
                  {proposal.status === ProposalStatus.OPEN ? 'Disponível' : 'Ocupado'}
              </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-secondary/80 backdrop-blur-md animate-fade-in-up">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[400px] flex flex-col border border-white/20">
                {isSuccess ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-success-pop">
                        <div className="w-28 h-28 bg-success rounded-full flex items-center justify-center shadow-glow mb-6">
                            <CheckCircle2 size={56} className="text-white" strokeWidth={3} />
                        </div>
                        <h3 className="text-3xl font-black text-secondary mb-2">Job Aceito!</h3>
                        <div className="bg-primary/5 px-6 py-3 rounded-full text-primary font-bold text-xs uppercase tracking-widest animate-pulse border border-primary/10 flex items-center gap-2">
                            <MessageCircle size={16} /> Abrindo Chat...
                        </div>
                    </div>
                ) : (
                <>
                    <div className="bg-primary p-8 pt-10 pb-12 text-center relative overflow-hidden shrink-0 text-white">
                        <button onClick={() => setShowConfirm(false)} className="absolute top-5 right-5 bg-white/10 rounded-full p-2"><X size={20} /></button>
                        <h3 className="text-3xl font-black leading-tight">Vamos fechar<br/>esse Job?</h3>
                    </div>
                    <div className="p-8 -mt-8 bg-white rounded-t-[2.5rem] relative z-10 flex-1 flex flex-col shadow-lg">
                        <div className="text-center mb-8">
                            <p className="text-secondaryMuted text-[10px] font-bold uppercase tracking-widest mb-2">Você está aceitando:</p>
                            <h4 className="text-2xl font-extrabold text-secondary mb-1">{proposal.title}</h4>
                            <p className="text-primary font-black text-lg">{proposal.budgetRange}</p>
                        </div>
                        <div className="space-y-3 mt-auto">
                            <button onClick={handleConfirm} className="w-full bg-primary hover:bg-primaryDark text-white h-16 rounded-2xl font-black text-sm uppercase tracking-widest shadow-glow flex items-center justify-center gap-3 transition-all">
                                <CheckCircle2 size={20} /> Confirmar e Contratar
                            </button>
                            <button onClick={() => setShowConfirm(false)} className="w-full h-14 rounded-2xl font-bold text-xs text-secondaryMuted hover:bg-gray-50 transition-colors uppercase tracking-widest">Cancelar</button>
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
