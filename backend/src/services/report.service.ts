import { ReportFormat, ReportType } from '../types/enums';
import { Attendance, Expense, Income, Report } from '../types/models';
import { COL, create, findMany, getCategoryMap, getUserMap, inDateRange, sortBy, sumAmounts } from '../lib/firestore';
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
  async generateIncomeReport(dateFrom: string, dateTo: string, format: ReportFormat, userId: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const items = (await findMany<Income>(COL.income)).filter((i) => inDateRange(i.date, from, to));
    const sorted = sortBy(items, 'date', 'desc');
    const categoryMap = await getCategoryMap(sorted.map((i) => i.categoryId));
    const userMap = await getUserMap(sorted.map((i) => i.createdById));

    const rows = sorted.map((i) => ({
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
      type: ReportType.INCOME,
      format,
      title: `Income Report ${dateFrom} to ${dateTo}`,
      dateFrom: from,
      dateTo: to,
      generatedById: userId,
    });

    return { report, ...blob, rows, total };
  },

  async generateExpenseReport(dateFrom: string, dateTo: string, format: ReportFormat, userId: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const items = (await findMany<Expense>(COL.expenses)).filter((e) => inDateRange(e.date, from, to));
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
      type: ReportType.EXPENSE,
      format,
      title: `Expense Report ${dateFrom} to ${dateTo}`,
      dateFrom: from,
      dateTo: to,
      generatedById: userId,
    });

    return { report, ...blob, rows, total };
  },

  async generateProfitLossReport(dateFrom: string, dateTo: string, format: ReportFormat, userId: string) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const [incomes, expenses] = await Promise.all([
      findMany<Income>(COL.income),
      findMany<Expense>(COL.expenses),
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
      type: ReportType.PROFIT_LOSS,
      format,
      title: `P&L Report ${dateFrom} to ${dateTo}`,
      dateFrom: from,
      dateTo: to,
      generatedById: userId,
    });

    return { report, ...blob, ...data };
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

  async list(userId?: string) {
    const items = await findMany<Report>(COL.reports, (r) => !userId || r.generatedById === userId);
    const sorted = sortBy(items, 'createdAt', 'desc').slice(0, 50);
    const userMap = await getUserMap(sorted.map((r) => r.generatedById));
    return sorted.map((r) => ({
      ...r,
      generatedBy: { name: userMap.get(r.generatedById)?.name || 'Unknown' },
    }));
  },
};
