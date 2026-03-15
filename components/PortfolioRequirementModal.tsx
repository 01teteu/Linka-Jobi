import React from 'react';
import { AlertTriangle, ArrowRight, LayoutTemplate, Sparkles } from 'lucide-react';

interface PortfolioRequirementModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

const PortfolioRequirementModal: React.FC<PortfolioRequirementModalProps> = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-scale-in text-center relative overflow-hidden border border-white/20">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-50 to-transparent -z-10"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-50"></div>
        
        <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-yellow-500 shadow-xl shadow-yellow-500/10 border border-yellow-100 relative group">
            <div className="absolute inset-0 bg-yellow-50 rounded-[1.5rem] transform rotate-6 scale-90 transition-transform group-hover:rotate-12"></div>
            <AlertTriangle size={36} strokeWidth={2.5} className="relative z-10" />
        </div>
        
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide mb-4">
            <Sparkles size={12} /> Ação Necessária
        </div>

        <h2 className="font-display font-black text-2xl text-secondary mb-3 leading-tight">
            Complete seu Perfil
        </h2>
        
        <p className="text-secondaryMuted text-sm leading-relaxed mb-8">
            Para ativar sua conta e começar a receber propostas, você precisa adicionar fotos ao seu <strong>Portfólio</strong>. É sua chance de brilhar!
        </p>
        
        <button 
            onClick={onConfirm}
            className="w-full bg-primary hover:bg-primaryDark text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-primary/25 transition-all active:scale-95 flex items-center justify-center gap-2 group"
        >
            <LayoutTemplate size={18} />
            Preencher Portfólio Agora
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default PortfolioRequirementModal;
