
import React, { useState, useEffect } from 'react';
import { User, UserRole, Proposal, ProposalStatus, AdminStats, ProfessionalDashboardStats, ServiceCategory, ServiceSubItem, ChatSession, Notification } from './types';
import { Backend } from './services/mockBackend'; 
import { useToast } from './components/ToastContext';
import ProposalCard from './components/ProposalCard';
import CreateProposalModal from './components/CreateProposalModal';
import ProposalDetailModal from './components/ProposalDetailModal';
import ChatInterface from './components/ChatInterface';
import AdminDashboard from './components/AdminDashboard';
import ProfessionalDashboard from './components/ProfessionalDashboard';
import AuthScreens from './components/AuthScreens'; 
import SettingsModal from './components/SettingsModal';
import ProfessionalCard from './components/ProfessionalCard';
import SecurityModal from './components/SecurityModal';
import FavoritesModal from './components/FavoritesModal';
import ReviewModal from './components/ReviewModal';
import PublicProfileModal from './components/PublicProfileModal'; 
import NotificationPanel from './components/NotificationPanel'; 
import MapInterface from './components/MapInterface'; 
import CalendarInterface from './components/CalendarInterface'; 
import GamificationHub from './components/GamificationHub'; 
import { DEFAULT_CATEGORIES, DEFAULT_SERVICES } from './constants'; 

import { 
  Home, Search, User as UserIcon, 
  Plus, Coffee, LogOut, MapPin, 
  Star, LayoutGrid, ShieldCheck, Heart, Sparkles, MessageCircle, ArrowRight, Calendar, Trophy, Settings, X, Loader2, Bell, Map, List, HelpCircle, FileText, ChevronRight, Filter, ArrowUpRight, Briefcase, PieChart,
  ChevronLeft, SlidersHorizontal, Hourglass, Radar
} from 'lucide-react';

const PAGE_SIZE = 10;

const MOCK_PRO_STATS: ProfessionalDashboardStats = {
    totalEarningsMonth: 0,
    totalEarningsToday: 150.00,
    completedJobsMonth: 12,
    profileViews: 145,
    chartData: [
        { day: 'Seg', value: 150, jobs: 1 },
        { day: 'Ter', value: 450, jobs: 3 },
        { day: 'Qua', value: 0, jobs: 0 },
        { day: 'Qui', value: 300, jobs: 2 },
        { day: 'Sex', value: 600, jobs: 4 },
        { day: 'Sáb', value: 1200, jobs: 5 },
        { day: 'Dom', value: 0, jobs: 0 },
    ],
    recentReviews: [
        { id: 101, proposalId: 1, reviewerId: 50, targetId: 2, reviewerName: "Mariana S.", rating: 5, comment: "Excelente profissional!", createdAt: new Date().toISOString() },
        { id: 102, proposalId: 2, reviewerId: 51, targetId: 2, reviewerName: "Carlos B.", rating: 4, comment: "Bom trabalho, chegou no horário.", createdAt: new Date().toISOString() }
    ]
};

const App: React.FC = () => {
  const { addToast } = useToast(); 
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [user, setUser] = useState<User>({ id: 0, name: '', email: '', role: UserRole.GUEST, avatarUrl: '' });
  const [view, setView] = useState('feed'); 
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]); 
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceSubItem[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadMore, setIsLoadMore] = useState(false);
  const [topPros, setTopPros] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<User[]>([]);
  const [modalInitialCategory, setModalInitialCategory] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTargetId, setReviewTargetId] = useState<number>(0);
  const [reviewProposalId, setReviewProposalId] = useState<number>(0);
  const [reviewTargetName, setReviewTargetName] = useState('');
  const [viewProfileUser, setViewProfileUser] = useState<User | null>(null);
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [directHireProfessional, setDirectHireProfessional] = useState<User | null>(null);
  const [browsingCategory, setBrowsingCategory] = useState<string | null>(null);
  const [searchViewMode, setSearchViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceRadius, setDistanceRadius] = useState<number | 'Infinity'>('Infinity');

  useEffect(() => {
    const initApp = async () => {
        try {
            await new Promise(r => setTimeout(r, 800));
            const session = await Backend.init();
            if (session && session.user) {
                setUser(session.user);
                if (session.user.role === UserRole.ADMIN) setView('admin');
                else setView('feed');
            }
            await loadCatalog();
            await loadSearchData(); 
        } catch (error) {
            console.warn("Using offline mode due to init failure:", error);
            setUser({ id: 0, name: '', email: '', role: UserRole.GUEST, avatarUrl: '' });
        } finally {
            setIsAppLoading(false);
        }
    };
    initApp();
  }, []);

  const loadSearchData = async () => {
      try {
          const pros = await Backend.getTopProfessionals();
          setTopPros(pros || []);
      } catch (e) {
          setTopPros([]);
      }
  };

  const loadCatalog = async () => {
    try {
        const [cats, servs] = await Promise.all([Backend.getCategories(), Backend.getServices()]);
        setCategories(cats && cats.length > 0 ? cats : DEFAULT_CATEGORIES);
        setServices(servs && servs.length > 0 ? servs : DEFAULT_SERVICES);
    } catch (error) {
        setCategories(DEFAULT_CATEGORIES);
        setServices(DEFAULT_SERVICES);
    }
  };

  useEffect(() => {
      if (user.id !== 0 && view === 'feed') {
          setPage(1);
          setHasMore(true);
          setProposals([]); 
          refreshData(1, true); 
      }
      if (user.id !== 0 && view === 'chats') refreshChats();
      if (user.id !== 0) loadNotifications();
  }, [user, selectedCategoryId, view, distanceRadius]); 

  const loadNotifications = async () => {
      try {
          const notifs = await Backend.getNotifications(user.id, user.role);
          setNotifications(notifs);
      } catch(e) {}
  };

  const handleMarkNotificationRead = async (id: string) => {
      await Backend.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const refreshChats = async () => {
      try {
          const userChats = await Backend.getUserChats(user.id);
          setChats(userChats || []);
      } catch (e) {
          setChats([]);
      }
  };

  const refreshData = async (pageNum: number = 1, shouldReplace: boolean = false) => {
      try {
          if (view === 'feed') {
              if (user.role === UserRole.PROFESSIONAL) {
                  let allProposals = await Backend.getProposals(
                      undefined, 
                      pageNum, 
                      PAGE_SIZE,
                      user.coordinates?.lat, 
                      user.coordinates?.lng,
                      distanceRadius === 'Infinity' ? undefined : distanceRadius
                  );
                  
                  if (user.specialty) {
                      const mySpecs = user.specialty.split(',').map(s => s.trim());
                      allProposals = allProposals.filter(p => mySpecs.includes(p.areaTag));
                  }

                  if (allProposals.length < PAGE_SIZE) setHasMore(false);
                  else setHasMore(true);

                  if (shouldReplace) setProposals(allProposals);
                  else setProposals(prev => [...prev, ...allProposals.filter(p => !prev.find(x => x.id === p.id))]);
              } 
              else if (user.role === UserRole.CONTRACTOR) {
                  const myProps = await Backend.getProposals(
                      undefined, 1, 5, undefined, undefined, undefined, user.id
                  );
                  setMyProposals(myProps.filter(p => p.status === ProposalStatus.OPEN));
              }
          }
      } catch (error) {}
  };

  const handleLoadMore = async () => {
      setIsLoadMore(true);
      const nextPage = page + 1;
      await refreshData(nextPage, false);
      setPage(nextPage);
      setIsLoadMore(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser({ id: 0, name: '', email: '', role: UserRole.GUEST });
    setView('feed');
    setIsSettingsOpen(false);
    addToast("Você saiu da conta", "info");
  };

  const handleLoginSuccess = (loggedInUser: User) => {
      setUser(loggedInUser);
      setView(loggedInUser.role === UserRole.ADMIN ? 'admin' : 'feed');
      addToast(`Bem-vindo, ${loggedInUser.name.split(' ')[0]}!`, "success");
  };

  const handleUpdateUser = async (updatedData: Partial<User>) => {
      try {
          const updatedUser = await Backend.updateUser({ ...user, ...updatedData });
          setUser(updatedUser);
          addToast("Perfil atualizado!", "success");
      } catch (error) {
          addToast("Erro ao salvar perfil.", "error");
      }
  };

  const handleAcceptProposal = async (proposalId: number) => {
      try {
          await Backend.acceptProposal(proposalId, user.id);
          // Não redirecionamos mais automaticamente para o chat, pois a animação do card diz "Adicionado à agenda"
          refreshData(1, true);
          // O usuário pode ir para a agenda ou feed.
      } catch (error: any) {
          addToast(error.message || "Erro ao aceitar.", "error");
      }
  };

  const handleCreateProposal = async (proposalData: Partial<Proposal>) => {
    try {
      const payload = {
          ...proposalData,
          coordinates: user.coordinates
      };
      await Backend.createProposal(payload);
      addToast("Pedido publicado com sucesso!", "success");
      refreshData(1, true); 
    } catch (error: any) {
      addToast(error.message || "Erro ao publicar pedido.", "error");
      throw error; 
    }
  };

  const handleSendMessage = async (chatId: number, text: string) => {
      try {
        await Backend.sendMessage(chatId, user.id, text);
        refreshChats(); 
      } catch (e) {}
  };

  const handleCompleteJob = async (proposalId: number) => {
      try {
          await Backend.completeProposal(proposalId);
          addToast("Serviço finalizado!", "success");
          refreshChats();
          const chat = (chats || []).find(c => c.proposalId === proposalId);
          if (chat) {
              setReviewProposalId(proposalId);
              setReviewTargetId(chat.professionalId);
              const proName = chat.participants.find(p => p.id === chat.professionalId)?.name || 'Profissional';
              setReviewTargetName(proName);
              setIsReviewModalOpen(true);
          }
      } catch (e) {}
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
      try {
          await Backend.submitReview(reviewProposalId, reviewTargetId, rating, comment);
          addToast("Avaliação enviada!", "success");
          setIsReviewModalOpen(false);
      } catch (e) {}
  };

  const handleStartRequest = (categoryName: string) => {
      setModalInitialCategory(categoryName);
      setDirectHireProfessional(null); 
      setModalOpen(true);
  };

  const handleViewProposalFromCalendar = async (proposalId: number) => {
      try {
          const proposal = await Backend.getProposalById(proposalId);
          setViewProposal(proposal);
      } catch (e) {
          addToast("Não foi possível carregar os detalhes.", "error");
      }
  };
  
  const handleViewProfile = (pro: User) => setViewProfileUser(pro);
  
  if (isAppLoading) {
      return (
          <div className="min-h-screen bg-primary flex flex-col items-center justify-center animate-fade-in-up">
              <ShieldCheck className="text-white w-20 h-20 animate-bounce-soft mb-4" />
              <h1 className="text-4xl font-extrabold text-white mb-2">Linka Jobi</h1>
              <Loader2 className="text-white/70 animate-spin mt-4" size={32} />
          </div>
      );
  }

  if (user.id === 0) return <AuthScreens onLogin={handleLoginSuccess} />;

  const isAdminView = user.role === UserRole.ADMIN && view === 'admin';

  return (
    <div className="min-h-screen bg-background text-secondary font-sans selection:bg-primary/20">
      <main className={`${isAdminView ? "h-screen overflow-hidden" : "pb-28"}`}>
        {view === 'admin' && <AdminDashboard />}
        {view === 'feed' && renderFeed()}
        {view === 'search' && renderSearch()} 
        {view === 'dashboard' && <ProfessionalDashboard stats={MOCK_PRO_STATS} />} 
        {view === 'calendar' && <CalendarInterface user={user} onViewProposal={handleViewProposalFromCalendar} />}
        {view === 'gamification' && <GamificationHub user={user} onBack={() => setView('profile')} />} 
        {view === 'chats' && <ChatInterface user={user} chats={chats} onSendMessage={handleSendMessage} onRefresh={refreshChats} onComplete={handleCompleteJob} />}
        {view === 'profile' && renderProfile()} 
      </main>

      {!isAdminView && (
          <div className="fixed bottom-0 left-0 right-0 glass px-6 pb-6 pt-4 z-[100] border-t border-white/50">
            <div className="flex items-center justify-around max-w-lg mx-auto">
              <NavBtn active={view === 'feed'} onClick={() => setView('feed')} icon={<Home />} label="Home" />
              <NavBtn active={view === (user.role === UserRole.CONTRACTOR ? 'search' : 'dashboard')} onClick={() => setView(user.role === UserRole.CONTRACTOR ? 'search' : 'dashboard')} icon={user.role === UserRole.CONTRACTOR ? <LayoutGrid /> : <PieChart />} label={user.role === UserRole.CONTRACTOR ? 'Busca' : 'Gestão'} />
              
              {/* Central Action Button */}
              {user.role === UserRole.CONTRACTOR ? (
                <button onClick={() => { setModalInitialCategory(null); setDirectHireProfessional(null); setModalOpen(true); }} className="relative -top-8 bg-primary hover:bg-primaryDark text-white w-14 h-14 rounded-full shadow-glow flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                   <Plus size={28} strokeWidth={2.5} />
                </button>
              ) : (
                <NavBtn active={view === 'calendar'} onClick={() => setView('calendar')} icon={<Calendar />} label="Agenda" />
              )}
              
              <NavBtn active={view === 'chats'} onClick={() => setView('chats')} icon={<MessageCircle />} label="Chat" notification={chats.some(c => c.unreadCount > 0)} />
              <NavBtn active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon />} label="Perfil" />
            </div>
          </div>
      )}

      <CreateProposalModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreateProposal} initialCategory={modalInitialCategory} targetProfessional={directHireProfessional} />
      <ProposalDetailModal isOpen={!!viewProposal} onClose={() => setViewProposal(null)} proposal={viewProposal} />
      <SecurityModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} />
      <FavoritesModal isOpen={isFavoritesModalOpen} onClose={() => setIsFavoritesModalOpen(false)} favorites={favorites} onRemove={id => {}} onOpenSubscription={() => {}} isSubscriber={true} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />
      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} onSubmit={handleSubmitReview} professionalName={reviewTargetName} />
      <PublicProfileModal isOpen={!!viewProfileUser} onClose={() => setViewProfileUser(null)} professional={viewProfileUser} onRequestQuote={() => { setViewProfileUser(null); setDirectHireProfessional(viewProfileUser); setModalOpen(true); }} />
    </div>
  );
  
  function renderFeed() {
    const displayServices = selectedCategoryId 
      ? services.filter(s => s.categoryId === selectedCategoryId)
      : services.slice(0, 8); 

    return (
    <div className="max-w-xl mx-auto px-6 py-6 animate-fade-in-up">
        <header className="flex justify-between items-center mb-8 pt-4">
            <div>
                <p className="text-xs font-black uppercase text-primary tracking-widest mb-1">Linka Jobi</p>
                <h1 className="font-display font-black text-4xl text-secondary tracking-tighter leading-none">
                    Olá, {user.name.split(' ')[0]}
                </h1>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setIsNotificationPanelOpen(true)} className="w-12 h-12 bg-white rounded-full border border-gray-100 flex items-center justify-center relative shadow-sm hover:bg-gray-50 transition-colors">
                    <Bell size={20} className="text-secondaryMuted" />
                    {notifications.filter(n => !n.read).length > 0 && <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent rounded-full border-2 border-white"></div>}
                </button>
                <div className="relative cursor-pointer group" onClick={() => setView('profile')}>
                    <img src={user.avatarUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-md object-cover group-hover:scale-105 transition-transform" />
                </div>
            </div>
        </header>
        
        <NotificationPanel isOpen={isNotificationPanelOpen} onClose={() => setIsNotificationPanelOpen(false)} notifications={notifications} onMarkRead={handleMarkNotificationRead} />

        {user.role === UserRole.CONTRACTOR ? (
            <div className="relative mb-10 group cursor-pointer" onClick={() => setView('search')}>
                <div className="absolute inset-0 bg-primary/5 rounded-[2rem] transform rotate-1 group-hover:rotate-2 transition-transform"></div>
                <div className="relative bg-white border border-gray-100 rounded-[2rem] p-5 flex items-center gap-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] group-hover:shadow-[0_15px_35px_-10px_rgba(124,58,237,0.15)] transition-all">
                    <Search className="text-primary" size={28} strokeWidth={2.5} />
                    <div className="flex-1">
                        <span className="block font-black text-lg text-secondary leading-tight">Do que você precisa?</span>
                        <span className="block text-xs font-medium text-secondaryMuted mt-0.5">Pedreiro, Eletricista, Faxina...</span>
                    </div>
                    <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowRight size={18} />
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-gradient-to-r from-primary to-primaryDark p-6 rounded-[1.5rem] shadow-glow mb-8 text-white relative overflow-hidden cursor-pointer" onClick={() => setView('dashboard')}>
                 <div className="relative z-10 flex justify-between items-center">
                     <div>
                         <h3 className="font-display font-bold text-lg mb-1">Painel Profissional</h3>
                         <p className="text-xs text-white/80 font-medium">Toque para ver seus ganhos</p>
                     </div>
                     <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"><Briefcase size={20} /></div>
                 </div>
                 <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>
        )}

        {user.role === UserRole.CONTRACTOR && (
            <div className="mb-10">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {selectedCategoryId && <button onClick={() => setSelectedCategoryId(null)} className="bg-secondary text-white px-5 py-3 rounded-2xl font-bold text-xs shrink-0 shadow-lg shadow-secondary/20">Todos</button>}
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)} className={`shrink-0 px-5 py-3 rounded-2xl font-bold text-xs transition-all ${selectedCategoryId === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-secondaryMuted border border-gray-100 hover:border-gray-200'}`}>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {user.role === UserRole.CONTRACTOR && (
            <>
                {myProposals.length > 0 && (
                    <div className="mb-10 animate-scale-in">
                        <h3 className="text-base font-black text-secondary mb-5 flex items-center gap-2 tracking-tight">
                            <Radar className="text-primary animate-pulse" size={20} /> Pedidos em Aberto
                        </h3>
                        <div className="space-y-4">
                            {myProposals.map(p => (
                                <div key={p.id} onClick={() => setViewProposal(p)} className="relative bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-card hover:shadow-float transition-all group overflow-hidden cursor-pointer active:scale-[0.98]">
                                    {/* Linha de Status Lateral */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                                    
                                    <div className="flex items-start justify-between pl-3">
                                        <div className="flex items-start gap-4">
                                            {/* Ícone da Categoria */}
                                            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-primary/10 text-primary">
                                                <Briefcase size={20} />
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-extrabold text-secondary text-base leading-tight mb-1">{p.title}</h4>
                                                <p className="text-[11px] text-secondaryMuted font-medium line-clamp-1 mb-2">"{p.description}"</p>
                                                
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                                                        {p.budgetRange}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="relative flex h-2 w-2">
                                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                        </span>
                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Buscando...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                 <div className="mb-10">
                    <h3 className="text-base font-black text-secondary mb-5 flex items-center gap-2 tracking-tight"><Star className="text-yellow-400 fill-yellow-400" size={20} /> Profissionais Recomendados</h3>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                        {topPros.map(pro => (
                            <button key={pro.id} onClick={() => handleViewProfile(pro)} className="relative min-w-[150px] w-[150px] h-[200px] rounded-[1.5rem] overflow-hidden shadow-card group shrink-0">
                                <img src={pro.avatarUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={pro.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                
                                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md border border-white/30 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                    <span className="text-[10px] font-black text-white">{pro.rating}</span>
                                </div>
                                
                                <div className="absolute bottom-4 left-4 text-left">
                                    <p className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-1 truncate w-28">{pro.specialty}</p>
                                    <h4 className="text-white font-black text-base leading-tight truncate w-28">{pro.name.split(' ')[0]}</h4>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                 <div className="mb-8">
                    <h3 className="text-base font-black text-secondary mb-5 flex items-center gap-2 tracking-tight"><Sparkles className="text-primary" size={20} /> Categorias Populares</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {displayServices.map(serv => (
                            <button key={serv.id} onClick={() => handleStartRequest(serv.name)} className="relative h-56 rounded-[2rem] overflow-hidden group shadow-lg cursor-pointer transform transition-transform duration-300 active:scale-95">
                                {/* Image Background */}
                                <img src={serv.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={serv.name} />
                                
                                {/* Dark Gradient Overlay for Text Readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
                                
                                {/* Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col justify-end h-full">
                                    <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                        <span className="block text-white/70 text-[9px] font-black uppercase tracking-widest mb-1">Serviço Premium</span>
                                        <div className="flex justify-between items-end">
                                            <span className="font-display font-black text-white text-xl leading-none w-3/4 text-left">{serv.name}</span>
                                            
                                            {/* Action Button */}
                                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-white group-hover:text-primary transition-all duration-300 shadow-lg">
                                                <ArrowUpRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </>
        )}

        {user.role === UserRole.PROFESSIONAL && (
            <div className="space-y-6">
                <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-secondary text-sm">Filtrar Oportunidades</h3>
                        <div className="bg-gray-50 rounded-full p-2 text-textMuted hover:text-primary cursor-pointer transition-colors">
                            <SlidersHorizontal size={16} />
                        </div>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {[5, 10, 30, 'Infinity'].map((val) => (
                            <button
                                key={val}
                                onClick={() => setDistanceRadius(val as number | 'Infinity')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    distanceRadius === val 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'bg-white text-secondaryMuted border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                {val === 'Infinity' ? 'Sem limite' : `Até ${val}km`}
                            </button>
                        ))}
                    </div>
                </div>

                {proposals.length === 0 ? (
                    <div className="text-center py-12 opacity-60">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                            <MapPin size={24} />
                        </div>
                        <p className="font-bold text-secondaryMuted">Nenhum job encontrado.</p>
                        <p className="text-xs text-gray-400">Tente aumentar o raio de busca.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {proposals.map(p => <ProposalCard key={p.id} proposal={p} userRole={user.role} onAccept={() => handleAcceptProposal(p.id)} />)}
                    </div>
                )}
                
                {hasMore && proposals.length > 0 && <button onClick={handleLoadMore} className="w-full py-3 bg-white border border-gray-100 text-secondaryMuted text-xs font-bold rounded-xl shadow-sm hover:bg-gray-50">{isLoadMore ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Carregar mais'}</button>}
            </div>
        )}
    </div>
    );
  }

  function renderSearch() { 
      return (
        <div className="max-w-xl mx-auto px-6 py-6 animate-fade-in-up">
            <h2 className="font-display text-2xl font-extrabold text-secondary mb-6">Explorar</h2>
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none focus:border-primary shadow-sm transition-all" placeholder="O que você procura?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {!searchQuery && !browsingCategory && (
                <div className="grid grid-cols-2 gap-3">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setBrowsingCategory(cat.id)} className="relative h-32 rounded-2xl overflow-hidden shadow-sm group active:scale-95 transition-transform">
                            <img src={cat.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={cat.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            <span className="absolute bottom-3 left-3 text-white font-bold text-sm leading-tight">{cat.name}</span>
                        </button>
                    ))}
                    <div onClick={() => setSearchViewMode('map')} className="col-span-2 bg-secondary p-6 rounded-2xl text-white flex justify-between items-center cursor-pointer shadow-lg mt-2">
                        <div>
                            <h3 className="font-bold text-lg mb-1">Mapa de Profissionais</h3>
                            <p className="text-xs text-white/70">Encontre ajuda perto de você</p>
                        </div>
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Map size={20} /></div>
                    </div>
                </div>
            )}

            {browsingCategory && !searchQuery && (
                <div className="space-y-4">
                    <button onClick={() => setBrowsingCategory(null)} className="flex items-center gap-2 text-secondaryMuted font-bold text-xs mb-4 hover:text-primary transition-colors"><ChevronLeft size={16} /> Voltar para categorias</button>
                    <h3 className="font-display text-2xl font-black text-secondary">{categories.find(c => c.id === browsingCategory)?.name}</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {services.filter(s => s.categoryId === browsingCategory).map(s => (
                            <button key={s.id} onClick={() => handleStartRequest(s.name)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-primary/30 transition-all text-left flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden"><img src={s.imageUrl} className="w-full h-full object-cover" /></div>
                                    <span className="font-bold text-secondary text-sm">{s.name}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <ArrowRight size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {searchViewMode === 'map' && (
                <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-scale-in">
                    <div className="p-4 flex justify-between items-center bg-white z-10 border-b border-gray-100">
                        <h2 className="font-bold text-lg text-secondary">Mapa</h2>
                        <button onClick={() => setSearchViewMode('list')} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100"><X size={20} /></button>
                    </div>
                    <div className="flex-1"><MapInterface professionals={topPros} onSelectProfessional={handleViewProfile} /></div>
                </div>
            )}
        </div>
      );
  }
  
  function renderProfile() { 
      return (
        <div className="max-w-xl mx-auto px-6 py-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-8"><h2 className="font-display text-2xl font-extrabold text-secondary">Meu Perfil</h2><button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 bg-white rounded-full border border-gray-100 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"><Settings size={18} /></button></div>
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-6 text-center">
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full p-1 border-2 border-primary/20 mb-3"><img src={user.avatarUrl} className="w-full h-full rounded-full object-cover shadow-sm" alt="Profile" /></div>
                    <h3 className="text-xl font-bold text-secondary mb-1">{user.name}</h3>
                    <p className="text-xs font-bold text-secondaryMuted uppercase tracking-wide bg-gray-50 px-3 py-1 rounded-full mb-4">{user.role === UserRole.PROFESSIONAL ? user.specialty : user.role === UserRole.ADMIN ? 'Administrador' : 'Cliente Linka'}</p>
                    <div className="flex items-center gap-2 text-xs text-secondaryMuted font-medium"><MapPin size={14} className="text-primary" />{user.location || 'Localização não definida'}</div>
                </div>
            </div>
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                {user.role === UserRole.ADMIN && (
                    <MenuItem icon={<ShieldCheck size={18}/>} label="Painel Admin" onClick={() => setView('admin')} color="text-gray-900" bg="bg-gray-100" />
                )}
                <MenuItem icon={<Trophy size={18}/>} label="Linka Club" onClick={() => setView('gamification')} color="text-yellow-600" bg="bg-yellow-50" />
                <MenuItem icon={<Heart size={18}/>} label="Favoritos" onClick={() => setIsFavoritesModalOpen(true)} color="text-accent" bg="bg-red-50" />
                <MenuItem icon={<ShieldCheck size={18}/>} label="Dicas de Segurança" onClick={() => setIsSecurityModalOpen(true)} color="text-blue-500" bg="bg-blue-50" />
                <MenuItem icon={<HelpCircle size={18}/>} label="Ajuda e Suporte" onClick={() => addToast("Suporte em breve!", "info")} color="text-purple-500" bg="bg-purple-50" />
                <button onClick={handleLogout} className="w-full flex items-center gap-4 p-5 hover:bg-red-50 transition-colors border-t border-gray-50 group">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors"><LogOut size={18} /></div>
                    <span className="font-bold text-sm text-secondary group-hover:text-red-500 transition-colors">Sair da Conta</span>
                </button>
            </div>
        </div>
      );
  }
};

const MenuItem = ({ icon, label, onClick, color, bg }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group active:bg-gray-100">
        <div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center transition-transform group-hover:scale-105`}>{icon}</div><span className="font-bold text-sm text-secondary">{label}</span></div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
    </button>
);

const NavBtn = ({ active, onClick, icon, label, notification }: any) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center w-16 h-full transition-all group relative">
    <div className={`p-2.5 rounded-2xl transition-all duration-300 ${active ? 'bg-primary text-white shadow-glow -translate-y-2' : 'text-secondaryMuted hover:text-primary hover:bg-primary/5'}`}>
        {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
        {notification && <div className="absolute top-2 right-4 w-2 h-2 bg-accent rounded-full border border-white"></div>}
    </div>
    <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${active ? 'text-primary opacity-100' : 'text-secondaryMuted opacity-0 h-0 overflow-hidden'}`}>{label}</span>
  </button>
);

export default App;
