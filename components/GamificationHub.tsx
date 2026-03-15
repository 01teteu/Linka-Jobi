
import React, { useState, useEffect } from 'react';
import { User, LevelData, UserRole, Review } from '../types';
import { Backend } from '../services/mockBackend';
import { 
    Trophy, ChevronLeft, Lock, Star, Zap, ShieldCheck, 
    Crown, Rocket, CheckCircle2, Award, Sparkles, AlertTriangle, User as UserIcon
} from 'lucide-react';

interface GamificationHubProps {
    user: User;
    onBack: () => void;
}

const GamificationHub: React.FC<GamificationHubProps> = ({ user, onBack }) => {
    const [data, setData] = useState<LevelData | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'progress' | 'reviews'>('progress');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await new Promise(r => setTimeout(r, 600)); // Simula animação
            try {
                const [gamiData, profileData] = await Promise.all([
                    Backend.getUserGamification(user.id, user.role),
                    Backend.getPublicProfile(user.id)
                ]);
                setData(gamiData);
                setReviews(profileData.reviews || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
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
        'Diamante': 'from-blue-600 to-cyan-300',
        'Lenda': 'from-purple-600 to-pink-400'
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

    const addDebugXp = async () => {
        try {
            setLoading(true);
            await fetch('/api/debug/add-xp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ amount: 500 })
            });
            // Reload data
            const [gamiData, profileData] = await Promise.all([
                Backend.getUserGamification(user.id, user.role),
                Backend.getPublicProfile(user.id)
            ]);
            setData(gamiData);
            setReviews(profileData.reviews || []);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <ChevronLeft size={20} className="text-textMain" />
                    </button>
                    <h2 className="text-2xl font-extrabold text-textMain">Linka Club</h2>
                </div>
                {/* Debug Button */}
                <button onClick={addDebugXp} className="text-[10px] bg-gray-100 px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-200">
                    +500 XP (Debug)
                </button>
            </header>

            {/* TABS */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-8">
                <button 
                    onClick={() => setActiveTab('progress')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'progress' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Meu Progresso
                </button>
                <button 
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'reviews' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Minhas Avaliações
                </button>
            </div>

            {activeTab === 'progress' ? (
                <>
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

                    {/* CAP REASON WARNING */}
                    {data.capReason && (
                        <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h4 className="font-bold text-orange-800 text-sm mb-1">Nível Limitado</h4>
                                <p className="text-orange-700 text-xs leading-relaxed">{data.capReason}</p>
                            </div>
                        </div>
                    )}

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
                </>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Star className="text-blue-500 fill-blue-500" size={20} />
                            <h3 className="font-bold text-blue-900">Impacto no Nível</h3>
                        </div>
                        <p className="text-blue-800 text-sm leading-relaxed">
                            Sua média de avaliações interfere diretamente no seu nível. 
                            Mantenha uma nota alta para desbloquear níveis superiores como 
                            <span className="font-black text-blue-900"> Diamante</span> e <span className="font-black text-blue-900">Lenda</span>.
                        </p>
                    </div>

                    {reviews.length === 0 ? (
                        <div className="text-center py-12 opacity-60">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                <Star size={24} />
                            </div>
                            <p className="font-bold text-secondaryMuted">Nenhuma avaliação ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map(review => (
                                <div key={review.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <UserIcon size={20} className="text-gray-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-secondary">{review.reviewerName}</h4>
                                                <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                            <span className="font-black text-xs text-yellow-700">{review.rating}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-secondaryMuted leading-relaxed">"{review.comment}"</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GamificationHub;
