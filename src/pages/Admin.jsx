import React, { useState, useMemo } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase.js";

const ADMIN_EMAIL    = "admin@ece.com";
const ADMIN_PASSWORD = "eclectica2k26";

// ── Server Error Overlay ──────────────────────────────────────────────────────
function ServerErrorOverlay() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 999,
      background: "linear-gradient(135deg, #0a1628 0%, #1a2d4d 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      backdropFilter: "blur(2px)",
      width: "100%",
      height: "100vh",
    }}>
      <div style={{
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "80px",
          marginBottom: "30px",
          animation: "pulse 2s infinite",
        }}>⚠️</div>
        
        <h1 style={{
          fontSize: "48px",
          fontWeight: "bold",
          color: "#f87171",
          marginBottom: "16px",
          margin: "0 0 16px 0",
        }}>Server Error</h1>
        
        <p style={{
          fontSize: "20px",
          color: "#aaa",
          marginBottom: "12px",
          margin: "0 0 12px 0",
        }}>500 - Internal Server Error</p>
        
        <p style={{
          fontSize: "16px",
          color: "#888",
          margin: "0",
          lineHeight: "1.6",
        }}>
          The admin panel is currently unavailable.
        </p>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

// ── Screenshot Modal ───────────────────────────────────────────────────────────
function ScreenshotModal({ src, name, onClose }) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0f1e35",
          border: "1px solid rgba(212,175,55,0.35)",
          borderRadius: 14,
          padding: 20,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: "#f4d03f", fontWeight: 600, fontSize: "0.95rem" }}>Payment Screenshot</p>
            <p style={{ color: "#aaa", fontSize: "0.82rem", marginTop: 2 }}>{name}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "none",
              color: "#fff", borderRadius: 8, width: 34, height: 34,
              fontSize: "1.1rem", cursor: "pointer", lineHeight: 1,
            }}
          >✕</button>
        </div>

        <div style={{ overflowY: "auto", borderRadius: 8, background: "#000", textAlign: "center" }}>
          <img
            src={src}
            alt="Payment screenshot"
            style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 8 }}
          />
        </div>

        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block", textAlign: "center",
            padding: "10px", borderRadius: 8,
            background: "linear-gradient(135deg,#d4af37,#f4d03f)",
            color: "#0a1628", fontWeight: 700, fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          ⬇️ Open Full Image
        </a>
      </div>
    </div>
  );
}

// ── Main Admin Component ───────────────────────────────────────────────────────
export default function Admin() {
  const [loggedIn,      setLoggedIn]     = useState(false);
  const [loginEmail,    setLoginEmail]   = useState("");
  const [loginPass,     setLoginPass]    = useState("");
  const [loginErr,      setLoginErr]     = useState("");
  const [data,          setData]         = useState([]);
  const [loading,       setLoading]      = useState(false);
  const [search,        setSearch]       = useState("");
  const [filterEvent,   setFilterEvent]  = useState("All");
  const [filterStatus,  setFilterStatus] = useState("All");

  const [modalSrc,  setModalSrc]  = useState(null);
  const [modalName, setModalName] = useState("");

  const openModal  = (src, name) => { setModalSrc(src); setModalName(name); };
  const closeModal = ()           => { setModalSrc(null); setModalName(""); };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === ADMIN_EMAIL && loginPass === ADMIN_PASSWORD) {
      setLoggedIn(true);
      fetchData();
    } else {
      setLoginErr("Invalid credentials.");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, "registrations"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      alert("Failed to load: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (id) => {
    try {
      await updateDoc(doc(db, "registrations", id), {
        paymentStatus: "verified",
        adminSecret: "eclectica_admin_2k26",
      });
      setData(prev => prev.map(r => r.id === id ? { ...r, paymentStatus: "verified" } : r));
    } catch (err) {
      alert("Failed to verify: " + err.message);
    }
  };

  const stats = useMemo(() => ({
    total:    data.length,
    pending:  data.filter(r => r.paymentStatus === "pending").length,
    verified: data.filter(r => r.paymentStatus === "verified").length,
    free:     data.filter(r => r.paymentStatus === "free").length,
  }), [data]);

  const allEvents = useMemo(() => ["All", ...new Set(data.map(r => r.event))], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(r => {
      const matchEvent  = filterEvent  === "All" || r.event         === filterEvent;
      const matchStatus = filterStatus === "All" || r.paymentStatus === filterStatus;
      const matchSearch = !q ||
        (r.name       || "").toLowerCase().includes(q) ||
        (r.rollnumber || "").toLowerCase().includes(q) ||
        (r.college    || "").toLowerCase().includes(q) ||
        (r.email      || "").toLowerCase().includes(q);
      return matchEvent && matchStatus && matchSearch;
    });
  }, [data, search, filterEvent, filterStatus]);

  const fmt = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  // ── Helper: get screenshot src from either field (supports old + new records) ──
  // Old records used screenshotBase64, new records use screenshotURL (Cloudinary)
  const getScreenshot = (r) => r.screenshotURL || r.screenshotBase64 || null;

  // ── Login screen ──────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="admin-login">
        <div className="admin-card">
          <h2>🔐 Admin Login</h2>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Admin email" required
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <input type="password" placeholder="Password" required
              value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            <button type="submit" className="btn-login">Login</button>
            {loginErr && <p className="error-msg">{loginErr}</p>}
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ServerErrorOverlay />
      <ScreenshotModal src={modalSrc} name={modalName} onClose={closeModal} />

      <div className="dashboard">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
          <h2>📋 Registrations Dashboard</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-verify" onClick={fetchData} style={{ padding: "7px 16px" }}>↻ Refresh</button>
            <button className="btn-verify" onClick={() => setLoggedIn(false)}
              style={{ padding: "7px 16px", color: "#f87171", borderColor: "rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.1)" }}>
              Logout
            </button>
          </div>
        </div>
        <p className="dashboard-meta">ECLECTICA 2K26 — ECE Dept, MITS (Firebase)</p>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-box"><div className="num">{stats.total}</div><div className="lbl">Total</div></div>
          <div className="stat-box"><div className="num">{stats.pending}</div><div className="lbl">Pending</div></div>
          <div className="stat-box"><div className="num">{stats.verified}</div><div className="lbl">Verified</div></div>
          <div className="stat-box"><div className="num">{stats.free}</div><div className="lbl">Free</div></div>
        </div>

        {/* Filters */}
        <div className="filters">
          <input placeholder="Search name, roll no, college…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
          <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
            {allEvents.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="free">Free</option>
          </select>
          <span style={{ color: "#888", fontSize: "0.85rem" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <p className="no-data">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="no-data">No registrations found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Roll No</th><th>College</th>
                  <th>Dept</th><th>Year</th><th>Event</th>
                  <th>Contact</th><th>Email</th><th>UTR</th>
                  <th>Screenshot</th><th>Status</th><th>Date</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const shot = getScreenshot(r);
                  return (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td>{r.rollnumber}</td>
                      <td style={{ maxWidth: 150, wordBreak: "break-word" }}>{r.college}</td>
                      <td>{r.department}</td>
                      <td>{r.year}</td>
                      <td><strong>{r.event}</strong></td>
                      <td>{r.contactnumber}</td>
                      <td style={{ fontSize: "0.8rem" }}>{r.email}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{r.utrNumber || "—"}</td>

                      {/* Screenshot cell — works for both old base64 and new Cloudinary URL */}
                      <td>
                        {shot ? (
                          <div
                            onClick={() => openModal(shot, `${r.name} — ${r.event}`)}
                            style={{ cursor: "pointer", display: "inline-block" }}
                            title="Click to view screenshot"
                          >
                            <img
                              src={shot}
                              alt="payment"
                              style={{
                                width: 48, height: 48,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "2px solid rgba(212,175,55,0.4)",
                                display: "block",
                                transition: "border-color 0.2s",
                              }}
                              onMouseOver={e => e.target.style.borderColor = "#f4d03f"}
                              onMouseOut={e  => e.target.style.borderColor = "rgba(212,175,55,0.4)"}
                            />
                            <span style={{ fontSize: "0.72rem", color: "#888", display: "block", textAlign: "center", marginTop: 2 }}>
                              tap to view
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#555", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>

                      <td><span className={`badge ${r.paymentStatus}`}>{r.paymentStatus}</span></td>
                      <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{fmt(r.createdAt)}</td>
                      <td>
                        {r.paymentStatus === "pending"
                          ? <button className="btn-verify" onClick={() => verifyPayment(r.id)}>✓ Verify</button>
                          : <span style={{ color: "#555", fontSize: "0.8rem" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}