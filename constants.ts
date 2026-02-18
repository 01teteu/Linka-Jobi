
import { ServiceCategory, ServiceSubItem, User, UserRole, Proposal, ProposalStatus, ChatSession, UserStatus, Review } from './types';

export const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { 
    id: 'cat_tech', 
    name: 'Tecnologia', 
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop' 
  },
  { 
    id: 'cat_home', 
    name: 'Casa & Reforma', 
    imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=600&auto=format&fit=crop' 
  },
  { 
    id: 'cat_health', 
    name: 'Saúde', 
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop' 
  },
  { 
    id: 'cat_education', 
    name: 'Educação', 
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=600&auto=format&fit=crop' 
  },
  { 
    id: 'cat_events', 
    name: 'Eventos', 
    imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop' 
  },
  { 
    id: 'cat_business', 
    name: 'Negócios', 
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop' 
  },
  { 
    id: 'cat_beauty', 
    name: 'Beleza', 
    imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=600&auto=format&fit=crop' 
  },
  { 
    id: 'cat_auto', 
    name: 'Automotivo', 
    imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600&auto=format&fit=crop' 
  }
];

export const DEFAULT_SERVICES: ServiceSubItem[] = [
  // --- TECNOLOGIA ---
  { id: 'serv_dev', name: 'Desenvolvedor Web/App', emoji: '', categoryId: 'cat_tech', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_support', name: 'Suporte Técnico', emoji: '', categoryId: 'cat_tech', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=400&auto=format&fit=crop' },
  // Imagem corrigida para Designer Gráfico (Setup criativo confiável)
  { id: 'serv_design', name: 'Designer Gráfico', emoji: '', categoryId: 'cat_tech', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop' },
  { id: 'serv_video', name: 'Editor de Vídeo', emoji: '', categoryId: 'cat_tech', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_marketing', name: 'Gestor de Tráfego', emoji: '', categoryId: 'cat_tech', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop' },

  // --- CASA ---
  { id: 'serv_pedreiro', name: 'Pedreiro', emoji: '', categoryId: 'cat_home', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_eletricista', name: 'Eletricista', emoji: '', categoryId: 'cat_home', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_encanador', name: 'Encanador', emoji: '', categoryId: 'cat_home', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_marido', name: 'Marido de Aluguel', emoji: '', categoryId: 'cat_home', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_diarista', name: 'Diarista', emoji: '', categoryId: 'cat_home', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1527515663462-113180287041?q=80&w=400&auto=format&fit=crop' },

  // --- SAÚDE ---
  { id: 'serv_personal', name: 'Personal Trainer', emoji: '', categoryId: 'cat_health', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_psy', name: 'Psicólogo', emoji: '', categoryId: 'cat_health', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_nutrition', name: 'Nutricionista', emoji: '', categoryId: 'cat_health', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_yoga', name: 'Instrutor de Yoga', emoji: '', categoryId: 'cat_health', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1544367563-12123d8965cd?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_care', name: 'Cuidador de Idosos', emoji: '', categoryId: 'cat_health', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=400&auto=format&fit=crop' },

  // --- EDUCAÇÃO ---
  { id: 'serv_english', name: 'Professor de Inglês', emoji: '', categoryId: 'cat_education', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_math', name: 'Reforço Escolar', emoji: '', categoryId: 'cat_education', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_music', name: 'Aulas de Música', emoji: '', categoryId: 'cat_education', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1514320291940-7cea59dc6a00?q=80&w=400&auto=format&fit=crop' },

  // --- EVENTOS ---
  { id: 'serv_photo', name: 'Fotógrafo', emoji: '', categoryId: 'cat_events', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_dj', name: 'DJ e Som', emoji: '', categoryId: 'cat_events', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_buffet', name: 'Buffet / Churrasqueiro', emoji: '', categoryId: 'cat_events', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=400&auto=format&fit=crop' },

  // --- NEGÓCIOS ---
  { id: 'serv_account', name: 'Contabilidade', emoji: '', categoryId: 'cat_business', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_legal', name: 'Advogado', emoji: '', categoryId: 'cat_business', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_trans', name: 'Tradutor', emoji: '', categoryId: 'cat_business', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=400&auto=format&fit=crop' },

  // --- BELEZA ---
  { id: 'serv_makeup', name: 'Maquiadora', emoji: '', categoryId: 'cat_beauty', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1487412947132-232a8408a360?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_hair', name: 'Cabeleireiro(a)', emoji: '', categoryId: 'cat_beauty', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=400&auto=format&fit=crop' },

  // --- AUTOMOTIVO ---
  { id: 'serv_mech', name: 'Mecânico', emoji: '', categoryId: 'cat_auto', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1487754180477-9b832f22595b?q=80&w=400&auto=format&fit=crop' },
  { id: 'serv_wash', name: 'Lavagem Ecológica', emoji: '', categoryId: 'cat_auto', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1520340356584-7c994887e9f0?q=80&w=400&auto=format&fit=crop' }
];

export const MOCK_CONTRACTOR: User = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane@linka.com',
  role: UserRole.CONTRACTOR,
  avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
  location: 'Pinheiros, SP',
  status: UserStatus.ACTIVE,
  rating: 4.9,
  reviewsCount: 12,
  experienceYears: '2',
  isSubscriber: false,
  coordinates: { lat: -23.561684, lng: -46.655981 } // Pinheiros
};

export const MOCK_PROFESSIONAL: User = {
  id: 2,
  name: 'João Silva',
  email: 'joao@linka.com',
  role: UserRole.PROFESSIONAL,
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
  specialty: 'Eletricista, Encanador, Pedreiro', 
  experienceYears: '5',
  rating: 4.9,
  reviewsCount: 124,
  isSubscriber: false,
  status: UserStatus.ACTIVE,
  coordinates: { lat: -23.550520, lng: -46.633308 } // Centro SP
};

export const TOP_PROFESSIONALS: User[] = [
  {
    id: 201,
    name: 'Marcos Dev',
    email: 'marcos@linka.com',
    role: UserRole.PROFESSIONAL,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop',
    specialty: 'Desenvolvedor Web',
    rating: 5.0,
    reviewsCount: 89,
    isSubscriber: true,
    location: 'Vila Madalena',
    coordinates: { lat: -23.5489, lng: -46.6860 }
  },
  {
    id: 202,
    name: 'Ana Tech',
    email: 'ana@linka.com',
    role: UserRole.PROFESSIONAL,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    specialty: 'Suporte Técnico',
    rating: 4.8,
    reviewsCount: 210,
    isSubscriber: true,
    location: 'Pinheiros',
    coordinates: { lat: -23.5663, lng: -46.6924 }
  },
  {
    id: 203,
    name: 'Carlos Pintor',
    email: 'carlos@linka.com',
    role: UserRole.PROFESSIONAL,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
    specialty: 'Pintor',
    rating: 4.7,
    reviewsCount: 45,
    isSubscriber: false,
    location: 'Moema',
    coordinates: { lat: -23.6025, lng: -46.6617 }
  },
  {
    id: 204,
    name: 'Roberto Encanador',
    email: 'roberto@linka.com',
    role: UserRole.PROFESSIONAL,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
    specialty: 'Encanador',
    rating: 4.9,
    reviewsCount: 132,
    isSubscriber: true,
    location: 'Jardins',
    coordinates: { lat: -23.5672, lng: -46.6669 }
  },
  {
    id: 205,
    name: 'Julia Yoga',
    email: 'julia@linka.com',
    role: UserRole.PROFESSIONAL,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
    specialty: 'Instrutor de Yoga',
    rating: 5.0,
    reviewsCount: 22,
    isSubscriber: false,
    location: 'Paulista',
    coordinates: { lat: -23.5631, lng: -46.6544 }
  }
];

export const TOP_CONTRACTORS: User[] = [
    {
      id: 301,
      name: 'Startup Beta',
      email: 'solar@admin.com',
      role: UserRole.CONTRACTOR,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
      location: 'Jardins, SP',
      rating: 5.0,
      reviewsCount: 45,
      status: UserStatus.ACTIVE,
      specialty: 'Empresa'
    }
];

export const MOCK_ADMIN: User = {
  id: 3,
  name: 'Admin Jobi',
  email: 'admin@linka.com',
  role: UserRole.ADMIN,
  avatarUrl: 'https://ui-avatars.com/api/?name=Admin+Jobi&background=101828&color=fff',
  status: UserStatus.ACTIVE
};

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 101,
    contractorId: 1,
    contractorName: 'Jane Doe',
    title: 'Site Institucional',
    description: 'Preciso de um site para minha clínica.',
    areaTag: 'Desenvolvedor Web',
    status: ProposalStatus.OPEN,
    location: 'Remoto',
    budgetRange: 'R$ 1500 - 2500',
    createdAt: new Date().toISOString(),
    acceptedByCount: 0,
    contractorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 102,
    contractorId: 301,
    contractorName: 'Startup Beta',
    title: 'Reparo Fiação',
    description: 'Fiação do escritório queimou, precisamos urgente para hoje.',
    areaTag: 'Eletricista',
    status: ProposalStatus.OPEN,
    location: 'Jardins, SP',
    budgetRange: 'R$ 400 - 600',
    createdAt: new Date().toISOString(),
    acceptedByCount: 0,
    contractorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 103,
    contractorId: 1,
    contractorName: 'Fernanda L.',
    title: 'Vazamento Pia',
    description: 'A pia da cozinha está vazando muito água por baixo.',
    areaTag: 'Encanador',
    status: ProposalStatus.OPEN,
    location: 'Centro, SP',
    budgetRange: 'R$ 150 - 250',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    acceptedByCount: 1,
    contractorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 104,
    contractorId: 302,
    contractorName: 'Condomínio Solar',
    title: 'Pintura Fachada',
    description: 'Pintura de muro externo de 20 metros quadrados.',
    areaTag: 'Pedreiro',
    status: ProposalStatus.OPEN,
    location: 'Vila Mariana, SP',
    budgetRange: 'R$ 1200 - 1800',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    acceptedByCount: 3,
    contractorAvatar: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 105,
    contractorId: 1,
    contractorName: 'Ricardo M.',
    title: 'Instalar Chuveiro',
    description: 'Comprei um chuveiro novo 220v e preciso instalar.',
    areaTag: 'Eletricista',
    status: ProposalStatus.OPEN,
    location: 'Bela Vista, SP',
    budgetRange: 'R$ 80 - 120',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    acceptedByCount: 0,
    contractorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop'
  }
];

export const MOCK_CHATS: ChatSession[] = [
  {
    id: 1,
    proposalId: 102,
    proposalTitle: 'App Mobile',
    contractorId: 1,
    professionalId: 2,
    proposalStatus: ProposalStatus.NEGOTIATING,
    participants: [
      { id: 1, name: 'Jane Doe', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop' },
      { id: 2, name: 'João Silva', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' }
    ],
    messages: [
      { id: 1, senderId: 0, text: 'Chat iniciado', timestamp: '10:00', isSystem: true, type: 'text' },
      { id: 2, senderId: 2, text: 'Olá, tenho experiência com React Native.', timestamp: '10:05', type: 'text' }
    ],
    lastMessage: 'Olá, tenho experiência com React Native.',
    unreadCount: 1
  }
];

export const MOCK_PROFILE_REVIEWS: Review[] = [
    {
        id: 1,
        proposalId: 901,
        reviewerId: 501,
        targetId: 2,
        reviewerName: "Mariana Souza",
        rating: 5,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        comment: "Profissional excelente! Entregou o código limpo e no prazo."
    }
];
