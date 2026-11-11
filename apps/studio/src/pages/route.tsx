/**
 * Arctis root aggregator.
 *
 * TanStack's file-based router derives routes from the filesystem and reserves
 * `__root.tsx` for the root route, so this module is not part of the generated
 * route tree. It documents the page hierarchy Arctis expects: the root layout
 * plus the immediate child route groups.
 */
export { Route as RootRoute } from "./__root";
export { Route as PathlessLayoutRoute } from "./_pathlessLayout/route";
export { Route as ConnectPage } from "./connect";
