export const MEMBER_SUBSCRIPTION_GROUP = 'Member Subscription Plan';
export const PT_SUBSCRIPTION_GROUP = 'Personal Training Subscription Plan';

export const INCOME_CATEGORY_GROUPS: { name: string; children: string[] }[] = [
  {
    name: MEMBER_SUBSCRIPTION_GROUP,
    children: [
      'Zumba',
      'INBODY ASSESSMENT',
      'Daily Package',
      'Basic Monthly',
      'Basic Quarterly',
      'Basic Half Yearly',
      'Basic Yearly',
    ],
  },
  {
    name: PT_SUBSCRIPTION_GROUP,
    children: [
      'Personal Training - 1 Month',
      'Personal Training - 2 Months',
      'Personal Training - 3 Months',
      'Couple Personal Training - 1 Month',
      'Couple Personal Training - 2 Months',
    ],
  },
];
