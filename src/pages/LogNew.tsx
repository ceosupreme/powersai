import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to /logs - entry mode selection is now on the main Logs page
export default function LogNew() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/logs', { replace: true });
  }, [navigate]);

  return null;
}
