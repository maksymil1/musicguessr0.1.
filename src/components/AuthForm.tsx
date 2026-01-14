import { useState } from "react";
import { supabase } from "../../lib/supabaseClient.ts";
import { AuthError } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";

export default function AuthForm() {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  // NOWE: Stan dla potwierdzenia hasła
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Funkcja pomocnicza do tłumaczenia błędów Supabase na polski
  const translateError = (error: AuthError) => {
    // Supabase często zwraca błędy po angielsku. Tutaj je tłumaczymy.
    console.log("Supabase error:", error.message); // Przydatne do debugowania

    switch (error.message) {
      case "User already registered":
        return "Ten adres e-mail jest już zajęty. Zaloguj się lub użyj innego.";
      case "Invalid login credentials":
        return "Nieprawidłowy e-mail lub hasło.";
      case "Password should be at least 6 characters.":
        return "Hasło musi mieć co najmniej 6 znaków.";
      case "Email not confirmed":
        return "Adres e-mail nie został potwierdzony.";
      default:
        return error.message; // Jeśli błąd jest inny, wyświetl oryginał
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isRegistering) {
        // --- NOWE: Sprawdzenie czy hasła są takie same ---
        if (password !== confirmPassword) {
          setErrorMsg("Hasła nie są identyczne.");
          setLoading(false); // Ważne: musimy wyłączyć loading
          return; // Przerywamy funkcję, nie wysyłamy do Supabase
        }

        // --- Rejestracja ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        navigate("/");
      } else {
        // --- Logowanie ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        navigate("/");
      }
    } catch (error) {
      const authError = error as AuthError;
      // Używamy naszej nowej funkcji tłumaczącej
      setErrorMsg(translateError(authError));
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
        backgroundColor: "white",
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

        {/* NOWE: Pole potwierdzenia hasła, widoczne tylko przy rejestracji */}
        {isRegistering && (
          <input
            type="password"
            placeholder="Powtórz hasło"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              padding: "10px",
              fontSize: "16px",
              borderRadius: "4px",
              border: `1px solid ${
                // Opcjonalny bajer: czerwona ramka jak hasła się różnią podczas pisania
                confirmPassword && password !== confirmPassword ? "red" : "#ccc"
              }`,
            }}
          />
        )}

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
            color: "#721c24", // Ciemniejszy czerwony dla lepszego kontrastu
            marginTop: "15px",
            background: "#f8d7da",
            padding: "10px",
            borderRadius: "4px",
            border: "1px solid #f5c6cb",
          }}
        >
          {errorMsg}
        </p>
      )}

      <p style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        {isRegistering ? "Masz już konto?" : "Nie masz konta?"}
        <button
          onClick={() => {
            setIsRegistering(!isRegistering);
            setErrorMsg("");
            setConfirmPassword(""); // Czyścimy potwierdzenie przy zmianie trybu
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
