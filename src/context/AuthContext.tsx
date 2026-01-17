import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient.ts"; // Upewnij się, że ta ścieżka jest poprawna

// 1. Definicja tego, co będzie dostępne w całym projekcie
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Komponent Provider, który "rozsyła" dane do reszty aplikacji
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sprawdzenie czy użytkownik jest już zalogowany przy starcie aplikacji
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Błąd podczas pobierania sesji:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Słuchacz zmian stanu (logowanie, wylogowanie, zmiana hasła itp.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Sprzątanie po odmontowaniu komponentu
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Funkcja wylogowania
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Własny hook do łatwego korzystania z danych o użytkowniku
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};