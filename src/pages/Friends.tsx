import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import MenuButton from "../components/MenuButton/MenuButton.tsx";
import "./Friends.css";

export default function Friends() {
  const myNickname = localStorage.getItem("myNickname") || "Anon";
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchNick, setSearchNick] = useState("");
  const [tab, setTab] = useState<"list" | "requests">("list");

  // Pobierz zaakceptowanych znajomych i oczekujące zaproszenia
  const fetchData = async () => {
    // Znajomi (ACCEPTED)
    const { data: fData } = await supabase
      .from("FriendRequest")
      .select("*")
      .or(`senderNick.eq.${myNickname},receiverNick.eq.${myNickname}`)
      .eq("status", "ACCEPTED");
    
    // Zaproszenia do mnie (PENDING)
    const { data: rData } = await supabase
      .from("FriendRequest")
      .select("*")
      .eq("receiverNick", myNickname)
      .eq("status", "PENDING");

    if (fData) setFriends(fData);
    if (rData) setRequests(rData);
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = searchNick.trim();
    if (!target || target === myNickname) return;

    // 1. Sprawdź czy user istnieje w GlobalRanking (nasz rejestr osób)
    const { data: userExists } = await supabase
      .from("GlobalRanking")
      .select("nickname")
      .eq("nickname", target)
      .single();

    if (!userExists) {
      alert("Gracz o takim nicku nie istnieje!");
      return;
    }

    // 2. Wyślij zaproszenie
    const { error } = await supabase.from("FriendRequest").insert([
      { senderNick: myNickname, receiverNick: target, status: "PENDING" }
    ]);

    if (error) alert("Zaproszenie już zostało wysłane lub wystąpił błąd.");
    else {
      alert("Wysłano zaproszenie!");
      setSearchNick("");
    }
  };

  const handleRequest = async (id: string, status: "ACCEPTED" | "REJECTED") => {
    if (status === "REJECTED") {
      await supabase.from("FriendRequest").delete().eq("id", id);
    } else {
      await supabase.from("FriendRequest").update({ status }).eq("id", id);
    }
    fetchData();
  };

  useEffect(() => { fetchData(); }, [myNickname]);

  return (
    <div className="friends-container-pro">
      <div className="friends-glass-box">
        <div className="tabs">
          <button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>FRIENDS</button>
          <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>
            INVITES {requests.length > 0 && <span className="badge">{requests.length}</span>}
          </button>
        </div>

        {tab === "list" ? (
          <div className="tab-content">
            <form onSubmit={sendInvite} className="invite-form">
              <input 
                type="text" 
                placeholder="Find player by nickname..." 
                value={searchNick}
                onChange={(e) => setSearchNick(e.target.value)}
              />
              <button type="submit">INVITE</button>
            </form>

            <div className="friends-list">
              {friends.map((f, i) => {
                const friendNick = f.senderNick === myNickname ? f.receiverNick : f.senderNick;
                return (
                  <div key={i} className="friend-row">
                    <div className="avatar-small">{friendNick[0]}</div>
                    <span>{friendNick}</span>
                    <div className="online-dot"></div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="tab-content">
            <div className="requests-list">
              {requests.length === 0 && <p className="empty-msg">No pending invites.</p>}
              {requests.map((r) => (
                <div key={r.id} className="request-row">
                  <span>{r.senderNick} wants to be friends!</span>
                  <div className="actions">
                    <button className="btn-accept" onClick={() => handleRequest(r.id, "ACCEPTED")}>✔</button>
                    <button className="btn-decline" onClick={() => handleRequest(r.id, "REJECTED")}>✖</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="friends-footer">
          <MenuButton label="BACK" to="/" external={false} />
        </div>
      </div>
    </div>
  );
}