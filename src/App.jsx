import { useState, useEffect, useRef } from "react";

// ── Cloudinary config ───────────────────────────────────────────
const CLOUD_NAME   = "dllurrhzp";
const UPLOAD_PRESET = "wedding_bingo"; // unsigned preset — create this in Cloudinary dashboard
// ── JSONBin config (metadata only — no photos stored here) ──────
const BIN_ID  = "69ceb06faaba882197bbd7d7";
const API_KEY = "$2a$10$nylqx.q2yf1ovWUTEscUqu/5OwsTYEG2NKgHWALIhJZqq/7qQBTci";
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const BIN_HEADERS = { "Content-Type": "application/json", "X-Master-Key": API_KEY };

async function readBin() {
  const r = await fetch(BIN_URL + "/latest", { headers: { "X-Master-Key": API_KEY } });
  const j = await r.json();
  const record = j.record || {};
  // support both "entries" and "uploads" key
  return { uploads: record.entries || record.uploads || [] };
}
async function writeBin(data) {
  await fetch(BIN_URL, {
    method: "PUT",
    headers: { ...BIN_HEADERS, "X-Bin-Versioning": "false" },
    body: JSON.stringify(data)
  });
}

// Upload file to Cloudinary, returns the secure URL
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "wedding_bingo");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!r.ok) throw new Error("Cloudinary upload failed");
  const j = await r.json();
  return j.secure_url;
}
// ───────────────────────────────────────────────────────────────

const BINGO_CATEGORIES = [
  { id: "baraat",        emoji: "🐴", label: "The Baraat",          desc: "The groom arriving with music and dancing" },
  { id: "mehndi",        emoji: "🌿", label: "Bride's Mehndi",      desc: "The bride showing her beautiful mehndi" },
  { id: "table_photo",   emoji: "🥂", label: "Table Group Photo",   desc: "A group photo with your table" },
  { id: "first_dance",   emoji: "💃", label: "First Dance",         desc: "Ishan & Natasha's first dance together" },
  { id: "joyful_laugh",  emoji: "😄", label: "Joyful Laugh",        desc: "The bride and groom sharing a joyful laugh" },
  { id: "loving_look",   emoji: "🥰", label: "The Loving Look",     desc: "The groom looking lovingly at the bride" },
  { id: "holding_hands", emoji: "🤝", label: "Holding Hands",       desc: "The newlyweds holding hands" },
  { id: "new_friend",    emoji: "🤳", label: "New Friend Selfie",   desc: "A selfie with a new friend you met tonight" },
  { id: "best_dancer",   emoji: "🕺", label: "Best Dancer",         desc: "The best dancer on the floor in action" },
  { id: "groom_parents", emoji: "🎉", label: "Groom's Parents",     desc: "Parents of the groom celebrating" },
  { id: "bride_parents", emoji: "💕", label: "Bride's Parents",     desc: "Parents of the bride sharing a moment" },
  { id: "best_man",      emoji: "🎩", label: "Best Man in Action",  desc: "Catch the best man doing his thing" },
  { id: "bridesmaid",    emoji: "💐", label: "Bridesmaid & Bride",  desc: "A bridesmaid sharing a moment with the bride" },
  { id: "cake",          emoji: "🎂", label: "The Wedding Cake",    desc: "The wedding cake before it is cut" },
  { id: "food_art",      emoji: "🍽️", label: "Artsy Food Shot",     desc: "An artsy photo of the food or dessert" },
  { id: "favorite",      emoji: "✨", label: "Favorite Memory",     desc: "A moment that becomes your favorite memory of the night" },
];

const BINGO_LINES = [
  [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
  [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
  [0,5,10,15],[3,6,9,12]
];

const G = "#D4AF37", S = "#FF7722";

function SparkleEffect({ active }) {
  if (!active) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 12 }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          position: "absolute", width: 6, height: 6, borderRadius: "50%", background: G,
          top: `${10 + Math.random() * 80}%`, left: `${10 + Math.random() * 80}%`,
          animation: `sparkle ${0.6 + i * 0.1}s ease-out forwards`, animationDelay: `${i * 0.05}s`,
        }} />
      ))}
    </div>
  );
}

export default function WeddingBingo() {
  const [guestName, setGuestName]      = useState(() => localStorage.getItem("wbingo_name") || "");
  const [nameSet, setNameSet]          = useState(() => !!localStorage.getItem("wbingo_name"));
  const [completedCells, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wbingo_cells") || "{}"); } catch { return {}; }
  });
  const [activeCell, setActiveCell]    = useState(null);
  const [uploadingCell, setUploading]  = useState(null);
  const [celebrating, setCelebrating]  = useState(null);
  const [score, setScore]              = useState(0);
  const [hasBingo, setHasBingo]        = useState(false);
  const [showBingo, setShowBingo]      = useState(false);
  const [toast, setToast]              = useState(null);
  const [syncing, setSyncing]          = useState(false);
  const cameraRef  = useRef();
  const uploadRef  = useRef();
  const pendingRef = useRef(null);

  useEffect(() => { setScore(Object.keys(completedCells).length); }, []);

  useEffect(() => {
    const grid = Array(16).fill(false);
    Object.keys(completedCells).forEach(id => {
      const i = BINGO_CATEGORIES.findIndex(c => c.id === id);
      if (i >= 0) grid[i] = true;
    });
    if (BINGO_LINES.some(line => line.every(i => grid[i])) && !hasBingo && score > 0) {
      setHasBingo(true); setShowBingo(true);
    }
  }, [completedCells, score]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleCellTap = (cell) => {
    setActiveCell(prev => prev === cell.id ? null : cell.id);
  };

  const markCell = async (cell, photoUrl) => {
    const existing = completedCells[cell.id];
    const wasNew   = !existing;
    const prev     = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
    const entry    = { guestName, timestamp: Date.now(), photo: photoUrl || null, photoUrl: photoUrl || null };
    const updated  = { ...completedCells, [cell.id]: [...prev, entry] };

    setCompleted(updated);
    localStorage.setItem("wbingo_cells", JSON.stringify(updated));
    if (wasNew) setScore(s => s + 1);
    setCelebrating(cell.id);
    setTimeout(() => setCelebrating(null), 1000);

    // Save only lightweight metadata + Cloudinary URL to JSONBin
    setSyncing(true);
    try {
      const bin     = await readBin();
      const uploads = bin.uploads || [];
      uploads.push({
        id: cell.id + "_" + Date.now(),
        category: cell.label,
        emoji: cell.emoji,
        guest: guestName,
        guestName: guestName,
        timestamp: Date.now(),
        photoUrl: photoUrl || null,
      });
      await writeBin({ entries: uploads });
    } catch {
      showToast("⚠️ Could not sync — check your connection");
    } finally {
      setSyncing(false);
    }
  };

  const triggerCamera = (cellId) => {
    pendingRef.current = BINGO_CATEGORIES.find(c => c.id === cellId);
    setActiveCell(null);
    cameraRef.current.click();
  };

  const triggerUpload = (cellId) => {
    pendingRef.current = BINGO_CATEGORIES.find(c => c.id === cellId);
    setActiveCell(null);
    uploadRef.current.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingRef.current) return;
    const cell = pendingRef.current;
    setUploading(cell.id);
    e.target.value = "";
    try {
      showToast("📤 Uploading photo...");
      const photoUrl = await uploadToCloudinary(file);
      await markCell(cell, photoUrl);
      showToast("✨ " + cell.label + " captured!");
    } catch (err) {
      // If Cloudinary upload fails (e.g. preset not set up yet), show helpful message
      showToast("⚠️ Upload failed — check Cloudinary preset");
      console.error(err);
    } finally {
      setUploading(null);
      pendingRef.current = null;
    }
  };

  const saveName = () => {
    if (!guestName.trim()) return;
    localStorage.setItem("wbingo_name", guestName);
    setNameSet(true);
  };

  if (!nameSet) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #8B0000 0%, #2a0a0a 50%, #1a0505 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 24 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cormorant+Garamond:ital,wght@0,400;1,300&display=swap');
          * { box-sizing: border-box; }
          @keyframes float    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
          @keyframes fadeIn   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes sparkle  { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0) translateY(-20px)} }
          @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.6} }
          @keyframes celebrate{ 0%{transform:scale(1)} 30%{transform:scale(1.15)} 60%{transform:scale(0.95)} 100%{transform:scale(1)} }
          @keyframes toastIn  { from{opacity:0;transform:translate(-50%,-20px)} to{opacity:1;transform:translate(-50%,0)} }
          @keyframes shimmer  { 0%{background-position:-200%} 100%{background-position:200%} }
          @keyframes slideDown{ from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
          .bingo-cell { transition: border 0.15s, box-shadow 0.15s, background 0.15s; -webkit-tap-highlight-color: transparent; }
          .bingo-cell:active { transform: scale(0.93); }
          .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.87);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s; }
        `}</style>
        <div style={{ animation: "float 3s ease-in-out infinite", fontSize: 64, marginBottom: 16 }}>🪷</div>
        <h1 style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 22, textAlign: "center", margin: "0 0 6px" }}>Ishan & Natasha</h1>
        <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,240,200,0.7)", fontSize: 16, textAlign: "center", marginBottom: 4, fontStyle: "italic" }}>Wedding Bingo ✨</p>
        <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,240,200,0.45)", fontSize: 13, textAlign: "center", marginBottom: 36, fontStyle: "italic" }}>Capture the magic, earn your squares</p>
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 360, animation: "fadeIn 0.6s ease-out" }}>
          <p style={{ color: G, fontFamily: "'Cormorant Garamond'", fontSize: 12, marginBottom: 10, letterSpacing: 2, textTransform: "uppercase" }}>Your name</p>
          <input
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && saveName()}
            placeholder="Enter your name..."
            autoFocus
            style={{ width: "100%", padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(212,175,55,0.4)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 18, fontFamily: "'Cormorant Garamond'", outline: "none", marginBottom: 16 }}
          />
          <button onClick={saveName} style={{ width: "100%", padding: 16, borderRadius: 12, background: "linear-gradient(135deg, #FF7722, #D4AF37)", border: "none", color: "#1a0505", fontSize: 15, fontFamily: "'Cinzel Decorative'", fontWeight: 700, cursor: "pointer" }}>
            Let's Play! 🎉
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #1a0505 0%, #2d0a0a 40%, #1f0808 100%)", fontFamily: "Georgia, serif", paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cormorant+Garamond:ital,wght@0,400;1,300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-6px)} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sparkle  { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0) translateY(-20px)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes celebrate{ 0%{transform:scale(1)} 30%{transform:scale(1.15)} 60%{transform:scale(0.95)} 100%{transform:scale(1)} }
        @keyframes toastIn  { from{opacity:0;transform:translate(-50%,-20px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes shimmer  { 0%{background-position:-200%} 100%{background-position:200%} }
        @keyframes slideDown{ from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .bingo-cell { transition: border 0.15s, box-shadow 0.15s, background 0.15s; -webkit-tap-highlight-color: transparent; }
        .bingo-cell:active { transform: scale(0.93); }
        .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.87);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "18px 16px 10px", background: "linear-gradient(to bottom, rgba(139,0,0,0.35), transparent)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 15 }}>Ishan & Natasha</h1>
            <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.7)", fontSize: 13, fontStyle: "italic" }}>
              Welcome, {guestName} 🙏 {syncing && <span style={{ fontSize: 11, opacity: 0.5 }}>syncing…</span>}
            </p>
          </div>
          <div style={{ textAlign: "center", background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "8px 16px" }}>
            <div style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 22 }}>{score}</div>
            <div style={{ color: "rgba(255,220,150,0.55)", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>/ 16</div>
          </div>
        </div>
        {hasBingo && (
          <div style={{ marginTop: 10, background: "linear-gradient(90deg, rgba(255,119,34,0.2), rgba(212,175,55,0.2), rgba(255,119,34,0.2))", backgroundSize: "200%", animation: "shimmer 2s linear infinite", border: "1px solid #D4AF37", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
            <span style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 11 }}>🎊 BINGO! You're a legend! 🎊</span>
          </div>
        )}
      </div>

      <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.35)", fontSize: 11, textAlign: "center", letterSpacing: 2.5, textTransform: "uppercase", margin: "4px 0 10px" }}>Tap a square to capture it</p>

      {/* 4×4 Grid */}
      <div style={{ padding: "0 10px" }}>
        {[0, 1, 2, 3].map(row => {
          const rowCells    = BINGO_CATEGORIES.slice(row * 4, row * 4 + 4);
          const activeInRow = rowCells.find(c => c.id === activeCell);
          return (
            <div key={row}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: activeInRow ? 0 : 6 }}>
                {rowCells.map(cell => {
                  const done          = !!completedCells[cell.id];
                  const isUploading   = uploadingCell === cell.id;
                  const isCelebrating = celebrating === cell.id;
                  const isActive      = activeCell === cell.id;
                  const entries       = done ? (Array.isArray(completedCells[cell.id]) ? completedCells[cell.id] : [completedCells[cell.id]]) : [];
                  const lastPhoto     = entries.slice().reverse().find(e => e.photo);
                  return (
                    <div
                      key={cell.id}
                      className="bingo-cell"
                      onClick={() => handleCellTap(cell)}
                      style={{
                        position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", cursor: "pointer",
                        background: isActive ? "linear-gradient(135deg, #3a0000, #2a0000)" : done ? "linear-gradient(135deg, #8B0000, #5a0000)" : "rgba(255,255,255,0.05)",
                        border: isActive ? "2px solid #FF7722" : done ? "2px solid #D4AF37" : "1px solid rgba(212,175,55,0.18)",
                        boxShadow: isActive ? "0 0 20px rgba(255,119,34,0.5)" : done ? "0 0 16px rgba(212,175,55,0.3)" : "none",
                        animation: isCelebrating ? "celebrate 0.6s ease" : "none",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {lastPhoto && <img src={lastPhoto.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }} />}
                      {isUploading ? (
                        <div style={{ animation: "pulse 0.8s infinite", fontSize: 24, textAlign: "center" }}>
                          <div>📤</div>
                          <div style={{ fontSize: 9, color: G, marginTop: 4, fontFamily: "Arial" }}>uploading…</div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 32, position: "relative", zIndex: 1 }}>{cell.emoji}</div>
                          {done && (
                            <div style={{ position: "absolute", top: 4, right: 5, background: G, borderRadius: 10, padding: "1px 5px", fontSize: 9, zIndex: 2, color: "#1a0505", fontFamily: "'Cinzel Decorative'", fontWeight: 700, lineHeight: 1.5 }}>
                              {entries.length}
                            </div>
                          )}
                          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: done ? "#fff" : "rgba(255,220,150,0.85)", textAlign: "center", padding: "3px 5px", lineHeight: 1.3, position: "relative", zIndex: 1, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                            {cell.label}
                          </div>
                        </>
                      )}
                      <SparkleEffect active={isCelebrating} />
                    </div>
                  );
                })}
              </div>

              {/* Inline action strip */}
              {activeInRow && (
                <div style={{ marginBottom: 6, background: "linear-gradient(135deg, rgba(30,5,5,0.97), rgba(20,3,3,0.97))", border: "1px solid rgba(255,119,34,0.4)", borderRadius: "0 0 14px 14px", padding: "12px 10px 10px", animation: "slideDown 0.2s ease-out" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 2 }}>
                    <span style={{ fontSize: 18 }}>{activeInRow.emoji}</span>
                    <span style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.75)", fontSize: 13, fontStyle: "italic" }}>{activeInRow.desc}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => triggerCamera(activeInRow.id)} style={{ flex: 1, padding: "12px 6px", borderRadius: 12, background: "linear-gradient(135deg, #FF7722, #D4AF37)", border: "none", color: "#1a0505", fontFamily: "'Cinzel Decorative'", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>📷</span> Camera
                    </button>
                    <button onClick={() => triggerUpload(activeInRow.id)} style={{ flex: 1, padding: "12px 6px", borderRadius: 12, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.45)", color: G, fontFamily: "'Cinzel Decorative'", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>🖼️</span> Upload
                    </button>
                    <button onClick={() => setActiveCell(null)} style={{ padding: "12px 14px", borderRadius: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,220,150,0.35)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ margin: "16px 10px 0", background: "rgba(255,255,255,0.07)", borderRadius: 20, height: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(score / 16) * 100}%`, background: "linear-gradient(90deg, #FF7722, #D4AF37)", borderRadius: 20, transition: "width 0.5s ease" }} />
      </div>
      <p style={{ textAlign: "center", fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.4)", fontSize: 12, marginTop: 6 }}>{score} of 16 captured</p>

      {/* Bingo modal */}
      {showBingo && (
        <div className="modal-overlay" onClick={() => setShowBingo(false)}>
          <div style={{ background: "linear-gradient(160deg, #2d0a0a, #1a0505)", border: "2px solid #D4AF37", borderRadius: 24, padding: 36, maxWidth: 360, width: "100%", textAlign: "center", animation: "fadeIn 0.3s" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎊</div>
            <h2 style={{ fontFamily: "'Cinzel Decorative'", color: G, fontSize: 18, marginBottom: 12 }}>BINGO!</h2>
            <p style={{ fontFamily: "'Cormorant Garamond'", color: "rgba(255,220,150,0.8)", fontSize: 16, marginBottom: 28, fontStyle: "italic", lineHeight: 1.6 }}>You have captured the magic of Ishan and Natasha's wedding. Shabash! 🥳</p>
            <button onClick={() => setShowBingo(false)} style={{ padding: "14px 32px", borderRadius: 14, background: "linear-gradient(135deg, #FF7722, #D4AF37)", border: "none", color: "#1a0505", fontSize: 14, fontFamily: "'Cinzel Decorative'", cursor: "pointer" }}>Keep Celebrating!</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translate(-50%,0)", background: "linear-gradient(135deg, #8B0000, #800000)", border: "1px solid #D4AF37", borderRadius: 100, padding: "12px 24px", color: G, fontFamily: "'Cinzel Decorative'", fontSize: 11, zIndex: 200, whiteSpace: "nowrap", animation: "toastIn 0.3s ease-out", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          {toast}
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <input ref={uploadRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}
