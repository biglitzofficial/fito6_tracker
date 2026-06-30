export type Role = 'ADMIN' | 'STAFF';

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
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface Income {
  id: string;
  receiptNumber?: string;
  amount: number;
  categoryId: string;
  category: Category;
  accountId?: string | null;
  account?: Account | null;
  source?: string;
  date: string;
  notes?: string;
  attachment?: string;
  createdBy: { id: string; name: string };
}

export interface Expense {
  id: string;
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
