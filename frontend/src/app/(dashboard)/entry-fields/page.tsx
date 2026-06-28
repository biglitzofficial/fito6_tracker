'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ListChecks, Tags, UserRound, Wallet, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { FieldToggleCard } from '@/components/entry-fields/field-toggle-card';
import { CategoriesPanel } from '@/components/entry-fields/categories-panel';
import { PartiesPanel } from '@/components/entry-fields/parties-panel';
import { PaymentModesPanel } from '@/components/entry-fields/payment-modes-panel';
import { api } from '@/lib/api';
import { useApiQuery, useInvalidate } from '@/hooks/use-api-query';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore, isAdmin } from '@/stores/auth.store';
import { DEFAULT_ENTRY_FIELDS, mergeEntryFields, type EntryFieldsConfig } from '@/lib/entry-fields';
import { cn } from '@/lib/utils';

type TabId = 'overview' | 'categories' | 'parties' | 'payment-modes';

const SECTIONS: { id: TabId; label: string; description: string; icon: typeof ListChecks }[] = [
  { id: 'overview', label: 'Entry Fields', description: 'Show or hide fields on forms', icon: ListChecks },
  { id: 'categories', label: 'Categories', description: 'Rename, add, or disable categories', icon: Tags },
  { id: 'parties', label: 'Parties', description: 'Staff, vendors & contacts', icon: UserRound },
  { id: 'payment-modes', label: 'Payment Modes', description: 'Bank, cash, UPI accounts', icon: Wallet },
];

function EntryFieldsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const admin = isAdmin(user);
  const invalidate = useInvalidate();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && SECTIONS.some((s) => s.id === tabParam) ? tabParam : 'overview');
  const [fields, setFields] = useState<EntryFieldsConfig>(DEFAULT_ENTRY_FIELDS);
  const [saving, setSaving] = useState(false);

  const { data: loadedFields } = useApiQuery<EntryFieldsConfig>(
    queryKeys.entryFields,
    '/settings/entry-fields',
    { staleTime: 5 * 60_000 }
  );

  useEffect(() => {
    if (loadedFields) setFields(mergeEntryFields(loadedFields));
  }, [loadedFields]);

  useEffect(() => {
    if (tabParam && SECTIONS.some((s) => s.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  const saveFields = async () => {
    setSaving(true);
    try {
      await api.put('/settings/entry_fields', { value: fields });
      invalidate(queryKeys.entryFields);
    } finally {
      setSaving(false);
    }
  };

  const autoOpenAdd = searchParams.get('action') === 'add';

  return (
    <div>
      <Header
        title="Entry Fields"
        subtitle="Party, category, payment mode & form settings"
      />
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-72 shrink-0">
            <nav className="space-y-1 rounded-xl border border-border bg-card p-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setTab(section.id)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-lg px-3 py-3 text-left transition-colors',
                    activeTab === section.id
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-accent'
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5 ml-6">{section.description}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Entry Field</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose which fields appear on income and expense forms.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Income Entry</p>
                  <FieldToggleCard
                    title="Category field"
                    description="Rename, delete, reorder, add new or hide"
                    enabled={fields.income.category}
                    onToggle={admin ? (v) => setFields({ ...fields, income: { ...fields.income, category: v } }) : undefined}
                    onManage={() => setTab('categories')}
                    readOnly={!admin}
                  />
                  <FieldToggleCard
                    title="Payment Mode field"
                    description="Rename, delete, reorder, add new or hide"
                    enabled={fields.income.paymentMode}
                    onToggle={admin ? (v) => setFields({ ...fields, income: { ...fields.income, paymentMode: v } }) : undefined}
                    onManage={() => setTab('payment-modes')}
                    readOnly={!admin}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expense Entry</p>
                  <FieldToggleCard
                    title="Party field"
                    description="Rename, delete, reorder, add new or hide"
                    enabled={fields.expense.party}
                    onToggle={admin ? (v) => setFields({ ...fields, expense: { ...fields.expense, party: v } }) : undefined}
                    onManage={() => setTab('parties')}
                    readOnly={!admin}
                  />
                  <FieldToggleCard
                    title="Category field"
                    description="Rename, delete, reorder, add new or hide"
                    enabled={fields.expense.category}
                    onToggle={admin ? (v) => setFields({ ...fields, expense: { ...fields.expense, category: v } }) : undefined}
                    onManage={() => setTab('categories')}
                    readOnly={!admin}
                  />
                  <FieldToggleCard
                    title="Payment Mode field"
                    description="Rename, delete, reorder, add new or hide"
                    enabled={fields.expense.paymentMode}
                    onToggle={admin ? (v) => setFields({ ...fields, expense: { ...fields.expense, paymentMode: v } }) : undefined}
                    onManage={() => setTab('payment-modes')}
                    readOnly={!admin}
                  />
                  <FieldToggleCard
                    title="Attach Bills field"
                    description="Show or hide bill attachment on expense form"
                    enabled={fields.expense.attachment}
                    onToggle={admin ? (v) => setFields({ ...fields, expense: { ...fields.expense, attachment: v } }) : undefined}
                    readOnly={!admin}
                  />
                </div>

                {admin && (
                  <Button onClick={saveFields} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Field Settings'}
                  </Button>
                )}
              </div>
            )}

            {activeTab === 'categories' && <CategoriesPanel />}
            {activeTab === 'parties' && <PartiesPanel autoOpenAdd={autoOpenAdd && activeTab === 'parties'} />}
            {activeTab === 'payment-modes' && (
              <PaymentModesPanel autoOpenAdd={autoOpenAdd && activeTab === 'payment-modes'} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function EntryFieldsPage() {
  return (
    <Suspense>
      <EntryFieldsContent />
    </Suspense>
  );
}
