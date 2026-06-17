import { DocumentType, Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/response';

export const documentService = {
  async list(filters: { search?: string; type?: DocumentType; page?: number; limit?: number }) {
    const { search, type, page = 1, limit = 20 } = filters;
    const where: Prisma.DocumentWhereInput = {};
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async create(data: {
    name: string;
    type: DocumentType;
    filePath: string;
    fileSize: number;
    mimeType: string;
    category?: string;
    uploadedById: string;
  }) {
    return prisma.document.create({
      data,
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  },

  async getById(id: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    if (!doc) throw new AppError(404, 'Document not found');
    return doc;
  },

  async delete(id: string) {
    await documentService.getById(id);
    await prisma.document.delete({ where: { id } });
    return { message: 'Document deleted' };
  },
};
