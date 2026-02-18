
export enum UserRole {
  GUEST = 'GUEST',
  CONTRACTOR = 'CONTRACTOR',
  PROFESSIONAL = 'PROFESSIONAL',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED'
}

export enum ProposalStatus {
  OPEN = 'OPEN',
  NEGOTIATING = 'NEGOTIATING',
  COMPLETED = 'COMPLETED'
}

export interface ServiceCategory {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface ServiceSubItem {
  id: string;
  name: string;
  emoji: string;
  categoryId: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface SystemSettings {
  allowNewRegistrations: boolean;
  maintenanceMode: boolean;
  globalNotification: string;
  autoApproveProfessionals: boolean;
}

export interface Message {
  id: number;
  senderId: number;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  type: 'text' | 'image' | 'schedule';
  mediaUrl?: string;
  scheduleData?: {
    date: string;
    time: string;
    status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  };
}

export interface ChatSession {
  id: number;
  proposalId: number;
  proposalTitle: string;
  contractorId: number;
  professionalId: number;
  proposalStatus: ProposalStatus;
  participants: { id: number; name: string; avatar: string }[];
  messages: Message[];
  lastMessage: string;
  unreadCount: number;
}

export interface Appointment {
  id: string;
  chatId?: number; 
  title: string;
  withUser: string;
  avatarUrl: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  location: string;
  isProposal?: boolean; 
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'WITHDRAW' | 'DEPOSIT';
  amount: number;
  description: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  relatedProposalId?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface LevelData {
  currentLevel: string;
  nextLevel: string;
  progress: number;
  xp: number;
  nextLevelXp: number;
  benefits: string[];
  badges: Badge[];
}

export interface Review {
  id: number;
  proposalId: number;
  reviewerId: number;
  reviewerName: string;
  targetId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PortfolioItem {
  id: number;
  userId: number;
  imageUrl: string;
  description?: string;
}

export interface Notification {
  id: string;
  userId: number;
  type: 'INVITE' | 'MESSAGE' | 'SYSTEM' | 'SUCCESS';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionLink?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  avatarUrl?: string;
  location?: string;
  coordinates?: { lat: number; lng: number }; 
  phone?: string;
  document?: string;
  bio?: string;
  specialty?: string;
  experienceYears?: string;
  notificationsEnabled?: boolean;
  rating?: number;
  reviewsCount?: number;
  isSubscriber?: boolean;
}

export interface Proposal {
  id: number;
  contractorId: number;
  contractorName: string;
  contractorEmail?: string;
  contractorPhone?: string;
  professionalId?: number;
  targetProfessionalId?: number;
  title: string;
  description: string;
  areaTag: string;
  status: ProposalStatus;
  location: string;
  budgetRange: string;
  createdAt: string;
  acceptedByCount: number;
  isReviewed?: boolean;
  contractorAvatar?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeJobs: number;
  revenue: number;
  reportsPending: number;
  onlineUsers: number;
  loggedInUsers: number;
  subscriptionPrice: number;
}

export interface ProfessionalDashboardStats {
  totalEarningsMonth: number;
  totalEarningsToday: number;
  completedJobsMonth: number;
  profileViews: number;
  chartData: { day: string; value: number; jobs: number }[];
  recentReviews: Review[];
}
