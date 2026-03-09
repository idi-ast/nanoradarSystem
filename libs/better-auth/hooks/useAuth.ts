import { useAuthContext } from "../context";

export function useAuth() {
  const { signIn, signUp, signOut, isLoading, error, refreshSession } =
    useAuthContext();

  return {
    signIn,
    signUp,
    signOut,
    isLoading,
    error,
    refreshSession,
  };
}


export function useSession() {
  const { session, user, isAuthenticated, isLoading } = useAuthContext();

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
  };
}


export function useUser() {
  const { user, isLoading } = useAuthContext();
  return { user, isLoading };
}

export function useIsAuthenticated() {
  const { isAuthenticated, isLoading } = useAuthContext();
  return { isAuthenticated, isLoading };
}
