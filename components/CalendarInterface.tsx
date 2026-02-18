
import React, { useState, useEffect } from 'react';
import { Appointment, User } from '../types';
import { Backend } from '../services/mockBackend';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, MessageCircle, ChevronRight, Loader2, PartyPopper, Hourglass, FileText } from 'lucide-react';
import { useToast } from './ToastContext';

interface CalendarInterfaceProps {
    user: User;
    onViewProposal: (proposalId: number) => void;
}

const CalendarInterface: React.FC<CalendarInterfaceProps> = ({ user, onViewProposal }) => {
    const { addToast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 600));
            try {
                const apps = await Backend.getUserAppointments(user.id);
                setAppointments(apps || []);
            } catch (error) {
                console.warn("Failed to load appointments", error);
                setAppointments([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    // Lógica para encontrar o próximo compromisso real
    const now = new Date();
    const safeAppointments = appointments || [];
    const upcoming = safeAppointments.filter(a => new Date(`${a.date}T${a.time}`) >= now && a.status === 'CONFIRMED');
    const nextAppointment = upcoming.length > 0 ? upcoming[0] : null;

    // Agrupamento por Data
    const grouped = safeAppointments.reduce((groups, app) => {
        const dateKey = app.date;
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(app);
        return groups;
    }, {} as Record<string, Appointment[]>);

    const sortedDates = Object.keys(grouped).sort();

    const formatDate = (dateStr: string) => {
        const d = new Date(`${dateStr}T12:00:00`);
        const today = new Date();
        today.setHours(12,0,0,0);
        
        if (d.getTime() === today.getTime()) return 'Hoje';
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (d.getTime() === tomorrow.getTime()) return 'Amanhã';

        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const handleAppointmentClick = (app: Appointment) => {
        // Extrai o ID numérico do job (ex: "job_123" -> 123)
        const idParts = app.id.split('_');
        if (idParts.length > 1) {
            const proposalId = parseInt(idParts[1]);
            onViewProposal(proposalId);
        } else {
            addToast("Detalhes indisponíveis.", "error");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-pulse">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-textMuted font-bold">Sincronizando agenda...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            <header className="mb-8">
                <h2 className="text-3xl font-extrabold text-textMain">Minha Agenda</h2>
                <p className="text-textMuted font-medium">Organize seus serviços e visitas.</p>
            </header>

            {/* NEXT APPOINTMENT HERO CARD */}
            {nextAppointment ? (
                <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary/30 mb-10 relative overflow-hidden group cursor-pointer" onClick={() => handleAppointmentClick(nextAppointment)}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all"></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 animate-pulse">
                                Em breve
                            </span>
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Clock size={20} className="text-white" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-black mb-1">{nextAppointment.title}</h3>
                        <p className="text-white/80 font-medium text-sm mb-6 flex items-center gap-2">
                            Com {nextAppointment.withUser}
                        </p>

                        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-sm border border-white/10">
                            <div className="text-center px-2 border-r border-white/20">
                                <p className="text-[10px] uppercase opacity-70 font-bold">Horário</p>
                                <p className="text-xl font-black leading-none">{nextAppointment.time}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase opacity-70 font-bold">Data</p>
                                <p className="font-bold text-sm">{formatDate(nextAppointment.date)}</p>
                            </div>
                            <ChevronRight className="ml-auto opacity-50" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 rounded-[2.5rem] p-8 text-center border border-gray-100 mb-10">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                        <PartyPopper size={32} />
                    </div>
                    <h3 className="font-bold text-textMain text-lg mb-1">Agenda Livre!</h3>
                    <p className="text-sm text-textMuted max-w-[200px] mx-auto">Você não tem compromissos confirmados para as próximas horas.</p>
                </div>
            )}

            {/* TIMELINE */}
            <div className="relative">
                {/* Linha Vertical */}
                <div className="absolute left-[19px] top-4 bottom-0 w-0.5 bg-gray-100"></div>

                {safeAppointments.length === 0 ? (
                    <div className="text-center py-10 pl-8">
                        <p className="text-textMuted font-medium">Nenhum agendamento encontrado.</p>
                        <p className="text-xs text-gray-400 mt-2">Combine visitas pelo chat para elas aparecerem aqui.</p>
                    </div>
                ) : (
                    sortedDates.map((dateStr) => (
                        <div key={dateStr} className="mb-8 relative animate-scale-in">
                            {/* Date Header */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-full bg-white border-4 border-gray-50 flex items-center justify-center z-10 shadow-sm">
                                    <Calendar size={16} className="text-primary" />
                                </div>
                                <h4 className="font-black text-textMain text-sm uppercase tracking-wide bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-50">
                                    {formatDate(dateStr)}
                                </h4>
                            </div>

                            {/* Cards do Dia */}
                            <div className="pl-12 space-y-4">
                                {grouped[dateStr].map((app) => (
                                    <div 
                                        key={app.id} 
                                        onClick={() => handleAppointmentClick(app)}
                                        className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${
                                            app.status === 'PENDING' ? 'border-l-4 border-l-amber-400' :
                                            app.status === 'CONFIRMED' ? 'border-l-4 border-l-green-500' :
                                            'border-l-4 border-l-gray-300 opacity-60'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-lg text-textMain">{app.time}</span>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                    app.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                    app.status === 'CONFIRMED' ? 'bg-green-50 text-green-600' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {app.status === 'PENDING' ? (app.isProposal ? 'Solicitação Aberta' : 'Pendente') : 
                                                     app.status === 'CONFIRMED' ? 'Confirmado' : 'Cancelado'}
                                                </span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                                {/* Icone de Detalhes em vez de Chat direto */}
                                                <FileText size={14} />
                                            </div>
                                        </div>
                                        
                                        <h4 className="font-bold text-textMain leading-tight mb-1">{app.title}</h4>
                                        <div className="flex items-center gap-2 mb-2">
                                            <img src={app.avatarUrl} className="w-5 h-5 rounded-full bg-gray-200" alt="" />
                                            <p className="text-xs font-medium text-textMuted">{app.withUser}</p>
                                        </div>

                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <MapPin size={10} /> {app.location}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CalendarInterface;
