import { User, Proposal, UserRole, Notification, ServiceCategory, ServiceSubItem, Appointment, AdminStats, ProposalStatus, PortfolioItem, Review } from '../types';
import { 
    DEFAULT_CATEGORIES, 
    DEFAULT_SERVICES, 
    TOP_PROFESSIONALS, 
    MOCK_CONTRACTOR, 
    MOCK_PROFESSIONAL, 
    MOCK_ADMIN,
    MOCK_PROPOSALS,
    MOCK_CHATS,
    MOCK_PROFILE_REVIEWS
} from '../constants';

const BASE_URL = '/api'; 

const mockDelay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

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

// --- Helper de Distância para Mock ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; 
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180)
}

async function tryApiOrMock<T>(
    apiCall: () => Promise<T>, 
    mockFallback: () => T | Promise<T>,
    endpointName: string = "API"
): Promise<T> {
    try {
        // Aumentado para 10s para suportar Cold Start do Supabase
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 10000) 
        );
        
        const response = await Promise.race([apiCall(), timeoutPromise]);
        return response as T;
    } catch (error: any) {
        const msg = error.message || error.toString();
        // Apenas loga se não for timeout, para debug
        if (msg !== "Timeout" && !msg.includes("Failed to fetch")) {
             console.warn(`⚠️ [API FALHOU] ${endpointName}: Usando dados locais. Motivo: ${msg}`);
        }
        await mockDelay(); 
        return await mockFallback();
    }
}

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
            throw new Error("Sessão expirada."); 
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) throw new Error("API not ready");

        let data = null;
        if (contentType?.includes("application/json")) {
            data = await response.json();
        }

        if (!response.ok) throw new Error(data?.error || 'Erro no servidor');

        return data;
    } catch (error: any) {
        throw error;
    }
};

// --- ESTADO MOCKADO (Memória Volátil) ---
let MOCK_WALLET_CONTRACTOR = 2500.00;
let MOCK_WALLET_PROFESSIONAL = 150.00;
let MOCK_TRANSACTIONS_MEMORY: any[] = [];

export const Backend = {
    checkHealth: async () => {
        try {
            await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
            return true; 
        } catch {
            return false;
        }
    },

    init: async () => {
        if (!localStorage.getItem('token')) return null;
        return tryApiOrMock(
            async () => {
                const data = await apiFetch('/api/me');
                if (!data || !data.user) throw new Error("Invalid user data");
                return { user: data.user };
            },
            () => {
                const savedEmail = localStorage.getItem('mock_user_email');
                if (savedEmail === 'admin@linka.com') return { user: MOCK_ADMIN };
                if (savedEmail === 'joao@linka.com') return { user: MOCK_PROFESSIONAL };
                return { user: MOCK_CONTRACTOR }; 
            },
            "Init Session"
        );
    },

    login: async (email: string, role: string, password?: string) => {
        return tryApiOrMock(
            async () => await apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ email, senha: password || '123456' }) }),
            () => {
                let user;
                if (email.includes('admin')) user = MOCK_ADMIN;
                else if (email.includes('joao')) user = MOCK_PROFESSIONAL;
                else user = MOCK_CONTRACTOR;
                
                localStorage.setItem('token', 'mock_token_123');
                localStorage.setItem('mock_user_email', user.email);
                return { user, token: 'mock_token_123' };
            },
            "Login"
        );
    },

    register: async (userData: any) => {
        return tryApiOrMock(
            async () => await apiFetch('/api/register', { method: 'POST', body: JSON.stringify(userData) }),
            () => {
                const newUser = { ...userData, id: Math.floor(Math.random() * 1000) + 100 };
                localStorage.setItem('token', 'mock_token_new');
                localStorage.setItem('mock_user_email', newUser.email);
                return { user: newUser, token: 'mock_token_new' };
            },
            "Register"
        );
    },

    updateUser: async (u: User) => {
        return tryApiOrMock(
            async () => await apiFetch(`/api/users/${u.id}`, { method: 'PUT', body: JSON.stringify(u) }),
            () => u,
            "Update User"
        );
    },

    uploadImage: async (file: File) => {
        return tryApiOrMock(
            async () => {
                const formData = new FormData();
                formData.append('file', file);
                const res = await apiFetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                return res.url;
            },
            () => URL.createObjectURL(file),
            "Upload Image"
        );
    },

    forgotPassword: async (email: string) => {
        return tryApiOrMock(
            async () => await apiFetch('/api/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
            () => ({ success: true }),
            "Forgot Password"
        );
    },

    getCategories: async () => tryApiOrMock(async () => {
        const res = await apiFetch('/api/categories');
        if (!res) throw new Error("API call returned null");
        return res;
    }, () => DEFAULT_CATEGORIES, "Get Categories"),
    
    getServices: async () => tryApiOrMock(async () => {
        const res = await apiFetch('/api/services');
        if (!res) throw new Error("API call returned null");
        return res;
    }, () => DEFAULT_SERVICES, "Get Services"),

    getProposals: async (area?: string, page: number = 1, limit: number = 10, lat?: number, lng?: number, radius?: number, contractorId?: number) => {
        const qArea = area ? `&area=${encodeURIComponent(area)}` : '';
        const qLat = lat ? `&lat=${lat}` : '';
        const qLng = lng ? `&lng=${lng}` : '';
        const qRad = radius ? `&radius=${radius}` : '';
        const qCid = contractorId ? `&contractorId=${contractorId}` : '';
        
        return tryApiOrMock(
            async () => await apiFetch(`/api/proposals?page=${page}&limit=${limit}${qArea}${qLat}${qLng}${qRad}${qCid}`) || [],
            () => {
                let props = [...MOCK_PROPOSALS];
                if (contractorId) props = props.filter(p => p.contractorId === contractorId);
                if (area) props = props.filter(p => p.areaTag === area);
                if (lat && lng && radius && radius !== Infinity && !contractorId) {
                    props = props.filter(p => {
                        const mockPropLat = -23.5505 + (p.id % 2 === 0 ? 0.01 : 0.5); 
                        const mockPropLng = -46.6333 + (p.id % 2 === 0 ? 0.01 : 0.5);
                        const dist = getDistanceFromLatLonInKm(lat, lng, mockPropLat, mockPropLng);
                        return dist <= radius;
                    });
                }
                return props.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            },
            "Get Proposals"
        );
    },

    getProposalById: async (id: number) => {
        return tryApiOrMock(
            async () => await apiFetch(`/api/proposals/${id}`),
            () => {
                const prop = MOCK_PROPOSALS.find(p => p.id === id);
                if (!prop) throw new Error("Not Found");
                return prop;
            },
            "Get Proposal By ID"
        );
    },

    createProposal: async (p: Partial<Proposal>) => {
        return tryApiOrMock(
            async () => await apiFetch('/api/proposals', { method: 'POST', body: JSON.stringify(p) }),
            () => {
                const newProposal: Proposal = { 
                    ...MOCK_PROPOSALS[0], 
                    ...p, 
                    id: Date.now(), 
                    status: ProposalStatus.OPEN, 
                    createdAt: new Date().toISOString(),
                    contractorId: p.contractorId || MOCK_CONTRACTOR.id,
                    contractorName: p.contractorName || MOCK_CONTRACTOR.name,
                    contractorAvatar: MOCK_CONTRACTOR.avatarUrl
                } as Proposal;
                MOCK_PROPOSALS.unshift(newProposal);
                return newProposal;
            },
            "Create Proposal"
        );
    },

    acceptProposal: async (id: number, userId: number) => {
        return tryApiOrMock(
            async () => await apiFetch(`/api/proposals/${id}/accept`, { method: 'POST' }),
            () => {
                const prop = MOCK_PROPOSALS.find(p => p.id === id);
                if (prop) {
                    prop.status = ProposalStatus.NEGOTIATING;
                    prop.professionalId = userId;
                    MOCK_CHATS.push({
                        id: Date.now(),
                        proposalId: prop.id,
                        proposalTitle: prop.title,
                        contractorId: prop.contractorId,
                        professionalId: userId,
                        proposalStatus: ProposalStatus.NEGOTIATING,
                        participants: [
                            { id: prop.contractorId, name: prop.contractorName, avatar: prop.contractorAvatar || '' },
                            { id: userId, name: MOCK_PROFESSIONAL.name, avatar: MOCK_PROFESSIONAL.avatarUrl || '' }
                        ],
                        messages: [
                            { id: 1, senderId: 0, text: 'Job aceito! Combinem os detalhes.', timestamp: 'Agora', isSystem: true, type: 'text' }
                        ],
                        lastMessage: 'Job aceito!',
                        unreadCount: 1
                    });
                }
                return { success: true };
            },
            "Accept Proposal"
        );
    },

    completeProposal: async (id: number) => {
        return tryApiOrMock(
            async () => await apiFetch(`/api/proposals/${id}/complete`, { method: 'POST' }),
            () => {
                const prop = MOCK_PROPOSALS.find(p => p.id === id);
                if (prop) {
                    prop.status = ProposalStatus.COMPLETED;
                    const chat = MOCK_CHATS.find(c => c.proposalId === id);
                    if (chat) chat.proposalStatus = ProposalStatus.COMPLETED;

                    const valueMatch = prop.budgetRange.match(/\d+/);
                    const value = valueMatch ? parseInt(valueMatch[0]) : 100;

                    MOCK_WALLET_CONTRACTOR -= value;
                    MOCK_TRANSACTIONS_MEMORY.push({
                        id: `tx_${Date.now()}_c`,
                        type: 'EXPENSE',
                        amount: value,
                        description: `Pagamento: ${prop.title}`,
                        date: new Date().toISOString(),
                        status: 'COMPLETED',
                        userId: prop.contractorId
                    });

                    if (prop.professionalId) {
                        MOCK_WALLET_PROFESSIONAL += (value * 0.9);
                        MOCK_TRANSACTIONS_MEMORY.push({
                            id: `tx_${Date.now()}_p`,
                            type: 'INCOME',
                            amount: value * 0.9,
                            description: `Serviço: ${prop.title}`,
                            date: new Date().toISOString(),
                            status: 'COMPLETED',
                            userId: prop.professionalId
                        });
                    }
                }
                return { success: true };
            },
            "Complete Proposal"
        );
    },

    submitReview: async (proposalId: number, targetId: number, rating: number, comment: string) => {
        return tryApiOrMock(
            async () => await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify({ proposalId, targetId, rating, comment }) }),
            () => {
                MOCK_PROFILE_REVIEWS.unshift({
                    id: Date.now(),
                    proposalId,
                    reviewerId: MOCK_CONTRACTOR.id,
                    targetId,
                    reviewerName: MOCK_CONTRACTOR.name,
                    rating,
                    comment,
                    createdAt: new Date().toISOString()
                });

                const pro = TOP_PROFESSIONALS.find(u => u.id === targetId) || MOCK_PROFESSIONAL;
                if (pro) {
                    const currentRating = pro.rating || 5;
                    const currentCount = pro.reviewsCount || 10;
                    const newCount = currentCount + 1;
                    const newRating = ((currentRating * currentCount) + rating) / newCount;
                    pro.rating = parseFloat(newRating.toFixed(1));
                    pro.reviewsCount = newCount;
                    
                    if (targetId === MOCK_PROFESSIONAL.id) {
                        MOCK_PROFESSIONAL.rating = pro.rating;
                        MOCK_PROFESSIONAL.reviewsCount = pro.reviewsCount;
                    }
                }
                return { success: true };
            },
            "Submit Review"
        );
    },

    getUserChats: async (id: number) => {
        return tryApiOrMock(
            async () => await apiFetch('/api/chats'),
            () => MOCK_CHATS,
            "Get Chats"
        );
    },

    sendMessage: async (chatId: number, senderId: number, text: string, type: string = 'text', metadata?: any) => {
        return tryApiOrMock(
            async () => await apiFetch('/api/messages', { method: 'POST', body: JSON.stringify({ chatId, text, type, ...metadata }) }),
            () => {
                const chat = MOCK_CHATS.find(c => c.id === chatId);
                if (chat) {
                    chat.messages.push({
                        id: Date.now(),
                        senderId,
                        text,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isSystem: false,
                        type: type as any,
                        ...metadata
                    });
                    chat.lastMessage = type === 'image' ? '📷 Imagem' : text;
                }
                return { success: true };
            },
            "Send Message"
        );
    },

    updateMessageStatus: async (chatId: number, msgId: number, status: string) => {
        return tryApiOrMock(
            async () => await apiFetch(`/api/messages/${msgId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
            () => {
                const chat = MOCK_CHATS.find(c => c.id === chatId);
                const msg = chat?.messages.find(m => m.id === msgId);
                if (msg && msg.scheduleData) {
                    msg.scheduleData.status = status as any;
                }
                return { success: true };
            },
            "Update Msg Status"
        );
    },

    getTopProfessionals: async () => tryApiOrMock(async () => {
        const res = await apiFetch('/api/professionals/top');
        if (!res) throw new Error("API call returned null");
        if (Array.isArray(res) && res.length === 0) throw new Error("No pros found");
        return res;
    }, () => TOP_PROFESSIONALS, "Get Top Pros"),

    getPublicProfile: async (userId: number): Promise<{user: User, portfolio: PortfolioItem[], reviews: Review[]}> => {
        return tryApiOrMock(
            async () => await apiFetch(`/api/users/${userId}/public_profile`),
            () => {
                const user = TOP_PROFESSIONALS.find(u => u.id === userId) || MOCK_PROFESSIONAL;
                const portfolio = [
                    { id: 1, userId: userId, imageUrl: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?w=400', description: 'Obra 1' },
                    { id: 2, userId: userId, imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', description: 'Obra 2' }
                ];
                return { user, portfolio, reviews: MOCK_PROFILE_REVIEWS };
            },
            "Get Profile"
        );
    },

    getAdminStats: async (): Promise<AdminStats> => {
        return tryApiOrMock(
            async () => await apiFetch('/api/admin/stats'),
            () => ({ totalUsers: 1540, activeJobs: 42, revenue: 12500.00, reportsPending: 3, onlineUsers: 125, loggedInUsers: 80, subscriptionPrice: 19.90 }),
            "Get Stats"
        );
    },
    
    getAllUsers: async (): Promise<User[]> => {
        return tryApiOrMock(
            async () => await apiFetch('/api/admin/users'),
            () => [MOCK_CONTRACTOR, MOCK_PROFESSIONAL, MOCK_ADMIN, ...TOP_PROFESSIONALS],
            "Get Users"
        );
    },

    updateUserStatus: async (id: number, status: string) => {
        return tryApiOrMock(
            async () => await apiFetch(`/api/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
            () => ({ success: true }),
            "Update User Status"
        );
    },

    getUserAppointments: async (userId: number): Promise<Appointment[]> => {
        return tryApiOrMock(
            async () => {
                const res = await apiFetch('/api/appointments');
                if (!res) throw new Error("API call returned null");
                return res;
            },
            () => {
                const existing: Appointment[] = [];
                // 1. Propostas onde sou o profissional (NEGOTIATING ou COMPLETED)
                const myAccepted = MOCK_PROPOSALS.filter(p => p.professionalId === userId);
                myAccepted.forEach(p => {
                    const chat = MOCK_CHATS.find(c => c.proposalId === p.id);
                    existing.push({
                        id: `job_${p.id}`,
                        chatId: chat?.id,
                        title: p.title || p.areaTag,
                        withUser: p.contractorName,
                        avatarUrl: p.contractorAvatar || "https://ui-avatars.com/api/?name=C&background=f3f4f6&color=6b7280",
                        date: new Date(p.createdAt).toISOString().split('T')[0],
                        time: new Date(p.createdAt).toLocaleTimeString().slice(0,5),
                        status: p.status === 'COMPLETED' ? 'CONFIRMED' : 'PENDING',
                        location: p.location,
                        isProposal: false
                    });
                });

                // 2. Propostas onde sou contratante (OPEN, NEGOTIATING, COMPLETED)
                const myOpenProposals = MOCK_PROPOSALS.filter(p => p.contractorId === userId);
                myOpenProposals.forEach(p => {
                    // Evita duplicatas se já foi tratado acima (caso eu seja contratante e profissional em testes)
                    if (existing.find(e => e.id === `job_${p.id}`)) return;
                    
                    const chat = MOCK_CHATS.find(c => c.proposalId === p.id);
                    // Se estiver em negociação, tenta achar o nome do profissional
                    let otherName = "Aguardando Profissional";
                    let otherAvatar = "https://ui-avatars.com/api/?name=A&background=f3f4f6&color=6b7280";
                    
                    if (p.professionalId) {
                         const pro = TOP_PROFESSIONALS.find(u => u.id === p.professionalId) || MOCK_PROFESSIONAL;
                         if (pro) {
                             otherName = pro.name;
                             otherAvatar = pro.avatarUrl || "";
                         }
                    }

                    existing.push({
                        id: `job_${p.id}`,
                        chatId: chat?.id,
                        title: p.title || p.areaTag,
                        withUser: otherName,
                        avatarUrl: otherAvatar,
                        date: new Date(p.createdAt).toISOString().split('T')[0], 
                        time: new Date(p.createdAt).toLocaleTimeString().slice(0,5), 
                        status: p.status === 'OPEN' ? 'PENDING' : 'CONFIRMED',
                        location: p.location,
                        isProposal: p.status === 'OPEN' 
                    });
                });
                return existing;
            },
            "Get Appointments"
        );
    },

    saveCategory: async (c: any) => ({ success: true }),
    deleteCategory: async (id: string) => ({ success: true }),
    saveService: async (s: any) => ({ success: true }),
    deleteService: async (id: string) => ({ success: true }),
    getUserGamification: async (userId: number, role: UserRole) => ({ currentLevel: 'Ouro', nextLevel: 'Diamante', progress: 75, xp: 3500, nextLevelXp: 5000, badges: [], benefits: ['Suporte VIP'] }),
    getNotifications: async (userId: number, role: UserRole) => [] as Notification[],
    markNotificationRead: async (id: string) => {},
    
    getUserWallet: async (userId: number, role: UserRole) => {
        if (role === UserRole.CONTRACTOR) {
            return { balance: MOCK_WALLET_CONTRACTOR, transactions: MOCK_TRANSACTIONS_MEMORY.filter(t => t.userId === userId) };
        } else {
            return { balance: MOCK_WALLET_PROFESSIONAL, transactions: MOCK_TRANSACTIONS_MEMORY.filter(t => t.userId === userId) };
        }
    },
};