
import React, { useState, useEffect } from 'react';
import { User, LevelData, UserRole } from '../types';
import { Backend } from '../services/mockBackend';
import { 
    Trophy, ChevronLeft, Lock, Star, Zap, ShieldCheck, 
    Crown, Rocket, CheckCircle2, Award, Sparkles 
} from 'lucide-react';

interface GamificationHubProps {
    user: User;
    onBack: () => void;
}

const GamificationHub: React.FC<GamificationHubProps> = ({ user, onBack }) => {
    const [data, setData] = useState<LevelData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 600)); // Simula animação
            const gamiData = await Backend.getUserGamification(user.id, user.role);
            setData(gamiData);
            setLoading(false);
        };
        load();
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-pulse">
                <Trophy className="w-12 h-12 text-yellow-400 mb-4 animate-bounce" />
                <p className="text-textMuted font-bold">Calculando conquistas...</p>
            </div>
        );
    }

    if (!data) return null;

    // Definição de cores por nível
    const levelColors: Record<string, string> = {
        'Bronze': 'from-orange-700 to-orange-400',
        'Prata': 'from-gray-400 to-gray-200',
        'Ouro': 'from-yellow-600 to-yellow-300',
        'Diamante': 'from-blue-600 to-cyan-300'
    };

    const currentGradient = levelColors[data.currentLevel] || 'from-primary to-purple-400';

    // Mapeamento de Ícones
    const getBadgeIcon = (iconName: string) => {
        if (iconName.includes('🚀')) return <Rocket size={24} />;
        if (iconName.includes('✅')) return <CheckCircle2 size={24} />;
        if (iconName.includes('⭐')) return <Star size={24} />;
        if (iconName.includes('⚡')) return <Zap size={24} />;
        if (iconName.includes('🛡️')) return <ShieldCheck size={24} />;
        if (iconName.includes('👑')) return <Crown size={24} />;
        return <Award size={24} />;
    };

    return (
        <div className="max-w-xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <ChevronLeft size={20} className="text-textMain" />
                </button>
                <h2 className="text-2xl font-extrabold text-textMain">Linka Club</h2>
            </header>

            {/* HERO: LEVEL CIRCLE */}
            <div className={`bg-gradient-to-br ${currentGradient} rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden mb-10`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-32 h-32 rounded-full border-8 border-white/20 flex items-center justify-center mb-4 relative">
                        {/* Progress SVG Ring (Simplified) */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                            <circle 
                                cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="8" 
                                strokeDasharray="289" 
                                strokeDashoffset={289 - (289 * data.progress) / 100}
                                strokeLinecap="round"
                            />
                        </svg>
                        <Trophy className="w-14 h-14 text-white drop-shadow-md" />
                    </div>
                    
                    <h3 className="font-black text-3xl uppercase tracking-widest mb-1">{data.currentLevel}</h3>
                    <p className="text-white/80 font-medium text-xs mb-6">
                        {data.xp} / {data.nextLevelXp} XP para {data.nextLevel}
                    </p>

                    <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 flex items-center gap-3">
                        <Sparkles size={18} />
                        <span className="font-bold text-sm">Nível {Math.floor(data.xp / 100) + 1}</span>
                    </div>
                </div>
            </div>

            {/* BADGES GRID */}
            <h3 className="text-lg font-black text-textMain mb-4">Suas Conquistas</h3>
            <div className="grid grid-cols-3 gap-3 mb-10">
                {data.badges.map(badge => (
                    <div key={badge.id} className={`flex flex-col items-center text-center p-4 rounded-3xl border-2 transition-all ${
                        badge.unlocked 
                        ? 'bg-white border-yellow-400/30 shadow-lg shadow-yellow-400/10' 
                        : 'bg-gray-50 border-transparent grayscale opacity-60'
                    }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                            badge.unlocked ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'
                        }`}>
                            {getBadgeIcon(badge.icon)}
                        </div>
                        <h4 className="font-bold text-xs text-textMain leading-tight mb-1">{badge.name}</h4>
                        {!badge.unlocked && <Lock size={12} className="text-textMuted mt-1" />}
                    </div>
                ))}
            </div>

            {/* BENEFITS LIST */}
            <h3 className="text-lg font-black text-textMain mb-4">Benefícios Ativos</h3>
            <div className="space-y-3">
                {data.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                            <CheckCircle2 size={20} />
                        </div>
                        <span className="font-bold text-sm text-textMain">{benefit}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GamificationHub;
