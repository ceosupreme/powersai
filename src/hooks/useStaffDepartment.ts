import { useState, useCallback, useMemo } from 'react';
import { useRole } from '@/context/RoleContext';

export type Department = 'FOH' | 'BOH';

interface UseStaffDepartmentReturn {
  department: Department;
  setDepartment: (dept: Department) => void;
  availableDepartments: Department[];
  hasBothDepartments: boolean;
}

const STORAGE_KEY = 'staff-department';

const ROLE_DEPARTMENT_MAP: Record<string, Department[]> = {
  foh: ['FOH'],
  boh: ['BOH'],
  lead: ['FOH', 'BOH'],
  gm: ['FOH', 'BOH'],
  owner: ['FOH', 'BOH'],
};

export const useStaffDepartment = (): UseStaffDepartmentReturn => {
  const { currentRole } = useRole();

  const availableDepartments = useMemo(() => {
    if (!currentRole) return ['FOH', 'BOH'] as Department[];
    return (ROLE_DEPARTMENT_MAP[currentRole] || ['FOH', 'BOH']) as Department[];
  }, [currentRole]);

  const [department, setDepartmentState] = useState<Department>(() => {
    if (availableDepartments.length === 1) return availableDepartments[0];
    const stored = localStorage.getItem(STORAGE_KEY) as Department | null;
    if (stored && availableDepartments.includes(stored)) return stored;
    return availableDepartments[0];
  });

  const setDepartment = useCallback((dept: Department) => {
    setDepartmentState(dept);
    localStorage.setItem(STORAGE_KEY, dept);
  }, []);

  return {
    department,
    setDepartment,
    availableDepartments,
    hasBothDepartments: availableDepartments.length > 1,
  };
};
