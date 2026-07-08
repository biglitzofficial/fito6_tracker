'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RowHoverActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RowHoverActions({ onEdit, onDelete }: RowHoverActionsProps) {
  if (!onEdit && !onDelete) return null;

  return (
    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      {onEdit && (
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      )}
      {onDelete && (
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      )}
    </div>
  );
}
