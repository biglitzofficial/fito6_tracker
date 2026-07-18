'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Landmark, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/use-api-query';
import type { AccountType } from '@/types';
import { formatCurrency } from '@/lib/utils';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: 'Bank',
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  OTHER: 'Other',
};

const PANEL_WIDTH = 288;

export function AccountsWalletMenu() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; right: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { data: accounts = [], isLoading } = useAccounts();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setMenuStyle({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
        width: PANEL_WIDTH,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const menu =
    open && menuStyle && mounted ? (
      <>
        <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setOpen(false)} aria-hidden />
        <div
          className="fixed z-[201] rounded-xl border border-border bg-white shadow-xl overflow-hidden"
          style={{ top: menuStyle.top, right: menuStyle.right, width: menuStyle.width }}
        >
          <div className="px-4 py-3 border-b border-border bg-white">
            <p className="text-sm font-semibold">Payment Accounts</p>
            <p className="text-xs text-muted-foreground">Cash, bank, UPI & more</p>
          </div>

          <div className="max-h-64 overflow-y-auto p-2 space-y-1 bg-white scrollbar-thin">
            {isLoading && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">Loading accounts...</p>
            )}
            {!isLoading &&
              accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Landmark className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{account.name}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </Badge>
                    </div>
                    {account.bankName && (
                      <p className="text-xs text-muted-foreground truncate">{account.bankName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opening: {formatCurrency(account.openingBalance ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            {!isLoading && !accounts.length && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No accounts yet</p>
            )}
          </div>

          <div className="border-t border-border p-2 bg-white">
            <Button asChild variant="ghost" size="sm" className="w-full justify-start">
              <Link href="/entry-fields?tab=payment-modes" onClick={() => setOpen(false)}>
                Manage payment modes
              </Link>
            </Button>
          </div>
        </div>
      </>
    ) : null;

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="icon"
        className="rounded-xl"
        onClick={() => setOpen((v) => !v)}
        title="Payment accounts"
        aria-expanded={open}
      >
        <Wallet className="h-4 w-4" />
      </Button>

      {mounted && menu && createPortal(menu, document.body)}
    </>
  );
}
