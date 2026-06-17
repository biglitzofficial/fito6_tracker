import { ReportType, ReportFormat } from '@prisma/client';
import prisma from '../lib/prisma';
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

  // Simple table rendering (monospace-ish columns)
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

  // EXCEL
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
    const items = await prisma.income.findMany({
      where: { date: { gte: new Date(dateFrom), lte: new Date(dateTo) } },
      include: { category: true, createdBy: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const rows = items.map((i) => ({
      date: i.date.toISOString().split('T')[0],
      amount: Number(i.amount),
      category: i.category.name,
      source: i.source || '',
      notes: i.notes || '',
      createdBy: i.createdBy.name,
    }));

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const blob = await buildReportBlob({
      title: `Income Report ${dateFrom} to ${dateTo}`,
      format,
      rows,
      filenameBase: `Income_Report_${dateFrom}_to_${dateTo}`,
    });

    const report = await prisma.report.create({
      data: {
        type: ReportType.INCOME,
        format,
        title: `Income Report ${dateFrom} to ${dateTo}`,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        generatedById: userId,
      },
    });

    return { report, ...blob, rows, total };
  },

  async generateExpenseReport(dateFrom: string, dateTo: string, format: ReportFormat, userId: string) {
    const items = await prisma.expense.findMany({
      where: { date: { gte: new Date(dateFrom), lte: new Date(dateTo) } },
      include: { category: true, createdBy: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const rows = items.map((e) => ({
      date: e.date.toISOString().split('T')[0],
      amount: Number(e.amount),
      category: e.category.name,
      vendor: e.vendor || '',
      notes: e.notes || '',
      createdBy: e.createdBy.name,
    }));

    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    const blob = await buildReportBlob({
      title: `Expense Report ${dateFrom} to ${dateTo}`,
      format,
      rows,
      filenameBase: `Expense_Report_${dateFrom}_to_${dateTo}`,
    });

    const report = await prisma.report.create({
      data: {
        type: ReportType.EXPENSE,
        format,
        title: `Expense Report ${dateFrom} to ${dateTo}`,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        generatedById: userId,
      },
    });

    return { report, ...blob, rows, total };
  },

  async generateProfitLossReport(dateFrom: string, dateTo: string, format: ReportFormat, userId: string) {
    const [income, expense] = await Promise.all([
      prisma.income.aggregate({
        where: { date: { gte: new Date(dateFrom), lte: new Date(dateTo) } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: new Date(dateFrom), lte: new Date(dateTo) } },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);
    const netProfit = totalIncome - totalExpense;

    const data = { totalIncome, totalExpense, netProfit, profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0 };
    const rows = [data] as unknown as Record<string, unknown>[];
    const blob = await buildReportBlob({
      title: `P&L Report ${dateFrom} to ${dateTo}`,
      format,
      rows,
      filenameBase: `PL_Report_${dateFrom}_to_${dateTo}`,
    });

    const report = await prisma.report.create({
      data: {
        type: ReportType.PROFIT_LOSS,
        format,
        title: `P&L Report ${dateFrom} to ${dateTo}`,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        generatedById: userId,
      },
    });

    return { report, ...blob, ...data };
  },

  async generateAttendanceReport(month: number, year: number, format: ReportFormat, userId: string) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const items = await prisma.attendance.findMany({
      where: { date: { gte: start, lte: end } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ user: { name: 'asc' } }, { date: 'asc' }],
    });

    const rows = items.map((a) => ({
      staff: a.user.name,
      email: a.user.email,
      date: a.date.toISOString().split('T')[0],
      checkIn: a.checkIn?.toISOString() || '',
      checkOut: a.checkOut?.toISOString() || '',
      isLate: a.isLate,
    }));

    const blob = await buildReportBlob({
      title: `Attendance Report ${year}-${month + 1}`,
      format,
      rows,
      filenameBase: `Attendance_Report_${year}-${month + 1}`,
    });

    const report = await prisma.report.create({
      data: {
        type: ReportType.ATTENDANCE,
        format,
        title: `Attendance Report ${year}-${month + 1}`,
        dateFrom: start,
        dateTo: end,
        generatedById: userId,
      },
    });

    return { report, ...blob, rows };
  },

  async list(userId?: string) {
    return prisma.report.findMany({
      where: userId ? { generatedById: userId } : {},
      include: { generatedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },
};
