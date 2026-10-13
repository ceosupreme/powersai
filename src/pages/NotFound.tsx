import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { getRoleHome } from "@/types/roles";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Container } from "@/components/marketing/studio/primitives";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { currentRole } = useRole();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    document.title = "Page not found | Supreme Team Media";
  }, [location.pathname]);

  const home = user ? getRoleHome(currentRole) : "/";

  return (
    <div className="stm-studio not-found-page min-h-screen"><StudioHeader/><main><Container><span className="home-eyebrow">404</span><h1 className="home-section-title">That page <em>isn&apos;t here.</em></h1><p>Try one of these instead.</p><nav aria-label="Helpful pages"><Link to={home}>Homepage</Link><Link to="/services">Services</Link><Link to="/pricing">Packages</Link><Link to="/work">Work</Link><Link to="/free-audit">Free business checkup</Link></nav></Container></main><StudioFooter/></div>
  );
};

export default NotFound;
