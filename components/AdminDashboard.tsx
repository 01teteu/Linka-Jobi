
import React, { useState, useEffect } from 'react';
import { AdminStats, User, ServiceCategory, ServiceSubItem, ChatSession, UserRole } from '../types';
import { Backend } from '../services/mockBackend';
import ChatInterface from './ChatInterface';
import { 
    Users, DollarSign, Ban, ShieldCheck, Search, Activity, Settings, 
    Monitor, Trash2, LayoutDashboard, Tag, Layers,
    ToggleLeft, ToggleRight, Plus, X, Zap, Wallet, CreditCard, ArrowUpRight, ArrowDownLeft,
    CheckCircle2, AlertTriangle, Lock, Unlock, MessageSquare, Briefcase, RefreshCw, BarChart3,
    MoreVertical, ChevronRight, UserMinus, UserCheck, ShieldAlert, Loader2, LogOut
} from 'lucide-react';
import { useToast } from './ToastContext';

type AdminSection = 'overview' | 'users' | 'catalog' | 'support' | 'reports';

interface AdminDashboardProps {
    user: User;
    onExit: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onExit }) => {
    const { addToast } = useToast();
    const [activeSection, setActiveSection] = useState<AdminSection>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, activeJobs: 0, revenue: 0, reportsPending: 0, onlineUsers: 0, loggedInUsers: 0, subscriptionPrice: 0 });
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [services, setServices] = useState<ServiceSubItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [supportChats, setSupportChats] = useState<ChatSession[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Catalog State
    const [editingCategory, setEditingCategory] = useState<(Partial<ServiceCategory> & { isNew?: boolean }) | null>(null);
    const [editingService, setEditingService] = useState<(Partial<ServiceSubItem> & { isNew?: boolean }) | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Auto-refresh 30s
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [s, u, c, serv, chats, r] = await Promise.all([
                Backend.getAdminStats(),
                Backend.getAllUsers(),
                Backend.getCategories(),
                Backend.getServices(),
                Backend.getUserChats(user.id),
                Backend.getReports()
            ]);
            setStats(s);
            setUsers(u);
            setCategories(c);
            setServices(serv);
            setSupportChats(chats.filter(c => c.isSupport));
            setReports(r || []);
        } catch (e) {
            console.error("Falha ao carregar dados administrativos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleUserStatus = async (user: User) => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
        try {
            await Backend.updateUserStatus(user.id, newStatus);
            addToast(`Usuário ${newStatus === 'BLOCKED' ? 'bloqueado' : 'ativado'} com sucesso.`, "success");
            await loadData();
        } catch (e) {
            addToast("Erro ao atualizar status do usuário.", "error");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBlockReportedUser = async (userId: number) => {
        if (isActionLoading) return;
        if (confirm('Deseja bloquear este usuário permanentemente?')) {
            setIsActionLoading(true);
            try {
                await Backend.blockUser(userId);
                addToast('Usuário bloqueado com sucesso.', 'success');
                await loadData();
            } catch (error) {
                addToast('Erro ao bloquear usuário.', 'error');
            } finally {
                setIsActionLoading(false);
            }
        }
    };

    const handleSaveCategory = async () => {
        if (!editingCategory?.id || !editingCategory?.name) return addToast('ID e Nome são obrigatórios', 'error');
        setIsActionLoading(true);
        try {
            await Backend.saveCategory(editingCategory);
            addToast('Categoria salva com sucesso!', 'success');
            setShowCategoryModal(false);
            await loadData();
        } catch (e) {
            addToast('Erro ao salvar categoria.', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Deseja excluir esta categoria?')) return;
        setIsActionLoading(true);
        try {
            await Backend.deleteCategory(id);
            addToast('Categoria excluída.', 'success');
            await loadData();
        } catch (e) {
            addToast('Erro ao excluir categoria. Verifique se há serviços vinculados.', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSaveService = async () => {
        if (!editingService?.id || !editingService?.categoryId || !editingService?.name) return addToast('ID, Categoria e Nome são obrigatórios', 'error');
        setIsActionLoading(true);
        try {
            await Backend.saveService(editingService);
            addToast('Serviço salvo com sucesso!', 'success');
            setShowServiceModal(false);
            await loadData();
        } catch (e) {
            addToast('Erro ao salvar serviço.', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Deseja excluir este serviço?')) return;
        setIsActionLoading(true);
        try {
            await Backend.deleteService(id);
            addToast('Serviço excluído.', 'success');
            await loadData();
        } catch (e) {
            addToast('Erro ao excluir serviço.', 'error');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderReports = () => (
        <div className="animate-fade-in-up space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-secondary tracking-tight">Denúncias</h2>
                    <p className="text-secondaryMuted font-medium">Moderação de conteúdo e usuários reportados.</p>
                </div>
                <button onClick={loadData} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Atualizar">
                    <RefreshCw size={20} className="text-secondary" />
                </button>
            </header>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-card overflow-hidden">
                {reports.length === 0 ? (
                    <div className="p-12 text-center text-textMuted">
                        <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold">Nenhuma denúncia pendente.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest">Data</th>
                                <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest">Denunciante</th>
                                <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest">Acusado</th>
                                <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest">Motivo</th>
                                <th className="p-6 text-[10px] font-black uppercase text-textMuted tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {reports.map((r: any) => (
                                <tr key={r.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="p-6 text-xs font-bold text-textMuted">
                                        {new Date(r.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-6 font-medium text-sm text-secondary">
                                        {r.reporter_name}
                                    </td>
                                    <td className="p-6 font-black text-sm text-red-500">
                                        {r.reported_name}
                                    </td>
                                    <td className="p-6">
                                        <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border border-red-100">
                                            {r.reason}
                                        </span>
                                        {r.description && (
                                            <p className="text-xs text-textMuted mt-1 italic max-w-xs truncate" title={r.description}>
                                                "{r.description}"
                                            </p>
                                        )}
                                    </td>
                                    <td className="p-6 text-right">
                                        <button 
                                            onClick={() => handleBlockReportedUser(r.reported_id)}
                                            disabled={isActionLoading}
                                            className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-all disabled:opacity-50"
                                            title="Bloquear Usuário"
                                        >
                                            <Ban size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const renderCatalog = () => (
        <div className="animate-fade-in-up">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black text-secondary">Catálogo</h2>
                    <p className="text-secondaryMuted font-medium">Gerencie categorias e serviços da plataforma.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => { setEditingCategory({ isNew: true }); setShowCategoryModal(true); }}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-primaryDark transition-all shadow-lg shadow-primary/30"
                    >
                        <Plus size={20} /> Nova Categoria
                    </button>
                    <button 
                        onClick={() => { setEditingService({ isNew: true, isActive: true }); setShowServiceModal(true); }}
                        className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-secondary/30"
                    >
                        <Plus size={20} /> Novo Serviço
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Categorias */}
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-secondary text-xl">Categorias</h3>
                        <span className="bg-primaryContainer text-primary px-3 py-1 rounded-full text-xs font-bold">{categories.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                        {categories.map(cat => (
                            <div key={cat.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden">
                                        {cat.imageUrl ? <img src={cat.imageUrl} className="w-full h-full object-cover" /> : <Layers className="text-gray-400" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-secondary">{cat.name}</p>
                                        <p className="text-xs text-textMuted font-medium">ID: {cat.id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingCategory(cat); setShowCategoryModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Settings size={18}/></button>
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Serviços */}
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-secondary text-xl">Serviços</h3>
                        <span className="bg-secondary text-white px-3 py-1 rounded-full text-xs font-bold">{services.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                        {services.map(srv => {
                            const cat = categories.find(c => c.id === srv.categoryId);
                            return (
                                <div key={srv.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                                            {srv.emoji || '🔧'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary">{srv.name}</p>
                                            <p className="text-xs text-textMuted font-medium">{cat?.name || srv.categoryId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`w-2 h-2 rounded-full ${srv.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingService(srv); setShowServiceModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Settings size={18}/></button>
                                            <button onClick={() => handleDeleteService(srv.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-secondary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-secondary">{editingCategory?.isNew ? 'Nova Categoria' : 'Editar Categoria'}</h3>
                            <button onClick={() => setShowCategoryModal(false)} className="text-textMuted hover:text-secondary"><X size={24}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">ID (ex: construcao)</label>
                                <input type="text" value={editingCategory?.id || ''} onChange={e => setEditingCategory({...editingCategory, id: e.target.value})} disabled={!editingCategory?.isNew} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">Nome (ex: Construção)</label>
                                <input type="text" value={editingCategory?.name || ''} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">URL da Imagem (opcional)</label>
                                <input type="text" value={editingCategory?.imageUrl || ''} onChange={e => setEditingCategory({...editingCategory, imageUrl: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                            </div>
                            <button onClick={handleSaveCategory} disabled={isActionLoading} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primaryDark transition-colors mt-4">
                                {isActionLoading ? 'Salvando...' : 'Salvar Categoria'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showServiceModal && (
                <div className="fixed inset-0 bg-secondary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-secondary">{editingService?.isNew ? 'Novo Serviço' : 'Editar Serviço'}</h3>
                            <button onClick={() => setShowServiceModal(false)} className="text-textMuted hover:text-secondary"><X size={24}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">ID (ex: pedreiro)</label>
                                <input type="text" value={editingService?.id || ''} onChange={e => setEditingService({...editingService, id: e.target.value})} disabled={!editingService?.isNew} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">Categoria</label>
                                <select value={editingService?.categoryId || ''} onChange={e => setEditingService({...editingService, categoryId: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none">
                                    <option value="">Selecione...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-secondary mb-2">Nome (ex: Pedreiro)</label>
                                <input type="text" value={editingService?.name || ''} onChange={e => setEditingService({...editingService, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-secondary mb-2">Emoji</label>
                                    <input type="text" value={editingService?.emoji || ''} onChange={e => setEditingService({...editingService, emoji: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editingService?.isActive !== false} onChange={e => setEditingService({...editingService, isActive: e.target.checked})} className="w-5 h-5 rounded text-primary" />
                                        <span className="text-sm font-bold text-secondary">Ativo</span>
                                    </label>
                                </div>
                            </div>
                            <button onClick={handleSaveService} disabled={isActionLoading} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primaryDark transition-colors mt-4">
                                {isActionLoading ? 'Salvando...' : 'Salvar Serviço'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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

            <div className="grid grid-cols-2 gap-6">
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
                                        <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-10 h-10 rounded-full bg-gray-100 object-cover border border-gray-100" />
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
                                        disabled={isActionLoading}
                                        className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
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
                    <h2 className="text-3xl font-black text-secondary">Suporte</h2>
                    <p className="text-secondaryMuted font-medium">Atendimentos e conversas ativas.</p>
                </div>
            </header>
            <div className="flex-1 bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden relative">
                <ChatInterface 
                    user={user} 
                    chats={supportChats} 
                    onSendMessage={async (chatId, text) => {
                        await Backend.sendMessage(chatId, user.id, text);
                        loadData(); 
                    }}
                    onRefresh={loadData}
                    className="w-full h-full flex flex-col bg-white overflow-hidden relative"
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
                    <SidebarLink icon={<Layers size={20}/>} label="Catálogo" active={activeSection === 'catalog'} onClick={() => setActiveSection('catalog')} />
                    <SidebarLink icon={<ShieldAlert size={20}/>} label="Denúncias" active={activeSection === 'reports'} onClick={() => setActiveSection('reports')} />
                    <SidebarLink icon={<MessageSquare size={20}/>} label="Mensagens" active={activeSection === 'support'} onClick={() => setActiveSection('support')} />
                </nav>

                <div className="mt-auto space-y-4">
                    <div className="relative">
                        <button 
                            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 bg-red-50 hover:bg-red-100 transition-all font-bold text-sm"
                        >
                            <LogOut size={18} />
                            Sair do Admin
                        </button>
                        
                        {showLogoutConfirm && (
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 animate-scale-in z-50">
                                <p className="text-xs font-bold text-secondary mb-3 text-center">Tem certeza que deseja sair?</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowLogoutConfirm(false)}
                                        className="flex-1 py-2 bg-gray-100 text-secondaryMuted rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Não
                                    </button>
                                    <button 
                                        onClick={onExit}
                                        className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        Sim, Sair
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                        <p className="text-[10px] font-black text-textMuted uppercase mb-2">Status do Servidor</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-secondary">Latência: 12ms</span>
                        </div>
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
                        {activeSection === 'catalog' && renderCatalog()}
                        {activeSection === 'reports' && renderReports()}
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
