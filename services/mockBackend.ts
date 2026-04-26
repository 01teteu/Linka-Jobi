import { User, Proposal, UserRole, Notification, ServiceCategory, ServiceSubItem, Appointment, AdminStats, PortfolioItem, Review } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SERVICES, TOP_PROFESSIONALS } from '../constants';

const BASE_URL = ''; 

// --- API Client Puro ---

// Logger simples para o frontend que só exibe logs em desenvolvimento
const logger = {
    warn: (...args: any[]) => {
        if (import.meta.env.MODE !== 'production') {
            console.warn(...args);
        }
    },
    error: (...args: any[]) => {
        if (import.meta.env.MODE !== 'production') {
            console.error(...args);
        }
    }
};

export const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
};

const getHeaders = (isMultipart = false, method = 'GET') => {
    const token = localStorage.getItem('token');
    const csrfToken = getCookie('csrf-token');
    
    const headers: any = { 
        'Authorization': token ? `Bearer ${token}` : '' 
    };
    
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
        headers['X-CSRF-Token'] = csrfToken;
    }
    
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

let isRefreshingCsrf = false;

export const apiFetch = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
    const url = endpoint.startsWith('/') ? endpoint : `${BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    const method = options.method || 'GET';

    // 1. Fetch CSRF token automatically before the first mutation request if missing
    if (!isRetry && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) && !getCookie('csrf-token') && endpoint !== '/api/auth/csrf-token') {
        if (!isRefreshingCsrf) {
            isRefreshingCsrf = true;
            try {
                // We use a direct fetch here to avoid circular dependency with Backend.getCsrfToken
                await fetch(`${BASE_URL}/api/auth/csrf-token`, { method: 'GET' });
            } catch (e) {
                logger.error("Failed to pre-fetch CSRF token", e);
            } finally {
                isRefreshingCsrf = false;
            }
        }
    }

    try {
        let response = await fetch(url, { 
            ...options, 
            headers: { 
                ...getHeaders(isFormData, method), 
                ...(options.headers || {}) 
            } 
        });
        
        // 2. Automatic refresh on 401 Unauthorized (expired JWT)
        if (response.status === 401 && !isRetry && endpoint !== '/api/auth/refresh' && endpoint !== '/api/login') {
            logger.warn('Token expired or invalid. Attempting to refresh...');
            try {
                const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    if (refreshData.token) {
                        localStorage.setItem('token', refreshData.token);
                        logger.info('Token refreshed successfully.');
                        // Retry the original request
                        return await apiFetch(endpoint, options, true);
                    }
                }
                
                // If refresh fails or returns no token, redirect to login
                logger.error('Token refresh failed. Redirecting to login.');
                localStorage.removeItem('token');
                window.location.href = '/?login=true';
                return null;
            } catch (e) {
                logger.error("Failed to refresh token", e);
                localStorage.removeItem('token');
                window.location.href = '/?login=true';
                return null;
            }
        }

        // 3. Automatic refresh on 403 Forbidden (likely invalid/expired CSRF token)
        if (response.status === 403 && !isRetry && endpoint !== '/api/auth/csrf-token') {
            logger.warn('CSRF token missing or invalid. Refreshing token and retrying...');
            if (!isRefreshingCsrf) {
                isRefreshingCsrf = true;
                try {
                    await fetch(`${BASE_URL}/api/auth/csrf-token`, { method: 'GET' });
                } catch (e) {
                    logger.error("Failed to refresh CSRF token", e);
                } finally {
                    isRefreshingCsrf = false;
                }
            }
            // Retry the request with the new headers
            return await apiFetch(endpoint, options, true);
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

        if (response.status === 401) { 
            localStorage.removeItem('token'); 
            // Use the actual error from server if available (e.g. "Senha incorreta")
            throw new Error(data?.error || "Sessão expirada. Faça login novamente."); 
        }

        if (!response.ok) throw new Error(data?.error || 'Erro no servidor');
        return data;
    } catch (error: any) {
        // Suppress NetworkError logs to avoid console noise during dev server restarts
        if (error.message !== 'Failed to fetch' && !error.message.includes('NetworkError')) {
             logger.warn(`API Warning [${endpoint}]:`, error.message);
        }
        throw error;
    }
};

// --- Backend Service Real ---

export const Backend = {
    // CSRF Token
    getCsrfToken: async () => {
        try {
            await apiFetch('/api/auth/csrf-token', { method: 'GET' });
        } catch (e) {
            console.error('Failed to get CSRF token', e);
        }
    },

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

    updateUser: async (u: User) => {
        return await apiFetch(`/api/users/${u.id}`, { 
            method: 'PUT', 
            body: JSON.stringify(u) 
        });
    },

    uploadImage: async (file: File, type: 'avatar' | 'portfolio' | 'cover' = 'portfolio') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
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

    cancelProposal: async (id: number) => {
        return await apiFetch(`/api/proposals/${id}/cancel`, { method: 'POST' });
    },

    acceptProposal: async (id: number, userId: number) => {
        return await apiFetch(`/api/proposals/${id}/accept`, { method: 'POST' });
    },

    hireProfessional: async (proposalId: number, professionalId: number) => {
        return await apiFetch(`/api/proposals/${proposalId}/hire`, {
            method: 'POST',
            body: JSON.stringify({ professionalId })
        });
    },

    completeProposal: async (id: number, professionalId?: number) => {
        return await apiFetch(`/api/proposals/${id}/complete`, { 
            method: 'POST',
            body: JSON.stringify({ professionalId })
        });
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

    proposePrice: async (chatId: number, price: number) => {
        return await apiFetch(`/api/chats/${chatId}/negotiate`, {
            method: 'POST',
            body: JSON.stringify({ price })
        });
    },

    acceptPrice: async (chatId: number) => {
        return await apiFetch(`/api/chats/${chatId}/negotiate/accept`, { method: 'POST' });
    },

    rejectPrice: async (chatId: number) => {
        return await apiFetch(`/api/chats/${chatId}/negotiate/reject`, { method: 'POST' });
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

    getPublicProfile: async (userId: number): Promise<{user: User, portfolio: PortfolioItem[], reviews: Review[], services?: ServiceItem[]}> => {
        return await apiFetch(`/api/users/${userId}/public_profile`);
    },

    getProfessionalStats: async () => {
        return await apiFetch('/api/professional/stats');
    },

    incrementProfileViews: async (userId: number) => {
        return await apiFetch(`/api/users/${userId}/view`, { method: 'POST' });
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

    getFavorites: async () => {
        return await apiFetch('/api/favorites');
    },

    toggleFavorite: async (professionalId: number) => {
        return await apiFetch('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ professionalId })
        });
    },

    // Denúncias e Bloqueios
    reportUser: async (reportedId: number, reason: string, description?: string) => {
        return await apiFetch('/api/reports', {
            method: 'POST',
            body: JSON.stringify({ reportedId, reason, description })
        });
    },

    blockUser: async (userId: number) => {
        return await apiFetch(`/api/users/${userId}/block`, { method: 'POST' });
    },

    unblockUser: async (userId: number) => {
        return await apiFetch(`/api/users/${userId}/block`, { method: 'DELETE' });
    },

    getBlockedUsers: async () => {
        return await apiFetch('/api/users/blocked');
    },

    getReports: async () => {
        return await apiFetch('/api/admin/reports');
    },

    contactSupport: async () => {
        return await apiFetch('/api/support/contact', { method: 'POST' });
    },

    // Admin CRUD
    saveCategory: async (c: any) => {
        if (c.isNew) {
            return await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(c) });
        } else {
            return await apiFetch(`/api/admin/categories/${c.id}`, { method: 'PUT', body: JSON.stringify(c) });
        }
    },
    deleteCategory: async (id: string) => {
        return await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    },
    saveService: async (s: any) => {
        if (s.isNew) {
            return await apiFetch('/api/admin/services', { method: 'POST', body: JSON.stringify(s) });
        } else {
            return await apiFetch(`/api/admin/services/${s.id}`, { method: 'PUT', body: JSON.stringify(s) });
        }
    },
    deleteService: async (id: string) => {
        return await apiFetch(`/api/admin/services/${id}`, { method: 'DELETE' });
    },
};