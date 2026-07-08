export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum AccountType {
  BANK = 'BANK',
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  OTHER = 'OTHER',
}

export enum StaffJobType {
  SALES = 'SALES',
  TRAINER = 'TRAINER',
  BOTH = 'BOTH',
  GENERAL = 'GENERAL',
}

export enum PartyType {
  STAFF = 'STAFF',
  VENDOR = 'VENDOR',
  CUSTOMER = 'CUSTOMER',
  OTHER = 'OTHER',
}

export enum PlanKind {
  MEMBERSHIP = 'MEMBERSHIP',
  PERSONAL_TRAINING = 'PERSONAL_TRAINING',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum DocumentType {
  BILL = 'BILL',
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  SALARY_SHEET = 'SALARY_SHEET',
}

export enum NotificationType {
  SALARY_DUE = 'SALARY_DUE',
  HIGH_EXPENSE = 'HIGH_EXPENSE',
  LOW_CASH_FLOW = 'LOW_CASH_FLOW',
  PENDING_TASK = 'PENDING_TASK',
  ATTENDANCE_ISSUE = 'ATTENDANCE_ISSUE',
  GENERAL = 'GENERAL',
}

export enum ReportType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  PROFIT_LOSS = 'PROFIT_LOSS',
  ATTENDANCE = 'ATTENDANCE',
  TRANSACTIONS = 'TRANSACTIONS',
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}
