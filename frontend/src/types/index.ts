export type Role = 'ADMIN' | 'STAFF';
export type StaffJobType = 'SALES' | 'TRAINER' | 'BOTH' | 'GENERAL';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  staff?: {
    id: string;
    phone?: string;
    salary: number;
    joiningDate: string;
    jobType?: StaffJobType;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string;
  children?: Category[];
}

export type AccountType = 'BANK' | 'CASH' | 'UPI' | 'CARD' | 'OTHER';
export type PartyType = 'STAFF' | 'VENDOR' | 'CUSTOMER' | 'OTHER';
export type PlanKind = 'MEMBERSHIP' | 'PERSONAL_TRAINING';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName?: string | null;
  lastFour?: string | null;
  openingBalance?: number;
  isActive: boolean;
}

export interface Party {
  id: string;
  name: string;
  type: PartyType;
  email?: string | null;
  phone?: string | null;
  promotionSource?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface MembershipPlan {
  id: string;
  name: string;
  kind: PlanKind;
  description?: string | null;
  durationDays: number;
  sessionsTotal?: number | null;
  priceExGst: number;
  priceInclGst: number;
  gstRate: number;
  gstAmount: number;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  kind: PlanKind;
  partyId: string;
  party?: Party | null;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  priceExGst: number;
  priceInclGst: number;
  gstRate: number;
  gstAmount: number;
  amountPaid: number;
  billRepId?: string | null;
  billRep?: { id: string; name: string } | null;
  trainerStaffId?: string | null;
  trainer?: { id: string; name: string } | null;
  sessionsTotal?: number | null;
  sessionsUsed?: number | null;
  accountId?: string | null;
  account?: Account | null;
  incomeId?: string | null;
  receiptNumber?: string | null;
  renewedFromId?: string | null;
  notes?: string | null;
  createdBy: { id: string; name: string };
}

export interface Income {
  id: string;
  receiptNumber?: string;
  amount: number;
  categoryId: string;
  category: Category;
  accountId?: string | null;
  account?: Account | null;
  partyId?: string | null;
  party?: Party | null;
  source?: string;
  creditedToId?: string | null;
  creditedTo?: { id: string; name: string } | null;
  date: string;
  notes?: string;
  attachment?: string;
  createdBy: { id: string; name: string };
}

export interface Expense {
  id: string;
  voucherNumber?: string;
  amount: number;
  categoryId: string;
  category: Category;
  accountId?: string | null;
  account?: Account | null;
  partyId?: string | null;
  party?: Party | null;
  vendor?: string;
  date: string;
  periodMonth?: string | null;
  notes?: string;
  attachment?: string;
  isRecurring: boolean;
  recurringDay?: number;
  createdBy: { id: string; name: string };
}

export interface StaffTargetRow {
  userId: string;
  name: string;
  periodMonth: string;
  salesTarget: number;
  ptTarget: number;
  salesActual: number;
  ptActual: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  assignedTo: { id: string; name: string };
  createdBy: { id: string; name: string };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminDashboard {
  cards: {
    todayRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    todayExpense: number;
    monthlyExpense: number;
    yearlyExpense: number;
    netProfit: number;
    netExpense: number;
    cashFlow: number;
    totalStaff: number;
    attendanceToday: number;
  };
  charts: {
    revenue: { month: string; value: number }[];
    expense: { month: string; value: number }[];
    profit: { month: string; value: number }[];
    cashFlow: { month: string; income: number; expense: number }[];
  };
  healthScore: { score: number; rating: string };
  insights: string[];
}

export interface StaffDashboard {
  attendanceStatus: { checkedIn: boolean; checkedOut: boolean; isLate: boolean };
  assignedTasks: Task[];
  recentIncome: Income[];
  recentExpense: Expense[];
  pendingTasksCount: number;
}
