import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";
import logoSrc from "../assets/logo.png";

// ── Load jsPDF from CDN ────────────────────────────────────────────────────────
const loadJsPDF = () =>
  new Promise((resolve) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf.jsPDF);
    document.head.appendChild(s);
  });

// ── Generate QR code as PNG data URL ─────────────────────────────────────────
const generateQR = (text) =>
  new Promise((resolve) => {
    const loadLib = () =>
      new Promise((res) => {
        if (window.QRCode) { res(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        s.onload = res;
        document.head.appendChild(s);
      });

    loadLib().then(() => {
      const div = document.createElement("div");
      div.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:150px;height:150px;";
      document.body.appendChild(div);
      new window.QRCode(div, {
        text,
        width: 150,
        height: 150,
        correctLevel: window.QRCode.CorrectLevel.M,
      });
      setTimeout(() => {
        const canvas = div.querySelector("canvas");
        resolve(canvas ? canvas.toDataURL("image/png") : null);
        document.body.removeChild(div);
      }, 500);
    });
  });

// ── Convert logo img src to base64 via canvas ─────────────────────────────────
const imgToBase64 = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width  = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

// ── PDF generator ─────────────────────────────────────────────────────────────
const generatePDF = async (reg) => {
  const JsPDF = await loadJsPDF();

  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW   = 210;   // page width  mm
  const PH   = 297;   // page height mm
  const ML   = 20;    // margin left
  const MR   = 20;    // margin right
  const TW   = PW - ML - MR;  // text width = 170mm

  // ── Watermark logo ──────────────────────────────────────────────────────────
  const logoB64 = await imgToBase64(logoSrc);
  if (logoB64) {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.10 }));
    const lSize = 140; // mm
    doc.addImage(logoB64, "PNG", (PW - lSize) / 2, (PH - lSize) / 2 - 20, lSize, lSize);
    doc.restoreGraphicsState();
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(0, 0, 0);
  doc.text("ECLECTICA-2K26", PW / 2, 18, { align: "center" });

  doc.setFontSize(13);
  doc.text("Permission Letter", PW / 2, 26, { align: "center" });

  // Horizontal rule
  doc.setDrawColor(180, 150, 50);
  doc.setLineWidth(0.5);
  doc.line(ML, 30, PW - MR, 30);

  // Date — right aligned
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("April 1, 2026", PW - MR, 38, { align: "right" });

  // ── From block ──────────────────────────────────────────────────────────────
  let y = 46;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("From:", ML, y); y += 5;

  doc.setFont("helvetica", "normal");
  const fromLines = [
    "The Coordinators",
    "ECLECTICA 2K26",
    "Department of Electronics and Communication Engineering",
    "MITS Deemed to be University, Madanapalle",
  ];
  fromLines.forEach(l => { doc.text(l, ML, y); y += 5; });
  y += 3;

  // ── To block ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.text("To:", ML, y); y += 5;

  doc.setFont("helvetica", "normal");
  const toLines = [
    "The Head of the Department",
    `Department of ${reg.department || "_______________"}`,
    reg.college,
  ];
  toLines.forEach(l => { doc.text(l, ML, y); y += 5; });
  y += 3;

  // ── Subject ─────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const subjectLines = doc.splitTextToSize(
    "Subject: Request for Permission to Participate in ECLECTICA 2K26",
    TW
  );
  doc.text(subjectLines, ML, y); y += subjectLines.length * 5 + 4;

  // ── Salutation ──────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.text("Respected Sir/Madam,", ML, y); y += 7;

  // ── Body paragraphs ─────────────────────────────────────────────────────────
  const paragraphs = [
    "We extend our greetings from the Department of Electronics and Communication Engineering, MITS Deemed to be University.",
    `This is to inform you that ${reg.name} (${reg.rollnumber}), a student of your esteemed institution, has registered for the event ${reg.event} to be conducted as part of ECLECTICA 2K26, our departmental technical symposium.`,
    "In this regard, we kindly request you to grant permission to participate in the above-mentioned event. We assure you that the program will be conducted in a well-organized and disciplined manner. Participation in this event will provide valuable technical exposure and contribute to the academic and professional development.",
    "We shall be grateful for your kind consideration and approval.",
  ];

  doc.setFontSize(10);
  paragraphs.forEach(para => {
    const lines = doc.splitTextToSize(para, TW);
    // justify each line except the last
    lines.forEach((line, idx) => {
      if (idx < lines.length - 1 && lines.length > 1) {
        doc.text(line, ML, y, { maxWidth: TW, align: "justify" });
      } else {
        doc.text(line, ML, y);
      }
      y += 5;
    });
    y += 3; // paragraph gap
  });

  y += 2;
  doc.text("Thanking you.", ML, y); y += 7;
  doc.text("Yours sincerely,", ML, y); y += 16;

  // ── Signature blocks ─────────────────────────────────────────────────────────
  const sigY = y;

  // Left — coordinators
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  ["The Coordinators", "ECLECTICA 2K26", "Department of ECE", "MITS Deemed to be University", "Madanapalle"]
    .forEach((l, i) => doc.text(l, ML, sigY + i * 5));

  // Right — HOD
  const hodLines = [
    "Head of the Department",
    `Department of ${reg.department || "ECE"}`,
  ];
  hodLines.forEach((l, i) => {
    doc.text(l, PW - MR, sigY + 20 + i * 5, { align: "right" });
  });

  // ── QR code (bottom-left) ────────────────────────────────────────────────────
  const qrText = JSON.stringify({
    name:       reg.name,
    roll:       reg.rollnumber,
    event:      reg.event,
    college:    reg.college,
    department: reg.department,
  });
  const qrDataUrl = await generateQR(qrText);
  if (qrDataUrl) {
    const qrSize = 28; // mm
    const qrX    = ML;
    const qrY    = PH - 46;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan to verify registration", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });
  }

  // Bottom rule
  doc.setDrawColor(180, 150, 50);
  doc.setLineWidth(0.4);
  doc.line(ML, PH - 14, PW - MR, PH - 14);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("ECLECTICA 2K26 — Department of ECE, MITS Deemed to be University, Madanapalle", PW / 2, PH - 9, { align: "center" });

  // Save
  doc.save(`PermissionLetter_${reg.rollnumber}_${reg.event.replace(/\s+/g, "_")}.pdf`);
};

// ── React Component ───────────────────────────────────────────────────────────
export default function PermissionLetter() {
  const [rollnumber, setRollnumber] = useState("");
  const [events,     setEvents]     = useState([]);
  const [event,      setEvent]      = useState("");
  const [step,       setStep]       = useState(1);
  const [lookupErr,  setLookupErr]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus,  setGenStatus]  = useState("");

  // Step 1 — look up registrations by roll number
  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupErr("");
    setLoading(true);
    try {
      const roll = rollnumber.trim().toUpperCase();
      const snap = await getDocs(
        query(collection(db, "registrations"), where("rollnumber", "==", roll))
      );
      if (snap.empty) {
        setLookupErr("No registrations found for this roll number. Please check and try again.");
      } else {
        const regs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEvents(regs);
        setEvent(regs[0].event);
        setStep(2);
      }
    } catch (err) {
      setLookupErr("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — generate PDF
  const handleDownload = async (e) => {
    e.preventDefault();
    if (!event) return;
    const reg = events.find(r => r.event === event);
    if (!reg) { alert("Registration not found."); return; }

    setGenerating(true);
    setGenStatus("Loading libraries…");
    try {
      setGenStatus("Drawing watermark…");
      await generatePDF(reg);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF: " + err.message);
    } finally {
      setGenerating(false);
      setGenStatus("");
    }
  };

  const reset = () => {
    setStep(1); setRollnumber(""); setEvents([]); setEvent(""); setLookupErr("");
  };

  const statusColor = s => (s === "free" || s === "verified") ? "#4ade80" : "#fbbf24";

  return (
    <div>
      <section className="hero">
        <h1 className="fest-name">
          <span className="big-letter">E</span>CLECTIC<span className="big-letter">A</span>
        </h1>
        <div className="year">2k26</div>
        <h2>Permission Letter</h2>
        <p>Download your permission letter to show your Head of Department.</p>
        <p className="contact-note">Issues? Call us: +91 8125035960</p>
      </section>

      <section className="form-section">
        <div className="reg-form" style={{ maxWidth: 520 }}>

          {/* ── Step 1: Enter roll number ── */}
          {step === 1 && (
            <>
              <h3 style={{ color: "#f4d03f", marginBottom: 20, fontSize: "1.1rem" }}>
                📋 Enter Your Roll Number
              </h3>
              <form onSubmit={handleLookup}>
                <label>Roll Number *</label>
                <input
                  type="text" placeholder="e.g. 23691A0424" required autoFocus
                  value={rollnumber} onChange={e => setRollnumber(e.target.value)}
                />
                {lookupErr && (
                  <p style={{ color: "#f87171", fontSize: "0.87rem", marginTop: -12, marginBottom: 14 }}>
                    ⚠️ {lookupErr}
                  </p>
                )}
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? "Looking up…" : "Find My Registrations →"}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: Pick event + download ── */}
          {step === 2 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <button onClick={reset}
                  style={{ background: "none", border: "none", color: "#d4af37", cursor: "pointer", fontSize: "0.9rem" }}>
                  ← Back
                </button>
                <h3 style={{ color: "#f4d03f", fontSize: "1.1rem", margin: 0 }}>Select Event</h3>
              </div>

              <p style={{ color: "#aaa", fontSize: "0.88rem", marginBottom: 18 }}>
                Roll No: <strong style={{ color: "#fff" }}>{rollnumber.toUpperCase()}</strong>
                {" "}— {events.length} registration{events.length > 1 ? "s" : ""} found
              </p>

              {/* Event selection cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                {events.map(ev => (
                  <div key={ev.id} onClick={() => setEvent(ev.event)} style={{
                    padding: "14px 16px", cursor: "pointer", borderRadius: 10, transition: "all 0.2s",
                    border: `1px solid ${event === ev.event ? "#f4d03f" : "rgba(212,175,55,0.2)"}`,
                    background: event === ev.event ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.04)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontWeight: 600, color: event === ev.event ? "#f4d03f" : "#ddd" }}>
                      {ev.event}
                    </span>
                    <span style={{
                      fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px",
                      borderRadius: 20, background: "rgba(255,255,255,0.07)",
                      color: statusColor(ev.paymentStatus),
                    }}>
                      {ev.paymentStatus}
                    </span>
                  </div>
                ))}
              </div>

              {/* Info box */}
              <div style={{
                background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 8, padding: "12px 14px", marginBottom: 22, fontSize: "0.85rem", color: "#bbb",
              }}>
                📄 The PDF includes your name, roll number, college, event details, the ECLECTICA logo as a watermark, and a QR code at the bottom for verification.
              </div>

              <form onSubmit={handleDownload}>
                <button type="submit" className="btn-submit" disabled={generating || !event}>
                  {generating ? `⏳ ${genStatus || "Generating…"}` : "⬇️ Download Permission Letter"}
                </button>
              </form>

              {generating && (
                <p className="loading-note">Please wait, generating your PDF…</p>
              )}
            </>
          )}
        </div>
      </section>

      <footer>© 2026 ECLECTICA — ECE Dept, MITS Deemed University</footer>
    </div>
  );
}