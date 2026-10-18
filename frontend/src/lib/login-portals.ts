const SCENE_BG = '/login/admin-background.png';

export type LoginPortalId = 'admin' | 'superadmin' | 'dharapuram' | 'palladam';

export type LoginFeature = { icon: 'chart' | 'users' | 'gear' | 'growth'; label: string };

export type LoginPortal = {
  id: LoginPortalId;
  path: string;
  title: string;
  kicker: string;
  subtitle: string;
  panelLabel: string;
  badge?: string;
  location?: string;
  image: string;
  match: string[];
  features: LoginFeature[];
};

export const LOGIN_PORTALS: Record<LoginPortalId, LoginPortal> = {
  superadmin: {
    id: 'superadmin',
    path: '/superadmin',
    title: 'Super Admin',
    kicker: '',
    subtitle: 'Franchise command · every gym, every report',
    panelLabel: 'Super Admin',
    image: SCENE_BG,
    match: [],
    features: [
      { icon: 'gear', label: 'Multi Branch' },
      { icon: 'users', label: 'User Control' },
      { icon: 'chart', label: 'Complete Reports' },
      { icon: 'growth', label: 'Grow Together' },
    ],
  },
  admin: {
    id: 'admin',
    path: '/admin',
    title: 'Admin',
    kicker: '',
    subtitle: 'Gym operations · members · billing',
    panelLabel: 'Admin',
    image: SCENE_BG,
    match: [],
    features: [
      { icon: 'chart', label: 'Track Performance' },
      { icon: 'users', label: 'Manage Members' },
      { icon: 'gear', label: 'Operate Smoothly' },
      { icon: 'growth', label: 'Grow Together' },
    ],
  },
  dharapuram: {
    id: 'dharapuram',
    path: '/Dharapuram-road-branch',
    title: 'Dharapuram Road Branch',
    kicker: '',
    subtitle: 'Branch 1 · Tirupur',
    panelLabel: 'Dharapuram Road Branch',
    badge: '',
    location: 'Canara Bank & HDFC Bank Upstairs, Dharapuram Road, Tirupur – 641605',
    image: SCENE_BG,
    match: ['dharapuram', 'branch 1', 'branch1'],
    features: [
      { icon: 'chart', label: 'Track Performance' },
      { icon: 'users', label: 'Manage Members' },
      { icon: 'gear', label: 'Operate Smoothly' },
      { icon: 'growth', label: 'Grow Together' },
    ],
  },
  palladam: {
    id: 'palladam',
    path: '/palladam-road-branch',
    title: 'Palladam Road Branch',
    kicker: '',
    subtitle: 'Branch 2 · Tirupur',
    panelLabel: 'Palladam Road Branch',
    badge: '',
    location: 'TKT Mill Bus Stop, Near Hyundai Showroom, Palladam Road, Tirupur',
    image: SCENE_BG,
    match: ['palladam', 'branch 2', 'branch2'],
    features: [
      { icon: 'chart', label: 'Track Performance' },
      { icon: 'users', label: 'Manage Members' },
      { icon: 'gear', label: 'Operate Smoothly' },
      { icon: 'growth', label: 'Grow Together' },
    ],
  },
};

export const LOGIN_PORTAL_LIST: LoginPortal[] = [
  LOGIN_PORTALS.superadmin,
  LOGIN_PORTALS.admin,
  LOGIN_PORTALS.dharapuram,
  LOGIN_PORTALS.palladam,
];
