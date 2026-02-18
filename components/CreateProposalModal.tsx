
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, MapPin, DollarSign, ListFilter, Sparkles, Loader2, User } from 'lucide-react';
import { Proposal, ServiceSubItem, User as UserType } from '../types';
import { Backend } from '../services/mockBackend';
import { enhanceProposalDescription, suggestServiceCategory } from '../services/geminiService';
import { useToast } from './ToastContext';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (proposal: Partial<Proposal>) => Promise<void>; // Retorna Promise para saber se deu sucesso
  initialCategory?: string | null;
  targetProfessional?: UserType | null; 
}

const CreateProposalModal: React.FC<CreateProposalModalProps> = ({ isOpen, onClose, onSubmit, initialCategory, targetProfessional }) => {
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<ServiceSubItem[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    areaTag: '',
    location: '',
    budgetRange: '',
  });

  useEffect(() => {
    if (isOpen) {
        Backend.getServices().then(res => {
            const list = res || [];
            setCatalog(list.filter(s => s.isActive));
        });
        
        // Lógica de Preenchimento Inicial
        if (targetProfessional && targetProfessional.specialty) {
            setFormData(prev => ({ ...prev, areaTag: targetProfessional.specialty || '' }));
        } else if (initialCategory) {
            setFormData(prev => ({ ...prev, areaTag: initialCategory }));
        }
    }
  }, [isOpen, initialCategory, targetProfessional]);

  const handleAiMagic = async () => {
      if (!formData.description || formData.description.length < 3) return;
      
      setIsAiLoading(true);
      try {
          const enhancedText = await enhanceProposalDescription(formData.description);
          setFormData(prev => ({ ...prev, description: enhancedText }));
          
          if (!targetProfessional) {
              const suggestedCat = await suggestServiceCategory(formData.description);
              if (suggestedCat) {
                  const match = catalog.find(c => c.name.toLowerCase().includes(suggestedCat.toLowerCase()));
                  if (match) setFormData(prev => ({ ...prev, areaTag: match.name }));
              }
          }
      } catch (error) {
          console.error("AI Error", error);
          addToast("Não foi possível usar a IA agora.", "info");
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
        await onSubmit({ 
            ...formData, 
            title: targetProfessional ? `Convite: ${formData.areaTag}` : (formData.areaTag + " - Solicitação"),
            targetProfessionalId: targetProfessional?.id 
        });
        
        // Se sucesso:
        setStep(1);
        setFormData({ title: '', description: '', areaTag: '', location: '', budgetRange: '' });
        onClose(); 
    } catch (error: any) {
        // Se erro, o modal permanece aberto
        console.error("Erro ao enviar proposta:", error);
        // O Toast de erro já é disparado pelo componente pai (App.tsx), 
        // mas aqui garantimos que o estado isSubmitting seja limpo.
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-background flex flex-col p-8 animate-fade-in-up overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-1.5">
            {[1,2,3].map(s => (
                <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${step >= s ? 'bg-primary' : 'bg-gray-100'}`} />
            ))}
        </div>
        <button onClick={onClose} disabled={isSubmitting} className="w-12 h-12 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 disabled:opacity-50">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {step === 1 && (
            <div className="space-y-6 animate-scale-in">
                {targetProfessional ? (
                    <div className="mb-4">
                        <div className="flex items-center gap-3 mb-2">
                             <img src={targetProfessional.avatarUrl} className="w-12 h-12 rounded-full border-2 border-primary" />
                             <div>
                                 <p className="text-xs font-bold text-primary uppercase">Pedido Direto Para</p>
                                 <h2 className="text-2xl font-extrabold text-textMain">{targetProfessional.name}</h2>
                             </div>
                        </div>
                        <p className="text-textMuted text-sm">Descreva o serviço para {targetProfessional.name.split(' ')[0]} avaliar.</p>
                    </div>
                ) : (
                    <h2 className="text-4xl font-extrabold text-textMain leading-tight">O que você <br/> <span className="text-primary">precisa hoje?</span></h2>
                )}

                <div className="space-y-4">
                    <div className="relative">
                        {/* Se tem um profissional alvo OU se veio dos Destaques (InitialCategory), mostra o serviço selecionado com destaque */}
                        {(targetProfessional || initialCategory) ? (
                             <div className="w-full bg-primary/5 border-2 border-primary/20 rounded-3xl p-6 flex items-center justify-between gap-3">
                                 <div className="flex items-center gap-3">
                                     <span className="font-bold text-textMain text-lg">{formData.areaTag || initialCategory}</span>
                                 </div>
                                 <Check className="text-primary" size={20} />
                             </div>
                        ) : (
                            // Select Normal
                            <>
                                <select 
                                    className="w-full bg-white border-2 border-gray-100 rounded-3xl p-6 text-lg font-bold outline-none focus:border-primary appearance-none transition-all"
                                    value={formData.areaTag}
                                    onChange={(e) => setFormData({...formData, areaTag: e.target.value})}
                                >
                                    <option value="">Escolha a categoria</option>
                                    {catalog.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                </select>
                                <ListFilter className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                            </>
                        )}
                    </div>
                    
                    <div className="relative">
                        <textarea
                            className="w-full bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 text-lg font-medium outline-none focus:border-primary min-h-[180px] shadow-inner transition-all resize-none"
                            placeholder={targetProfessional ? `Olá ${targetProfessional.name.split(' ')[0]}, preciso de...` : "Ex: Minha pia está vazando muito água..."}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                        
                        <button 
                            onClick={handleAiMagic}
                            disabled={isAiLoading || !formData.description}
                            className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg transition-all ${
                                isAiLoading 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:scale-105 active:scale-95'
                            }`}
                        >
                            {isAiLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Sparkles className="w-4 h-4" />}
                            {isAiLoading ? 'Pensando...' : 'Melhorar com IA'}
                        </button>
                    </div>
                </div>
                <button onClick={() => setStep(2)} disabled={!formData.areaTag || !formData.description} className="w-full bg-primary text-white h-16 rounded-full font-bold text-lg shadow-xl disabled:opacity-30 transition-all">Próximo</button>
            </div>
        )}

        {step === 2 && (
            <div className="space-y-8 animate-scale-in">
                <h2 className="text-4xl font-extrabold text-textMain leading-tight">Onde e <br/> <span className="text-primary">quanto?</span></h2>
                <div className="space-y-4">
                    <div className="relative">
                        <MapPin className="absolute left-6 top-6 text-primary" size={20} />
                        <input 
                            className="w-full bg-white border-2 border-gray-100 rounded-full p-6 pl-14 text-lg font-bold outline-none focus:border-primary"
                            placeholder="Seu bairro ou CEP"
                            value={formData.location}
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                        />
                    </div>
                    <div className="relative">
                        <DollarSign className="absolute left-6 top-6 text-primary" size={20} />
                        <input 
                            className="w-full bg-white border-2 border-gray-100 rounded-full p-6 pl-14 text-lg font-bold outline-none focus:border-primary"
                            placeholder="Valor aproximado (R$)"
                            value={formData.budgetRange}
                            onChange={(e) => setFormData({...formData, budgetRange: e.target.value})}
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <ArrowRight className="rotate-180 text-textMuted" />
                    </button>
                    <button onClick={() => setStep(3)} disabled={!formData.location} className="flex-1 bg-primary text-white h-16 rounded-full font-bold text-lg shadow-xl">Revisar</button>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="space-y-8 animate-scale-in text-center">
                <div className="w-24 h-24 bg-success rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-xl">
                    <Check className="text-primary w-12 h-12 stroke-[4px]" />
                </div>
                <h2 className="text-4xl font-extrabold text-textMain">Confirma?</h2>
                <div className="bg-primaryContainer/30 p-8 rounded-[3rem] border border-primaryContainer/50 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Sparkles size={100} />
                    </div>
                    {targetProfessional && (
                         <div className="flex items-center gap-2 mb-4 bg-white/50 p-2 rounded-xl w-fit">
                             <User size={14} className="text-primary"/>
                             <span className="text-xs font-bold text-primary">Para: {targetProfessional.name}</span>
                         </div>
                    )}
                    <p className="text-primary font-black text-[10px] uppercase tracking-widest mb-4">Resumo do pedido:</p>
                    <p className="text-textMain font-bold text-xl mb-3 leading-tight flex items-center gap-2">
                        {formData.areaTag}
                    </p>
                    <p className="text-textMuted text-sm italic font-medium mb-4 leading-relaxed">"{formData.description}"</p>
                    <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-black uppercase text-primary bg-white px-3 py-1.5 rounded-full shadow-sm">{formData.location}</span>
                        <span className="text-[10px] font-black uppercase text-primary bg-white px-3 py-1.5 rounded-full shadow-sm">R$ {formData.budgetRange}</span>
                    </div>
                </div>
                <div className="pt-4 space-y-3">
                    <button 
                        onClick={handleFinalSubmit} 
                        disabled={isSubmitting}
                        className="w-full bg-primary text-white h-20 rounded-full font-black text-xl shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:shadow-none"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : (targetProfessional ? 'Enviar Convite' : 'Publicar Agora')}
                    </button>
                    <button onClick={() => setStep(1)} disabled={isSubmitting} className="w-full text-textMuted font-bold py-2 disabled:opacity-50">Quero editar</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CreateProposalModal;
