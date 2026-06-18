'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, Download, Search, FileText } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { useDebounce } from '@/hooks/use-debounce';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types';
import { formatDate } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  type: string;
  fileSize: number;
  category?: string;
  createdAt: string;
  uploadedBy: { name: string };
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [showUpload, setShowUpload] = useState(searchParams.get('action') === 'upload');
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('INVOICE');
  const invalidate = useInvalidate();

  const { data: docsRes } = useApiQuery<PaginatedResponse<Document>>(
    queryKeys.documents(debouncedSearch),
    `/documents?search=${debouncedSearch}`
  );
  const docs = docsRes?.items ?? [];

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setUploading(true);
    try {
      await api.post('/documents/upload', formData);
      form.reset();
      setShowUpload(false);
      invalidate(queryKeys.documents(debouncedSearch));
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div>
      <Header title="Documents" subtitle="Bills, invoices, receipts, and salary sheets" />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setShowUpload(!showUpload)}><Upload className="h-4 w-4" /> Upload</Button>
        </div>

        {showUpload && (
          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INVOICE">Invoice</SelectItem>
                      <SelectItem value="BILL">Bill</SelectItem>
                      <SelectItem value="RECEIPT">Receipt</SelectItem>
                      <SelectItem value="SALARY_SHEET">Salary Sheet</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="type" value={docType} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input name="category" placeholder="Optional category" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>File</Label>
                  <Input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.csv" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Document'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Card key={doc.id} className="hover:border-white/15 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{doc.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">{doc.type.replace('_', ' ')}</Badge>
                      <span className="text-xs text-muted-foreground">{formatSize(doc.fileSize)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(doc.createdAt)} · {doc.uploadedBy.name}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => api.download(`/documents/${doc.id}/download`, doc.name)}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {!docs.length && <div className="text-center text-muted-foreground py-8">No documents found</div>}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return <Suspense><DocumentsContent /></Suspense>;
}
