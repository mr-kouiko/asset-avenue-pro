import { useAuth } from './useAuth';

/**
 * Hook to access user role from the centralized auth context.
 * The role is cached in localStorage and synced across tabs.
 */
export const useUserRole = () => {
  const { role, roleLoading, isAdmin, isCreator, isClient, refreshRole } = useAuth();

  return {
    role,
    loading: roleLoading,
    isAdmin,
    isCreator,
    isClient,
    refetch: refreshRole
  };
};
