
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Mail, Lock, User, ArrowRight, Hammer, ShieldCheck, Eye, EyeOff, Loader2, Star, CheckCircle2, ArrowLeft, Wifi, WifiOff, Phone, MapPin, Briefcase, Check } from 'lucide-react';
import { Backend } from '../services/mockBackend';
import { useToast } from './ToastContext'; 
import { DEFAULT_SERVICES } from '../constants'; // Importar lista de serviços

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

// Helpers para máscaras
const applyPhoneMask = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limit = numbers.slice(0, 11);

    // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    return limit
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2');
};

const applyCepMask = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    return numbers.replace(/^(\d{5})(\d)/, '$1-$2');
};

const AuthScreens: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { addToast } = useToast();
  const [viewState, setViewState] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Status do Servidor
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); 
  const [cep, setCep] = useState(''); 
  
  // Alterado para Array de strings para suportar múltiplas profissões
  const [specialties, setSpecialties] = useState<string[]>([]); 
  
  const [role, setRole] = useState<UserRole>(UserRole.CONTRACTOR);

  useEffect(() => {
    const checkServer = async () => {
        const isUp = await Backend.checkHealth();
        setServerStatus(isUp ? 'online' : 'offline');
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (viewState === 'login') {
        const result = await Backend.login(email, role, password);
        onLogin(result.user);
      } else if (viewState === 'register') {
        // Validação básica
        if (!phone || !cep) {
            throw new Error("Por favor, preencha telefone e CEP.");
        }
        if (phone.length < 14) {
            throw new Error("Telefone inválido. Use o formato (DDD) 99999-9999.");
        }
        if (cep.length < 9) {
            throw new Error("CEP inválido. Use o formato 00000-000.");
        }

        // Validação de Senha Forte
        if (password.length < 8) {
            throw new Error("A senha deve ter no mínimo 8 caracteres.");
        }
        if (!/[A-Z]/.test(password)) {
            throw new Error("A senha deve conter pelo menos uma letra maiúscula.");
        }
        if (!/[0-9]/.test(password)) {
            throw new Error("A senha deve conter pelo menos um número.");
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            throw new Error("A senha deve conter pelo menos um caractere especial (!@#$...).");
        }

        if (role === UserRole.PROFESSIONAL && specialties.length === 0) {
            throw new Error("Selecione pelo menos uma área de atuação.");
        }

        const newUser = {
          name,
          email,
          role,
          password,
          phone, 
          location: `CEP: ${cep}`,
          // Junta as especialidades em uma string separada por vírgula
          specialty: role === UserRole.PROFESSIONAL ? specialties.join(', ') : undefined, 
          avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
        };
        const result = await Backend.register(newUser);
        onLogin(result.user);
      }
    } catch (err: any) {
      addToast(err.message || 'Erro de conexão.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (serviceName: string) => {
      setSpecialties(prev => {
          if (prev.includes(serviceName)) {
              return prev.filter(s => s !== serviceName);
          } else {
              if (prev.length >= 3) {
                  addToast("Máximo de 3 especialidades no plano grátis.", "warning");
                  return prev;
              }
              return [...prev, serviceName];
          }
      });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      try {
          await Backend.forgotPassword(email);
          addToast("Link de recuperação enviado para seu e-mail.", "success");
      } catch (err: any) {
          addToast(err.message || "Erro ao recuperar senha.", "error");
      } finally {
          setLoading(false);
      }
  };

  const demoLogin = async (email: string, role: UserRole) => {
    setRole(role);
    setEmail(email);
    setPassword('123456');
    setLoading(true);
    
    try {
        const res = await Backend.login(email, role, '123456');
        onLogin(res.user);
    } catch (err: any) {
        addToast("Falha no login demo: " + err.message, "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans relative">
        {/* Status Indicator */}
        <div className="absolute top-4 right-4 z-50">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all ${
                serverStatus === 'online' ? 'bg-green-50 border-green-200 text-green-700' :
                serverStatus === 'offline' ? 'bg-red-50 border-red-200 text-red-700' :
                'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
                {serverStatus === 'online' ? <Wifi size={14} /> : 
                 serverStatus === 'offline' ? <WifiOff size={14} /> : 
                 <Loader2 size={14} className="animate-spin" />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {serverStatus === 'online' ? 'Online' : 
                     serverStatus === 'offline' ? 'Offline' : 'Conectando...'}
                </span>
            </div>
        </div>

        {/* Lado Esquerdo */}
        <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-end p-16">
            <div className="absolute inset-0">
                <img 
                    src={role === UserRole.PROFESSIONAL 
                        ? "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1920&auto=format&fit=crop"
                        : "https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=1920&auto=format&fit=crop"
                    }
                    className="w-full h-full object-cover opacity-90 transition-opacity duration-700"
                    alt="Background"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/60 to-transparent" />
            </div>

            <div className="relative z-10 text-white max-w-lg animate-fade-in-up">
                <div className="mb-6 flex gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />)}
                </div>
                <h2 className="text-5xl font-black mb-6 leading-tight">
                    {role === UserRole.PROFESSIONAL 
                        ? "Transforme sua habilidade em renda extra." 
                        : "Encontre ajuda de confiança para o seu lar."}
                </h2>
                <p className="text-lg text-white/80 font-medium mb-8">
                    {role === UserRole.PROFESSIONAL
                        ? "Escolha suas áreas de atuação, defina seu raio de atendimento e comece a faturar."
                        : "Conectamos você aos melhores profissionais do bairro em minutos. Rápido, seguro e sem complicações."}
                </p>
            </div>
        </div>

        {/* Lado Direito - Formulário */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12 relative bg-background overflow-y-auto max-h-screen">
            <div className="max-w-md w-full mx-auto animate-fade-in-up">
                
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <ShieldCheck size={24} />
                        </div>
                        <span className="font-black text-2xl tracking-tight text-textMain">Linka Jobi</span>
                    </div>

                    {viewState === 'forgot' ? (
                        <>
                            <h1 className="text-3xl font-black text-textMain mb-3">Recuperar Senha</h1>
                            <p className="text-textMuted font-medium">Digite seu e-mail para receber um link de redefinição.</p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-3xl sm:text-4xl font-black text-textMain mb-3">
                                {viewState === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta grátis'}
                            </h1>
                            <p className="text-textMuted font-medium">
                                {viewState === 'login' ? 'Digite seus dados para acessar.' : 'Preencha seus dados para começar.'}
                            </p>
                        </>
                    )}
                </div>

                {/* Seletor de Role (Apenas Cadastro) */}
                {viewState === 'register' && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <RoleCard 
                            active={role === UserRole.CONTRACTOR} 
                            onClick={() => setRole(UserRole.CONTRACTOR)} 
                            icon={<User size={20}/>} 
                            label="Sou Cliente" 
                            desc="Quero contratar"
                        />
                        <RoleCard 
                            active={role === UserRole.PROFESSIONAL} 
                            onClick={() => setRole(UserRole.PROFESSIONAL)} 
                            icon={<Hammer size={20}/>} 
                            label="Sou Profissional" 
                            desc="Quero trabalhar"
                        />
                    </div>
                )}

                {(viewState === 'login' || viewState === 'register') && (
                <form onSubmit={handleAuth} className="space-y-5">
                    {viewState === 'register' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase text-textMuted ml-1">Nome Completo</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-4 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Ex: Maria Silva" 
                                    className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-4 font-bold text-textMain outline-none transition-all shadow-sm" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase text-textMuted ml-1">Seu E-mail</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                            <input 
                                type="email" 
                                placeholder="exemplo@email.com" 
                                className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-4 font-bold text-textMain outline-none transition-all shadow-sm" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    {/* NOVOS CAMPOS: TELEFONE E CEP E PROFISSÃO */}
                    {viewState === 'register' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-textMuted ml-1">Celular</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-4 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                        <input 
                                            type="tel" 
                                            placeholder="(11) 99999-9999" 
                                            className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-2 font-bold text-textMain outline-none transition-all shadow-sm" 
                                            value={phone} 
                                            onChange={e => setPhone(applyPhoneMask(e.target.value))} 
                                            maxLength={15}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase text-textMuted ml-1">CEP</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-4 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                        <input 
                                            type="text" 
                                            placeholder="00000-000" 
                                            className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-2 font-bold text-textMain outline-none transition-all shadow-sm" 
                                            value={cep} 
                                            onChange={e => setCep(applyCepMask(e.target.value))} 
                                            maxLength={9}
                                            required 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* MULTI SELEÇÃO DE PROFISSÃO (Apenas Profissional) */}
                            {role === UserRole.PROFESSIONAL && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-xs font-black uppercase text-textMuted">Suas Profissões (Selecione)</label>
                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">
                                            {specialties.length} selecionadas
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                                        {DEFAULT_SERVICES.map(s => {
                                            const isSelected = specialties.includes(s.name);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => toggleSpecialty(s.name)}
                                                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                                                        isSelected 
                                                        ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                                        : 'border-transparent bg-white hover:bg-gray-50 text-textMuted'
                                                    }`}
                                                >
                                                    <span className="text-xs font-bold flex-1">{s.name}</span>
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-xs font-black uppercase text-textMuted">Sua Senha</label>
                            {viewState === 'login' && (
                                <button 
                                    type="button" 
                                    onClick={() => setViewState('forgot')}
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    Esqueceu?
                                </button>
                            )}
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-12 font-bold text-textMain outline-none transition-all shadow-sm" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-textMain transition-colors">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {viewState === 'register' && (
                            <p className="text-[10px] text-textMuted ml-1">Mínimo 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.</p>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-primary hover:bg-violet-700 text-white h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>{viewState === 'login' ? 'Entrar na Conta' : 'Finalizar Cadastro'} <ArrowRight size={20} /></>}
                    </button>
                </form>
                )}

                {/* --- FORGOT PASSWORD FORM --- */}
                {viewState === 'forgot' && (
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                         {/* ... (código existente forgot password) ... */}
                         <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase text-textMuted ml-1">Seu E-mail</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                                <input 
                                    type="email" 
                                    placeholder="exemplo@email.com" 
                                    className="w-full bg-white border-2 border-transparent focus:border-primary rounded-2xl py-3.5 pl-12 pr-4 font-bold text-textMain outline-none transition-all shadow-sm" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-primary hover:bg-violet-700 text-white h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Enviar Link de Recuperação'}
                        </button>
                        
                        <button 
                            type="button" 
                            onClick={() => setViewState('login')}
                            className="w-full flex items-center justify-center gap-2 text-textMuted font-bold text-sm mt-2 py-2"
                        >
                            <ArrowLeft size={16} /> Voltar para Login
                        </button>
                    </form>
                )}

                {viewState !== 'forgot' && (
                <div className="mt-8 text-center">
                    <p className="text-textMuted font-medium text-sm">
                        {viewState === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
                        <button 
                            onClick={() => setViewState(viewState === 'login' ? 'register' : 'login')} 
                            className="text-primary font-black ml-1 hover:underline focus:outline-none"
                        >
                            {viewState === 'login' ? 'Cadastre-se' : 'Fazer Login'}
                        </button>
                    </p>
                </div>
                )}

                {viewState !== 'forgot' && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-[10px] font-black uppercase text-center text-textMuted tracking-widest mb-4 opacity-50">Demo (Preenche Automático)</p>
                    <div className="flex gap-2 justify-center">
                        <button onClick={() => demoLogin('jane@linka.com', UserRole.CONTRACTOR)} className="px-3 py-1.5 bg-white shadow-sm hover:bg-blue-50 text-textMuted hover:text-blue-600 rounded-lg text-xs font-bold transition-colors border border-gray-100">
                            Cliente
                        </button>
                        <button onClick={() => demoLogin('joao@linka.com', UserRole.PROFESSIONAL)} className="px-3 py-1.5 bg-white shadow-sm hover:bg-purple-50 text-textMuted hover:text-purple-600 rounded-lg text-xs font-bold transition-colors border border-gray-100">
                            Profissional
                        </button>
                    </div>
                </div>
                )}
            </div>
        </div>
    </div>
  );
};

const RoleCard = ({ active, onClick, icon, label, desc }: any) => (
    <button 
        type="button" 
        onClick={onClick} 
        className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${
            active 
            ? 'bg-primary/5 border-primary shadow-md' 
            : 'bg-white border-transparent shadow-sm hover:border-primary/30'
        }`}
    >
        <div className={`p-2.5 rounded-xl mb-3 transition-colors ${active ? 'bg-primary text-white' : 'bg-gray-100 text-textMuted group-hover:bg-gray-200 group-hover:text-primary'}`}>
            {icon}
        </div>
        <span className={`font-black text-sm mb-0.5 ${active ? 'text-primary' : 'text-textMain'}`}>{label}</span>
        <span className="text-[10px] text-textMuted font-medium text-left leading-tight">{desc}</span>
        
        {active && <div className="absolute top-3 right-3 text-primary"><CheckCircle2 size={16} fill="currentColor" className="text-white"/></div>}
    </button>
);

export default AuthScreens;
