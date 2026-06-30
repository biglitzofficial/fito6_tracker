import {
  AccountType,
  CategoryType,
  DocumentType,
  NotificationType,
  PartyType,
  ReportFormat,
  ReportType,
  Role,
  TaskPriority,
  TaskStatus,
} from './enums';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  isActive: boolean;
  resetToken?: string | null;
  resetTokenExp?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  id: string;
  userId: string;
  phone?: string | null;
  salary: number;
  joiningDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  businessId?: string | null;
  name: string;
  type: CategoryType;
  parentId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  businessId?: string | null;
  name: string;
  type: AccountType;
  bankName?: string | null;
  lastFour?: string | null;
  openingBalance?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Party {
  id: string;
  businessId?: string | null;
  name: string;
  type: PartyType;
  phone?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  businessId?: string | null;
  receiptNumber?: string | null;
  amount: number;
  categoryId: string;
  accountId?: string | null;
  source?: string | null;
  date: Date;
  notes?: string | null;
  attachment?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  businessId?: string | null;
  voucherNumber?: string | null;
  amount: number;
  categoryId: string;
  accountId?: string | null;
  partyId?: string | null;
  vendor?: string | null;
  date: Date;
  periodMonth?: string | null;
  notes?: string | null;
  attachment?: string | null;
  isRecurring: boolean;
  recurringDay?: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  userId: string;
  date: Date;
  checkIn?: Date | null;
  checkOut?: Date | null;
  isLate: boolean;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  assignedToId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category?: string | null;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface Report {
  id: string;
  businessId?: string | null;
  type: ReportType;
  format: ReportFormat;
  title: string;
  filePath?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  generatedById: string;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface Setting {
  id: string;
  key: string;
  businessId?: string | null;
  value: Record<string, unknown>;
  updatedAt: Date;
}

export interface Business {
  id: string;
  name: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
