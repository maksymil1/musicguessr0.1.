import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Ensure this CSS file exists and has the content you provided

export default function Login() {
  // Form states
  const [loginInput, setLoginInput] = useState(""); // For login: Email OR Nickname
  const [email, setEmail] = useState("");           // Only for registration
  const [nickname, setNickname] = useState("");     // Only for registration
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
        // --- LOGIN LOGIC (NICKNAME OR EMAIL) ---
        let emailToUse = loginInput.trim();

        // 1. If NICKNAME is entered (no @), find the EMAIL assigned to it
        if (!emailToUse.includes("@")) {
          const { data, error } = await supabase
            .from("Profiles")
            .select("email")
            .eq("nickname", emailToUse) // Searching by nickname in DB
            .maybeSingle();

          if (error || !data) {
            throw new Error("Player with this nickname not found!");
          }
          
          // Swap nickname for the found email
          emailToUse = data.email;
        }

        // 2. Actual Login (Supabase always requires email)
        const { error } = await supabase.auth.signInWithPassword({ 
          email: emailToUse, 
          password 
        });

        if (error) throw error;

        // Login success
        navigate("/");

      } else {
        // --- REGISTRATION LOGIC ---
        if (!nickname) throw new Error("You must provide a Nickname!");

        // Check if nickname is taken
        const { data: existing } = await supabase
          .from("Profiles")
          .select("nickname")
          .eq("nickname", nickname)
          .maybeSingle();

        if (existing) throw new Error("This nickname is already taken!");

        // Registration
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nickname: nickname } // Saving nickname in meta_data
          }
        });

        if (error) throw error;

        setMsg({ type: 'success', text: "Account created! Check your email or log in." });
        setIsLoginMode(true); // Switch to login mode so the user can log in
      }

    } catch (error: any) {
      setMsg({ type: 'error', text: error.message || "An error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ranking-master">
      <div className="ranking-card">
        <h1 className="neon-text">{isLoginMode ? "WELCOME" : "JOIN US"}</h1>
        <p className="subtitle">{isLoginMode ? "Log in to the game" : "Create a new account"}</p>
        
        <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="d-flex flex-column gap-3">
          
          {isLoginMode ? (
            /* --- LOGIN FIELDS --- */
            <>
              <input 
                className="form-control login-field" 
                type="text" 
                placeholder="EMAIL OR NICKNAME" 
                value={loginInput}
                onChange={e => setLoginInput(e.target.value)} 
                required
              />
              <input 
                className="form-control login-field" 
                type="password" 
                placeholder="PASSWORD" 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                required
              />
            </>
          ) : (
            /* --- REGISTRATION FIELDS --- */
            <>
              <input 
                className="form-control login-field" 
                type="text" 
                placeholder="YOUR NICKNAME" 
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
                placeholder="PASSWORD" 
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
              {loading ? "PROCESSING..." : (isLoginMode ? "ENTER GAME" : "REGISTER")}
            </button>
            
            <button 
              type="button" 
              className="btn-link-gray" 
              onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setMsg(null);
                  setPassword(""); // Clear password on switch
              }}
            >
              {isLoginMode ? "NO ACCOUNT? CREATE ONE" : "ALREADY HAVE AN ACCOUNT? LOG IN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}