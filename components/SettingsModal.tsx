
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { X, Camera, Save, User as UserIcon, MapPin, Phone, HelpCircle, FileText, ChevronRight, LogOut, Loader2, UploadCloud } from 'lucide-react';
import { Backend } from '../services/mockBackend';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUpdateUser: (updatedData: Partial<User>) => Promise<void>;
    onLogout: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, onUpdateUser, onLogout }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        phone: '',
        bio: '',
        avatarUrl: ''
    });

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                name: user.name || '',
                location: user.location || '',
                phone: user.phone || '',
                bio: user.bio || '',
                avatarUrl: user.avatarUrl || ''
            });
        }
    }, [isOpen, user]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onUpdateUser(formData);
            onClose();
        } catch (error) {
            console.error("Failed to update user", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Upload real via Backend Service
            const newUrl = await Backend.uploadImage(file);
            setFormData(prev => ({ ...prev, avatarUrl: newUrl }));
        } catch (error) {
            alert("Erro ao enviar imagem.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleContactSupport = () => {
        alert("Chamando suporte... (Simulação: Redirecionaria para WhatsApp ou Chat de Suporte)");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-black text-textMain">Configurações</h2>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <X size={20} className="text-textMuted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 relative">
                                <img src={formData.avatarUrl} alt="Avatar" className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-50' : ''}`} />
                                {isUploading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-primary" size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-primary text-white p-2.5 rounded-full border-4 border-white shadow-md group-hover:scale-110 transition-transform">
                                <Camera size={18} />
                            </div>
                            {/* Hidden File Input */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                        <p className="text-xs text-primary font-bold mt-3 uppercase tracking-widest">
                            {isUploading ? 'Enviando...' : 'Alterar Foto'}
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-textMuted ml-1">Nome Completo</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-bold text-textMain text-sm outline-none transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Seu nome"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-textMuted ml-1">Localização</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-bold text-textMain text-sm outline-none transition-all"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    placeholder="Bairro, Cidade"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-textMuted ml-1">Telefone / WhatsApp</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl py-3 pl-12 pr-4 font-bold text-textMain text-sm outline-none transition-all"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                        </div>

                        {user.role === UserRole.PROFESSIONAL && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-textMuted ml-1">Bio / Sobre Você</label>
                                <textarea 
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl p-4 font-medium text-textMain text-sm outline-none transition-all min-h-[100px]"
                                    value={formData.bio}
                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                    placeholder="Conte um pouco sobre sua experiência..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Support & Actions */}
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                        <button onClick={handleContactSupport} className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 group-hover:bg-white rounded-full flex items-center justify-center text-blue-600">
                                    <HelpCircle size={18} />
                                </div>
                                <span className="font-bold text-sm text-blue-900">Falar com Suporte</span>
                            </div>
                            <ChevronRight size={18} className="text-blue-300 group-hover:text-blue-500" />
                        </button>

                        <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-textMuted">
                                    <FileText size={18} />
                                </div>
                                <span className="font-bold text-sm text-textMain">Termos e Privacidade</span>
                            </div>
                            <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-white space-y-3">
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading || isUploading}
                        className="w-full bg-primary text-white h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Alterações</>}
                    </button>
                    
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-500 font-bold text-sm py-2 hover:bg-red-50 rounded-xl transition-colors">
                        <LogOut size={16} /> Sair da conta
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SettingsModal;
