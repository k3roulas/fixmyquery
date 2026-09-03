// Single source of truth for internal paths — keeps Link/router/redirect targets
// typo-proof and renameable in one place.
export const ROUTES = {
  home: '/',
  app: '/app',
  history: '/history',
  historyDetail: (id: string) => `/history/${id}`,
  login: '/login',
  register: '/register',
  verify: (token: string) => `/verify?token=${token}`,
} as const;
