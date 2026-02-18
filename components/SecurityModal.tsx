
import React from 'react';
import { X, ShieldCheck, MessageCircle, AlertTriangle, Eye, Lock, Phone } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const tips = [
    {
      icon: <MessageCircle className="w-5 h-5 text-blue-500" />,
      bg: "bg-blue-50",
      title: "Mantenha o papo no App",
      desc: "Nunca negocie por WhatsApp antes de fechar. O chat do Linka é monitorado para sua segurança."
    },
    {
      icon: <Lock className="w-5 h-5 text-purple-500" />,
      bg: "bg-purple-50",
      title: "Pagamento Seguro",
      desc: "Evite pagar 100% adiantado. Combine o pagamento após a conclusão ou em etapas conforme o avanço."
    },
    {
      icon: <Eye className="w-5 h-5 text-amber-500" />,
      bg: "bg-amber-50",
      title: "Verifique a Identidade",
      desc: "Ao receber o profissional, peça um documento com foto e confira se é a mesma pessoa do perfil."
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      bg: "bg-red-50",
      title: "Objetos de Valor",
      desc: "Guarde joias, dinheiro e eletrônicos pequenos antes do profissional chegar. Prevenir é sempre melhor."
    }
  ];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-scale-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-green-500 p-8 pt-10 pb-12 text-center relative">
            <button 
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 bg-black/10 rounded-full flex items-center justify-center text-white hover:bg-black/20 transition-colors"
            >
                <X size={18} />
            </button>
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg text-green-500">
                <ShieldCheck size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">Segurança em<br/>Primeiro Lugar</h2>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white relative -mt-6 rounded-t-[2rem] p-6 overflow-y-auto">
            <p className="text-textMuted text-sm font-medium text-center mb-8 px-4">
                Siga estas 4 regras de ouro para garantir uma experiência tranquila e segura ao contratar.
            </p>

            <div className="space-y-4 mb-8">
                {tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-2xl border border-gray-50 hover:border-gray-100 hover:shadow-sm transition-all">
                        <div className={`w-12 h-12 rounded-2xl ${tip.bg} flex items-center justify-center flex-shrink-0`}>
                            {tip.icon}
                        </div>
                        <div>
                            <h4 className="font-extrabold text-textMain text-sm mb-1">{tip.title}</h4>
                            <p className="text-xs text-textMuted leading-relaxed">{tip.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-red-50 rounded-2xl p-4 border border-red-100 mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Phone size={16} className="text-red-500" />
                    <span className="text-xs font-black text-red-600 uppercase">Em caso de Emergência</span>
                </div>
                <p className="text-[10px] text-red-800 font-medium leading-relaxed">
                    Se sentir ameaçado ou notar comportamento suspeito, encerre o serviço imediatamente e ligue para <strong>190</strong>. Depois, reporte no app.
                </p>
            </div>

            <button 
                onClick={onClose}
                className="w-full bg-primary text-white h-14 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
                Entendi, vou me cuidar
            </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityModal;
