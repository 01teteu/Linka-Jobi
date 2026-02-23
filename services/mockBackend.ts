import { User, Proposal, UserRole, Notification, ServiceCategory, ServiceSubItem, Appointment, AdminStats, PortfolioItem, Review } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SERVICES, TOP_PROFESSIONALS } from '../constants';

const BASE_URL = ''; 

// --- API Client Puro ---

const getHeaders = (isMultipart = false) => {
    const token = localStorage.getItem('token');
    const headers: any = { 
        'Authorization': token ? `Bearer ${token}` : '' 
    };
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const url = endpoint.startsWith('/') ? endpoint : `${BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;

    try {
        const response = await fetch(url, { 
            ...options, 
            headers: { 
                ...getHeaders(isFormData), 
                ...(options.headers || {}) 
            } 
        });
        
        if (response.status === 401) { 
            localStorage.removeItem('token'); 
            throw new Error("Sessão expirada. Faça login novamente."); 
        }
        
        const contentType = response.headers.get("content-type");
        let data = null;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
             const text = await response.text();
             if (!response.ok) throw new Error(text || 'Erro no servidor');
             return text;
        }

        if (!response.ok) throw new Error(data?.error || 'Erro no servidor');
        return data;
    } catch (error: any) {
        // Suppress NetworkError logs to avoid console noise during dev server restarts
        if (error.message !== 'Failed to fetch' && !error.message.includes('NetworkError')) {
             console.warn(`API Warning [${endpoint}]:`, error.message);
        }
        throw error;
    }
};

// --- Backend Service Real ---

export const Backend = {
    // Health Check
    checkHealth: async () => {
        try {
            await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
            return true; 
        } catch {
            return false;
        }
    },

    // Auth
    init: async () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const data = await apiFetch('/api/me');
            return { user: data.user };
        } catch (e) {
            return null;
        }
    },

    login: async (email: string, role: string, password?: string) => {
        const res = await apiFetch('/api/login', { 
            method: 'POST', 
            body: JSON.stringify({ email, senha: password || '123456' }) 
        });
        if (res.token) localStorage.setItem('token', res.token);
        return res;
    },

    register: async (userData: any) => {
        const res = await apiFetch('/api/register', { 
            method: 'POST', 
            body: JSON.stringify(userData) 
        });
        if (res.token) localStorage.setItem('token', res.token);
        return res;
    },

    forgotPassword: async (email: string) => {
        // Rota placeholder no frontend, backend ainda não envia email real
        return { success: true };
    },

    updateUser: async (u: User) => {
        return await apiFetch(`/api/users/${u.id}`, { 
            method: 'PUT', 
            body: JSON.stringify(u) 
        });
    },

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiFetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        return res.url;
    },

    // Catálogo (Fallback para constantes se DB estiver vazio, apenas para UI não quebrar)
    getCategories: async () => {
        try {
            const res = await apiFetch('/api/categories');
            return res.length > 0 ? res : DEFAULT_CATEGORIES;
        } catch { return DEFAULT_CATEGORIES; }
    },
    
    getServices: async () => {
        try {
            const res = await apiFetch('/api/services');
            return res.length > 0 ? res : DEFAULT_SERVICES;
        } catch { return DEFAULT_SERVICES; }
    },

    // Propostas & Jobs
    getProposals: async (area?: string, page: number = 1, limit: number = 10, lat?: number, lng?: number, radius?: number, contractorId?: number) => {
        const params = new URLSearchParams();
        if (area) params.append('area', area);
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());
        if (lat) params.append('lat', lat.toString());
        if (lng) params.append('lng', lng.toString());
        if (radius) params.append('radius', radius.toString());
        if (contractorId) params.append('contractorId', contractorId.toString());
        
        return await apiFetch(`/api/proposals?${params.toString()}`);
    },

    getProposalById: async (id: number) => {
        return await apiFetch(`/api/proposals/${id}`);
    },

    createProposal: async (p: Partial<Proposal>) => {
        return await apiFetch('/api/proposals', { 
            method: 'POST', 
            body: JSON.stringify(p) 
        });
    },

    acceptProposal: async (id: number, userId: number) => {
        return await apiFetch(`/api/proposals/${id}/accept`, { method: 'POST' });
    },

    completeProposal: async (id: number) => {
        return await apiFetch(`/api/proposals/${id}/complete`, { method: 'POST' });
    },

    submitReview: async (proposalId: number, targetId: number, rating: number, comment: string) => {
        return await apiFetch('/api/reviews', { 
            method: 'POST', 
            body: JSON.stringify({ proposalId, targetId, rating, comment }) 
        });
    },

    // Chat
    getUserChats: async (id: number) => {
        return await apiFetch('/api/chats');
    },

    sendMessage: async (chatId: number, senderId: number, text: string, type: string = 'text', metadata?: any) => {
        return await apiFetch('/api/messages', { 
            method: 'POST', 
            body: JSON.stringify({ chatId, text, type, ...metadata }) 
        });
    },

    updateMessageStatus: async (chatId: number, msgId: number, status: string) => {
        return await apiFetch(`/api/messages/${msgId}/status`, { 
            method: 'PUT', 
            body: JSON.stringify({ status }) 
        });
    },

    // Features Específicas
    getTopProfessionals: async () => {
        try {
            const res = await apiFetch('/api/professionals/top');
            return res.length > 0 ? res : TOP_PROFESSIONALS;
        } catch { return TOP_PROFESSIONALS; }
    },

    getPublicProfile: async (userId: number): Promise<{user: User, portfolio: PortfolioItem[], reviews: Review[]}> => {
        return await apiFetch(`/api/users/${userId}/public_profile`);
    },

    getAdminStats: async (): Promise<AdminStats> => {
        return await apiFetch('/api/admin/stats');
    },
    
    getAllUsers: async (): Promise<User[]> => {
        return await apiFetch('/api/admin/users');
    },

    updateUserStatus: async (id: number, status: string) => {
        return await apiFetch(`/api/admin/users/${id}/status`, { 
            method: 'PUT', 
            body: JSON.stringify({ status }) 
        });
    },

    getUserAppointments: async (userId: number): Promise<Appointment[]> => {
        return await apiFetch('/api/appointments');
    },

    // Rotas Reais de Gamificação, Notificações e Carteira
    getUserGamification: async (userId: number, role: UserRole) => {
        return await apiFetch('/api/gamification');
    },

    getNotifications: async (userId: number, role: UserRole) => {
        return await apiFetch('/api/notifications');
    },

    markNotificationRead: async (id: string) => {
        return await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    },
    
    getUserWallet: async (userId: number, role: UserRole) => {
        return await apiFetch('/api/wallet');
    },

    // Stubs (Funcionalidades de CRUD administrativo futuro)
    saveCategory: async (c: any) => ({ success: true }),
    deleteCategory: async (id: string) => ({ success: true }),
    saveService: async (s: any) => ({ success: true }),
    deleteService: async (id: string) => ({ success: true }),
};