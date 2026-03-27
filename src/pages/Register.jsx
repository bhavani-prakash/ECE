import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase.js";
import qrImage from "../assets/qr.jpeg";

const EVENT_FEES = {
  "Tech Quiz": 70, "Bug Hunters": 70, "Circuit Detective": 70,
  "Paper Presentation": 70, "Poster Presentation": 70,
  "Project Expo": 100, "Debate": 40,
  "Free Fire": 200, "BGMI": 200,
  "cineQuest": 50, "Balloon Spirit": 50, "Rope Rumble": 50, "Ball Heist": 50,
};
const TECH_EVENTS    = ["Tech Quiz","Bug Hunters","Circuit Detective","Paper Presentation","Poster Presentation","Project Expo","Debate"];
const NONTECH_EVENTS = ["Free Fire","BGMI","cineQuest","Balloon Spirit","Rope Rumble","Ball Heist"];

// Compress image and convert to base64 — stored inside Firestore, no Storage plan needed
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
        else        { w = Math.round((w * MAX) / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = reject;
    img.src = url;
  });

export default function Register() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();

  const [name,           setName]      = useState("");
  const [email,          setEmail]     = useState("");
  const [college,        setCollege]   = useState("");
  const [rollnumber,     setRoll]      = useState("");
  const [contactnumber,  setContact]   = useState("");
  const [whatsappnumber, setWhatsapp]  = useState("");
  const [year,           setYear]      = useState("");
  const [department,     setDept]      = useState("");
  const [eventType,      setEventType] = useState("");
  const [event,          setEvent]     = useState("");
  const [fee,            setFee]       = useState(0);
  const [utrNumber,      setUtr]       = useState("");
  const [screenshot,     setShot]      = useState(null);
  const [preview,        setPreview]   = useState(null);
  const [loading,        setLoading]   = useState(false);
  const [status,         setStatus]    = useState("");

  const urlEvent     = params.get("event") ? decodeURIComponent(params.get("event")) : "";
  const urlType      = params.get("type")  || "";
  const isFromUrl    = Boolean(urlEvent && urlType);
  const isRedirected = params.get("redirected") === "true";
  const isFree       = fee === 0;

  useEffect(() => {
    if (urlEvent && urlType) {
      setEvent(urlEvent);
      setEventType(urlType);
      setFee(EVENT_FEES[urlEvent] ?? 0);
    }
  }, []);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
    if (file.size > 12 * 1024 * 1024)   { alert("Image must be under 12 MB."); return; }
    setShot(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!name.trim() || !email.trim() || !college.trim() || !rollnumber.trim() ||
        !contactnumber.trim() || !whatsappnumber.trim() || !year || !department.trim() ||
        !eventType || !event) {
      alert("Please fill in all fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!isFree && !screenshot) {
      alert("Please upload your payment screenshot.");
      return;
    }
    if (!isFree && !utrNumber.trim()) {
      alert("Please enter the UTR / reference number.");
      return;
    }

    setLoading(true);

    try {
      // 1. Check for duplicate
      setStatus("Checking registration…");
      const dupQ = query(
        collection(db, "registrations"),
        where("rollnumber", "==", rollnumber.trim().toUpperCase()),
        where("event",      "==", event)
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        alert("You are already registered for this event!");
        setLoading(false);
        setStatus("");
        return;
      }

      // 2. Compress screenshot → base64 (no Firebase Storage needed)
      let screenshotBase64 = null;
      if (!isFree && screenshot) {
        setStatus("Processing screenshot…");
        screenshotBase64 = await fileToBase64(screenshot);
      }

      // 3. Save everything to Firestore
      setStatus("Saving registration…");
      await addDoc(collection(db, "registrations"), {
        name:             name.trim(),
        email:            email.trim().toLowerCase(),
        college:          college.trim(),
        rollnumber:       rollnumber.trim().toUpperCase(),
        contactnumber:    contactnumber.trim(),
        whatsappnumber:   whatsappnumber.trim(),
        year,
        department:       department.trim(),
        eventType,
        event,
        paymentAmount:    fee,
        paymentStatus:    isFree ? "free" : "pending",
        utrNumber:        isFree ? null : utrNumber.trim(),
        screenshotBase64,
        createdAt:        serverTimestamp(),
      });

      navigate("/greeting");

    } catch (err) {
      console.error("Registration error:", err);
      alert("Registration failed: " + (err.message || "Please try again."));
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  return (
    <div>
      <section className="hero">
        <h1 className="fest-name"><span className="big-letter">E</span>CLECTIC<span className="big-letter">A</span></h1>
        <div className="year">2k26</div>
        <h2>Registration Form</h2>
        <p>Fill in your details and register for Eclectica 2k26!</p>
        <p className="contact-note">Issues? Call us: +91 8125035960</p>
      </section>

      <section className="form-section">
        <form className="reg-form" onSubmit={handleSubmit}>

          {isRedirected && (
            <div className="redirect-banner">
              ⚡ You've been redirected from the old site. Please complete your registration here.
            </div>
          )}

          {event && (
            <div className="event-banner">
              <h3>📋 {event}</h3>
              <p>{isFree ? "Free Event — No payment required" : `Registration Fee: ₹${fee}`}</p>
            </div>
          )}

          <label>Full Name *</label>
          <input type="text" placeholder="Your full name" required value={name} onChange={e => setName(e.target.value)} />

          <label>College Email *</label>
          <input type="email" placeholder="your@email.com" required value={email} onChange={e => setEmail(e.target.value)} />

          <label>College Name *</label>
          <input type="text" placeholder="Your college name" required value={college} onChange={e => setCollege(e.target.value)} />

          <label>Roll Number *</label>
          <input type="text" placeholder="e.g. 23691A0424" required value={rollnumber} onChange={e => setRoll(e.target.value)} />

          <label>Contact Number *</label>
          <input type="tel" placeholder="10-digit mobile number" required maxLength={10}
            value={contactnumber} onChange={e => setContact(e.target.value.replace(/\D/g, ""))} />

          <label>WhatsApp Number *</label>
          <input type="tel" placeholder="WhatsApp number" required maxLength={10}
            value={whatsappnumber} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ""))} />

          <label>Year *</label>
          <select required value={year} onChange={e => setYear(e.target.value)}>
            <option value="">Select Year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          <label>Department *</label>
          <input type="text" placeholder="e.g. ECE, CSE, EEE" required value={department} onChange={e => setDept(e.target.value)} />

          <label>Event Type *</label>
          <select required value={eventType} disabled={isFromUrl}
            style={isFromUrl ? { opacity: 0.7, cursor: "not-allowed" } : {}}
            onChange={e => { setEventType(e.target.value); setEvent(""); setFee(0); }}>
            <option value="">Select Event Type</option>
            <option value="technical">Technical</option>
            <option value="non-technical">Non-Technical</option>
          </select>

          {eventType && (
            <>
              <label>Event *</label>
              <select required value={event} disabled={isFromUrl}
                style={isFromUrl ? { opacity: 0.7, cursor: "not-allowed" } : {}}
                onChange={e => {
                  const ev = e.target.value;
                  setEvent(ev); setFee(EVENT_FEES[ev] ?? 0);
                  setShot(null); setPreview(null); setUtr("");
                }}>
                <option value="">Select Event</option>
                {(eventType === "technical" ? TECH_EVENTS : NONTECH_EVENTS).map(ev => (
                  <option key={ev} value={ev}>{ev} — {EVENT_FEES[ev] === 0 ? "Free" : `₹${EVENT_FEES[ev]}`}</option>
                ))}
              </select>
            </>
          )}

          {event && !isFree && (
            <div className="payment-box">
              <h4>💳 Payment — ₹{fee}</h4>
              <p>Scan the QR code, pay ₹{fee}, then upload the screenshot and enter the UTR number.</p>
              <div className="qr-wrap">
                <img src={qrImage} alt="Payment QR" />
              </div>
              <p className="upi-name"></p>

              <div className="file-input-wrapper" style={{ textAlign: "left", marginTop: 16 }}>
                <label>Upload Payment Screenshot *</label>
                <input type="file" accept="image/*" required={!isFree} onChange={handleFile} />
                <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>JPG, PNG, WEBP — max 12 MB</p>
                {preview && <img src={preview} alt="preview" className="screenshot-preview" />}
              </div>

              <label style={{ display: "block", textAlign: "left", marginTop: 12 }}>UTR / Reference Number *</label>
              <input type="text" placeholder="Enter transaction reference number"
                required value={utrNumber} onChange={e => setUtr(e.target.value)}
                style={{ width: "100%", padding: "11px 13px", marginTop: 6, marginBottom: 0,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(212,175,55,0.25)",
                  borderRadius: 8, color: "#fff", fontSize: "0.95rem", outline: "none",
                  fontFamily: "'DM Sans',sans-serif" }} />
              <p style={{ fontSize: 12, color: "#888", marginTop: 4, textAlign: "left" }}>
                Found in your UPI app under transaction details.
              </p>
            </div>
          )}

          {event && isFree && (
            <div className="free-badge">✅ Debate is a free event — no payment needed!</div>
          )}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (status || "Submitting…") : "Submit Registration"}
          </button>

          {loading && <p className="loading-note">Please wait, do not close or refresh this page…</p>}

        </form>
      </section>

      <footer>
        © 2026 ECLECTICA — ECE Dept, MITS Deemed University &nbsp;·&nbsp;
        <a href="/permission-letter" style={{ color: "#d4af37", textDecoration: "underline" }}>
          Download Permission Letter
        </a>
      </footer>
    </div>
  );
}