
import React, { useState, useEffect } from 'react';
import { Appointment, User } from '../types';
import { Backend } from '../services/mockBackend';
import { Clock, MapPin, ChevronRight, Loader2, PartyPopper, ChevronLeft, List, Grid } from 'lucide-react';
import { useToast } from './ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarInterfaceProps {
    user: User;
    onViewProposal: (proposalId: number) => void;
}

const CalendarInterface: React.FC<CalendarInterfaceProps> = ({ user, onViewProposal }) => {
    const { addToast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'month'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            // Simulate network delay
            await new Promise(r => setTimeout(r, 600));
            try {
                const apps = await Backend.getUserAppointments(user.id);
                // Convert server UTC timestamp to local date/time for display
                const localApps = (apps || []).map(app => {
                    if (app.timestamp) {
                        const d = new Date(app.timestamp);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const hours = String(d.getHours()).padStart(2, '0');
                        const minutes = String(d.getMinutes()).padStart(2, '0');
                        return {
                            ...app,
                            date: `${year}-${month}-${day}`,
                            time: `${hours}:${minutes}`
                        };
                    }
                    return app;
                });
                setAppointments(localApps);
            } catch (error) {
                console.warn("Failed to load appointments", error);
                setAppointments([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    // Helper to format dates for comparison (YYYY-MM-DD) in local time
    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Filter appointments for the selected date (if any)
    const filteredAppointments = selectedDate
        ? appointments.filter(app => app.date === formatDateKey(selectedDate))
        : appointments;

    // Sort appointments by date and time
    const sortedAppointments = [...filteredAppointments].sort((a, b) => {
        return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });

    // Find next appointment (global, not filtered)
    const now = new Date();
    const upcoming = appointments.filter(a => new Date(`${a.date}T${a.time}`) >= now && a.status === 'CONFIRMED');
    const nextAppointment = upcoming.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())[0];

    // Calendar Grid Logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
        }

        // Days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = formatDateKey(date);
            const hasAppointment = appointments.some(app => app.date === dateKey);
            const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey;
            const isToday = formatDateKey(new Date()) === dateKey;

            days.push(
                <motion.button
                    key={day}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedDate(date)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium relative transition-colors ${
                        isSelected
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : isToday
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-textMain hover:bg-gray-100'
                    }`}
                >
                    {day}
                    {hasAppointment && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                    )}
                </motion.button>
            );
        }

        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleAppointmentClick = (app: Appointment) => {
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
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-textMuted font-bold animate-pulse">Sincronizando agenda...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-textMain tracking-tight">Minha Agenda</h2>
                    <p className="text-textMuted font-medium mt-1">Gerencie seus compromissos.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-primary' : 'text-textMuted hover:text-textMain'}`}
                    >
                        <Grid size={20} />
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('list');
                            setSelectedDate(null); // Clear selection when switching to list
                        }}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-textMuted hover:text-textMain'}`}
                    >
                        <List size={20} />
                    </button>
                </div>
            </header>

            {/* NEXT APPOINTMENT HERO CARD */}
            <AnimatePresence>
                {nextAppointment && (
                    <motion.div
                        key="next-appointment"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8"
                    >
                        <div 
                            onClick={() => handleAppointmentClick(nextAppointment)}
                            className="bg-gradient-to-br from-primary to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-primary/20 relative overflow-hidden group cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/20 transition-all duration-500"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 animate-pulse">
                                        Próximo Compromisso
                                    </span>
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <Clock size={20} className="text-white" />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black mb-1 leading-tight">{nextAppointment.title}</h3>
                                <p className="text-white/80 font-medium text-sm mb-6 flex items-center gap-2">
                                    Com {nextAppointment.withUser}
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                                        <p className="text-[10px] uppercase opacity-70 font-bold mb-1">Horário</p>
                                        <p className="text-lg font-black">{nextAppointment.time}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                                        <p className="text-[10px] uppercase opacity-70 font-bold mb-1">Data</p>
                                        <p className="text-lg font-black">
                                            {new Date(`${nextAppointment.date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CALENDAR VIEW */}
            {viewMode === 'month' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft size={20} className="text-textMuted" />
                        </button>
                        <h3 className="text-lg font-black text-textMain capitalize">
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronRight size={20} className="text-textMuted" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                            <div key={i} className="text-xs font-bold text-textMuted opacity-50 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 place-items-center">
                        {renderCalendarGrid()}
                    </div>
                </motion.div>
            )}

            {/* APPOINTMENTS LIST */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-textMain text-lg">
                        {selectedDate 
                            ? `Compromissos de ${selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`
                            : 'Todos os Compromissos'}
                    </h3>
                    {selectedDate && (
                        <button 
                            onClick={() => setSelectedDate(null)}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            Ver todos
                        </button>
                    )}
                </div>

                {sortedAppointments.length === 0 ? (
                    <div className="bg-gray-50 rounded-3xl p-8 text-center border border-gray-100">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                            <PartyPopper size={32} />
                        </div>
                        <h3 className="font-bold text-textMain text-lg mb-1">Dia Livre!</h3>
                        <p className="text-sm text-textMuted max-w-[200px] mx-auto">
                            Nenhum compromisso encontrado para {selectedDate ? 'esta data' : 'o período'}.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedAppointments.map((app) => (
                            <motion.div
                                key={app.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleAppointmentClick(app)}
                                className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${
                                    app.status === 'PENDING' ? 'border-l-4 border-l-amber-400' :
                                    app.status === 'CONFIRMED' ? 'border-l-4 border-l-green-500' :
                                    'border-l-4 border-l-gray-300 opacity-60'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border ${
                                            app.status === 'CONFIRMED' ? 'bg-green-50 border-green-100 text-green-700' : 
                                            app.status === 'PENDING' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                            'bg-gray-50 border-gray-200 text-gray-500'
                                        }`}>
                                            <span className="text-xs font-bold uppercase">{new Date(`${app.date}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                                            <span className="text-lg font-black leading-none">{new Date(`${app.date}T12:00:00`).getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-textMain leading-tight text-lg">{app.title}</h4>
                                            <p className="text-sm text-textMuted font-medium">{app.withUser}</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pl-[3.75rem]">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-textMuted bg-gray-50 px-2 py-1 rounded-md">
                                        <Clock size={12} />
                                        {app.time}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-textMuted bg-gray-50 px-2 py-1 rounded-md truncate max-w-[150px]">
                                        <MapPin size={12} />
                                        {app.location}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarInterface;
