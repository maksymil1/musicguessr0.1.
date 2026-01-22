import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import "./Friends.css";

// --- INTERFACES ---
interface FriendRequest {
  id: string;
  senderNick: string;
  receiverNick: string;
  status: "PENDING" | "ACCEPTED";
  createdAt: string;
  avatarUrl?: string;
  friendStats?: {
    guessed_percentage: number;
    games_played: number;
    multi_points: number;
  };
}

export default function Friends() {
  const { user } = useAuth();
  
  const myNickname = user?.user_metadata?.nickname || user?.email?.split('@')[0] || "";

  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchNick, setSearchNick] = useState("");
  const [tab, setTab] = useState<"list" | "requests">("list");
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING LOGIC ---
  const fetchData = useCallback(async () => {
    if (!myNickname) return;
    setLoading(true);

    try {
      // 1. FETCH FRIENDS
      const { data: friendsData, error: friendsError } = await supabase
        .from("FriendRequest")
        .select("*")
        .or(`senderNick.eq."${myNickname}",receiverNick.eq."${myNickname}"`)
        .eq("status", "ACCEPTED");

      // 2. FETCH PENDING REQUESTS
      const { data: requestsData, error: requestsError } = await supabase
        .from("FriendRequest")
        .select("*")
        .eq("receiverNick", myNickname)
        .eq("status", "PENDING");

      if (friendsError) console.error("Error fetching friends:", friendsError);
      if (requestsError) console.error("Error fetching requests:", requestsError);

      // --- 3. FETCH STATISTICS AND AVATARS ---
      let enrichedFriends: FriendRequest[] = friendsData || [];

      if (friendsData && friendsData.length > 0) {
        const friendNicknames = friendsData.map(f => 
          f.senderNick === myNickname ? f.receiverNick : f.senderNick
        );

        // Retrieve 'avatar_url' and stats from Profiles
        const { data: profilesData } = await supabase
          .from("Profiles")
          .select("nickname, guessed_percentage, games_played, points, avatar_url")
          .in("nickname", friendNicknames);

        enrichedFriends = friendsData.map(f => {
          const friendNick = f.senderNick === myNickname ? f.receiverNick : f.senderNick;
          const profile = profilesData?.find(p => p.nickname === friendNick);
          
          return {
            ...f,
            avatarUrl: profile?.avatar_url,
            friendStats: profile ? {
              guessed_percentage: profile.guessed_percentage || 0,
              games_played: profile.games_played || 0,
              multi_points: profile.points || 0
            } : undefined
          };
        });
      }

      setFriends(enrichedFriends);
      if (requestsData) setRequests(requestsData);

    } catch (err) {
      console.error("Critical error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [myNickname]);

  // --- SENDING INVITATION ---
  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = searchNick.trim();

    if (!myNickname) { 
        alert("You must be logged in!"); 
        return; 
    }
    if (!target || target === myNickname) { 
        alert("Invalid nickname."); 
        return; 
    }

    const { data: userExists, error: searchError } = await supabase
      .from("Profiles")
      .select("nickname")
      .eq("nickname", target)
      .maybeSingle();

    if (searchError || !userExists) { 
        alert("This player does not exist."); 
        return; 
    }

    const { data: existing } = await supabase
      .from("FriendRequest")
      .select("*")
      .or(`senderNick.eq."${myNickname}",receiverNick.eq."${myNickname}"`)
      .in("status", ["PENDING", "ACCEPTED"]);

    const isAlreadyLinked = existing?.some((req) => 
      (req.senderNick === myNickname && req.receiverNick === target) ||
      (req.senderNick === target && req.receiverNick === myNickname)
    );

    if (isAlreadyLinked) { 
        alert("You are already friends or an invitation is pending."); 
        return; 
    }

    const { error: insertError } = await supabase.from("FriendRequest").insert([{ 
      senderNick: myNickname, receiverNick: target, status: "PENDING"
    }]);

    if (insertError) alert("Database error: " + insertError.message);
    else {
      alert(`Invitation sent to ${target}!`);
      setSearchNick("");
      fetchData();
    }
  };

  const handleRequest = async (id: string, action: "ACCEPTED" | "REJECTED") => {
    try {
      if (action === "REJECTED") {
          await supabase.from("FriendRequest").delete().eq("id", id);
      } else {
          await supabase.from("FriendRequest").update({ status: "ACCEPTED" }).eq("id", id);
      }
      fetchData();
    } catch (error) { 
        console.error(error); 
    }
  };

  useEffect(() => {
    if (user) fetchData();
    const channel = supabase.channel("friend-system")
      .on("postgres_changes", { event: "*", schema: "public", table: "FriendRequest" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  if (!user) return (
    <div className="friends-container-pro">
      <div className="friends-glass-box">
        <h2 className="neon-text">LOG IN</h2>
        <MenuButton label="BACK TO MENU" to="/" external={false} />
      </div>
    </div>
  );

  return (
    <div className="friends-container-pro">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="friends-glass-box"
      >
        <div className="tabs">
          <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>MY FRIENDS</button>
          <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
            INVITES {requests.length > 0 && <span className="badge-count">{requests.length}</span>}
          </button>
        </div>

        <div className="tab-content">
          {tab === "list" ? (
            <>
              <form onSubmit={sendInvite} className="invite-form">
                <input type="text" placeholder="Find player by nickname..." value={searchNick} onChange={(e) => setSearchNick(e.target.value)} />
                <button type="submit">INVITE</button>
              </form>

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
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div className="friend-meta" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          
                          {/* --- FRIEND AVATAR --- */}
                          <div className="avatar-small" style={{ 
                               width: '40px', height: '40px', borderRadius: '50%', 
                               overflow: 'hidden', border: '2px solid #555', 
                               display: 'flex', alignItems: 'center', justifyContent: 'center',
                               backgroundColor: '#333'
                          }}>
                            {f.avatarUrl ? (
                                <img src={f.avatarUrl} alt={friendNick} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{friendNick[0].toUpperCase()}</span>
                            )}
                          </div>

                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{friendNick}</div>
                            
                            {f.friendStats && (
                              <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>
                                <span title="Single Player Accuracy" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🎯 <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{f.friendStats.guessed_percentage}%</span>
                                </span>
                                <span title="Multiplayer Points" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🌐 <span style={{ color: '#facc15', fontWeight: 'bold' }}>{f.friendStats.multi_points}</span>
                                </span>
                              </div>
                            )}
                            {!f.friendStats && <span style={{fontSize: '0.7rem', color: '#555'}}>No data available</span>}
                          </div>
                        </div>
                        
                        <div className="status-indicator online" title="Online status (mock)"></div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="requests-list">
              {requests.length === 0 && <p className="empty-info">No pending invites.</p>}
              <AnimatePresence mode="popLayout">
                {requests.map((r) => (
                  <motion.div key={r.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5 }} className="request-row">
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