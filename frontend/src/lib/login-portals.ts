export type LoginPortalId = 'admin' | 'superadmin' | 'dharapuram' | 'palladam';

export type LoginFeature = { icon: 'chart' | 'users' | 'gear' | 'growth'; label: string };

export type LoginPortal = {
  id: LoginPortalId;
  path: string;
  title: string;
  kicker: string;
  subtitle: string;
  panelLabel?: string;
  badge?: string;
  location?: string;
  image: string;
  match: string[];
  icon: 'admin' | 'crown' | 'gym';
  scene?: boolean;
  features?: LoginFeature[];
};

export const LOGIN_PORTALS: Record<LoginPortalId, LoginPortal> = {
  superadmin: {
    id: 'superadmin',
    path: '/superadmin',
    title: 'Super Admin',
    kicker: 'Full control. All branches.',
    subtitle: 'Franchise command · every gym, every report',
    image: '/login/superadmin.jpg',
    match: [],
    icon: 'crown',
  },
  admin: {
    id: 'admin',
    path: '/admin',
    title: 'Admin',
    kicker: 'Admin Panel',
    subtitle: 'Gym operations · members · billing',
    panelLabel: 'Admin Panel',
    image: '/login/admin-background.png',
    match: [],
    icon: 'admin',
    scene: true,
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
    title: 'Branch Login',
    kicker: 'Dharapuram Road',
    subtitle: 'Branch 1 · Tirupur',
    badge: 'BRANCH 1',
    location: 'Canara Bank & HDFC Bank Upstairs, Dharapuram Road, Tirupur – 641605',
    image: '/login/branch-dharapuram.jpg',
    match: ['dharapuram', 'branch 1', 'branch1'],
    icon: 'gym',
  },
  palladam: {
    id: 'palladam',
    path: '/palladam-road-branch',
    title: 'Branch Login',
    kicker: 'Palladam Road',
    subtitle: 'Branch 2 · Tirupur',
    badge: 'BRANCH 2',
    location: 'TKT Mill Bus Stop, Near Hyundai Showroom, Palladam Road, Tirupur',
    image: '/login/branch-palladam.jpg',
    match: ['palladam', 'branch 2', 'branch2'],
    icon: 'gym',
  },
};

export const LOGIN_PORTAL_LIST: LoginPortal[] = [
  LOGIN_PORTALS.superadmin,
  LOGIN_PORTALS.admin,
  LOGIN_PORTALS.dharapuram,
  LOGIN_PORTALS.palladam,
];
