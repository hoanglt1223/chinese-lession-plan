import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  username: string;
  creditBalance: string;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      // Skip login for development
      if (import.meta.env.DEV) {
        return {
          user: {
            id: "dev-user",
            username: "Dev User",
            creditBalance: "$1000"
          }
        };
      }
      
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Important for session cookies
      });
      
      if (!response.ok) {
        throw new Error("Not authenticated");
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const user = data?.user as AuthUser | undefined;

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
  };
}