export interface EntryFieldsConfig {
  income: {
    party: boolean;
    category: boolean;
    paymentMode: boolean;
  };
  expense: {
    party: boolean;
    category: boolean;
    paymentMode: boolean;
    attachment: boolean;
  };
}

export const DEFAULT_ENTRY_FIELDS: EntryFieldsConfig = {
  income: { party: true, category: true, paymentMode: true },
  expense: { party: true, category: true, paymentMode: true, attachment: true },
};

export function mergeEntryFields(value: unknown): EntryFieldsConfig {
  const v = value as Partial<EntryFieldsConfig> | null | undefined;
  return {
    income: { ...DEFAULT_ENTRY_FIELDS.income, ...v?.income },
    expense: { ...DEFAULT_ENTRY_FIELDS.expense, ...v?.expense },
  };
}
