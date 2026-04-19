import { useState, useEffect, useRef } from "react";

// ── JSONBin config ──────────────────────────────────────────────
const BIN_ID  = "69ceb06faaba882197bbd7d7";
const API_KEY = "$2a$10$nylqx.q2yf1ovWUTEscUqu/5OwsTYEG2NKgHWALIhJZqq/7qQBTci";
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function readBin() {
  const r = await fetch(BIN_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
  const j = await r.json();
  const record = j.record || {};
  return { uploads: record.entries || record.uploads || [] };
}
// ───────────────────────────────────────────────────────────────

const BINGO_CATEGORIES = [
  { id: "baraat",        emoji: "🐴", label: "The Baraat" },
  { id: "mehndi",        emoji: "🌿", label: "Bride's Mehndi" },
  { id: "table_photo",   emoji: "🥂", label: "Table Group Photo" },
  { id: "first_dance",   emoji: "💃", label: "First Dance" },
  { id: "joyful_laugh",  emoji: "😄", label: "Joyful Laugh" },
  { id: "loving_look",   emoji: "🥰", label: "The Loving Look" },
  { id: "holding_hands", emoji: "🤝", label: "Holding Hands" },
  { id: "new_friend",    emoji: "🤳", label: "New Friend Selfie" },
  { id: "best_dancer",   emoji: "🕺", label: "Best Dancer" },
  { id: "groom_parents", emoji: "🎉", label: "Groom's Parents" },
  { id: "bride_parents", emoji: "💕", label: "Bride's Parents" },
  { id: "best_man",      emoji: "🎩", label: "Best Man in Action" },
  { id: "bridesmaid",    emoji: "💐", label: "Bridesmaid & Bride" },
  { id: "cake",          emoji: "🎂", label: "The Wedding Cake" },
  { id: "food_art",      emoji: "🍽️", label: "Artsy Food Shot" },
  { id: "favorite",      emoji: "✨", label: "Favorite Memory" },
];

const G = "#D4AF37", S = "#FF7722";

function PhotoCard({ upload, isNew }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1.5px solid ${isNew ? G : "rgba(212,175,55,0.18)"}`,
      borderRadius: 14, overflow: "hidden",
      animation: isNew ? "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      boxShadow: isNew ? `0 0 28px rgba(212,175,55,0.4)` : "0 4px 14px rgba(0,0,0,0.3)",
      transition: "border-color 1.5s ease",
    }}>
      {upload.photoUrl ? (
        <img src={upload.photoUrl} alt={upload.category} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, background: "rgba(139,0,0,0.25)" }}>
          {upload.emoji}
        </div>
      )}
      <div style={{ padding: "9px 11px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", color: G, fontSize: 12, fontWeight: 600 }}>{upload.emoji} {upload.category}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(255,220,150,0.45)", fontSize: 11, fontStyle: "italic", marginTop: 2 }}>by {upload.guestName || upload.guest}</div>
      </div>
    </div>
  );
}

export default function DisplayBoard() {
  const [uploads, setUploads]         = useState([]);
  const [newIds, setNewIds]           = useState(new Set());
  const [leaderboard, setLeaderboard] = useState([]);
  const [spotlight, setSpotlight]     = useState(null);
  const [fireworks, setFireworks]     = useState([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [connected, setConnected]     = useState(true);
  const prevLenRef   = useRef(0);
  const spotTimerRef = useRef();

  const triggerFireworks = () => {
    const fw = Array.from({ length: 6 }, (_, i) => ({ id: Date.now() + i, x: `${15 + Math.random() * 70}%`, y: `${10 + Math.random() * 60}%` }));
    setFireworks(fw);
    setTimeout(() => setFireworks([]), 1500);
  };

  const fetchData = async () => {
    try {
      const bin = await readBin();
      const all = bin.uploads || [];
      setConnected(true);

      if (all.length > prevLenRef.current) {
        const newItems = all.slice(prevLenRef.current);
        const ids = new Set(newItems.map(u => u.id));
        setNewIds(ids);
        setTimeout(() => setNewIds(new Set()), 4000);

        const newestPhoto = [...newItems].reverse().find(u => u.photoUrl);
        if (newestPhoto) {
          if (spotTimerRef.current) clearTimeout(spotTimerRef.current);
          setSpotlight(newestPhoto);
          spotTimerRef.current = setTimeout(() => setSpotlight(null), 6000);
          triggerFireworks();
        }
      }

      prevLenRef.current = all.length;
      setUploads(all);
      setTotalPhotos(all.filter(u => u.photoUrl).length);

      const counts = {};
      all.forEach(u => { const name = u.guestName || u.guest || "Guest"; counts[name] = (counts[name] || 0) + 1; });
      setLeaderboard(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8));
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, []);

  const completedIds = new Set(
    BINGO_CATEGORIES.filter(c => uploads.some(u => (u.id || "").startsWith(c.id))).map(c => c.id)
  );

  const recentUploads = [...uploads].reverse().slice(0, 16);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top, #2d0a0a 0%, #0f0303 65%)", fontFamily: "Georgia, serif", color: "#fff", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap');
        * { box-sizing: border-box; }
        @keyframes popIn      { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.97)} }
        @keyframes shimmer    { 0%{background-position:-200%} 100%{background-position:200%} }
        @keyframes spotlightIn{ from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes glow       { 0%,100%{box-shadow:0 0 20px rgba(212,175,55,0.4)} 50%{box-shadow:0 0 60px rgba(212,175,55,0.8)} }
        @keyframes fw0 { to{transform:translate(40px,-60px) scale(0);opacity:0} }
        @keyframes fw1 { to{transform:translate(-40px,-60px) scale(0);opacity:0} }
        @keyframes fw2 { to{transform:translate(60px,0) scale(0);opacity:0} }
        @keyframes fw3 { to{transform:translate(-60px,0) scale(0);opacity:0} }
        @keyframes ticker { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      `}</style>

      {/* Fireworks */}
      {fireworks.map(fw => (
        <div key={fw.id} style={{ position: "fixed", left: fw.x, top: fw.y, pointerEvents: "none", zIndex: 40 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ position: "absolute", width: 5, height: 5, borderRadius: "50%", background: [G, S, "#fff", "#FF6B6B"][i % 4], animation: `fw${i % 4} 0.9s ease-out forwards`, animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      ))}

      {/* Spotlight */}
      {spotlight && (
        <div onClick={() => setSpotlight(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "spotlightIn 0.4s ease" }}>
          <div style={{ maxWidth: 460, width: "90%", textAlign: "center" }}>
            <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 12, letterSpacing: 4, marginBottom: 18, animation: "pulse 1.5s infinite" }}>✨ JUST CAPTURED ✨</div>
            {spotlight.photoUrl && <img src={spotlight.photoUrl} alt="" style={{ width: "100%", borderRadius: 20, border: `3px solid ${G}`, animation: "glow 2s infinite" }} />}
            <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 17, marginTop: 20 }}>{spotlight.emoji} {spotlight.category}</div>
            <div style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.75)", fontSize: 15, fontStyle: "italic", marginTop: 6 }}>captured by {spotlight.guestName || spotlight.guest}</div>
            <div style={{ color: "rgba(255,220,150,0.3)", fontSize: 12, marginTop: 16, fontFamily: "'Cormorant Garamond'" }}>tap anywhere to dismiss</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: "center", padding: "28px 20px 16px" }}>
        <div style={{ fontSize: 40, animation: "float 3s ease-in-out infinite" }}>🪷</div>
        <h1 style={{ fontFamily: "'Cinzel Decorative'", background: `linear-gradient(90deg, ${S}, ${G}, ${S})`, backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "clamp(24px, 4vw, 48px)", margin: "8px 0 4px", animation: "shimmer 3s linear infinite" }}>
          Ishan & Natasha
        </h1>
        <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.6)", fontStyle: "italic", fontSize: 16 }}>Live Wedding Bingo 📸</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 18 }}>
          {[["Photos", totalPhotos], ["Squares", completedIds.size], ["Players", leaderboard.length]].map(([label, val]) => (
            <div key={label} style={{ background: "rgba(212,175,55,0.09)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 14, padding: "10px 18px", minWidth: 75 }}>
              <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 24 }}>{val}</div>
              <div style={{ color: "rgba(255,220,150,0.55)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: 18, padding: "0 18px", maxWidth: 1100, margin: "0 auto" }}>

        <div>
          {/* Bingo grid */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 11, letterSpacing: 3, marginBottom: 10, opacity: 0.7 }}>BINGO PROGRESS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {BINGO_CATEGORIES.map(cell => {
                const done   = completedIds.has(cell.id);
                const upload = uploads.find(u => (u.id || "").startsWith(cell.id));
                const isNew  = upload && newIds.has(upload.id);
                return (
                  <div key={cell.id} style={{
                    aspectRatio: "1", borderRadius: 10, overflow: "hidden",
                    background: done ? "linear-gradient(135deg, #8B0000, #5a0000)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${done ? G : "rgba(212,175,55,0.12)"}`,
                    boxShadow: isNew ? `0 0 22px ${G}` : done ? `0 0 8px rgba(212,175,55,0.25)` : "none",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative",
                    animation: isNew ? "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" : "none",
                    transition: "all 0.4s ease",
                  }}>
                    {done && upload?.photoUrl && <img src={upload.photoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }} />}
                    <span style={{ fontSize: 16, position: "relative", zIndex: 1 }}>{cell.emoji}</span>
                    {done && <span style={{ position: "absolute", top: 3, right: 5, fontSize: 10, color: G, zIndex: 2 }}>✓</span>}
                    <span style={{ fontFamily: "'Cormorant Garamond'", fontSize: 8, color: done ? "rgba(255,225,170,0.9)" : "rgba(255,220,150,0.28)", textAlign: "center", padding: "0 3px", position: "relative", zIndex: 1, lineHeight: 1.2, marginTop: 3 }}>
                      {cell.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photo wall */}
          <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 11, letterSpacing: 3, marginBottom: 10, opacity: 0.7 }}>LIVE PHOTO WALL</div>
          {recentUploads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px dashed rgba(212,175,55,0.25)" }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📸</div>
              <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.4)", fontStyle: "italic" }}>Waiting for guests to capture memories...</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 9 }}>
              {recentUploads.map((upload, i) => (
                <PhotoCard key={upload.id || i} upload={upload} isNew={newIds.has(upload.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 11, letterSpacing: 3, marginBottom: 10, opacity: 0.7 }}>LEADERBOARD</div>
          <div style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 16, overflow: "hidden" }}>
            {leaderboard.length === 0 ? (
              <div style={{ padding: 22, textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>🏆</div>
                <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.4)", fontSize: 13, fontStyle: "italic" }}>Waiting for players...</p>
              </div>
            ) : leaderboard.map(([name, count], i) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < leaderboard.length - 1 ? "1px solid rgba(212,175,55,0.15)" : "none", background: i === 0 ? "linear-gradient(90deg, rgba(212,175,55,0.1), transparent)" : "transparent" }}>
                <span style={{ fontSize: 14, minWidth: 22 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond'", color: i === 0 ? G : "rgba(255,220,150,0.8)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.35)", fontSize: 11 }}>{count} photo{count !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 15 }}>{count}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "#4CAF50" : "#f44336", animation: "pulse 1.5s infinite", boxShadow: connected ? "0 0 7px #4CAF50" : "0 0 7px #f44336" }} />
            <span style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.45)", fontSize: 11 }}>
              {connected ? "Live — updates every 5s" : "Reconnecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Ticker */}
      {uploads.length > 0 && (
        <div style={{ marginTop: 28, background: "rgba(139,0,0,0.35)", borderTop: "1px solid rgba(212,175,55,0.25)", borderBottom: "1px solid rgba(212,175,55,0.25)", padding: "9px 0", overflow: "hidden" }}>
          <div style={{ animation: "ticker 25s linear infinite", whiteSpace: "nowrap", display: "inline-block" }}>
            {[...uploads].reverse().map((u, i) => (
              <span key={i} style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.75)", fontSize: 13, marginRight: 48 }}>
                {u.emoji} <strong style={{ color: G }}>{u.guestName || u.guest}</strong> captured <em>{u.category}</em>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
