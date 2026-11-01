import { Navigate, useLocation } from 'react-router-dom';

/** Old Methods address: keep the query string and hash. */
export default function MethodsRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={`/playbooks${search}${hash}`} replace />;
}
