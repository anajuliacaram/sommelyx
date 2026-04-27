import { useOutlet } from "react-router-dom";

/**
 * Renders the current <Outlet> inside AnimatePresence
 * so dashboard sub-routes animate without re-mounting the layout shell.
 */
export function AnimatedOutlet() {
  const outlet = useOutlet();

  return outlet;
}
