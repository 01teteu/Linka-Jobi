
import React from 'react';
import { Proposal, ProposalStatus } from '../types';
import { X, MapPin, DollarSign, Calendar, Clock, CheckCircle2, Circle, ArrowRight, FileText, AlertCircle, MessageCircle } from 'lucide-react';

interface ProposalDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    proposal: Proposal | null;
}

const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({ isOpen, onClose, proposal }) => {
    if (!isOpen || !proposal) return null;

    // Definição visual baseada no status
    const getStatusInfo = (status: ProposalStatus) => {
        switch (status) {
            case ProposalStatus.OPEN:
                return {
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    label: 'Em Aberto',
                    desc: 'Aguardando profissionais interessados.',
                    step: 1
                };
            case ProposalStatus.NEGOTIATING:
                return {
                    color: 'text-amber-600',
                    bg: 'bg-amber-50',
                    borderColor: 'border-amber-200',
                    label: 'Em Negociação',
                    desc: 'Você está conversando com um profissional.',
                    step: 2
                };
            case ProposalStatus.COMPLETED:
                return {
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                    borderColor: 'border-green-200',
                    label: 'Finalizado',
                    desc: 'Serviço concluído com sucesso.',
                    step: 3
                };
            default:
                return { color: 'text-gray-600', bg: 'bg-gray-50', borderColor: 'border-gray-200', label: 'Desconhecido', desc: '', step: 0 };
        }
    };

    const statusInfo = getStatusInfo(proposal.status);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in-up">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-scale-in flex flex-col max-h-[90vh]">
                
                {/* Header com Gradiente Suave */}
                <div className="relative p-8 pb-10 bg-gradient-to-br from-white to-gray-50 border-b border-gray-100">
                    <button 
                        onClick={onClose}
                        className="absolute top-5 right-5 w-10 h-10 bg-white rounded-full flex items-center justify-center text-textMuted hover:bg-gray-100 border border-gray-100 shadow-sm transition-all z-20"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col gap-4">
                        <span className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.borderColor}`}>
                            {statusInfo.label}
                        </span>
                        <h2 className="text-3xl font-display font-black text-textMain leading-tight">
                            {proposal.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-textMuted">
                            <Calendar size={14} />
                            <span>Postado em {new Date(proposal.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <Clock size={14} />
                            <span>{new Date(proposal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>

                {/* Conteúdo Scrollável */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-white">
                    
                    {/* Linha do Tempo de Status */}
                    <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                        <h3 className="text-sm font-black text-textMain mb-4 uppercase tracking-wide">Status do Pedido</h3>
                        <div className="relative flex justify-between items-center px-2">
                            {/* Linha de fundo */}
                            <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-200 -z-10 rounded-full"></div>
                            {/* Linha de progresso */}
                            <div 
                                className="absolute left-0 top-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-500"
                                style={{ width: statusInfo.step === 1 ? '0%' : statusInfo.step === 2 ? '50%' : '100%' }}
                            ></div>

                            {/* Steps */}
                            <div className={`flex flex-col items-center gap-2 ${statusInfo.step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${statusInfo.step >= 1 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-300 text-white'}`}>
                                    <FileText size={14} />
                                </div>
                                <span className="text-[9px] font-black uppercase">Aberto</span>
                            </div>

                            <div className={`flex flex-col items-center gap-2 ${statusInfo.step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${statusInfo.step >= 2 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-300 text-white'}`}>
                                    <MessageCircle size={14} />
                                </div>
                                <span className="text-[9px] font-black uppercase">Negociando</span>
                            </div>

                            <div className={`flex flex-col items-center gap-2 ${statusInfo.step >= 3 ? 'text-green-500' : 'text-gray-400'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${statusInfo.step >= 3 ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-gray-300 text-white'}`}>
                                    <CheckCircle2 size={14} />
                                </div>
                                <span className="text-[9px] font-black uppercase">Pronto</span>
                            </div>
                        </div>
                        <p className="text-center text-xs text-textMuted font-medium mt-6 bg-white p-3 rounded-xl border border-gray-100">
                            {statusInfo.desc}
                        </p>
                    </div>

                    {/* Detalhes Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-2">
                                <DollarSign size={18} />
                            </div>
                            <p className="text-[10px] text-textMuted font-black uppercase tracking-widest">Orçamento</p>
                            <p className="text-sm font-bold text-textMain mt-0.5">{proposal.budgetRange}</p>
                        </div>
                        <div className="p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                                <MapPin size={18} />
                            </div>
                            <p className="text-[10px] text-textMuted font-black uppercase tracking-widest">Local</p>
                            <p className="text-sm font-bold text-textMain mt-0.5 truncate">{proposal.location}</p>
                        </div>
                    </div>

                    {/* Descrição Completa */}
                    <div>
                        <h3 className="text-sm font-black text-textMain mb-3 uppercase tracking-wide">Descrição do Problema</h3>
                        <div className="p-5 rounded-[1.5rem] bg-gray-50 border border-gray-100 text-sm text-textMain leading-relaxed font-medium">
                            "{proposal.description}"
                        </div>
                    </div>

                    {/* Profissional Selecionado (Se houver) */}
                    {proposal.status !== ProposalStatus.OPEN && (
                        <div>
                            <h3 className="text-sm font-black text-textMain mb-3 uppercase tracking-wide">Profissional Responsável</h3>
                            <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                     <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-bold text-textMain">João Silva</p>
                                    <p className="text-xs text-textMuted">Aceitou o serviço</p>
                                </div>
                                <button className="ml-auto bg-primary text-white p-2 rounded-xl">
                                    <MessageCircle size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
                    {proposal.status === ProposalStatus.OPEN ? (
                        <button className="w-full py-4 rounded-2xl font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                            <AlertCircle size={18} /> Cancelar Pedido
                        </button>
                    ) : (
                        <button 
                            className="w-full py-4 rounded-2xl font-bold text-white bg-primary hover:bg-primaryDark transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            onClick={onClose}
                        >
                            <MessageCircle size={18} /> Ir para o Chat
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProposalDetailModal;
