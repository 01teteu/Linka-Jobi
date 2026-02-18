
import React from 'react';
import { ProfessionalDashboardStats } from '../types';
import { TrendingUp, Users, Star, Briefcase, Sparkles, Wallet, ArrowUpRight, ShieldCheck, Crown, Eye, ChevronRight, BarChart3, CalendarCheck } from 'lucide-react';

interface ProfessionalDashboardProps {
    stats: ProfessionalDashboardStats;
}

const ProfessionalDashboard: React.FC<ProfessionalDashboardProps> = ({ stats }) => {
    const maxChartValue = Math.max(...stats.chartData.map(d => d.jobs), 5);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    // Formata moeda
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            
            {/* --- HEADER --- */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md shadow-yellow-500/20">
                            <Crown size={12} fill="currentColor" /> Profissional Ouro
                        </span>
                    </div>
                    <h1 className="font-display text-3xl font-extrabold text-secondary tracking-tight">
                        {greeting}, Mestre!
                    </h1>
                    <p className="text-secondaryMuted font-medium text-sm">
                        Confira o resumo da sua performance este mês.
                    </p>
                </div>
                <div className="hidden md:block">
                    <button className="bg-white border border-gray-200 text-secondary font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                        <ShieldCheck size={16} className="text-primary"/> Central de Ajuda
                    </button>
                </div>
            </div>

            {/* --- HERO PERFORMANCE CARD (NO WALLET) --- */}
            <div className="relative w-full bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary/20 overflow-hidden mb-8 group">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-primary/30 to-transparent rounded-full blur-[80px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[60px] -ml-20 -mb-20"></div>
                
                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
                    <div className="space-y-6 flex-1 w-full">
                        <div className="flex items-center justify-between md:justify-start gap-4">
                            <div className="flex items-center gap-3 opacity-90">
                                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/5">
                                    <BarChart3 size={20} className="text-blue-400" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-widest text-gray-300">Resumo Mensal</span>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Estimativa de Faturamento</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-white">
                                    {formatCurrency(stats.totalEarningsMonth)}
                                </h2>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium mt-1">*Valores baseados nos orçamentos fechados diretamente com clientes.</p>
                        </div>
                    </div>

                    {/* Stats Blocks */}
                    <div className="flex gap-3 w-full md:w-auto">
                         <div className="flex-1 md:w-40 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2 text-primaryLight">
                                <Briefcase size={16} />
                                <span className="text-[10px] font-black uppercase">Jobs Feitos</span>
                            </div>
                            <p className="text-2xl font-black">{stats.completedJobsMonth}</p>
                            <span className="text-[10px] text-green-400 font-bold">+2 essa semana</span>
                         </div>

                         <div className="flex-1 md:w-40 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2 text-yellow-300">
                                <Star size={16} />
                                <span className="text-[10px] font-black uppercase">Reputação</span>
                            </div>
                            <p className="text-2xl font-black">4.9</p>
                            <span className="text-[10px] text-gray-400 font-bold">Excelente</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* --- METRICS GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard 
                    icon={<Eye size={20}/>} 
                    value={stats.profileViews} 
                    label="Visitas no Perfil" 
                    trend="+15% esta semana"
                    color="text-purple-600" 
                    bg="bg-purple-50"
                    border="border-purple-100"
                />
                <MetricCard 
                    icon={<CalendarCheck size={20}/>} 
                    value="98%" 
                    label="Assiduidade" 
                    trend="Sempre pontual"
                    color="text-teal-600" 
                    bg="bg-teal-50"
                    border="border-teal-100"
                />
                <MetricCard 
                    icon={<Sparkles size={20}/>} 
                    value="Rápido" 
                    label="Tempo de Resposta" 
                    trend="Média: 15 min"
                    color="text-blue-600" 
                    bg="bg-blue-50"
                    border="border-blue-100"
                />
                <MetricCard 
                    icon={<ShieldCheck size={20}/>} 
                    value="Verificado" 
                    label="Status da Conta" 
                    trend="Documentos OK"
                    color="text-green-600" 
                    bg="bg-green-50"
                    border="border-green-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- CHART SECTION --- */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-card relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-black text-xl text-secondary">Volume de Trabalho</h3>
                            <p className="text-xs text-secondaryMuted font-medium mt-1">Serviços concluídos nos últimos 7 dias.</p>
                        </div>
                        <select className="bg-gray-50 border border-gray-200 text-xs font-bold text-secondary px-3 py-2 rounded-xl outline-none">
                            <option>Esta Semana</option>
                            <option>Semana Passada</option>
                        </select>
                    </div>

                    <div className="h-56 w-full flex items-end justify-between gap-3 sm:gap-6 relative z-10">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                        </div>

                        {stats.chartData.map((data, index) => {
                            const heightPct = Math.max((data.jobs / maxChartValue) * 100, 8);
                            const isToday = data.day === 'Sex'; // Mock logic for 'Today' highlight
                            
                            return (
                                <div key={index} className="flex flex-col items-center justify-end h-full w-full group cursor-pointer">
                                    <div className="relative w-full max-w-[40px] h-full flex items-end">
                                        <div 
                                            className={`w-full rounded-t-2xl transition-all duration-700 ease-out relative overflow-hidden ${
                                                isToday 
                                                ? 'bg-gradient-to-t from-primary to-violet-400 shadow-lg shadow-primary/30' 
                                                : 'bg-gray-100 group-hover:bg-primaryLight'
                                            }`}
                                            style={{ height: `${heightPct}%` }}
                                        >
                                            {/* Bar Shine Effect */}
                                            {isToday && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent"></div>}
                                        </div>
                                        
                                        {/* Tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-xl whitespace-nowrap z-20 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                            {data.jobs} Jobs
                                            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary rotate-45"></div>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold mt-4 uppercase ${isToday ? 'text-primary' : 'text-gray-400'}`}>{data.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- RECENT REVIEWS --- */}
                <div className="bg-gray-50 rounded-[2.5rem] p-6 border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-lg text-secondary">Últimos Feedbacks</h3>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">Ver todos</span>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-[350px]">
                        {stats.recentReviews.map((review, idx) => (
                            <div key={review.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative">
                                <div className="absolute top-4 right-4 text-gray-300 opacity-20">
                                    <QuoteIcon />
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-black text-gray-500 border border-white shadow-sm">
                                        {review.reviewerName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-secondary">{review.reviewerName}</p>
                                        <div className="flex text-yellow-400 gap-0.5">
                                            {[...Array(review.rating)].map((_, i) => <Star key={i} size={8} fill="currentColor"/>)}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-secondary/80 font-medium leading-relaxed">"{review.comment}"</p>
                                {/* Botão de Responder removido conforme solicitado */}
                            </div>
                        ))}
                        {stats.recentReviews.length === 0 && (
                            <div className="text-center py-10 opacity-50">
                                <p className="text-xs font-bold">Sem avaliações recentes.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ icon, value, label, trend, color, bg, border }: any) => (
    <div className={`p-5 rounded-[1.8rem] bg-white border ${border} shadow-sm hover:shadow-lg transition-all group relative overflow-hidden`}>
        <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
        <h4 className="text-2xl font-display font-black text-secondary tracking-tight leading-none mb-1">{value}</h4>
        <p className="text-[10px] font-bold text-secondaryMuted uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-[9px] font-bold ${color} opacity-80`}>{trend}</p>
    </div>
);

const QuoteIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
    </svg>
);

export default ProfessionalDashboard;
