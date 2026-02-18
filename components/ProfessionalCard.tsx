
import React from 'react';
import { User } from '../types';
import { MapPin, Star, ChevronRight } from 'lucide-react';

interface ProfessionalCardProps {
  professional: User;
  onViewProfile: () => void;
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional, onViewProfile }) => {
  return (
    <div className="min-w-[180px] w-[180px] bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm group hover:shadow-lg transition-all flex flex-col items-center overflow-hidden">
      <div className="absolute top-3 right-3 bg-yellow-400 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
        <Star size={8} fill="currentColor" /> {professional.rating || '5.0'}
      </div>

      <div className="relative mb-3">
        <div className="w-16 h-16 rounded-full p-1 border-2 border-primaryContainer group-hover:scale-110 transition-transform overflow-hidden bg-white">
            <img src={professional.avatarUrl} className="w-full h-full rounded-full object-cover" alt="Pro" />
        </div>
      </div>

      <div className="text-center w-full relative">
        <h4 className="font-extrabold text-textMain text-sm truncate w-full mb-0.5">{professional.name}</h4>
        <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1 truncate px-2">{professional.specialty}</p>
        <p className="text-[9px] text-textMuted font-medium mb-4 flex items-center justify-center gap-1 opacity-70">
            <MapPin size={8}/> {professional.location || 'São Paulo'}
        </p>
        <button 
            onClick={onViewProfile} 
            className="w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wide bg-gray-50 text-textMain hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1"
        >
            Ver Perfil <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
};

export default ProfessionalCard;
