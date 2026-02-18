
import React from 'react';
import { User, UserRole } from '../types';
import { CheckCircle, Crown, ShieldCheck, Zap, Star, X, Unlock, ChevronRight, Users, MessageSquare } from 'lucide-react';

interface SubscriptionScreenProps {
    user: User;
    onSubscribe: () => void;
    onCancel: () => void;
    onClose: () => void;
    isLoading: boolean;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ user, onSubscribe, onCancel, onClose, isLoading }) => {
    // Cast to access professional specific fields safely
    const isSubscriber = (user as any).isSubscriber;
    const isProfessional = user.role === UserRole.PROFESSIONAL;

    // Configuração de Conteúdo baseada no Tipo de Usuário
    const content = isProfessional ? {
        title: "Seja Linka",
        subtitle: "PRO",
        description: "Desbloqueie todos os jobs e feche negócios sem limites.",
        benefits: [
            {
                icon: <Unlock className="w-6 h-6 text-amber-600" />,
                bg: "bg-amber-50",
                title: "Veja todas as propostas",
                desc: "Desbloqueie descrições, valores e contatos de todos os jobs."
            },
            {
                icon: <Zap className="w-6 h-6 text-purple-600" />,
                bg: "bg-purple-50",
                title: "Saia na frente",
                desc: "Receba jobs 10 minutos antes dos usuários gratuitos."
            },
            {
                icon: <Star className="w-6 h-6 text-blue-600" />,
                bg: "bg-blue-50",
                title: "Perfil Destacado",
                desc: "Apareça no topo das buscas e ganhe o selo de Verificado."
            }
        ]
    } : {
        title: "Linka",
        subtitle: "PRIME",
        description: "Encontre os melhores profissionais e tenha prioridade no atendimento.",
        benefits: [
            {
                icon: <Users className="w-6 h-6 text-amber-600" />,
                bg: "bg-amber-50",
                title: "Acesso aos Melhores",
                desc: "Veja perfis completos dos profissionais mais bem avaliados."
            },
            {
                icon: <ShieldCheck className="w-6 h-6 text-green-600" />,
                bg: "bg-green-50",
                title: "Garantia de Serviço",
                desc: "Suporte prioritário e seguro contra danos em serviços contratados."
            },
            {
                icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
                bg: "bg-blue-50",
                title: "Chat Ilimitado",
                desc: "Converse com quantos profissionais quiser sem restrições."
            }
        ]
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-fade-in-up overflow-y-auto">
            <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 text-white backdrop-blur-md flex items-center justify-center transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Hero Section */}
                <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-10 pb-16 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 rotate-3 animate-scale-in">
                            <Crown className="w-10 h-10 text-amber-500 fill-amber-500" />
                        </div>
                        
                        <h2 className="font-display text-4xl font-extrabold text-white mb-2 leading-tight drop-shadow-md">
                            {content.title} <span className="text-yellow-200">{content.subtitle}</span>
                        </h2>
                        <p className="text-white/90 font-medium text-sm max-w-xs mx-auto">
                            {content.description}
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 bg-white relative -mt-10 rounded-t-[3rem] p-8 pb-10 z-10">
                    
                    {/* Price Card Floating */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white p-2 pr-6 pl-6 rounded-full shadow-xl border border-gray-100 flex items-center gap-3 whitespace-nowrap">
                         <div className="flex flex-col text-right leading-none">
                            <span className="text-[10px] text-textMuted font-bold uppercase tracking-wide line-through opacity-60">R$ 29,90</span>
                            <span className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Promoção</span>
                         </div>
                         <div className="flex items-baseline gap-0.5 text-textMain">
                            <span className="text-sm font-bold">R$</span>
                            <span className="text-3xl font-black tracking-tighter">19,90</span>
                            <span className="text-xs font-bold text-textMuted">/mês</span>
                         </div>
                    </div>

                    <div className="mt-10 space-y-6">
                         {content.benefits.map((benefit, index) => (
                             <div key={index} className="flex items-center gap-4 group">
                                <div className={`w-12 h-12 ${benefit.bg} rounded-2xl flex items-center justify-center group-hover:brightness-95 transition-colors`}>
                                    {benefit.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-textMain text-base">{benefit.title}</h4>
                                    <p className="text-textMuted text-xs font-medium">{benefit.desc}</p>
                                </div>
                            </div>
                         ))}
                    </div>

                    <div className="mt-10">
                        {isSubscriber ? (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-black text-green-800 text-sm">Você é {content.subtitle}!</p>
                                        <p className="text-xs text-green-700 font-medium">Sua assinatura está ativa e você tem acesso total.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={onCancel}
                                    disabled={isLoading}
                                    className="w-full py-3 text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    {isLoading ? 'Processando...' : 'Cancelar Plano'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button 
                                    onClick={onSubscribe}
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:to-orange-600 text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    {isLoading ? 'Confirmando...' : 'Assinar e Desbloquear'}
                                    {!isLoading && <ChevronRight className="w-6 h-6" />}
                                </button>
                                <p className="text-[10px] text-center text-textMuted font-medium">
                                    Cancelamento grátis a qualquer momento. Pagamento seguro.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionScreen;
