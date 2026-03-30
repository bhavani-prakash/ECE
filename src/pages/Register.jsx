import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase.js";
import qrImage from "../assets/slice.jpeg";

const EVENT_FEES = {
  "Tech Quiz": 70, "Bug Hunters": 70, "Circuit Detective": 70,
  "Paper Presentation": 70, "Poster Presentation": 70,
  "Project Expo": 100, "Debate": 40,
  "Free Fire": 200, "BGMI": 200,
  "cineQuest": 50, "Balloon Spirit": 50, "Rope Rumble": 50, "Ball Heist": 50,
};

// WhatsApp group links for each event
const WHATSAPP_LINKS = {
  "Tech Quiz": "https://chat.whatsapp.com/BHl63ANHgXMERZjg7k6IRh",
  "Bug Hunters": "https://chat.whatsapp.com/DBmldCiDijdEoN0APpYUWT",
  "Circuit Detective": "https://chat.whatsapp.com/Klq9gmF9zjvJf7zEUQvefK",
  "Paper Presentation": "https://chat.whatsapp.com/E2eDAVuiuneLdjDpseagBL",
  "Poster Presentation": "https://chat.whatsapp.com/JJnMYXQtiO32fV85wAztS7",
  "Project Expo": "https://chat.whatsapp.com/EjyHg06jXBdAgGu3oApo33",
  "Debate": "https://chat.whatsapp.com/E8y4AeQ0SMlIkRqm6nrEhF",
  "Free Fire": "https://chat.whatsapp.com/Hpd8w8LeQCuIt98go6SpZg",
  "BGMI": "https://chat.whatsapp.com/JowExNYiOXXEq3p8JjjZqj",
  "cineQuest": "https://chat.whatsapp.com/CTwZSWVhYyOLYWsOi5EI5t",
  "Balloon Spirit": "https://chat.whatsapp.com/KpFCmbAXqIU73pHENJQS3o",
  "Rope Rumble": "https://chat.whatsapp.com/CQH4wK1MyO24Q5m2xJL3FU",
  "Ball Heist": "https://chat.whatsapp.com/EMPqMBL8iH8KQuPAHpcgfB",
};
const TECH_EVENTS    = ["Tech Quiz","Bug Hunters","Circuit Detective","Paper Presentation","Poster Presentation","Project Expo","Debate"];
const NONTECH_EVENTS = ["Free Fire","BGMI","cineQuest","Balloon Spirit","Rope Rumble","Ball Heist"];



const CLOUDINARY_CLOUD_NAME    = "dxyz1234";          // your cloud name
const CLOUDINARY_UPLOAD_PRESET = "eclectica_preset";  // your preset name

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
        else       { w = Math.round((w * MAX) / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Compression failed")), "image/jpeg", 0.7);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not load image")); };
    img.src = url;
  });

const uploadToCloudinary = async (file, onProgress) => {
  const blob     = await compressImage(file);
  const formData = new FormData();
  formData.append("file",          blob);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder",        "eclectica_screenshots");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else { console.error("Cloudinary error:", xhr.responseText); reject(new Error("Upload failed: " + xhr.status)); }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
};

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
  const [uploadProgress, setProgress]  = useState(0);
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
    setProgress(0);
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
    if (!isFree && !screenshot) { alert("Please upload your payment screenshot."); return; }
    if (!isFree && !utrNumber.trim()) { alert("Please enter the UTR / reference number."); return; }

    setLoading(true); setProgress(0);

    try {
      // 1. Duplicate check
      setStatus("Checking registration...");
      let dupSnap;
      try {
        const dupQ = query(
          collection(db, "registrations"),
          where("rollnumber", "==", rollnumber.trim().toUpperCase()),
          where("event",      "==", event)
        );
        dupSnap = await getDocs(dupQ);
      } catch (dupErr) {
        console.warn("Duplicate check failed (non-fatal):", dupErr.code, dupErr.message);
        dupSnap = { empty: true };
      }
      if (!dupSnap.empty) {
        alert("You are already registered for this event!");
        setLoading(false); setStatus(""); return;
      }

      // 2. Upload to Cloudinary
      let screenshotURL = null;
      if (!isFree && screenshot) {
        setStatus("Uploading screenshot...");
        try {
          screenshotURL = await uploadToCloudinary(screenshot, (pct) => {
            setProgress(pct);
            setStatus(`Uploading screenshot... ${pct}%`);
          });
          console.log("Uploaded:", screenshotURL);
        } catch (uploadErr) {
          console.error("Upload failed (non-fatal):", uploadErr.message);
          screenshotURL = null; // UTR is still saved, can verify manually
        }
      }

      // 3. Save to Firestore (tiny doc - just text + URL)
      setStatus("Saving registration...");
      const docData = {
        name: name.trim(), email: email.trim().toLowerCase(),
        college: college.trim(), rollnumber: rollnumber.trim().toUpperCase(),
        contactnumber: contactnumber.trim(), whatsappnumber: whatsappnumber.trim(),
        year, department: department.trim(), eventType, event,
        paymentAmount: fee, paymentStatus: isFree ? "free" : "pending",
        utrNumber: isFree ? null : utrNumber.trim(),
        screenshotURL,
        createdAt: serverTimestamp(), createdAtMs: Date.now(),
      };

      const RETRYABLE = new Set(["unavailable","deadline-exceeded","internal","aborted"]);
      const trySave = async (attempt) => {
        try {
          await addDoc(collection(db, "registrations"), docData);
        } catch (saveErr) {
          console.error(`Save attempt ${attempt}:`, saveErr.code, saveErr.message);
          if (attempt === 1 && RETRYABLE.has(saveErr.code)) {
            setStatus("Connection issue, retrying...");
            await new Promise(r => setTimeout(r, 2500));
            await trySave(2);
          } else throw saveErr;
        }
      };
      await trySave(1);
      navigate("/greeting");

    } catch (err) {
      console.error("Registration FINAL error:", { code: err.code, message: err.message, err });
      let msg = "Registration failed. Please try again.";
      if (err.code === "resource-exhausted") msg = "Server quota exceeded. Wait 1 minute and retry.";
      else if (err.code === "unavailable" || err.code === "deadline-exceeded") msg = "Network timeout. Check connection and retry.";
      else if (err.code === "permission-denied") msg = "Permission denied. Contact: +91 8125035960.";
      else if (err.code === "not-found") msg = "Database error. Contact: +91 8125035960.";
      alert(`${msg}\n\n(Error: ${err.code || err.message || "unknown"})`);
    } finally {
      setLoading(false); setStatus(""); setProgress(0);
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
              {WHATSAPP_LINKS[event] && (
                <a
                  href={WHATSAPP_LINKS[event]}
                  target="_blank"
                  rel="noreferrer"
                  className="whatsapp-link"
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    padding: "8px 16px",
                    backgroundColor: "#25D366",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={e => {
                    e.target.style.backgroundColor = "#20BA5A";
                    e.target.style.transform = "scale(1.05)";
                  }}
                  onMouseOut={e => {
                    e.target.style.backgroundColor = "#25D366";
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  💬 Join WhatsApp Group
                </a>
              )}
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
                  setShot(null); setPreview(null); setUtr(""); setProgress(0);
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
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", height: 6 }}>
                      <div style={{ width: `${uploadProgress}%`, background: "#d4af37", height: "100%", transition: "width 0.3s" }} />
                    </div>
                    <p style={{ fontSize: 12, color: "#d4af37", marginTop: 4 }}>Uploading... {uploadProgress}%</p>
                  </div>
                )}
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
            {loading ? (status || "Submitting...") : "Submit Registration"}
          </button>

          {loading && <p className="loading-note">Please wait, do not close or refresh this page...</p>}

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