import React, { useState } from "react";
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
const generatePDF = async (data) => {
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
    `Department of ${data.department || "_______________"}`,
    data.college,
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
    `This is to inform you that ${data.name} (${data.rollnumber}), a student of your esteemed institution, has registered for the event ${data.event} to be conducted as part of ECLECTICA 2K26, our departmental technical symposium.`,
    "In this regard, we kindly request you to grant permission to participate in the above-mentioned event. We assure you that the program will be conducted in a well-organized and disciplined manner. Participation in this event will provide valuable technical exposure and contribute to the academic and professional development.",
    "We shall be grateful for your kind consideration and approval.",
  ];

  doc.setFontSize(10);
  paragraphs.forEach(para => {
    const lines = doc.splitTextToSize(para, TW);
    lines.forEach((line, idx) => {
      if (idx < lines.length - 1 && lines.length > 1) {
        doc.text(line, ML, y, { maxWidth: TW, align: "justify" });
      } else {
        doc.text(line, ML, y);
      }
      y += 5;
    });
    y += 3;
  });

  y += 2;
  doc.text("Thanking you.", ML, y); y += 7;
  doc.text("Yours sincerely,", ML, y); y += 16;

  // ── Signature blocks ─────────────────────────────────────────────────────────
  const sigY = y;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  ["The Coordinators", "ECLECTICA 2K26", "Department of ECE", "MITS Deemed to be University", "Madanapalle"]
    .forEach((l, i) => doc.text(l, ML, sigY + i * 5));

  const hodLines = [
    "Head of the Department",
    `Department of ${data.department || "ECE"}`,
  ];
  hodLines.forEach((l, i) => {
    doc.text(l, PW - MR, sigY + 20 + i * 5, { align: "right" });
  });

  // ── QR code (bottom-left) ────────────────────────────────────────────────────
  const qrText = JSON.stringify({
    name:       data.name,
    roll:       data.rollnumber,
    event:      data.event,
    college:    data.college,
    department: data.department,
  });
  const qrDataUrl = await generateQR(qrText);
  if (qrDataUrl) {
    const qrSize = 28;
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

  doc.save(`PermissionLetter_${data.rollnumber}_${data.event.replace(/\s+/g, "_")}.pdf`);
};

const EVENTS = [
  "Tech Quiz", "Bug Hunters", "Circuit Detective", "Paper Presentation", "Poster Presentation",
  "Project Expo", "Debate", "cineQuest", "Balloon Spirit", "Rope Rumble", "Ball Heist"
];

const DEPARTMENTS = ["ECE", "CSE", "EEE", "MECH", "CIVIL", "CIVIL", "Other"];

export default function GeneratePermissionLetter() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [name, setName] = useState("");
  const [rollnumber, setRollnumber] = useState("");
  const [event, setEvent] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");

  const ADMIN_EMAIL = "admin@ece.com";
  const ADMIN_PASSWORD = "eclectica2k26";

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === ADMIN_EMAIL && loginPass === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setLoginErr("");
    } else {
      setLoginErr("Invalid credentials");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !rollnumber.trim() || !event || !college.trim() || !department) {
      alert("Please fill in all fields.");
      return;
    }

    setGenerating(true);
    setGenStatus("Generating permission letter...");
    try {
      await generatePDF({
        name: name.trim(),
        rollnumber: rollnumber.trim().toUpperCase(),
        event,
        college: college.trim(),
        department,
      });
      alert("Permission letter downloaded successfully!");
      setName("");
      setRollnumber("");
      setEvent("");
      setCollege("");
      setDepartment("");
      setGenStatus("");
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to generate letter: " + err.message);
      setGenStatus("");
    } finally {
      setGenerating(false);
    }
  };

  if (!loggedIn) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a1628 0%, #1a2d4d 100%)",
        padding: "20px",
      }}>
        <div style={{
          background: "rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          borderRadius: "12px",
          padding: "40px",
          maxWidth: "400px",
          width: "100%",
        }}>
          <h2 style={{
            textAlign: "center",
            color: "#d4af37",
            marginBottom: "24px",
            fontSize: "24px",
          }}>🔐 Admin Login</h2>
          
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Admin email"
              required
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "12px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            
            <input
              type="password"
              placeholder="Password"
              required
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "16px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #d4af37, #f4d03f)",
                color: "#0a1628",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "14px",
                transition: "transform 0.2s",
              }}
              onMouseOver={e => e.target.style.transform = "scale(1.02)"}
              onMouseOut={e => e.target.style.transform = "scale(1)"}
            >
              Login
            </button>
            
            {loginErr && <p style={{ color: "#f87171", textAlign: "center", marginTop: "12px", fontSize: "14px" }}>{loginErr}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628 0%, #1a2d4d 100%)",
      padding: "40px 20px",
    }}>
      <button
        onClick={() => window.history.back()}
        style={{
          marginBottom: "20px",
          padding: "8px 16px",
          background: "rgba(212, 175, 55, 0.2)",
          border: "1px solid rgba(212, 175, 55, 0.4)",
          color: "#d4af37",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        ← Back
      </button>

      <div style={{
        maxWidth: "600px",
        margin: "0 auto",
        background: "rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(212, 175, 55, 0.2)",
        borderRadius: "12px",
        padding: "40px",
      }}>
        <h1 style={{
          textAlign: "center",
          color: "#d4af37",
          marginBottom: "30px",
          fontSize: "28px",
        }}>📄 Generate Permission Letter</h1>

        <form onSubmit={handleGenerate}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              color: "#aaa",
              fontSize: "14px",
              marginBottom: "6px",
              fontWeight: "500",
            }}>Student Name *</label>
            <input
              type="text"
              placeholder="Full name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              color: "#aaa",
              fontSize: "14px",
              marginBottom: "6px",
              fontWeight: "500",
            }}>Roll Number *</label>
            <input
              type="text"
              placeholder="e.g. 23691A0424"
              required
              value={rollnumber}
              onChange={e => setRollnumber(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              color: "#aaa",
              fontSize: "14px",
              marginBottom: "6px",
              fontWeight: "500",
            }}>Event *</label>
            <select
              required
              value={event}
              onChange={e => setEvent(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => {
                e.target.style.background = "rgba(255,255,255,0.12)";
                e.target.style.borderColor = "rgba(212,175,55,0.5)";
                e.target.style.boxShadow = "0 0 8px rgba(212,175,55,0.2)";
              }}
              onMouseLeave={e => {
                e.target.style.background = "rgba(255,255,255,0.08)";
                e.target.style.borderColor = "rgba(212,175,55,0.3)";
                e.target.style.boxShadow = "none";
              }}
            >
              <option value="" style={{ background: "#1a1a1a", color: "#aaa" }}>Select Event</option>
              {EVENTS.map(ev => <option key={ev} value={ev} style={{ background: "#1a1a1a", color: "#fff" }}>{ev}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "block",
              color: "#aaa",
              fontSize: "14px",
              marginBottom: "6px",
              fontWeight: "500",
            }}>College Name *</label>
            <input
              type="text"
              placeholder="College name"
              required
              value={college}
              onChange={e => setCollege(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              color: "#aaa",
              fontSize: "14px",
              marginBottom: "6px",
              fontWeight: "500",
            }}>Department *</label>
            <select
              required
              value={department}
              onChange={e => setDepartment(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => {
                e.target.style.background = "rgba(255,255,255,0.12)";
                e.target.style.borderColor = "rgba(212,175,55,0.5)";
                e.target.style.boxShadow = "0 0 8px rgba(212,175,55,0.2)";
              }}
              onMouseLeave={e => {
                e.target.style.background = "rgba(255,255,255,0.08)";
                e.target.style.borderColor = "rgba(212,175,55,0.3)";
                e.target.style.boxShadow = "none";
              }}
            >
              <option value="" style={{ background: "#1a1a1a", color: "#aaa" }}>Select Department</option>
              {DEPARTMENTS.map(dept => <option key={dept} value={dept} style={{ background: "#1a1a1a", color: "#fff" }}>{dept}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={generating}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #d4af37, #f4d03f)",
              color: "#0a1628",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: generating ? "not-allowed" : "pointer",
              fontSize: "16px",
              transition: "transform 0.2s",
              opacity: generating ? 0.7 : 1,
            }}
            onMouseOver={e => !generating && (e.target.style.transform = "scale(1.02)")}
            onMouseOut={e => !generating && (e.target.style.transform = "scale(1)")}
          >
            {generating ? (genStatus || "Generating...") : "📥 Download Permission Letter"}
          </button>

          <button
            type="button"
            onClick={() => setLoggedIn(false)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "12px",
              background: "rgba(248, 113, 113, 0.1)",
              color: "#f87171",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              borderRadius: "8px",
              fontWeight: "500",
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
            onMouseOver={e => {
              e.target.style.background = "rgba(248, 113, 113, 0.15)";
              e.target.style.borderColor = "rgba(248, 113, 113, 0.5)";
            }}
            onMouseOut={e => {
              e.target.style.background = "rgba(248, 113, 113, 0.1)";
              e.target.style.borderColor = "rgba(248, 113, 113, 0.3)";
            }}
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
