
import React, { useState, useEffect } from 'react';
import { ProfessionalDashboardStats, User, PortfolioItem, ServiceItem } from '../types';
import { TrendingUp, Users, Star, Briefcase, Sparkles, Wallet, ArrowUpRight, ShieldCheck, Crown, Eye, ChevronRight, BarChart3, CalendarCheck, Image as ImageIcon, Upload, X, Save, LayoutTemplate, Plus, Loader2, User as UserIcon, Trash2, DollarSign, Tag, Camera } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import { Backend } from '../services/mockBackend';

interface ProfessionalDashboardProps {
    stats: ProfessionalDashboardStats;
    user: User;
    onUpdateUser: (data: Partial<User>) => Promise<void>;
}

const ProfessionalDashboard: React.FC<ProfessionalDashboardProps> = ({ stats, user, onUpdateUser }) => {
    const isPortfolioIncomplete = !user.portfolio || user.portfolio.length === 0;
    const [activeTab, setActiveTab] = useState<'portfolio' | 'overview'>(isPortfolioIncomplete ? 'portfolio' : 'overview');

    // Force portfolio tab if incomplete
    if (isPortfolioIncomplete && activeTab !== 'portfolio') {
        setActiveTab('portfolio');
    }

    const maxChartValue = Math.max(...stats.chartData.map(d => d.jobs), 5);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    // Formata moeda
    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="max-w-5xl mx-auto px-6 py-8 pb-32 animate-fade-in-up">
            
            {/* --- HEADER --- */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md shadow-yellow-500/20">
                            <Crown size={12} fill="currentColor" /> Profissional Ouro
                        </span>
                    </div>
                    <h1 className="font-display text-3xl font-extrabold text-secondary tracking-tight">
                        {greeting}, Mestre!
                    </h1>
                    <p className="text-secondaryMuted font-medium text-sm">
                        Gerencie sua carreira e destaque-se.
                    </p>
                </div>
                <div className="hidden md:block">
                    <button className="bg-white border border-gray-200 text-secondary font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                        <ShieldCheck size={16} className="text-primary"/> Central de Ajuda
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('portfolio')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'portfolio' ? 'bg-white text-primary shadow-sm' : 'text-secondaryMuted hover:text-secondary'}`}
                >
                    <LayoutTemplate size={16} />
                    Meu Portfólio
                    <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-md ml-1">Obrigatório</span>
                </button>
                <button 
                    onClick={() => !isPortfolioIncomplete && setActiveTab('overview')}
                    disabled={isPortfolioIncomplete}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white text-primary shadow-sm' : 'text-secondaryMuted hover:text-secondary'} ${isPortfolioIncomplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <BarChart3 size={16} />
                    Visão Geral
                    {isPortfolioIncomplete && <span className="bg-gray-200 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-md ml-1">Bloqueado</span>}
                </button>
            </div>

            {activeTab === 'portfolio' ? (
                <PortfolioTab user={user} onUpdateUser={onUpdateUser} />
            ) : (
                <OverviewTab stats={stats} formatCurrency={formatCurrency} maxChartValue={maxChartValue} />
            )}
        </div>
    );
};

import { Reorder } from 'framer-motion';

const PortfolioTab = ({ user, onUpdateUser }: { user: User, onUpdateUser: (data: Partial<User>) => Promise<void> }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: user.name,
        specialty: user.specialty || '',
        avatarUrl: user.avatarUrl || '',
        bio: user.bio || '',
        portfolioImages: user.portfolio || [],
        services: user.services || [],
        coverUrl: user.coverUrl || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
    
    // Service Modal State
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<Partial<ServiceItem>>({});

    const avatarInputRef = React.useRef<HTMLInputElement>(null);
    const coverInputRef = React.useRef<HTMLInputElement>(null);
    const portfolioInputRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const optimizeImageUrl = (url: string, type: 'avatar' | 'portfolio' | 'cover') => {
        if (!url) return url;

        // Cloudinary Optimization
        if (url.includes('cloudinary.com')) {
            const parts = url.split('/upload/');
            if (parts.length === 2) {
                let transformation = 'f_auto,q_auto'; // Default: Auto format & quality
                
                if (type === 'avatar') {
                    transformation += ',w_200,h_200,c_fill,g_face';
                } else if (type === 'portfolio') {
                    transformation += ',w_800,h_600,c_limit';
                } else if (type === 'cover') {
                    transformation += ',w_1200,h_400,c_fill';
                }
                
                return `${parts[0]}/upload/${transformation}/${parts[1]}`;
            }
        }
        
        // Unsplash Optimization (Mock)
        if (url.includes('images.unsplash.com')) {
             const baseUrl = url.split('?')[0];
             if (type === 'avatar') return `${baseUrl}?w=200&h=200&fit=crop&q=80`;
             if (type === 'portfolio') return `${baseUrl}?w=800&h=600&fit=crop&q=80`;
             if (type === 'cover') return `${baseUrl}?w=1200&h=400&fit=crop&q=80`;
        }

        return url;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'portfolio' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            addToast("Por favor, selecione uma imagem válida.", "error");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            addToast("A imagem deve ter no máximo 5MB.", "error");
            return;
        }

        try {
            if (type === 'avatar') setUploadingAvatar(true);
            else if (type === 'cover') setUploadingCover(true);
            else setUploadingPortfolio(true);

            const rawUrl = await Backend.uploadImage(file, type);
            const url = optimizeImageUrl(rawUrl, type);

            if (type === 'avatar') {
                handleChange('avatarUrl', url);
                addToast("Foto de perfil atualizada!", "success");
            } else if (type === 'cover') {
                handleChange('coverUrl', url);
                addToast("Capa atualizada!", "success");
            } else {
                const newItem: PortfolioItem = {
                    id: Date.now(),
                    userId: user.id,
                    imageUrl: url,
                    description: ''
                };
                setFormData(prev => ({ ...prev, portfolioImages: [...prev.portfolioImages, newItem] }));
                addToast("Imagem adicionada ao portfólio!", "success");
            }
        } catch (error) {
            console.error("Upload error:", error);
            addToast("Erro ao fazer upload da imagem.", "error");
        } finally {
            if (type === 'avatar') setUploadingAvatar(false);
            else if (type === 'cover') setUploadingCover(false);
            else setUploadingPortfolio(false);
            // Reset input
            if (e.target) e.target.value = '';
        }
    };

    const handleSave = async () => {
        // Validation
        if (!formData.name.trim()) {
            addToast("O nome é obrigatório.", "error");
            return;
        }
        if (!formData.specialty.trim()) {
            addToast("A especialidade é obrigatória.", "error");
            return;
        }
        if (!formData.avatarUrl.trim()) {
            addToast("A foto de perfil é obrigatória.", "error");
            return;
        }
        if (!formData.bio.trim()) {
            addToast("A biografia é obrigatória.", "error");
            return;
        }
        if (formData.portfolioImages.length === 0) {
            addToast("Adicione pelo menos uma foto ao portfólio.", "error");
            return;
        }

        setIsSaving(true);
        try {
            await onUpdateUser({
                name: formData.name,
                specialty: formData.specialty,
                avatarUrl: formData.avatarUrl,
                bio: formData.bio,
                portfolio: formData.portfolioImages,
                services: formData.services,
                coverUrl: formData.coverUrl
            });
        } catch (error) {
            console.error("Error saving portfolio:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const [editingImage, setEditingImage] = useState<PortfolioItem | null>(null);

    const [deleteConfirmation, setDeleteConfirmation] = useState<number | null>(null);

    const handleUpdateImageDescription = (id: number, description: string) => {
        setFormData(prev => ({
            ...prev,
            portfolioImages: prev.portfolioImages.map(img => img.id === id ? { ...img, description } : img)
        }));
    };

    const handleRemoveImage = (id: number) => {
        setFormData(prev => ({ ...prev, portfolioImages: prev.portfolioImages.filter(img => img.id !== id) }));
        if (editingImage?.id === id) setEditingImage(null);
        addToast("Imagem removida.", "success");
    };

    const handleAddService = () => {
        if (!currentService.title || !currentService.price) {
            addToast("Preencha título e preço.", "error");
            return;
        }
        const newService: ServiceItem = {
            id: Date.now().toString(),
            title: currentService.title!,
            description: currentService.description || '',
            price: currentService.price!,
            priceUnit: currentService.priceUnit || 'FIXED'
        };
        setFormData(prev => ({ ...prev, services: [...prev.services, newService] }));
        setIsServiceModalOpen(false);
        setCurrentService({});
        addToast("Serviço adicionado!", "success");
    };

    const handleDeleteService = (id: string) => {
        if (confirm("Tem certeza que deseja remover este serviço?")) {
            setFormData(prev => ({
                ...prev,
                services: prev.services.filter(s => s.id !== id)
            }));
            addToast("Serviço removido.", "success");
        }
    };

    return (
        <div className="animate-fade-in-up pb-24 space-y-6">
            {/* Hidden Inputs */}
            <input 
                type="file" 
                ref={avatarInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, 'avatar')} 
            />
            <input 
                type="file" 
                ref={portfolioInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileUpload(e, 'portfolio')} 
            />

            {/* --- IMAGE DETAIL MODAL --- */}
            {editingImage && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scale-in">
                        <button 
                            onClick={() => setEditingImage(null)}
                            className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img 
                                src={editingImage.imageUrl} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('bg-gray-200');
                                    // Show an icon instead
                                    const icon = document.createElement('div');
                                    icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                    e.currentTarget.parentElement?.appendChild(icon);
                                }}
                            />
                        </div>

                        <div className="p-6">
                            <label className="block text-xs font-bold text-secondaryMuted uppercase tracking-wider mb-2">Legenda / Descrição</label>
                            <textarea 
                                value={editingImage.description || ''}
                                onChange={(e) => {
                                    const newDesc = e.target.value;
                                    setEditingImage(prev => prev ? { ...prev, description: newDesc } : null);
                                    handleUpdateImageDescription(editingImage.id, newDesc);
                                }}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-medium text-secondary outline-none focus:border-primary transition-colors resize-none h-24 mb-4"
                                placeholder="Descreva este trabalho..."
                            />
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => {
                                        if (deleteConfirmation === editingImage.id) {
                                            handleRemoveImage(editingImage.id);
                                            setDeleteConfirmation(null);
                                        } else {
                                            setDeleteConfirmation(editingImage.id);
                                            setTimeout(() => setDeleteConfirmation(null), 3000);
                                        }
                                    }}
                                    className={`flex-1 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                        deleteConfirmation === editingImage.id 
                                            ? 'bg-red-600 text-white hover:bg-red-700' 
                                            : 'bg-red-50 text-red-500 hover:bg-red-100'
                                    }`}
                                >
                                    <Trash2 size={18} /> {deleteConfirmation === editingImage.id ? "Confirmar?" : "Excluir"}
                                </button>
                                <button 
                                    onClick={() => setEditingImage(null)}
                                    className="flex-[2] bg-primary text-white font-bold py-3 rounded-lg hover:bg-primaryDark transition-colors shadow-lg shadow-primary/20"
                                >
                                    Concluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PROFILE HEADER CARD --- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
                {/* Cover Image */}
                <div className="h-32 md:h-48 bg-gradient-to-r from-slate-700 to-slate-900 relative group">
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                        style={{ 
                            backgroundImage: formData.coverUrl ? `url('${formData.coverUrl}')` : "url('https://www.transparenttextures.com/patterns/cubes.png')",
                            opacity: formData.coverUrl ? 1 : 0.1
                        }}
                    ></div>
                    <button 
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-colors disabled:opacity-50"
                    >
                         {uploadingCover ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                    </button>
                    <input
                        type="file"
                        ref={coverInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'cover')}
                    />
                </div>

                <div className="px-6 pb-6">
                    <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4 gap-4">
                        {/* Avatar */}
                        <div className="relative group cursor-pointer" onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-white relative flex items-center justify-center">
                                {uploadingAvatar ? (
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                ) : (
                                    <img 
                                        src={formData.avatarUrl || 'https://via.placeholder.com/160'} 
                                        className="w-full h-full object-cover" 
                                        alt={formData.name} 
                                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/160')}
                                    />
                                )}
                                {/* Overlay Edit Hint */}
                                {!uploadingAvatar && (
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ImageIcon className="text-white" size={24} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name & Headline */}
                        <div className="flex-1 pt-2 md:pt-0">
                            <div className="flex justify-between items-start">
                                <div className="w-full">
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className="w-full font-bold text-2xl text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none transition-colors placeholder-gray-400 mb-1"
                                        placeholder="Seu Nome"
                                    />
                                    <input 
                                        type="text" 
                                        value={formData.specialty} 
                                        onChange={(e) => handleChange('specialty', e.target.value)}
                                        className="w-full text-base text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary outline-none transition-colors placeholder-gray-400"
                                        placeholder="Sua Especialidade (ex: Desenvolvedor Web)"
                                    />
                                </div>
                                <div className="hidden md:block">
                                   <div className="flex gap-2">
                                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                            <ShieldCheck size={14} /> Verificado
                                        </div>
                                   </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <span className="text-gray-400">Localização:</span> {user.location || 'Brasil'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ABOUT SECTION --- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Sobre</h3>
                    <button className="text-gray-400 hover:text-gray-600">
                        <Sparkles size={18} />
                    </button>
                </div>
                <textarea 
                    value={formData.bio} 
                    onChange={(e) => handleChange('bio', e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-primary rounded-lg p-3 text-sm text-gray-700 leading-relaxed outline-none transition-all resize-none min-h-[100px]"
                    placeholder="Escreva um resumo sobre sua experiência, habilidades e o que você oferece..."
                />
            </div>

            {/* --- FEATURED / PORTFOLIO SECTION --- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Destaques</h3>
                        <p className="text-xs text-gray-500">Seus principais projetos e trabalhos</p>
                    </div>
                    <button 
                        onClick={() => !uploadingPortfolio && portfolioInputRef.current?.click()} 
                        className="text-primary font-bold text-sm flex items-center gap-1 hover:bg-primary/5 px-3 py-1.5 rounded-full transition-colors"
                        disabled={uploadingPortfolio}
                    >
                        {uploadingPortfolio ? <Loader2 size={16} className="animate-spin"/> : <><Plus size={16} /> Adicionar projeto</>}
                    </button>
                </div>

                <Reorder.Group 
                    axis="y" 
                    values={formData.portfolioImages} 
                    onReorder={(newOrder) => setFormData(prev => ({ ...prev, portfolioImages: newOrder }))}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 list-none p-0 m-0"
                >
                    {formData.portfolioImages.map((img) => (
                        <Reorder.Item 
                            key={img.id} 
                            value={img}
                            as="div"
                            onClick={() => setEditingImage(img)}
                            className="group cursor-pointer"
                            whileDrag={{ scale: 1.05, zIndex: 10, cursor: 'grabbing' }}
                            layoutId={`portfolio-img-${img.id}`}
                        >
                            <div className="aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 relative bg-gray-50">
                                <img 
                                    src={img.imageUrl} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const icon = document.createElement('div');
                                        icon.className = 'w-full h-full flex items-center justify-center text-gray-300';
                                        icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                        e.currentTarget.parentElement?.appendChild(icon);
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    {/* Hover overlay if needed */}
                                </div>
                            </div>
                            <div className="mt-2">
                                <p className="text-sm font-bold text-gray-900 truncate">{img.description || "Sem título"}</p>
                                <p className="text-xs text-gray-500">Visualizar detalhes</p>
                            </div>
                        </Reorder.Item>
                    ))}
                    
                    {formData.portfolioImages.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                <ImageIcon size={24} />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">Comece a adicionar destaques</h4>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 mb-4">Adicione fotos dos seus melhores trabalhos para atrair mais clientes.</p>
                            <button 
                                onClick={() => !uploadingPortfolio && portfolioInputRef.current?.click()}
                                className="text-primary font-bold text-sm hover:underline"
                            >
                                Adicionar mídia
                            </button>
                        </div>
                    )}
                </Reorder.Group>
            </div>

            {/* --- SERVICES SECTION --- */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Serviços</h3>
                        <p className="text-xs text-gray-500">O que você oferece aos clientes</p>
                    </div>
                    <button 
                        onClick={() => setIsServiceModalOpen(true)} 
                        className="text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="space-y-0 divide-y divide-gray-100">
                    {formData.services.length === 0 && (
                        <div className="text-center py-6">
                            <p className="text-sm text-gray-500">Nenhum serviço listado ainda.</p>
                            <button onClick={() => setIsServiceModalOpen(true)} className="text-primary text-sm font-bold mt-2 hover:underline">
                                Adicionar serviço
                            </button>
                        </div>
                    )}
                    {formData.services.map((service) => (
                        <div key={service.id} className="py-4 flex justify-between items-start group first:pt-0 last:pb-0">
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">{service.title}</h4>
                                <p className="text-xs text-gray-500 mt-1">{service.description || "Sem descrição"}</p>
                                <p className="text-xs font-medium text-gray-700 mt-2">
                                    R$ {service.price} 
                                    <span className="text-gray-400 font-normal ml-1">
                                        {service.priceUnit === 'HOURLY' ? '/hora' : service.priceUnit === 'ESTIMATE' ? '(estimado)' : ''}
                                    </span>
                                </p>
                            </div>
                            <button 
                                onClick={() => handleDeleteService(service.id)}
                                className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Service Modal */}
            {isServiceModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-900">Novo Serviço</h3>
                            <button onClick={() => setIsServiceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                                <input 
                                    type="text" 
                                    value={currentService.title || ''}
                                    onChange={e => setCurrentService(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-primary focus:bg-white transition-colors"
                                    placeholder="Ex: Instalação Elétrica"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço (R$)</label>
                                <input 
                                    type="text" 
                                    value={currentService.price || ''}
                                    onChange={e => setCurrentService(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-primary focus:bg-white transition-colors"
                                    placeholder="Ex: 150,00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Cobrança</label>
                                <select 
                                    value={currentService.priceUnit || 'FIXED'}
                                    onChange={e => setCurrentService(prev => ({ ...prev, priceUnit: e.target.value as any }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-primary focus:bg-white transition-colors"
                                >
                                    <option value="FIXED">Preço Fixo</option>
                                    <option value="HOURLY">Por Hora</option>
                                    <option value="ESTIMATE">A partir de / Estimado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição (Opcional)</label>
                                <textarea 
                                    value={currentService.description || ''}
                                    onChange={e => setCurrentService(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-primary focus:bg-white transition-colors resize-none h-20"
                                    placeholder="Detalhes do serviço..."
                                />
                            </div>
                            
                            <button 
                                onClick={handleAddService}
                                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primaryDark transition-colors shadow-lg shadow-primary/20 mt-2"
                            >
                                Adicionar Serviço
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FIXED BOTTOM BAR FOR SAVING --- */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-[101] md:static md:bg-transparent md:border-0 md:p-0 md:mt-8">
                <div className="max-w-md mx-auto md:max-w-none md:flex md:justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full md:w-auto bg-primary hover:bg-primaryDark text-white px-8 py-3 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isSaving ? <><Loader2 size={18} className="animate-spin"/> Salvando...</> : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const OverviewTab = ({ stats, formatCurrency, maxChartValue }: any) => (
    <>
        {/* --- HERO PERFORMANCE CARD (NO WALLET) --- */}
            <div className="relative w-full bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary/20 overflow-hidden mb-8 group animate-fade-in-up">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-primary/30 to-transparent rounded-full blur-[80px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[60px] -ml-20 -mb-20"></div>
                
                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-end gap-8">
                    <div className="space-y-6 flex-1 w-full">
                        <div className="flex items-center justify-between md:justify-start gap-4">
                            <div className="flex items-center gap-3 opacity-90">
                                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/5">
                                    <BarChart3 size={20} className="text-blue-400" />
                                </div>
                                <span className="text-sm font-black uppercase tracking-widest text-gray-300">Resumo Mensal</span>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Estimativa de Faturamento</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-white">
                                    {formatCurrency(stats.totalEarningsMonth)}
                                </h2>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium mt-1">*Valores baseados nos orçamentos fechados diretamente com clientes.</p>
                        </div>
                    </div>

                    {/* Stats Blocks */}
                    <div className="flex gap-3 w-full md:w-auto">
                         <div className="flex-1 md:w-40 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2 text-primaryLight">
                                <Briefcase size={16} />
                                <span className="text-[10px] font-black uppercase">Jobs Feitos</span>
                            </div>
                            <p className="text-2xl font-black">{stats.completedJobsMonth}</p>
                            <span className="text-[10px] text-green-400 font-bold">+2 essa semana</span>
                         </div>

                         <div className="flex-1 md:w-40 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2 text-yellow-300">
                                <Star size={16} />
                                <span className="text-[10px] font-black uppercase">Reputação</span>
                            </div>
                            <p className="text-2xl font-black">4.9</p>
                            <span className="text-[10px] text-gray-400 font-bold">Excelente</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* --- METRICS GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-up delay-100">
                <MetricCard 
                    icon={<Eye size={20}/>} 
                    value={stats.profileViews} 
                    label="Visitas no Perfil" 
                    trend="+15% esta semana"
                    color="text-purple-600" 
                    bg="bg-purple-50"
                    border="border-purple-100"
                />
                <MetricCard 
                    icon={<CalendarCheck size={20}/>} 
                    value="98%" 
                    label="Assiduidade" 
                    trend="Sempre pontual"
                    color="text-teal-600" 
                    bg="bg-teal-50"
                    border="border-teal-100"
                />
                <MetricCard 
                    icon={<Sparkles size={20}/>} 
                    value="Rápido" 
                    label="Tempo de Resposta" 
                    trend="Média: 15 min"
                    color="text-blue-600" 
                    bg="bg-blue-50"
                    border="border-blue-100"
                />
                <MetricCard 
                    icon={<ShieldCheck size={20}/>} 
                    value="Verificado" 
                    label="Status da Conta" 
                    trend="Documentos OK"
                    color="text-green-600" 
                    bg="bg-green-50"
                    border="border-green-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up delay-200">
                {/* --- CHART SECTION --- */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-card relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="font-black text-xl text-secondary">Volume de Trabalho</h3>
                            <p className="text-xs text-secondaryMuted font-medium mt-1">Serviços concluídos nos últimos 7 dias.</p>
                        </div>
                        <select className="bg-gray-50 border border-gray-200 text-xs font-bold text-secondary px-3 py-2 rounded-xl outline-none">
                            <option>Esta Semana</option>
                            <option>Semana Passada</option>
                        </select>
                    </div>

                    <div className="h-56 w-full flex items-end justify-between gap-3 sm:gap-6 relative z-10">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                            <div className="w-full h-px bg-gray-200 border-dashed"></div>
                        </div>

                        {stats.chartData.map((data: any, index: number) => {
                            const heightPct = Math.max((data.jobs / maxChartValue) * 100, 8);
                            const isToday = data.day === 'Sex'; // Mock logic for 'Today' highlight
                            
                            return (
                                <div key={index} className="flex flex-col items-center justify-end h-full w-full group cursor-pointer">
                                    <div className="relative w-full max-w-[40px] h-full flex items-end">
                                        <div 
                                            className={`w-full rounded-t-2xl transition-all duration-700 ease-out relative overflow-hidden ${
                                                isToday 
                                                ? 'bg-gradient-to-t from-primary to-violet-400 shadow-lg shadow-primary/30' 
                                                : 'bg-gray-100 group-hover:bg-primaryLight'
                                            }`}
                                            style={{ height: `${heightPct}%` }}
                                        >
                                            {/* Bar Shine Effect */}
                                            {isToday && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent"></div>}
                                        </div>
                                        
                                        {/* Tooltip */}
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-xl whitespace-nowrap z-20 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                                            {data.jobs} Jobs
                                            <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary rotate-45"></div>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold mt-4 uppercase ${isToday ? 'text-primary' : 'text-gray-400'}`}>{data.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- RECENT REVIEWS --- */}
                <div className="bg-gray-50 rounded-[2.5rem] p-6 border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-lg text-secondary">Últimos Feedbacks</h3>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">Ver todos</span>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-[350px]">
                        {stats.recentReviews.map((review: any, idx: number) => (
                            <div key={review.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative">
                                <div className="absolute top-4 right-4 text-gray-300 opacity-20">
                                    <QuoteIcon />
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-black text-gray-500 border border-white shadow-sm">
                                        {review.reviewerName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-secondary">{review.reviewerName}</p>
                                        <div className="flex text-yellow-400 gap-0.5">
                                            {[...Array(review.rating)].map((_, i) => <Star key={i} size={8} fill="currentColor"/>)}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-secondary/80 font-medium leading-relaxed">"{review.comment}"</p>
                            </div>
                        ))}
                        {stats.recentReviews.length === 0 && (
                            <div className="text-center py-10 opacity-50">
                                <p className="text-xs font-bold">Sem avaliações recentes.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
    </>
);

const MetricCard = ({ icon, value, label, trend, color, bg, border }: any) => (
    <div className={`p-5 rounded-[1.8rem] bg-white border ${border} shadow-sm hover:shadow-lg transition-all group relative overflow-hidden`}>
        <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
        <h4 className="text-2xl font-display font-black text-secondary tracking-tight leading-none mb-1">{value}</h4>
        <p className="text-[10px] font-bold text-secondaryMuted uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-[9px] font-bold ${color} opacity-80`}>{trend}</p>
    </div>
);

const QuoteIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
    </svg>
);

export default ProfessionalDashboard;
