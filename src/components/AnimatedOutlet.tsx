import { useLocation, useOutlet } from "react-router-dom";

/**
 * Renders the current <Outlet> inside AnimatePresence
 * so dashboard sub-routes animate without re-mounting the layout shell.
 */
export function AnimatedOutlet() {
  const outlet = useOutlet();
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-transition-surface">
      {outlet}
    </div>
  );
}
