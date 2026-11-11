/**
 * Demo-mode helper. Everything here is gated on the `VITE_STUDIO_DEMO` environment variable,
 * and the demo client is the only implementation that labels data as samples. Real mode never
 * builds that client; see `shared/peridotbase/client.ts`.
 */
export const isDemoMode = (): boolean => import.meta.env.VITE_STUDIO_DEMO === "true";
