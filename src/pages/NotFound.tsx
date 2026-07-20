import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { getRoleHome } from "@/types/roles";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { currentRole } = useRole();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const home = user ? getRoleHome(currentRole) : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link to={home} className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
