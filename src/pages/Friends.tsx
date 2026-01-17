import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import { motion, AnimatePresence } from "framer-motion";
import "./Friends.css";

// --- INTERFEJSY ---
interface FriendRequest {
  id: string;
  senderNick: string;
  receiverNick: string;
  status: "PENDING" | "ACCEPTED";
  createdAt: string;
}

export default function Friends() {
  const myNickname = localStorage.getItem("myNickname") || "Anon";
  
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchNick, setSearchNick] = useState("");
  const [tab, setTab] = useState<"list" | "requests">("list");
  const [loading, setLoading] = useState(true);

  // --- LOGIKA POBIERANIA DANYCH ---
  const fetchData = useCallback(async () => {
    if (!myNickname) return;
    setLoading(true);

    try {
      const [friendsRes, requestsRes] = await Promise.all([
        // Znajomi (ACCEPTED) - sprawdzamy obie strony relacji
        supabase
          .from("FriendRequest")
          .select("*")
          .or(`senderNick.eq.${myNickname},receiverNick.eq.${myNickname}`)
          .eq("status", "ACCEPTED"),
        
        // Zaproszenia DO MNIE (PENDING)
        supabase
          .from("FriendRequest")
          .select("*")
          .eq("receiverNick", myNickname)
          .eq("status", "PENDING")
      ]);

      if (friendsRes.data) setFriends(friendsRes.data);
      if (requestsRes.data) setRequests(requestsRes.data);
    } catch (err) {
      console.error("Błąd pobierania znajomych:", err);
    } finally {
      setLoading(false);
    }
  }, [myNickname]);

  // --- AKCJE ---
  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = searchNick.trim();

    if (!target || target === myNickname) {
      alert("Nie możesz zaprosić samego siebie.");
      return;
    }

    // Sprawdzenie czy gracz istnieje w rankingu/bazie
    const { data: userExists } = await supabase
      .from("GlobalRanking")
      .select("nickname")
      .eq("nickname", target)
      .single();

    if (!userExists) {
      alert("Gracz o takim nicku nie istnieje!");
      return;
    }

    const { error } = await supabase.from("FriendRequest").insert([
      { senderNick: myNickname, receiverNick: target, status: "PENDING" }
    ]);

    if (error) {
      alert("Zaproszenie już wysłane lub wystąpił błąd.");
    } else {
      alert("Wysłano zaproszenie!");
      setSearchNick("");
    }
  };

  const handleRequest = async (id: string, action: "ACCEPTED" | "REJECTED") => {
    if (action === "REJECTED") {
      await supabase.from("FriendRequest").delete().eq("id", id);
    } else {
      await supabase.from("FriendRequest").update({ status: "ACCEPTED" }).eq("id", id);
    }
    // Realtime zajmie się resztą, ale odświeżamy dla pewności
    fetchData();
  };

  // --- REALTIME I INIT ---
  useEffect(() => {
    fetchData();

    // Słuchamy zmian w tabeli zaproszeń (dodanie, usunięcie, update)
    const channel = supabase
      .channel("friend-system")
      .on("postgres_changes", { event: "*", schema: "public", table: "FriendRequest" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return (
    <div className="friends-container-pro">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="friends-glass-box"
      >
        {/* TABS */}
        <div className="tabs">
          <button 
            className={tab === "list" ? "active" : ""} 
            onClick={() => setTab("list")}
          >
            MY FRIENDS
          </button>
          <button 
            className={tab === "requests" ? "active" : ""} 
            onClick={() => setTab("requests")}
          >
            INVITES {requests.length > 0 && <span className="badge-count">{requests.length}</span>}
          </button>
        </div>

        <div className="tab-content">
          {tab === "list" ? (
            <>
              {/* Formularz zaproszenia */}
              <form onSubmit={sendInvite} className="invite-form">
                <input
                  type="text"
                  placeholder="Find player by nickname..."
                  value={searchNick}
                  onChange={(e) => setSearchNick(e.target.value)}
                />
                <button type="submit">INVITE</button>
              </form>

              {/* Lista znajomych */}
              <div className="friends-list">
                {loading && <p className="status-info">Loading...</p>}
                {!loading && friends.length === 0 && <p className="empty-info">No friends added yet.</p>}
                
                <AnimatePresence mode="popLayout">
                  {friends.map((f) => {
                    const friendNick = f.senderNick === myNickname ? f.receiverNick : f.senderNick;
                    return (
                      <motion.div 
                        key={f.id} 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="friend-row"
                      >
                        <div className="friend-meta">
                          <div className="avatar-small">{friendNick[0].toUpperCase()}</div>
                          <span>{friendNick}</span>
                        </div>
                        <div className="status-indicator online"></div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* Lista zaproszeń */
            <div className="requests-list">
              {requests.length === 0 && <p className="empty-info">No pending invites.</p>}
              <AnimatePresence mode="popLayout">
                {requests.map((r) => (
                  <motion.div 
                    key={r.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="request-row"
                  >
                    <span className="request-label"><b>{r.senderNick}</b> invited you</span>
                    <div className="actions">
                      <button className="btn-accept" onClick={() => handleRequest(r.id, "ACCEPTED")}>✔</button>
                      <button className="btn-decline" onClick={() => handleRequest(r.id, "REJECTED")}>✖</button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="friends-footer">
          <MenuButton label="BACK TO MENU" to="/" external={false} />
        </div>
      </motion.div>
    </div>
  );
}