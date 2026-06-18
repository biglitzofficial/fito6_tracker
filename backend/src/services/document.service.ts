import { DocumentType } from '../types/enums';
import { Document } from '../types/models';
import {
  COL,
  create,
  findMany,
  getById,
  getUserMap,
  matchesSearch,
  paginate,
  remove,
  sortBy,
} from '../lib/firestore';
import { deleteFile } from '../lib/storage';
import { AppError } from '../utils/response';

async function withUploader(items: Document[]) {
  const userMap = await getUserMap(items.map((d) => d.uploadedById));
  return items.map((doc) => ({
    ...doc,
    uploadedBy: {
      id: doc.uploadedById,
      name: userMap.get(doc.uploadedById)?.name || 'Unknown',
    },
  }));
}

export const documentService = {
  async list(filters: { search?: string; type?: DocumentType; page?: number; limit?: number }) {
    const { search, type, page = 1, limit = 20 } = filters;

    let items = await findMany<Document>(COL.documents, (doc) => {
      if (type && doc.type !== type) return false;
      if (!matchesSearch(search, doc.name, doc.category)) return false;
      return true;
    });

    items = sortBy(items, 'createdAt', 'desc');
    const paged = paginate(items, page, limit);
    return { ...paged, items: await withUploader(paged.items) };
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
    const doc = await create<Document>(COL.documents, data);
    return (await withUploader([doc]))[0];
  },

  async getById(id: string) {
    const doc = await getById<Document>(COL.documents, id);
    if (!doc) throw new AppError(404, 'Document not found');
    return (await withUploader([doc]))[0];
  },

  async delete(id: string) {
    const doc = await documentService.getById(id);
    await deleteFile(doc.filePath);
    await remove(COL.documents, id);
    return { message: 'Document deleted' };
  },
};
