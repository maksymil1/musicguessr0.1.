import { useState } from "react";
import { supabase } from "../../lib/supabaseClient.ts"; // Upewnij się, że ścieżka do supabaseClient jest poprawna (może być ../supabaseClient lub ../lib/supabaseClient)
import { AuthError } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

export default function AuthForm() {
  // 1. POPRAWKA: useNavigate musi być TUTAJ, na górze komponentu
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isRegistering) {
        // --- Rejestracja ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Opcjonalnie: Jeśli masz włączone potwierdzanie e-maila w Supabase,
        // tutaj powinieneś wyświetlić komunikat "Sprawdź email".
        // Jeśli nie, przekieruj od razu:
        navigate("/");
      } else {
        // --- Logowanie ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // 2. POPRAWKA: Przekierowanie działa teraz poprawnie
        navigate("/");
      }
    } catch (error) {
      const authError = error as AuthError;
      setErrorMsg(authError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-container"
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "30px",
        textAlign: "center",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        backgroundColor: "white", // Dodane tło, żeby nie było przezroczyste na kolorowym tle App
      }}
    >
      <h2 style={{ marginBottom: "20px", color: "#333" }}>
        {isRegistering ? "Załóż konto" : "Zaloguj się"}
      </h2>

      <form
        onSubmit={handleAuth}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <input
          type="email"
          placeholder="Twój email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "10px",
            fontSize: "16px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px",
            cursor: loading ? "not-allowed" : "pointer",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {loading
            ? "Przetwarzanie..."
            : isRegistering
            ? "Zarejestruj się"
            : "Zaloguj"}
        </button>
      </form>

      {errorMsg && (
        <p
          style={{
            color: "red",
            marginTop: "15px",
            background: "#ffe6e6",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          Błąd: {errorMsg}
        </p>
      )}

      <p style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        {isRegistering ? "Masz już konto?" : "Nie masz konta?"}
        <button
          onClick={() => {
            setIsRegistering(!isRegistering);
            setErrorMsg("");
          }}
          style={{
            background: "none",
            border: "none",
            color: "#007bff",
            cursor: "pointer",
            textDecoration: "underline",
            marginLeft: "5px",
            fontSize: "14px",
          }}
        >
          {isRegistering ? "Zaloguj się" : "Zarejestruj się"}
        </button>
      </p>
    </div>
  );
}
