
import React, { useState, useEffect } from 'react';
import { User, Transaction, UserRole } from '../types';
import { Backend } from '../services/mockBackend';
import { 
    Wallet, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, CreditCard, 
    Banknote, PieChart, ChevronLeft, Loader2, ArrowRight
} from 'lucide-react';
import { useToast } from './ToastContext';

interface WalletInterfaceProps {
    user: User;
    onBack: () => void;
}

const WalletInterface: React.FC<WalletInterfaceProps> = ({ user, onBack }) => {
    const { addToast } = useToast();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 800)); // Simulando delay de rede bancária
            const data = await Backend.getUserWallet(user.id, user.role);
            setBalance(data.balance);
            setTransactions(data.transactions);
            setLoading(false);
        };
        load();
    }, [user]);

    const handleWithdraw = () => {
        addToast("Saque de R$ 500,00 solicitado via PIX.", "success");
        // Simulação visual de atualização
        setBalance(prev => prev - 500);
        const newTrans: Transaction = {
             id: 'new_' + Date.now(),
             type: 'WITHDRAW',
             amount: 500,
             description: 'Saque PIX',
             date: new Date().toISOString(),
             status: 'PENDING'
        };
        setTransactions(prev => [newTrans, ...prev]);
    };

    const handleAddFunds = () => {
        addToast("Boleto gerado. O saldo cairá em até 2 dias.", "info");
    };

    return (
        <div className="max-w-xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <ChevronLeft size={20} className="text-textMain" />
                </button>
                <h2 className="text-2xl font-extrabold text-textMain">Linka Pay</h2>
            </header>

            {/* BALANCE CARD (Estilo Nubank/Fintech) */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-[2.5rem] p-8 text-white shadow-2xl shadow-gray-400/30 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-2 text-white/70">
                            <Wallet size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest">Saldo Disponível</span>
                        </div>
                        <button onClick={() => setShowBalance(!showBalance)} className="opacity-70 hover:opacity-100 transition-opacity">
                            {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                    </div>

                    <div className="mb-8">
                        {loading ? (
                            <div className="h-10 w-32 bg-white/10 rounded animate-pulse"></div>
                        ) : (
                            <h1 className="text-4xl font-black tracking-tight">
                                {showBalance ? `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ••••••'}
                            </h1>
                        )}
                    </div>

                    <div className="flex gap-4">
                        {user.role === UserRole.PROFESSIONAL ? (
                             <button 
                                onClick={handleWithdraw}
                                disabled={balance <= 0}
                                className="flex-1 bg-primary hover:bg-violet-600 disabled:opacity-50 disabled:bg-gray-700 text-white h-12 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30"
                             >
                                <ArrowUpRight size={16} /> Sacar
                             </button>
                        ) : (
                            <button 
                                onClick={handleAddFunds}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white h-12 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/30"
                             >
                                <ArrowDownLeft size={16} /> Adicionar
                             </button>
                        )}
                        <button className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                            <PieChart size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <button className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-textMain group-hover:bg-primary group-hover:text-white transition-colors">
                        <CreditCard size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-textMuted uppercase">Cartões</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-textMain group-hover:bg-primary group-hover:text-white transition-colors">
                        <Banknote size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-textMuted uppercase">Boleto</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all group">
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-textMain group-hover:bg-primary group-hover:text-white transition-colors">
                        <ArrowRight size={20} className="-rotate-45"/>
                    </div>
                    <span className="text-[10px] font-bold text-textMuted uppercase">Pix</span>
                </button>
            </div>

            {/* Transactions History */}
            <h3 className="text-lg font-black text-textMain mb-4">Histórico</h3>
            <div className="bg-white rounded-[2rem] p-2 border border-gray-100 shadow-sm min-h-[200px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 opacity-50">
                        <Loader2 className="animate-spin mb-2" />
                        <p className="text-xs font-bold">Carregando extrato...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <p className="text-sm font-bold">Nenhuma movimentação</p>
                    </div>
                ) : (
                    <div>
                        {transactions.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        t.type === 'INCOME' || t.type === 'DEPOSIT' 
                                        ? 'bg-green-100 text-green-600' 
                                        : 'bg-gray-100 text-textMuted'
                                    }`}>
                                        {t.type === 'INCOME' || t.type === 'DEPOSIT' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-textMain text-sm">{t.description}</h4>
                                        <p className="text-[10px] text-textMuted font-medium">{new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className={`text-right ${
                                    t.type === 'INCOME' || t.type === 'DEPOSIT' ? 'text-green-600' : 'text-textMain'
                                }`}>
                                    <p className="font-black text-sm">
                                        {t.type === 'INCOME' || t.type === 'DEPOSIT' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                    </p>
                                    <p className="text-[9px] font-bold uppercase text-gray-400">{t.status === 'PENDING' ? 'Pendente' : 'Pago'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WalletInterface;
