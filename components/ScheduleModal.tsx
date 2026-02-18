
import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: string, time: string) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (date && time) {
            onConfirm(date, time);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-textMuted hover:bg-gray-200"
                >
                    <X size={18} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primaryContainer rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <Calendar size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-textMain">Sugerir Visita</h3>
                    <p className="text-sm text-textMuted font-medium">Proponha um horário para o serviço.</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-textMuted ml-1">Data</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 font-bold text-textMain outline-none focus:border-primary transition-all"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-textMuted ml-1">Horário</label>
                        <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="time" 
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 pl-12 font-bold text-textMain outline-none focus:border-primary transition-all"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={!date || !time}
                    className="w-full bg-primary text-white h-14 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    Enviar Proposta
                </button>
            </div>
        </div>
    );
};

export default ScheduleModal;
