
import React, { useState, useEffect } from 'react';
import { User, UserRole, Proposal, ProposalStatus, AdminStats, ProfessionalDashboardStats, ServiceCategory, ServiceSubItem, ChatSession, Notification } from './types';
import { Backend } from './services/mockBackend'; 
import { useToast } from './components/ToastContext';
import ProposalCard from './components/ProposalCard';
import CreateProposalModal from './components/CreateProposalModal';
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
  ChevronLeft, SlidersHorizontal, Hourglass
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
  const [myProposals, setMyProposals] = useState<Proposal[]>([]); // Novo estado para pedidos do contratante
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [directHireProfessional, setDirectHireProfessional] = useState<User | null>(null);
  const [browsingCategory, setBrowsingCategory] = useState<string | null>(null);
  const [searchViewMode, setSearchViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para filtro de distância (Profissional)
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
            // Default to guest/login screen instead of crashing
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
              // SE FOR PROFISSIONAL: Busca jobs na região
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
              // SE FOR CONTRATANTE: Busca "Meus Pedidos"
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
          addToast("Job aceito!", "success");
          refreshData(1, true); 
          setView('chats');
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
      refreshData(1, true); // Recarrega para mostrar o novo pedido na lista "Meus Pedidos"
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
    <div className="min-h-screen bg-background text-secondary">
      <main className={isAdminView ? "h-screen overflow-hidden" : ""}>
        {view === 'admin' && <AdminDashboard />}
        {view === 'feed' && renderFeed()}
        {view === 'search' && renderSearch()} 
        {view === 'dashboard' && <ProfessionalDashboard stats={MOCK_PRO_STATS} />} 
        {view === 'calendar' && <CalendarInterface user={user} onOpenChat={() => setView('chats')} />}
        {view === 'gamification' && <GamificationHub user={user} onBack={() => setView('profile')} />} 
        {view === 'chats' && <ChatInterface user={user} chats={chats} onSendMessage={handleSendMessage} onRefresh={refreshChats} onComplete={handleCompleteJob} />}
        {view === 'profile' && renderProfile()} 
      </main>

      {!isAdminView && (
          <div className="fixed bottom-6 left-6 right-6 h-[88px] glass rounded-[2.5rem] flex items-center justify-around px-2 z-[100] shadow-float">
            <NavBtn active={view === 'feed'} onClick={() => setView('feed')} icon={<Home />} label="Home" />
            <NavBtn active={view === (user.role === UserRole.CONTRACTOR ? 'search' : 'dashboard')} onClick={() => setView(user.role === UserRole.CONTRACTOR ? 'search' : 'dashboard')} icon={user.role === UserRole.CONTRACTOR ? <LayoutGrid /> : <PieChart />} label={user.role === UserRole.CONTRACTOR ? 'Busca' : 'Gestão'} />
            <NavBtn active={view === 'calendar'} onClick={() => setView('calendar')} icon={<Calendar />} label="Agenda" />
            <NavBtn active={view === 'chats'} onClick={() => setView('chats')} icon={<MessageCircle />} label="Chat" />
            <NavBtn active={view === 'profile'} onClick={() => setView('profile')} icon={<UserIcon />} label="Perfil" />
          </div>
      )}

      <CreateProposalModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreateProposal} initialCategory={modalInitialCategory} targetProfessional={directHireProfessional} />
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
    <div className="max-w-xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
        <header className="flex justify-between items-center mb-10">
            <div>
                <p className="text-[11px] font-black uppercase text-primary tracking-widest leading-none mb-1">Linka Jobi,</p>
                <h3 className="font-extrabold text-3xl text-secondary tracking-tight">Olá, {user.name.split(' ')[0]}!</h3>
            </div>
            <div className="flex items-center gap-4">
                {user.role === UserRole.ADMIN && (
                    <button onClick={() => setView('admin')} className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <ShieldCheck size={20} />
                    </button>
                )}
                <button onClick={() => setIsNotificationPanelOpen(true)} className="w-12 h-12 bg-white rounded-full border border-gray-100 flex items-center justify-center relative shadow-sm">
                    <Bell size={20} className="text-secondaryMuted" />
                    {notifications.filter(n => !n.read).length > 0 && <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-50 rounded-full"></div>}
                </button>
                <div className="relative group cursor-pointer" onClick={() => setView('profile')}>
                    <img src={user.avatarUrl} className="w-14 h-14 rounded-full border-4 border-white shadow-lg object-cover" />
                </div>
            </div>
        </header>
        
        <NotificationPanel isOpen={isNotificationPanelOpen} onClose={() => setIsNotificationPanelOpen(false)} notifications={notifications} onMarkRead={handleMarkNotificationRead} />

        {user.role === UserRole.CONTRACTOR ? (
            <div className="relative mb-8 group" onClick={() => setView('search')}>
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary" size={24} />
                <div className="w-full bg-white border-2 border-transparent rounded-[2rem] p-6 pl-16 font-bold text-sm text-secondaryMuted cursor-pointer shadow-card">
                    O que você precisa hoje?
                </div>
            </div>
        ) : (
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-card mb-10 flex items-center justify-between cursor-pointer" onClick={() => setView('dashboard')}>
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><Briefcase size={24} /></div>
                     <div><h3 className="font-bold text-secondary text-base">Meu Desempenho</h3><p className="text-xs text-secondaryMuted font-medium">Veja seus resultados</p></div>
                 </div>
                 <ChevronRight size={20} className="text-gray-400" />
            </div>
        )}

        {user.role === UserRole.CONTRACTOR && (
            <div className="mb-10">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {selectedCategoryId && <button onClick={() => setSelectedCategoryId(null)} className="bg-gray-200 text-secondaryMuted px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wide">Todos</button>}
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)} className={`flex-shrink-0 px-6 py-3 rounded-2xl font-bold text-xs transition-all ${selectedCategoryId === cat.id ? 'bg-primary text-white' : 'bg-white text-secondaryMuted border border-gray-100'}`}>
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {user.role === UserRole.CONTRACTOR && (
            <>
                {/* Meus Pedidos Recentes (FEEDBACK VISUAL IMPORTANTE) */}
                {myProposals.length > 0 && (
                    <div className="mb-12 animate-scale-in">
                        <h3 className="text-xl font-black text-secondary mb-4 flex items-center gap-2"><Hourglass className="text-primary" size={20} /> Meus Pedidos em Aberto</h3>
                        <div className="space-y-4">
                            {myProposals.map(p => (
                                <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <h4 className="font-extrabold text-secondary text-lg">{p.title}</h4>
                                        <p className="text-xs text-secondaryMuted font-bold uppercase tracking-wide">{p.budgetRange}</p>
                                    </div>
                                    <span className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-yellow-100">
                                        Aguardando
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button onClick={() => { setModalInitialCategory(null); setDirectHireProfessional(null); setModalOpen(true); }} className="w-full bg-primary p-1 rounded-[3rem] mb-12 shadow-glow hover:shadow-xl transition-all">
                    <div className="bg-primary p-10 rounded-[2.8rem] flex items-center justify-between relative overflow-hidden">
                        <div className="relative z-10 text-left">
                            <h4 className="text-3xl font-extrabold text-white mb-2">Pedir Novo <br/>Serviço</h4>
                            <p className="text-white/80 font-bold text-sm">Rápido e no bairro.</p>
                        </div>
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-xl text-primary"><Plus size={40} strokeWidth={3} /></div>
                    </div>
                </button>
                
                 <div className="mb-12">
                    <h3 className="text-xl font-black text-secondary mb-6 flex items-center gap-2"><Star className="text-warning fill-warning" size={20} /> Vizinhos mais bem avaliados</h3>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-8 px-2 -mx-2">
                        {topPros.map(pro => (
                            <button key={pro.id} onClick={() => handleViewProfile(pro)} className="relative min-w-[150px] w-[150px] h-[200px] rounded-[2.5rem] overflow-hidden shadow-card group shrink-0">
                                <img src={pro.avatarUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={pro.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                
                                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10 shadow-sm">
                                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                                    <span className="text-[10px] font-bold text-white">{pro.rating}</span>
                                </div>
                                
                                <div className="absolute bottom-5 left-5 text-left pr-4">
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">{pro.specialty}</p>
                                    <h4 className="text-white font-extrabold text-lg leading-tight truncate">{pro.name.split(' ')[0]}</h4>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                 <div className="mb-12">
                    <h3 className="text-xl font-black text-secondary mb-6 flex items-center gap-2"><Sparkles className="text-primary" size={20} /> Serviços em Destaque</h3>
                    <div className="flex overflow-x-auto gap-4 no-scrollbar pb-8 px-2 -mx-2">
                        {displayServices.map(serv => (
                            <button key={serv.id} onClick={() => handleStartRequest(serv.name)} className="relative min-w-[150px] w-[150px] h-[200px] rounded-[2.5rem] overflow-hidden shadow-card group shrink-0">
                                <img src={serv.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={serv.name} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                <div className="absolute bottom-5 left-5 text-left"><h4 className="text-white font-extrabold text-xl leading-tight">{serv.name}</h4><p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-2">Pedir agora</p></div>
                            </button>
                        ))}
                    </div>
                </div>
            </>
        )}

        {user.role === UserRole.PROFESSIONAL && (
            <div className="space-y-6">
                <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-black text-secondary text-lg mb-1">Jobs para Você</h3>
                            <p className="text-sm text-secondaryMuted font-medium">Filtro: <strong className="text-primary">{user.specialty || 'Todas as áreas'}</strong></p>
                        </div>
                        <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 text-primary">
                            <SlidersHorizontal size={20} />
                        </div>
                    </div>
                    
                    {/* Filtro de Raio */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {[5, 10, 30, 'Infinity'].map((val) => (
                            <button
                                key={val}
                                onClick={() => setDistanceRadius(val as number | 'Infinity')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    distanceRadius === val 
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                    : 'bg-white text-textMuted border-gray-100 hover:border-gray-200'
                                }`}
                            >
                                {val === 'Infinity' ? 'Tudo' : `${val} km`}
                            </button>
                        ))}
                    </div>
                </div>

                {proposals.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <MapPin size={40} className="mx-auto text-gray-300 mb-2" />
                        <p className="font-bold text-textMuted">Nenhum job encontrado nesta região.</p>
                        <p className="text-xs">Tente aumentar o raio de busca.</p>
                    </div>
                ) : (
                    proposals.map(p => <ProposalCard key={p.id} proposal={p} userRole={user.role} onAccept={() => handleAcceptProposal(p.id)} />)
                )}
                
                {hasMore && proposals.length > 0 && <button onClick={handleLoadMore} className="w-full py-4 bg-white border border-gray-100 text-secondaryMuted font-bold rounded-[2rem] shadow-sm">{isLoadMore ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Ver mais jobs'}</button>}
            </div>
        )}
    </div>
    );
  }

  function renderSearch() { 
      return (
        <div className="max-w-xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            <h2 className="text-3xl font-extrabold text-secondary mb-6">Explorar</h2>
            <div className="relative mb-8">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary" size={24} />
                <input className="w-full h-16 bg-white border-2 border-transparent rounded-[2rem] pl-16 pr-6 font-bold text-lg outline-none focus:border-primary shadow-card transition-all placeholder:text-gray-300" placeholder="Busque por serviço (ex: Pintor)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {!searchQuery && !browsingCategory && (
                <div className="grid grid-cols-2 gap-4">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setBrowsingCategory(cat.id)} className="relative h-44 rounded-[2.5rem] overflow-hidden shadow-card group active:scale-95">
                            <img src={cat.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110" alt={cat.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <span className="absolute bottom-5 left-5 text-white font-extrabold text-xl leading-tight">{cat.name}</span>
                        </button>
                    ))}
                    <div onClick={() => setSearchViewMode('map')} className="col-span-2 bg-primary p-8 rounded-[2.5rem] text-white flex justify-between items-center cursor-pointer shadow-glow">
                        <div><h3 className="text-2xl font-black mb-1">Ver no Mapa</h3><p className="text-sm opacity-80">Profissionais perto de você</p></div>
                        <Map size={40} />
                    </div>
                </div>
            )}

            {browsingCategory && !searchQuery && (
                <div className="space-y-6">
                    <button onClick={() => setBrowsingCategory(null)} className="flex items-center gap-2 text-secondaryMuted font-bold text-sm mb-4"><ChevronLeft size={18} /> Voltar</button>
                    <h3 className="text-3xl font-black text-secondary">{categories.find(c => c.id === browsingCategory)?.name}</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {services.filter(s => s.categoryId === browsingCategory).map(s => (
                            <button key={s.id} onClick={() => handleStartRequest(s.name)} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-primary transition-all text-left flex justify-between items-center group">
                                <span className="font-extrabold text-secondary text-xl">{s.name}</span>
                                <ArrowUpRight className="text-gray-300 group-hover:text-primary transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {searchViewMode === 'map' && (
                <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-scale-in">
                    <div className="p-6 flex justify-between items-center bg-white z-10">
                        <h2 className="text-2xl font-black text-secondary">Profissionais</h2>
                        <button onClick={() => setSearchViewMode('list')} className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center"><X size={24} /></button>
                    </div>
                    <div className="flex-1"><MapInterface professionals={topPros} onSelectProfessional={handleViewProfile} /></div>
                </div>
            )}
        </div>
      );
  }
  
  function renderProfile() { 
      return (
        <div className="max-w-xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-extrabold text-secondary">Meu Perfil</h2><button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 bg-white rounded-full border border-gray-100 flex items-center justify-center shadow-sm"><Settings size={22} /></button></div>
            <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-white mb-8 text-center group">
                <div className="flex flex-col items-center">
                    <div className="w-28 h-28 rounded-full p-1.5 border-2 border-primary/20 mb-4"><img src={user.avatarUrl} className="w-full h-full rounded-full object-cover shadow-lg" alt="Profile" /></div>
                    <h3 className="text-2xl font-black text-secondary mb-1">{user.name}</h3>
                    <p className="text-sm font-bold text-secondaryMuted uppercase tracking-wide mb-6 px-4 bg-gray-50 py-1 rounded-full">{user.role === UserRole.PROFESSIONAL ? user.specialty : user.role === UserRole.ADMIN ? 'Administrador' : 'Cliente Linka'}</p>
                    <div className="flex items-center gap-2 bg-gray-50 px-5 py-2.5 rounded-full border border-gray-100"><MapPin size={16} className="text-primary" /><span className="text-xs font-bold text-secondary">{user.location || 'Localização não definida'}</span></div>
                </div>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-white shadow-card overflow-hidden">
                {user.role === UserRole.ADMIN && (
                    <MenuItem icon={<ShieldCheck size={20}/>} label="Painel de Controle Admin" onClick={() => setView('admin')} color="text-gray-900" bg="bg-gray-100" />
                )}
                <MenuItem icon={<Trophy size={20}/>} label="Linka Club (Nível)" onClick={() => setView('gamification')} color="text-yellow-600" bg="bg-yellow-50" />
                <MenuItem icon={<Heart size={20}/>} label="Favoritos" onClick={() => setIsFavoritesModalOpen(true)} color="text-red-500" bg="bg-red-50" />
                <MenuItem icon={<ShieldCheck size={20}/>} label="Segurança" onClick={() => setIsSecurityModalOpen(true)} color="text-blue-500" bg="bg-blue-50" />
                <MenuItem icon={<HelpCircle size={20}/>} label="Ajuda e Suporte" onClick={() => addToast("Suporte em breve!", "info")} color="text-purple-500" bg="bg-purple-50" />
                <MenuItem icon={<FileText size={20}/>} label="Termos de Uso" onClick={() => {}} color="text-secondaryMuted" bg="bg-gray-50" />
                <button onClick={handleLogout} className="w-full flex items-center gap-4 p-6 hover:bg-red-50 transition-colors border-t border-gray-50 group">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors"><LogOut size={20} /></div>
                    <span className="font-bold text-sm text-secondary group-hover:text-red-500 transition-colors">Sair da Conta</span>
                </button>
            </div>
        </div>
      );
  }
};

const MenuItem = ({ icon, label, onClick, color, bg }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group active:bg-gray-100">
        <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center transition-transform group-hover:scale-110`}>{icon}</div><span className="font-bold text-sm text-secondary">{label}</span></div>
        <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
    </button>
);

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full transition-all group ${active ? '' : 'opacity-60 hover:opacity-100'}`}>
    <div className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-primary text-white shadow-glow -translate-y-4 scale-110' : 'text-secondaryMuted group-hover:text-primary group-hover:bg-primary/5'}`}>{React.cloneElement(icon, { size: 24, strokeWidth: active ? 3 : 2.5 })}</div>
    <span className={`text-[10px] font-black uppercase mt-1 transition-all duration-300 ${active ? 'text-primary opacity-100 -translate-y-2' : 'text-secondaryMuted opacity-0 h-0 overflow-hidden'}`}>{label}</span>
  </button>
);

export default App;
