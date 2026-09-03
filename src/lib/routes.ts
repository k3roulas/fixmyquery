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

// Deployment path prefix, inlined at build time (must match `basePath` in
// next.config.ts). Needed wherever URLs are built outside next/link: client
// fetches, public asset srcs, absolute links in emails.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
