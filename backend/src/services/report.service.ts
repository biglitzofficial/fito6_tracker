import { AccountType, ReportFormat, ReportType } from '../types/enums';
import { Attendance, Expense, Income, Report } from '../types/models';
import { COL, create, findMany, findManyForBusiness, getAccountMap, getCategoryMap, getUserMap, inDateRange, sortBy, sumAmounts } from '../lib/firestore';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

type ReportBlob = {
  format: ReportFormat;
  filename: string;
  mimeType: string;
  contentBase64: string;
  previewText?: string;
};

function toBase64(buffer: Buffer) {
  return buffer.toString('base64');
}

async function generatePdf(title: string, columns: string[], rows: Record<string, unknown>[]) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  doc.fontSize(16).text(title, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#666').text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(1);

  doc.fillColor('#000').fontSize(10);
  doc.text(columns.join(' | '));
  doc.moveDown(0.25);
  doc.strokeColor('#ddd').moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  for (const r of rows.slice(0, 500)) {
    const line = columns.map((c) => String(r[c] ?? '')).join(' | ');
    doc.text(line, { lineGap: 2 });
  }

  doc.end();

  await new Promise<void>((resolve) => doc.on('end', () => resolve()));
  return Buffer.concat(chunks);
}

async function generateExcel(sheetName: string, columns: string[], rows: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fito6';
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c, key: c, width: Math.min(Math.max(c.length + 6, 12), 28) }));
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export type TransactionGroupBy = 'all' | 'day' | 'party' | 'category' | 'payment-mode';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Bank',
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  OTHER: 'Other',
};

interface UnifiedTransaction {
  receiptNumber: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  party: string;
  category: string;
  paymentMode: string;
  account: string;
  amount: number;
  notes: string;
}

async function loadTransactions(
  businessId: string,
  dateFrom: string,
  dateTo: string
): Promise<UnifiedTransaction[]> {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);

  const [incomes, expenses] = await Promise.all([
    findManyForBusiness<Income>(COL.income, businessId, (i) => inDateRange(i.date, from, to)),
    findManyForBusiness<Expense>(COL.expenses, businessId, (e) => inDateRange(e.date, from, to)),
  ]);

  const categoryMap = await getCategoryMap([
    ...incomes.map((i) => i.categoryId),
    ...expenses.map((e) => e.categoryId),
  ]);
  const accountMap = await getAccountMap([
    ...incomes.map((i) => i.accountId || ''),
    ...expenses.map((e) => e.accountId || ''),
  ]);

  const incomeRows: UnifiedTransaction[] = incomes.map((i) => {
    const account = i.accountId ? accountMap.get(i.accountId) : null;
    return {
      receiptNumber: i.receiptNumber || '—',
      date: i.date.toISOString().split('T')[0],
      type: 'INCOME',
      party: i.source || '—',
      category: categoryMap.get(i.categoryId)?.name || 'Unknown',
      paymentMode: account ? ACCOUNT_TYPE_LABELS[account.type as AccountType] || account.type : '—',
      account: account?.name || '—',
      amount: Number(i.amount),
      notes: i.notes || '',
    };
  });

  const expenseRows: UnifiedTransaction[] = expenses.map((e) => {
    const account = e.accountId ? accountMap.get(e.accountId) : null;
    return {
      receiptNumber: '—',
      date: e.date.toISOString().split('T')[0],
      type: 'EXPENSE',
      party: e.vendor || '—',
      category: categoryMap.get(e.categoryId)?.name || 'Unknown',
      paymentMode: account ? ACCOUNT_TYPE_LABELS[account.type as AccountType] || account.type : '—',
      account: account?.name || '—',
      amount: Number(e.amount),
      notes: e.notes || '',
    };
  });

  return [...incomeRows, ...expenseRows].sort((a, b) => a.date.localeCompare(b.date));
}

function groupTransactions(transactions: UnifiedTransaction[], groupBy: TransactionGroupBy) {
  if (groupBy === 'all') {
    return transactions.map((t) => ({
      'Receipt No': t.receiptNumber,
      Date: t.date,
      Type: t.type,
      Party: t.party,
      Category: t.category,
      'Payment Mode': t.paymentMode,
      Account: t.account,
      Amount: t.amount,
      Notes: t.notes,
    }));
  }

  const grouped = new Map<string, UnifiedTransaction[]>();
  for (const t of transactions) {
    let key: string;
    switch (groupBy) {
      case 'day':
        key = t.date;
        break;
      case 'party':
        key = `${t.type}|${t.party}`;
        break;
      case 'category':
        key = `${t.type}|${t.category}`;
        break;
      case 'payment-mode':
        key = `${t.type}|${t.paymentMode}|${t.account}`;
        break;
      default:
        key = t.date;
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  const rows: Record<string, unknown>[] = [];
  for (const [key, items] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const incomeTotal = items.filter((i) => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0);
    const expenseTotal = items.filter((i) => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0);
    const count = items.length;

    if (groupBy === 'day') {
      rows.push({
        Date: key,
        'Income Total': incomeTotal,
        'Expense Total': expenseTotal,
        Net: incomeTotal - expenseTotal,
        Entries: count,
      });
      continue;
    }

    if (groupBy === 'party') {
      const [type, party] = key.split('|');
      rows.push({
        Type: type,
        Party: party,
        'Total Amount': type === 'INCOME' ? incomeTotal : expenseTotal,
        Entries: count,
      });
      continue;
    }

    if (groupBy === 'category') {
      const [type, category] = key.split('|');
      rows.push({
        Type: type,
        Category: category,
        'Total Amount': type === 'INCOME' ? incomeTotal : expenseTotal,
        Entries: count,
      });
      continue;
    }

    const [type, paymentMode, account] = key.split('|');
    rows.push({
      Type: type,
      'Payment Mode': paymentMode,
      Account: account,
      'Total Amount': type === 'INCOME' ? incomeTotal : expenseTotal,
      Entries: count,
    });
  }

  return rows;
}

async function buildReportBlob(args: {
  title: string;
  format: ReportFormat;
  rows: Record<string, unknown>[];
  filenameBase: string;
}): Promise<ReportBlob> {
  const columns = args.rows.length ? Object.keys(args.rows[0]) : ['empty'];
  const safeBase = args.filenameBase.replace(/[^\w\-]+/g, '_');

  if (args.format === ReportFormat.CSV) {
    const csv = toCSV(args.rows);
    return {
      format: args.format,
      filename: `${safeBase}.csv`,
      mimeType: 'text/csv',
      contentBase64: toBase64(Buffer.from(csv, 'utf-8')),
      previewText: csv,
    };
  }

  if (args.format === ReportFormat.PDF) {
    const pdf = await generatePdf(args.title, columns, args.rows);
    return {
      format: args.format,
      filename: `${safeBase}.pdf`,
      mimeType: 'application/pdf',
      contentBase64: toBase64(pdf),
    };
  }

  const xlsx = await generateExcel(args.title.slice(0, 31), columns, args.rows);
  return {
    format: args.format,
    filename: `${safeBase}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    contentBase64: toBase64(xlsx),
  };
}

export const reportService = {
  async generateIncomeReport(
    businessId: string,
    dateFrom: string,
    dateTo: string,
    format: ReportFormat,
    userId: string
  ) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const items = await findManyForBusiness<Income>(COL.income, businessId, (i) =>
      inDateRange(i.date, from, to)
    );
    const sorted = sortBy(items, 'date', 'desc');
    const categoryMap = await getCategoryMap(sorted.map((i) => i.categoryId));
    const userMap = await getUserMap(sorted.map((i) => i.createdById));

    const rows = sorted.map((i) => ({
      receiptNumber: i.receiptNumber || '',
      date: i.date.toISOString().split('T')[0],
      amount: Number(i.amount),
      category: categoryMap.get(i.categoryId)?.name || 'Unknown',
      source: i.source || '',
      notes: i.notes || '',
      createdBy: userMap.get(i.createdById)?.name || 'Unknown',
    }));

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const blob = await buildReportBlob({
      title: `Income Report ${dateFrom} to ${dateTo}`,
      format,
      rows,
      filenameBase: `Income_Report_${dateFrom}_to_${dateTo}`,
    });

    const report = await create<Report>(COL.reports, {
      businessId,
      type: ReportType.INCOME,
      format,
      title: `Income Report ${dateFrom} to ${dateTo}`,
      dateFrom: from,
      dateTo: to,
      generatedById: userId,
    });

    return { report, ...blob, rows, total };
  },

  async generateExpenseReport(
    businessId: string,
    dateFrom: string,
    dateTo: string,
    format: ReportFormat,
    userId: string
  ) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const items = await findManyForBusiness<Expense>(COL.expenses, businessId, (e) =>
      inDateRange(e.date, from, to)
    );
    const sorted = sortBy(items, 'date', 'desc');
    const categoryMap = await getCategoryMap(sorted.map((e) => e.categoryId));
    const userMap = await getUserMap(sorted.map((e) => e.createdById));

    const rows = sorted.map((e) => ({
      date: e.date.toISOString().split('T')[0],
      amount: Number(e.amount),
      category: categoryMap.get(e.categoryId)?.name || 'Unknown',
      vendor: e.vendor || '',
      notes: e.notes || '',
      createdBy: userMap.get(e.createdById)?.name || 'Unknown',
    }));

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const blob = await buildReportBlob({
      title: `Expense Report ${dateFrom} to ${dateTo}`,
      format,
      rows,
      filenameBase: `Expense_Report_${dateFrom}_to_${dateTo}`,
    });

    const report = await create<Report>(COL.reports, {
      businessId,
      type: ReportType.EXPENSE,
      format,
      title: `Expense Report ${dateFrom} to ${dateTo}`,
      dateFrom: from,
      dateTo: to,
      generatedById: userId,
    });

    return { report, ...blob, rows, total };
  },

  async generateProfitLossReport(
    businessId: string,
    dateFrom: string,
    dateTo: string,
    format: ReportFormat,
    userId: string
  ) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const [incomes, expenses] = await Promise.all([
      findManyForBusiness<Income>(COL.income, businessId),
      findManyForBusiness<Expense>(COL.expenses, businessId),
    ]);

    const totalIncome = sumAmounts(incomes, from, to);
    const totalExpense = sumAmounts(expenses, from, to);
    const netProfit = totalIncome - totalExpense;

    const data = {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
    };
    const rows = [data] as unknown as Record<string, unknown>[];
    const blob = await buildReportBlob({
      title: `P&L Report ${dateFrom} to ${dateTo}`,
      format,
      rows,
      filenameBase: `PL_Report_${dateFrom}_to_${dateTo}`,
    });

    const report = await create<Report>(COL.reports, {
      businessId,
      type: ReportType.PROFIT_LOSS,
      format,
      title: `P&L Report ${dateFrom} to ${dateTo}`,
      dateFrom: from,
      dateTo: to,
      generatedById: userId,
    });

    return { report, ...blob, ...data };
  },

  async generateTransactionExport(
    businessId: string,
    dateFrom: string,
    dateTo: string,
    format: ReportFormat,
    groupBy: TransactionGroupBy,
    userId: string
  ) {
    const transactions = await loadTransactions(businessId, dateFrom, dateTo);
    const rows = groupTransactions(transactions, groupBy);

    const groupLabels: Record<TransactionGroupBy, string> = {
      all: 'All Entries',
      day: 'Day-wise',
      party: 'Party-wise',
      category: 'Category-wise',
      'payment-mode': 'Payment Mode-wise',
    };

    const label = groupLabels[groupBy];
    const blob = await buildReportBlob({
      title: `Transactions (${label}) ${dateFrom} to ${dateTo}`,
      format,
      rows,
      filenameBase: `Transactions_${groupBy}_${dateFrom}_to_${dateTo}`,
    });

    const report = await create<Report>(COL.reports, {
      businessId,
      type: ReportType.TRANSACTIONS,
      format,
      title: `Transactions (${label}) ${dateFrom} to ${dateTo}`,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      generatedById: userId,
    });

    return { report, ...blob, rows, groupBy, label };
  },

  async generateAttendanceReport(month: number, year: number, format: ReportFormat, userId: string) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const items = (await findMany<Attendance>(COL.attendance)).filter((a) => inDateRange(a.date, start, end));
    const userMap = await getUserMap(items.map((a) => a.userId));

    const rows = items
      .map((a) => ({
        staff: userMap.get(a.userId)?.name || 'Unknown',
        email: userMap.get(a.userId)?.email || '',
        date: a.date.toISOString().split('T')[0],
        checkIn: a.checkIn?.toISOString() || '',
        checkOut: a.checkOut?.toISOString() || '',
        isLate: a.isLate,
      }))
      .sort((a, b) => a.staff.localeCompare(b.staff) || a.date.localeCompare(b.date));

    const blob = await buildReportBlob({
      title: `Attendance Report ${year}-${month + 1}`,
      format,
      rows,
      filenameBase: `Attendance_Report_${year}-${month + 1}`,
    });

    const report = await create<Report>(COL.reports, {
      type: ReportType.ATTENDANCE,
      format,
      title: `Attendance Report ${year}-${month + 1}`,
      dateFrom: start,
      dateTo: end,
      generatedById: userId,
    });

    return { report, ...blob, rows };
  },

  async list(businessId: string, userId?: string) {
    const items = await findManyForBusiness<Report>(
      COL.reports,
      businessId,
      (r) => !userId || r.generatedById === userId
    );
    const sorted = sortBy(items, 'createdAt', 'desc').slice(0, 50);
    const userMap = await getUserMap(sorted.map((r) => r.generatedById));
    return sorted.map((r) => ({
      ...r,
      generatedBy: { name: userMap.get(r.generatedById)?.name || 'Unknown' },
    }));
  },
};
