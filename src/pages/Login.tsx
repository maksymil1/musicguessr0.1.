import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Upewnij się, że ten plik CSS istnieje i ma zawartość, którą podałeś

export default function Login() {
  // Stany formularza
  const [loginInput, setLoginInput] = useState(""); // Dla logowania: Email LUB Nick
  const [email, setEmail] = useState("");           // Tylko dla rejestracji
  const [nickname, setNickname] = useState("");     // Tylko dla rejestracji
  const [password, setPassword] = useState("");
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  
  const navigate = useNavigate();

  const handleAuth = async () => {
    setLoading(true);
    setMsg(null);
    
    try {
      if (isLoginMode) {
        // --- LOGIKA LOGOWANIA (NICK LUB EMAIL) ---
        let emailToUse = loginInput.trim();

        // 1. Jeśli wpisano NICK (brak @), znajdź przypisany do niego EMAIL
        if (!emailToUse.includes("@")) {
          const { data, error } = await supabase
            .from("Profiles")
            .select("email")
            .eq("nickname", emailToUse) // Szukamy po nicku w bazie
            .maybeSingle();

          if (error || !data) {
            throw new Error("Nie znaleziono gracza o takim nicku!");
          }
          
          // Podmieniamy nick na znaleziony email
          emailToUse = data.email;
        }

        // 2. Logowanie właściwe (Supabase zawsze wymaga maila)
        const { error } = await supabase.auth.signInWithPassword({ 
          email: emailToUse, 
          password 
        });

        if (error) throw error;

        // Sukces logowania
        navigate("/");

      } else {
        // --- LOGIKA REJESTRACJI ---
        if (!nickname) throw new Error("Musisz podać Nick!");

        // Sprawdź czy nick jest wolny
        const { data: existing } = await supabase
          .from("Profiles")
          .select("nickname")
          .eq("nickname", nickname)
          .maybeSingle();

        if (existing) throw new Error("Ten nick jest już zajęty!");

        // Rejestracja
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nickname: nickname } // Zapisujemy nick w meta_data
          }
        });

        if (error) throw error;

        setMsg({ type: 'success', text: "Konto utworzone! Sprawdź email lub zaloguj się." });
        setIsLoginMode(true); // Przełącz na logowanie, żeby użytkownik mógł się zalogować
      }

    } catch (error: any) {
      setMsg({ type: 'error', text: error.message || "Wystąpił błąd." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ranking-master">
      <div className="ranking-card">
        <h1 className="neon-text">{isLoginMode ? "WITAJ" : "DOŁĄCZ"}</h1>
        <p className="subtitle">{isLoginMode ? "Zaloguj się do gry" : "Stwórz nowe konto"}</p>
        
        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="d-flex flex-column gap-3">
          
          {isLoginMode ? (
            /* --- POLA DO LOGOWANIA --- */
            <>
              <input 
                className="form-control login-field" 
                type="text" 
                placeholder="EMAIL LUB NICKNAME" 
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)} 
                required
              />
              <input 
                className="form-control login-field" 
                type="password" 
                placeholder="HASŁO" 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </>
          ) : (
            /* --- POLA DO REJESTRACJI --- */
            <>
              <input 
                className="form-control login-field" 
                type="text" 
                placeholder="TWOJE PSEUDO (NICK)" 
                value={nickname}
                onChange={e => setNickname(e.target.value)} 
                required
              />
              <input 
                className="form-control login-field" 
                type="email" 
                placeholder="EMAIL" 
                value={email}
                onChange={e => setEmail(e.target.value)} 
                required
              />
              <input 
                className="form-control login-field" 
                type="password" 
                placeholder="HASŁO" 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </>
          )}

          {msg && (
            <div style={{ 
              color: msg.type === 'error' ? '#ff4757' : '#4ade80', 
              marginTop: '5px', 
              fontWeight: 'bold',
              textShadow: '0 0 5px rgba(0,0,0,0.5)' 
            }}>
              {msg.text}
            </div>
          )}

          <div className="nav-footer">
            <button type="submit" className="main-btn-neon" disabled={loading}>
              {loading ? "PRZETWARZANIE..." : (isLoginMode ? "WEJDŹ DO GRY" : "ZAREJESTRUJ SIĘ")}
            </button>
            
            <button 
              type="button" 
              className="btn-link-gray" 
              onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setMsg(null);
                  setPassword(""); // Czyść hasło przy przełączaniu
              }}
            >
              {isLoginMode ? "NIE MASZ KONTA? STWÓRZ JE" : "MASZ KONTO? ZALOGUJ SIĘ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}