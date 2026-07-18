'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PartyForm } from '@/components/parties/party-form';
import { AssignPlanForm } from '@/components/subscriptions/assign-plan-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAccounts, useCategories, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/utils';
import type { Party, Subscription } from '@/types';

const STEPS = ['Personal Details', 'Subscription', 'Billing & Payment'] as const;

interface ClientWizardProps {
  onClose: () => void;
  onComplete: (partyId: string) => void;
}

export function ClientWizard({ onClose, onComplete }: ClientWizardProps) {
  const invalidate = useInvalidate();
  const [step, setStep] = useState(1);
  const [party, setParty] = useState<Party | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories('INCOME');
  const incomeLeaves = useMemo(() => {
    const leaves = categories.filter((c) => c.parentId);
    return leaves.length ? leaves : categories;
  }, [categories]);

  const pending = subscription
    ? Math.max(0, Number(subscription.priceInclGst) - Number(subscription.amountPaid || 0))
    : 0;

  const finish = (partyId: string) => {
    invalidate(queryKeys.parties());
    invalidate(queryKeys.parties('CUSTOMER'));
    invalidate(queryKeys.subscriptions('MEMBERSHIP'));
    invalidate(queryKeys.income(''));
    onComplete(partyId);
  };

  const collectPayment = async (skip?: boolean) => {
    if (!party || !subscription) return;
    if (skip) {
      finish(party.id);
      return;
    }

    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      setPayError('Enter a valid payment amount');
      return;
    }
    if (!accountId) {
      setPayError('Select a payment account');
      return;
    }
    if (!categoryId) {
      setPayError('Select an income category');
      return;
    }

    setPaying(true);
    setPayError('');
    try {
      await api.post('/income', {
        amount,
        categoryId,
        accountId,
        partyId: party.id,
        date: new Date().toISOString().split('T')[0],
        notes: `${subscription.planName} · ${subscription.id}`,
      });
      const newPaid = Number(subscription.amountPaid || 0) + amount;
      await api.put(`/subscriptions/${subscription.id}`, {
        amountPaid: newPaid,
      });
      finish(party.id);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Card className="animate-fade-in border-primary/20">
      <CardContent className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">New Client Registration</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Personal details → membership plan → billing (same flow as FITO6 ERP)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const on = step === n;
            const done = step > n;
            return (
              <div
                key={label}
                className={`rounded-lg px-2 py-2 text-center text-xs font-bold ${
                  on
                    ? 'bg-primary text-white'
                    : done
                      ? 'bg-[#e3f6ec] text-success'
                      : 'bg-secondary text-muted-foreground'
                }`}
              >
                {n} · {label}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <PartyForm
            compact
            forceCustomer
            hideCancel={false}
            submitLabel="Save & Next"
            onCancel={onClose}
            onSaved={(p) => {
              if (!p) return;
              setParty(p);
              setStep(2);
            }}
          />
        )}

        {step === 2 && party && (
          <AssignPlanForm
            kind="MEMBERSHIP"
            party={party}
            deferIncome
            hideCancel
            submitLabel="Save & Next"
            onCancel={() => setStep(1)}
            onSaved={(sub) => {
              if (!sub) return;
              setSubscription(sub);
              setPayAmount(String(sub.priceInclGst));
              setStep(3);
            }}
          />
        )}

        {step === 3 && party && subscription && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-border bg-muted/30 p-4">
              <div>
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Client</p>
                <p className="font-semibold">{party.name}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Plan</p>
                <p className="font-semibold">{subscription.planName}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Total</p>
                <p className="font-semibold">{formatCurrency(Number(subscription.priceInclGst))}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground font-semibold">Pending</p>
                <p className="font-semibold text-destructive">{formatCurrency(pending || Number(subscription.priceInclGst))}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cash / UPI / Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.isActive !== false).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Income Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeLeaves.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {payError && <p className="text-xs text-destructive">{payError}</p>}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => collectPayment(false)} disabled={paying}>
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Payment'}
              </Button>
              <Button variant="secondary" onClick={() => collectPayment(true)} disabled={paying}>
                Skip / Pay Later
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
