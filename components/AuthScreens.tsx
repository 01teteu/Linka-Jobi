import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Mail, Lock, User, ArrowRight, Hammer, ShieldCheck, Eye, EyeOff, Loader2, Star, CheckCircle2, ArrowLeft, Phone, MapPin, Briefcase, Check } from 'lucide-react';
import { Backend } from '../services/mockBackend';
import { useToast } from './ToastContext'; 
import { DEFAULT_SERVICES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

const applyPhoneMask = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limit = numbers.slice(0, 11);
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
  const [viewState, setViewState] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); 
  const [cep, setCep] = useState(''); 
  const [addressDetails, setAddressDetails] = useState<any>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');
  
  const [specialties, setSpecialties] = useState<string[]>([]); 
  const [role, setRole] = useState<UserRole>(UserRole.CONTRACTOR);

  // Modals state
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
        fetchAddress(cleanCep);
    } else {
        setAddressDetails(null);
        setCepError('');
    }
  }, [cep]);

  const fetchAddress = async (cepValue: string) => {
      setLoadingCep(true);
      setCepError('');
      try {
          const response = await fetch(`/api/cep/${cepValue}`);
          if (!response.ok) {
              if (response.status === 404) throw new Error('CEP não encontrado');
              throw new Error('Erro na busca');
          }
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setAddressDetails(data);
      } catch (error: any) {
          if (error.message !== 'CEP não encontrado') {
              console.warn("Erro busca CEP:", error.message);
          }
          setAddressDetails(null);
          setCepError('CEP inválido ou não encontrado.');
      } finally {
          setLoadingCep(false);
      }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (viewState === 'login') {
        const result = await Backend.login(email, role, password);
        onLogin(result.user);
      } else if (viewState === 'register') {
        if (password !== confirmPassword) {
            throw new Error("As senhas não coincidem.");
        }
        if (!phone || !cep) {
            throw new Error("Por favor, preencha telefone e CEP.");
        }
        if (phone.length < 14) {
            throw new Error("Telefone inválido. Use o formato (DDD) 99999-9999.");
        }
        if (cep.length < 9) {
            throw new Error("CEP inválido. Use o formato 00000-000.");
        }
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

        const locationString = addressDetails 
            ? `${addressDetails.city}, ${addressDetails.state}` 
            : "Localização Pendente";

        const newUser = {
          name,
          email,
          password,
          role,
          phone,
          location: locationString,
          cep, 
          coordinates: addressDetails?.lat ? {
              lat: addressDetails.lat,
              lng: addressDetails.lng
          } : undefined,
          specialty: role === UserRole.PROFESSIONAL ? specialties.join(', ') : undefined, 
          avatarUrl: undefined,
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
              return [...prev, serviceName];
          }
      });
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

  const bgImage = role === UserRole.PROFESSIONAL 
    ? "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1920&auto=format&fit=crop"
    : "https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=1920&auto=format&fit=crop";

  return (
    <div className="min-h-[100dvh] relative flex items-end sm:items-center justify-center bg-primary overflow-hidden font-sans">
        
        {/* Immersive Background */}
        <div className="absolute inset-0 z-0">
            <motion.img 
                key={bgImage}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.4, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                src={bgImage}
                className="w-full h-full object-cover mix-blend-overlay"
                alt="Background"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primaryDark via-primary/80 to-transparent sm:via-primary/90" />
        </div>

        {/* Form Container */}
        <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-md bg-white sm:bg-white/95 sm:backdrop-blur-xl rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
        >
            {/* Mobile Drag Handle Indicator */}
            <div className="w-full flex justify-center pt-4 pb-2 sm:hidden">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            <div className="px-6 pb-6 sm:p-8 overflow-y-auto custom-scrollbar">
                
                {/* Header */}
                <div className="mb-6">
                    {/* Fixed height container for back button to prevent layout shift */}
                    <div className="h-8 mb-2 flex items-center">
                        <AnimatePresence mode="wait">
                            {viewState === 'register' && (
                                <motion.button 
                                    key="back-button"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    onClick={() => setViewState('login')}
                                    className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-bold group"
                                >
                                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                            <ShieldCheck size={24} />
                        </div>
                        <span className="font-black text-2xl tracking-tight text-gray-900">Linka Jobi</span>
                    </div>

                    <motion.div
                        key={viewState}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
                            {viewState === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
                        </h1>
                        <p className="text-gray-500 font-medium text-sm">
                            {viewState === 'login' ? 'Acesse sua conta para continuar.' : 'Junte-se a milhares de usuários.'}
                        </p>
                    </motion.div>
                </div>

                {/* Role Selector (Register Only) */}
                <AnimatePresence>
                    {viewState === 'register' && (
                        <motion.div 
                            key="role-selection"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-2 gap-3 mb-8 overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={() => setRole(UserRole.CONTRACTOR)}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                                    role === UserRole.CONTRACTOR 
                                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                }`}
                            >
                                <User size={24} className="mb-2" />
                                <span className="font-bold text-sm">Cliente</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole(UserRole.PROFESSIONAL)}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                                    role === UserRole.PROFESSIONAL 
                                    ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                }`}
                            >
                                <Hammer size={24} className="mb-2" />
                                <span className="font-bold text-sm">Profissional</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={handleAuth} className="space-y-4">
                    <AnimatePresence>
                        {viewState === 'register' && (
                            <motion.div 
                                key="name-input"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden"
                            >
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Maria Silva" 
                                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 font-semibold text-gray-900 outline-none transition-all" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="email" 
                                placeholder="exemplo@email.com" 
                                className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 font-semibold text-gray-900 outline-none transition-all" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <AnimatePresence>
                        {viewState === 'register' && (
                            <motion.div 
                                key="phone-cep-inputs"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-2 gap-3 overflow-hidden"
                            >
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">Celular</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="tel" 
                                            placeholder="(11) 99999-9999" 
                                            className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-9 pr-3 font-semibold text-gray-900 outline-none transition-all text-sm" 
                                            value={phone} 
                                            onChange={e => setPhone(applyPhoneMask(e.target.value))} 
                                            maxLength={15}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">CEP</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="00000-000" 
                                            className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-9 pr-8 font-semibold text-gray-900 outline-none transition-all text-sm" 
                                            value={cep} 
                                            onChange={e => setCep(applyCepMask(e.target.value))} 
                                            maxLength={9}
                                            required 
                                        />
                                        {loadingCep && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 size={14} className="animate-spin text-gray-400"/></div>}
                                    </div>
                                    {addressDetails && (
                                        <p className="text-[10px] text-green-600 font-bold ml-1 flex items-center gap-1">
                                            <CheckCircle2 size={10} /> {addressDetails.city} - {addressDetails.state}
                                        </p>
                                    )}
                                    {cepError && (
                                        <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1">
                                            <ShieldCheck size={10} /> {cepError}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {viewState === 'register' && role === UserRole.PROFESSIONAL && (
                            <motion.div 
                                key="specialties-selection"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2 overflow-hidden pt-1"
                            >
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Suas Profissões</label>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                        {specialties.length} {specialties.length === 1 ? 'selecionada' : 'selecionadas'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {DEFAULT_SERVICES.map(s => {
                                        const isSelected = specialties.includes(s.name);
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => toggleSpecialty(s.name)}
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs font-bold ${
                                                    isSelected 
                                                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/20' 
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                }`}
                                            >
                                                <span className="truncate flex-1">{s.name}</span>
                                                {isSelected && <Check size={14} className="text-white shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-12 font-semibold text-gray-900 outline-none transition-all" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {viewState === 'register' && (
                            <motion.div 
                                key="confirm-password-input"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden pt-1"
                            >
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 ml-1">Confirmar Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••" 
                                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-12 font-semibold text-gray-900 outline-none transition-all" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {viewState === 'register' && (
                            <motion.div 
                                key="terms-checkbox"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden pt-2"
                            >
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center mt-0.5">
                                        <input 
                                            type="checkbox" 
                                            className="peer sr-only"
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                        />
                                        <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center group-hover:border-primary/50">
                                            <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 select-none">
                                        Concordo com os <button type="button" onClick={() => setShowTerms(true)} className="text-primary font-bold hover:underline">Termos de Uso</button> e <button type="button" onClick={() => setShowPrivacy(true)} className="text-primary font-bold hover:underline">Política de Privacidade</button>.
                                    </span>
                                </label>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button 
                        type="submit" 
                        disabled={loading || (viewState === 'register' && !termsAccepted)}
                        className="w-full bg-primary text-white hover:bg-primaryDark py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                {viewState === 'login' ? 'Entrar na conta' : 'Criar minha conta'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    {viewState === 'login' ? (
                        <p className="text-gray-500 text-sm font-medium">
                            Ainda não tem uma conta?{' '}
                            <button 
                                onClick={() => setViewState('register')}
                                className="text-primary font-black hover:underline"
                            >
                                Criar agora
                            </button>
                        </p>
                    ) : (
                        <p className="text-gray-500 text-sm font-medium">
                            Já tem uma conta?{' '}
                            <button 
                                onClick={() => setViewState('login')}
                                className="text-primary font-black hover:underline"
                            >
                                Entrar
                            </button>
                        </p>
                    )}
                </div>

                {/* Demo Logins */}
                {viewState === 'login' && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-400 text-center mb-4">Acesso Rápido (Demo)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => demoLogin('jane@linka.com', UserRole.CONTRACTOR)}
                                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-primary/5 hover:text-primary text-gray-700 font-bold text-xs transition-colors border border-gray-200 hover:border-primary/20"
                            >
                                <User size={14} /> Demo Cliente
                            </button>
                            <button 
                                onClick={() => demoLogin('joao@linka.com', UserRole.PROFESSIONAL)}
                                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-primary/5 hover:text-primary text-gray-700 font-bold text-xs transition-colors border border-gray-200 hover:border-primary/20"
                            >
                                <Hammer size={14} /> Demo Profissional
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>

        {/* Modals */}
        <AnimatePresence>
            {showTerms && (
                <div key="terms" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setShowTerms(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900">Termos de Uso</h2>
                            <button onClick={() => setShowTerms(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                                <span className="sr-only">Fechar</span>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-gray-600 space-y-4">
                            <p><strong>1. Aceitação dos Termos</strong><br/>Ao acessar e usar o aplicativo Linka Jobi, você concorda em cumprir e ficar vinculado a estes Termos de Uso.</p>
                            <p><strong>2. Uso do Serviço</strong><br/>O Linka Jobi é uma plataforma que conecta clientes a profissionais independentes. Não somos responsáveis pela qualidade, segurança ou legalidade dos serviços prestados.</p>
                            <p><strong>3. Cadastro</strong><br/>Você deve fornecer informações precisas e completas ao criar sua conta. Você é responsável por manter a confidencialidade de sua senha.</p>
                            <p><strong>4. Conduta do Usuário</strong><br/>Você concorda em não usar o serviço para qualquer propósito ilegal ou não autorizado. Assédio, fraude ou comportamento abusivo resultarão no banimento da conta.</p>
                            <p><strong>5. Pagamentos</strong><br/>Os pagamentos pelos serviços são acordados diretamente entre o cliente e o profissional. O Linka Jobi não processa pagamentos diretamente nesta versão.</p>
                            <p><strong>6. Modificações</strong><br/>Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso contínuo do aplicativo constitui aceitação dos novos termos.</p>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setShowTerms(false)} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryDark transition-colors">
                                Entendi
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showPrivacy && (
                <div key="privacy" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setShowPrivacy(false)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900">Política de Privacidade</h2>
                            <button onClick={() => setShowPrivacy(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                                <span className="sr-only">Fechar</span>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar text-sm text-gray-600 space-y-4">
                            <p><strong>1. Coleta de Dados</strong><br/>Coletamos informações que você nos fornece diretamente, como nome, e-mail, telefone, endereço (CEP) e localização para facilitar a conexão entre clientes e profissionais.</p>
                            <p><strong>2. Uso das Informações</strong><br/>Utilizamos seus dados para fornecer, manter e melhorar nossos serviços, além de personalizar sua experiência no aplicativo.</p>
                            <p><strong>3. Compartilhamento</strong><br/>Seu perfil público (nome, especialidades, localização aproximada) será visível para outros usuários. Não vendemos seus dados pessoais para terceiros.</p>
                            <p><strong>4. Segurança</strong><br/>Implementamos medidas de segurança para proteger suas informações, incluindo criptografia de senhas e comunicação segura.</p>
                            <p><strong>5. Seus Direitos</strong><br/>Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento através das configurações da sua conta.</p>
                            <p><strong>6. Contato</strong><br/>Para dúvidas sobre esta política, entre em contato conosco através do suporte no aplicativo.</p>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => setShowPrivacy(false)} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primaryDark transition-colors">
                                Entendi
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default AuthScreens;
