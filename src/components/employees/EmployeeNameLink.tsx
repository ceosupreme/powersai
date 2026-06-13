import { Link } from 'react-router-dom';
import { User } from 'lucide-react';

interface EmployeeNameLinkProps {
  employeeId: string;
  name: string;
  variant?: 'chip' | 'inline';
  className?: string;
}

/**
 * Renders an employee name as a link to the employee detail page.
 * Used across insight cards, alert items, and other surfaces where
 * employee names appear.
 */
export const EmployeeNameLink = ({
  employeeId,
  name,
  variant = 'chip',
  className = '',
}: EmployeeNameLinkProps) => {
  if (variant === 'inline') {
    return (
      <Link
        to={`/employees/${employeeId}`}
        className={`text-primary hover:underline ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {name}
      </Link>
    );
  }

  return (
    <Link
      to={`/employees/${employeeId}`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors ${className}`}
    >
      <User className="w-3 h-3" />
      <span className="truncate max-w-[140px]">{name}</span>
    </Link>
  );
};
