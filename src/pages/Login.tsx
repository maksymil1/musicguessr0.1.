import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // DODANE: Stan dla nicku
  const [nickname, setNickname] = useState(""); 
  const [isLoginMode, setIsLoginMode] = useState(true); // Przełącznik logowanie/rejestracja

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const navigate = useNavigate();

  const handleAuth = async () => {
    setLoading(true);
    setMsg(null);
    
    let error = null;

    if (isLoginMode) {
      // LOGOWANIE
      const res = await supabase.auth.signInWithPassword({ email, password });
      error = res.error;
    } else {
      // REJESTRACJA
      if (!nickname) {
        setMsg({ type: 'error', text: "Przy rejestracji musisz podać Nick!" });
        setLoading(false);
        return;
      }

      // Tutaj przekazujemy nickname do meta_data -> Trigger w SQL to przechwyci
      const res = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname: nickname 
          }
        }
      });
      error = res.error;
    }

    if (error) {
      setMsg({ type: 'error', text: error.message });
      setLoading(false);
    } else {
      if (!isLoginMode) {
        setMsg({ type: 'success', text: "Konto utworzone! Sprawdź email." });
        setLoading(false);
      } else {
        // Po zalogowaniu zapisz nick w localStorage dla kompatybilności z resztą gry
        // Pobieramy go z bazy, żeby mieć pewność
        const { data: profile } = await supabase
           .from("Profiles")
           .select("nickname")
           .eq("id", (await supabase.auth.getUser()).data.user?.id)
           .single();
           
        if (profile?.nickname) {
            localStorage.setItem("myNickname", profile.nickname);
        }
        
        navigate("/");
      }
    }
  };

  return (
    <div className="ranking-master">
      <div className="ranking-card">
        <h1 className="neon-text">{isLoginMode ? "ZALOGUJ" : "DOŁĄCZ"}</h1>
        
        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="d-flex flex-column gap-3">
          
          {/* Pole Nickname pokazujemy tylko przy rejestracji */}
          {!isLoginMode && (
             <input 
             className="form-control login-field" 
             type="text" 
             placeholder="TWOJE PSEUDO (NICK)" 
             value={nickname}
             onChange={e => setNickname(e.target.value)} 
             required
           />
          )}

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

          {msg && (
            <div style={{ color: msg.type === 'error' ? '#ff4444' : '#4ade80', marginTop: '10px' }}>
              {msg.text}
            </div>
          )}

          <div className="nav-footer d-flex flex-column gap-2">
            <button type="submit" className="main-btn-neon" disabled={loading}>
              {loading ? "CZEKAJ..." : (isLoginMode ? "WEJDŹ" : "ZAREJESTRUJ")}
            </button>
            
            <button 
              type="button" 
              className="btn-link-gray" 
              onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setMsg(null);
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