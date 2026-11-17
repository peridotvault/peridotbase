/**
 * Arctis root aggregator.
 *
 * TanStack's file-based router derives routes from the filesystem and reserves
 * `__root.tsx` for the root route, so this module is not part of the generated
 * route tree. It documents the top of the page hierarchy:
 *
 *   __root.tsx         document shell (head, scripts, providers)
 *   _marketing/        public shell: landing, changelog, roadmap (SSR + prerendered)
 *   /studio            client-only app shell (no SSR); auth and org live under it
 *   /admin             client-only admin shell (no SSR); connect and settings live under it
 *
 * Every group registers its own children through its route.tsx, so they are not
 * re-exported here.
 */
export { Route as RootRoute } from "./__root";
export { Route as MarketingLayoutRoute } from "./_marketing/route";
export { Route as StudioLayoutRoute } from "./studio/route";
export { Route as AdminLayoutRoute } from "./admin/route";
