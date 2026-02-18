
import React from 'react';
import { ProfessionalDashboardStats } from '../types';
import { TrendingUp, Users, Star, Briefcase, Sparkles, Heart, CheckCircle2 } from 'lucide-react';

interface ProfessionalDashboardProps {
    stats: ProfessionalDashboardStats;
}

const ProfessionalDashboard: React.FC<ProfessionalDashboardProps> = ({ stats }) => {
    const maxChartValue = Math.max(...stats.chartData.map(d => d.jobs), 5);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                <div>
                    <p className="text-primary font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Sparkles size={14} /> Gestão Profissional
                    </p>
                    <h1 className="text-4xl font-extrabold text-secondary tracking-tight mb-2">
                        {greeting}, Vizinho!
                    </h1>
                    <p className="text-secondaryMuted font-medium text-sm">
                        Acompanhe seu progresso e os jobs realizados.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2 bg-gradient-to-br from-[#2E2856] via-[#463896] to-[#7F56D9] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 w-fit mb-6">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sempre Online</span>
                        </div>
                        <div>
                            <p className="text-white/70 text-sm font-medium mb-1">Total de Jobs Realizados</p>
                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">{stats.completedJobsMonth}</h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-green-300 bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20 w-fit">
                            <TrendingUp size={14} /> Reputação excelente!
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-card flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 rounded-full border-[6px] border-yellow-50 flex items-center justify-center bg-white shadow-sm mb-4">
                        <Star size={40} className="text-yellow-400 fill-yellow-400" />
                    </div>
                    <h3 className="text-4xl font-black text-secondary mb-1">4.9</h3>
                    <p className="text-secondaryMuted text-xs font-bold uppercase tracking-widest">Nota Média</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <MetricCard icon={<Briefcase size={20}/>} value={stats.completedJobsMonth} label="Jobs no Mês" color="bg-blue-50" textColor="text-blue-600" />
                <MetricCard icon={<Users size={20}/>} value={stats.profileViews} label="Visitas Perfil" subLabel="+12% essa semana" color="bg-purple-50" textColor="text-purple-600" />
                <MetricCard icon={<CheckCircle2 size={20}/>} value="98%" label="Taxa Sucesso" color="bg-green-50" textColor="text-green-600" />
                <MetricCard icon={<Heart size={20}/>} value="12" label="Favoritado" color="bg-red-50" textColor="text-red-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-card">
                    <h3 className="text-xl font-extrabold text-secondary mb-8">Atividade Semanal</h3>
                    <div className="h-56 w-full flex items-end justify-between gap-4">
                        {stats.chartData.map((data, index) => {
                            const heightPct = Math.max((data.jobs / maxChartValue) * 100, 10);
                            return (
                                <div key={index} className="flex flex-col items-center justify-end h-full w-full">
                                    <div className="w-full max-w-[40px] rounded-2xl bg-gray-100 group hover:bg-primary transition-all relative" style={{ height: `${heightPct}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold">{data.jobs}</div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 mt-2">{data.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-[#F8F7FF] rounded-[2.5rem] p-8 border border-primary/5 flex flex-col">
                    <h3 className="text-xl font-extrabold text-secondary mb-6">Mural de Elogios</h3>
                    <div className="space-y-4">
                        {stats.recentReviews.map(review => (
                            <div key={review.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-white/50">
                                <p className="text-sm text-secondary font-medium leading-relaxed mb-1">"{review.comment}"</p>
                                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-primary">{review.reviewerName}</span><div className="flex text-yellow-400"><Star size={10} fill="currentColor"/></div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ icon, value, label, subLabel, color, textColor }: any) => (
    <div className="p-5 rounded-[2rem] bg-white shadow-card hover:shadow-float transition-all group">
        <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-secondary`}>{icon}</div>
        <h4 className="text-2xl font-black text-secondary tracking-tight leading-none mb-1">{value}</h4>
        <p className="text-[10px] font-bold text-secondaryMuted uppercase tracking-wide">{label}</p>
        {subLabel && <p className={`text-[9px] font-bold mt-1 ${textColor}`}>{subLabel}</p>}
    </div>
);

export default ProfessionalDashboard;
