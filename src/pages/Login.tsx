import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (type: 'login' | 'signup') => {
    setLoading(true);
    setMsg(null);
    
    // Używamy signInWithPassword, aby uniknąć błędów logowania anonimowego
    const { error } = type === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setMsg({ type: 'error', text: error.message });
      setLoading(false);
    } else {
      if (type === 'signup') {
        setMsg({ type: 'success', text: "Sprawdź skrzynkę mailową, aby potwierdzić konto!" });
        setLoading(false);
      } else {
        navigate("/");
      }
    }
  };

  return (
    <div className="ranking-master">
      <div className="ranking-card">
        <h1 className="neon-text">ZALOGUJ</h1>
        <p className="subtitle">MusicGuessr Account</p>

        <form onSubmit={(e) => { e.preventDefault(); handleAuth('login'); }} className="d-flex flex-column gap-3">
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
            <div style={{ 
              color: msg.type === 'error' ? '#ff4444' : '#4ade80', 
              fontSize: '0.9rem', 
              fontWeight: 'bold',
              marginTop: '10px' 
            }}>
              {msg.text}
            </div>
          )}

          <div className="nav-footer d-flex flex-column gap-2">
            <button 
              type="button" 
              className="main-btn-neon" 
              onClick={() => handleAuth('login')}
              disabled={loading}
            >
              {loading ? "PROSZĘ CZEKAĆ..." : "WEJDŹ"}
            </button>
            
            <button 
              type="button" 
              className="btn-link-gray" 
              onClick={() => handleAuth('signup')}
            >
              STWÓRZ NOWE KONTO
            </button>

            <button type="button" className="btn-link-gray mt-2" onClick={() => navigate("/")}>
              POWRÓT DO MENU
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}