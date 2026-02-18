
import React, { useState, useEffect } from 'react';
import { AdminStats, User, ServiceCategory, ServiceSubItem, ChatSession, UserRole } from '../types';
import { Backend } from '../services/mockBackend';
import ChatInterface from './ChatInterface';
import { 
    Users, DollarSign, Ban, ShieldCheck, Search, Activity, Settings, 
    Monitor, Trash2, LayoutDashboard, Tag, Layers,
    ToggleLeft, ToggleRight, Plus, X, Zap, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft,
    CheckCircle2, AlertTriangle, Lock, Unlock, MessageSquare, Briefcase, RefreshCw, BarChart3,
    MoreVertical, ChevronRight, UserMinus, UserCheck, ShieldAlert, Loader2
} from 'lucide-react';
import { useToast } from './ToastContext';

type AdminSection = 'overview' | 'users' | 'catalog' | 'support';

const AdminDashboard: React.FC = () => {
    const { addToast } = useToast();
    const [activeSection, setActiveSection] = useState<AdminSection>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, activeJobs: 0, revenue: 0, reportsPending: 0, onlineUsers: 0, loggedInUsers: 0, subscriptionPrice: 0 });
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [services, setServices] = useState<ServiceSubItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [supportChats, setSupportChats] = useState<ChatSession[]>([]);

    const [adminUser] = useState<User>({ 
        id: 999, 
        name: 'Comando Linka', 
        email: 'admin@linka.com', 
        role: UserRole.ADMIN, 
        avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=101828&color=fff' 
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Auto-refresh 30s
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [s, u, c, serv, chats] = await Promise.all([
                Backend.getAdminStats(),
                Backend.getAllUsers(),
                Backend.getCategories(),
                Backend.getServices(),
                Backend.getUserChats(adminUser.id)
            ]);
            setStats(s);
            setUsers(u);
            setCategories(c);
            setServices(serv);
            setSupportChats(chats);
        } catch (e) {
            console.error("Falha ao carregar dados administrativos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleUserStatus = async (user: User) => {
        const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
        try {
            await Backend.updateUserStatus(user.id, newStatus);
            addToast(`Usuário ${newStatus === 'BLOCKED' ? 'bloqueado' : 'ativado'} com sucesso.`, "success");
            loadData();
        } catch (e) {
            addToast("Erro ao atualizar status do usuário.", "error");
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderOverview = () => (
        <div className="animate-fade-in-up space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-secondary tracking-tight">Sala de Comando</h2>
                    <p className="text-secondaryMuted font-medium">Visão em tempo real da saúde do Linka Jobi.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 font-bold text-xs">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Sistemas Online
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard icon={<Users className="text-primary"/>} label="Usuários" value={stats.totalUsers} color="bg-primary/10" />
                <KPICard icon={<Briefcase className="text-blue-600"/>} label="Jobs Ativos" value={stats.activeJobs} color="bg-blue-50" />
                <KPICard icon={<Monitor className="text-purple-600"/>} label="Online" value={stats.onlineUsers} color="bg-purple-50" />
                <KPICard icon={<DollarSign className="text-green-600"/>} label="Faturamento" value={`R$ ${stats.revenue}`} color="bg-green-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-card">
                    <h3 className="font-black text-lg mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-primary"/> Fluxo de Atividade</h3>
                    <div className="space-y-4">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group border border-transparent hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <Zap size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-secondary">Novo contrato fechado: Reparo Elétrico</p>
                                        <p className="text-[10px] text-secondaryMuted font-bold uppercase">Há {i * 5} minutos em Pinheiros</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-primary" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-secondary p-8 rounded-[2.5rem] text-white relative overflow-hidden flex flex-col justify-center min-h-[250px]">
                     <div className="relative z-10">
                        <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-2">Segurança da Rede</p>
                        <h3 className="text-2xl font-black mb-4">Firewall Linka Ativo</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-green-400">
                                <CheckCircle2 size={14} /> HTTPS 2.1 Encriptado
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-green-400">
                                <CheckCircle2 size={14} /> Backups diários: OK
                            </div>
                        </div>
                     </div>
                     <ShieldCheck size={140} className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12" />
                </div>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-secondary">Base de Usuários</h2>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary" size={18} />
                    <input 
                        className="bg-white border border-gray-100 pl-12 pr-6 py-3 rounded-2xl font-bold outline-none focus:border-primary w-80 shadow-sm transition-all"
                        placeholder="Pesquisar vizinho..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-card overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest">Vizinho</th>
                            <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest">Papel</th>
                            <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest">Status</th>
                            <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <img src={u.avatarUrl} className="w-10 h-10 rounded-full bg-gray-100 object-cover border border-gray-100" />
                                        <div>
                                            <p className="font-black text-secondary text-sm">{u.name}</p>
                                            <p className="text-[11px] text-textMuted font-medium">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${
                                        u.role === UserRole.PROFESSIONAL ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${u.status === 'BLOCKED' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                        <span className={`text-xs font-bold ${u.status === 'BLOCKED' ? 'text-red-500' : 'text-green-600'}`}>
                                            {u.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-6 text-right">
                                    <button 
                                        onClick={() => handleToggleUserStatus(u)}
                                        className={`p-2 rounded-lg transition-all ${
                                            u.status === 'BLOCKED' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-500 hover:bg-red-100'
                                        }`}
                                        title={u.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}
                                    >
                                        {u.status === 'BLOCKED' ? <UserCheck size={18}/> : <UserMinus size={18}/>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSupport = () => (
        <div className="animate-fade-in-up h-[calc(100vh-160px)] flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-black text-secondary">Suporte Técnico</h2>
                    <p className="text-secondaryMuted font-medium">Atendimento direto à comunidade Linka.</p>
                </div>
            </header>
            <div className="flex-1 bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden relative">
                <ChatInterface 
                    user={adminUser} 
                    chats={supportChats} 
                    onSendMessage={async (chatId, text) => {
                        await Backend.sendMessage(chatId, adminUser.id, text);
                        loadData(); 
                    }}
                    onRefresh={loadData}
                    className="w-full h-full flex flex-col md:flex-row bg-white overflow-hidden relative"
                />
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#F8F9FC] font-sans overflow-hidden">
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col p-8 z-20">
                <div className="flex items-center gap-3 mb-12 px-2">
                    <div className="w-10 h-10 bg-secondary text-white rounded-2xl flex items-center justify-center shadow-lg">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <span className="block font-black text-lg text-secondary leading-none">Linka</span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Admin Command</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    <SidebarLink icon={<LayoutDashboard size={20}/>} label="Painel Geral" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
                    <SidebarLink icon={<Users size={20}/>} label="Usuários" active={activeSection === 'users'} onClick={() => setActiveSection('users')} />
                    <SidebarLink icon={<MessageSquare size={20}/>} label="Suporte Chat" active={activeSection === 'support'} onClick={() => setActiveSection('support')} />
                </nav>

                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 mt-auto">
                    <p className="text-[10px] font-black text-textMuted uppercase mb-2">Status do Servidor</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-secondary">Latência: 12ms</span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto no-scrollbar p-12 relative">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-primary" size={40} />
                        <p className="font-black text-xs uppercase tracking-widest text-textMuted">Carregando Sala de Comando...</p>
                    </div>
                ) : (
                    <>
                        {activeSection === 'overview' && renderOverview()}
                        {activeSection === 'users' && renderUsers()}
                        {activeSection === 'support' && renderSupport()}
                    </>
                )}
            </main>
        </div>
    );
};

const SidebarLink = ({ icon, label, active = false, onClick }: any) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 active:scale-95 ${
            active 
            ? 'bg-primary text-white shadow-xl shadow-primary/20' 
            : 'text-secondaryMuted hover:bg-gray-50 hover:text-secondary'
        }`}
    >
        <span className={active ? 'text-white' : 'text-textMuted group-hover:text-primary'}>{icon}</span>
        <span className="font-bold text-sm">{label}</span>
    </button>
);

const KPICard = ({ icon, label, value, color }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>{icon}</div>
        <p className="text-[10px] font-black uppercase text-textMuted tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-secondary tracking-tighter">{value}</h4>
    </div>
);

export default AdminDashboard;
