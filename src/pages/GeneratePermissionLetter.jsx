import React, { useState } from "react";
import logoSrc from "../assets/new logo.jpeg";

const loadJsPDF = () =>
  new Promise((resolve, reject) => {
    if (window.jspdf) {
      resolve(window.jspdf.jsPDF);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error("Unable to load the PDF generator."));
    document.head.appendChild(script);
  });

const generateQR = (text) =>
  new Promise((resolve, reject) => {
    const loadLib = () =>
      new Promise((res, rej) => {
        if (window.QRCode) {
          res();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        script.onload = res;
        script.onerror = () => rej(new Error("Unable to load the QR generator."));
        document.head.appendChild(script);
      });

    loadLib().then(() => {
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:180px;height:180px;";
      document.body.appendChild(container);
      new window.QRCode(container, {
        text,
        width: 180,
        height: 180,
        correctLevel: window.QRCode.CorrectLevel.M,
      });
      setTimeout(() => {
        const canvas = container.querySelector("canvas");
        document.body.removeChild(container);
        if (!canvas) {
          reject(new Error("Unable to create the QR code."));
          return;
        }
        resolve(canvas.toDataURL("image/png"));
      }, 500);
    }).catch(reject);
  });

const imgToBase64 = (src) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });

const generatePDF = async ({ departments, college }) => {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const ML = 20;
  const MR = 20;
  const TW = PW - ML - MR;

  const watermark = await imgToBase64(logoSrc);
  if (watermark) {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.1 }));
    doc.addImage(watermark, "JPEG", 38, 78, 134, 134);
    doc.restoreGraphicsState();
  }

  const navy = [22, 43, 76];
  const blue = [42, 91, 145];
  const headerLogo = await imgToBase64(logoSrc);
  if (headerLogo) {
    doc.addImage(headerLogo, "PNG", ML, 10, 17, 17);
    doc.addImage(headerLogo, "PNG", PW - MR - 17, 10, 17, 17);
  }
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MADANAPALLE INSTITUTE OF TECHNOLOGY & SCIENCE", PW / 2, 14, { align: "center" });
  doc.setFontSize(7.5);
  doc.text("DEPARTMENT OF ELECTRONICS AND COMMUNICATION ENGINEERING", PW / 2, 20, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("MITS - DEEMED TO BE UNIVERSITY", PW / 2, 24.5, { align: "center" });
  doc.setLineWidth(0.45);
  doc.line(ML, 30, PW - MR, 30);

  doc.setFontSize(8.5);
  doc.text("From:", ML, 36);
  doc.setFont("helvetica", "bold");
  doc.text("ECE Department Organizing Committee", ML + 12, 36);
  doc.setFont("helvetica", "normal");
  doc.text("Department of Electronics and Communication Engineering", ML + 12, 40);
  doc.text("MITS", ML + 12, 44);
  doc.text("Date: 12 November 2026", PW - MR, 36, { align: "right" });

  let y = 54;
  doc.setFillColor(...blue);
  doc.rect(ML, y, TW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SUBJECT", ML + 4, y + 5);
  doc.setFontSize(8.5);
  const subject = doc.splitTextToSize(
    "REQUEST FOR ATTENDANCE PERMISSION FOR ECE DEPARTMENT FEST — ECLECTICA 2K26",
    TW - 28
  );
  doc.text(subject, ML + 25, y + 5, { lineHeightFactor: 1.15 });
  y += 22;

  doc.setTextColor(...navy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Respected Sir/Madam,", ML, y);
  y += 7;

  const paragraphs = [
    "We, the ECE Department Organizing Committee, are pleased to inform you that the Department of Electronics and Communication Engineering is organizing its Department Fest, ECLECTICA 2K26, on 12th November 2026.",
    "The following students from your department have registered to participate in the fest. We kindly request you to grant them permission to attend the events and consider their attendance for the respective programme hours.",
    "We assure you that the students will maintain discipline and actively participate in the events. We sincerely request your support and cooperation in making this event a success.",
  ];
  paragraphs.forEach((paragraph) => {
    const lines = doc.splitTextToSize(paragraph, TW);
    doc.text(lines, ML, y, { maxWidth: TW, lineHeightFactor: 1.3 });
    y += lines.length * 4.6 + 3;
  });

  doc.text("The list of participating students is provided below for your reference.", ML, y);
  y += 8;

  const groups = departments.filter(({ department, rollnumbers }) => department && rollnumbers.length);
  const rowHeight = 7;
  const gridColumns = 6;
  const cellWidth = TW / gridColumns;
  groups.forEach(({ department: studentDepartment, rollnumbers: departmentRollnumbers }) => {
    if (y + 14 > PH - 22) {
      doc.addPage();
      y = 22;
    }
    doc.setFillColor(225, 233, 243);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.rect(ML, y, TW, 7, "F");
    doc.text(studentDepartment.toUpperCase(), ML + 3, y + 4.7);
    doc.text(`${departmentRollnumbers.length} student${departmentRollnumbers.length === 1 ? "" : "s"}`, PW - MR - 3, y + 4.7, { align: "right" });
    y += 7;

    doc.setFillColor(...blue);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.rect(ML, y, TW, rowHeight, "F");
    doc.text("REGISTERED ROLL NUMBERS", ML + 3, y + 4.7);
    y += rowHeight;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    departmentRollnumbers.forEach((rollnumber, index) => {
      const position = index % gridColumns;
      if (position === 0 && y + rowHeight > PH - 22) {
        doc.addPage();
        y = 22;
        doc.setFillColor(...blue);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.rect(ML, y, TW, rowHeight, "F");
        doc.text("REGISTERED ROLL NUMBERS (CONTINUED)", ML + 3, y + 4.7);
        y += rowHeight;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
      }

      const rowY = y;
      const cellX = ML + position * cellWidth;
      doc.setTextColor(...navy);
      doc.rect(cellX, rowY, cellWidth, rowHeight);
      doc.setTextColor(125, 145, 175);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, cellX + 1.5, rowY + 4.7);
      doc.setTextColor(...navy);
      doc.setFont("helvetica", "bold");
      doc.text(rollnumber, cellX + 8, rowY + 4.7, { maxWidth: cellWidth - 9 });
      if (position === gridColumns - 1 || index === departmentRollnumbers.length - 1) {
        y += rowHeight;
      }
    });
    y += 5;
  });

  if (y > PH - 75) {
    doc.addPage();
    y = 35;
  }

  const closingY = y;
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.text("Thank you.", ML, y);
  y += 5;
  doc.text("Yours faithfully,", ML, y);
  y += 13;
  doc.setFont("helvetica", "bold");
  doc.text("ECE Department Organizing Committee", ML, y);
  doc.setFont("helvetica", "normal");
  doc.text("Department of Electronics and Communication Engineering", ML, y + 5);
  doc.text("MITS - Deemed to be University", ML, y + 10);

  const qrText = JSON.stringify({
    date: "12-11-2026",
    college,
    departments: groups,
  });
  const qrDataUrl = await generateQR(qrText);
  if (qrDataUrl) {
    const qrSize = 31;
    const qrX = PW - MR - qrSize;
    const qrY = closingY;
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan for all participant details", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });
  }

  doc.setTextColor(20, 35, 65);
  doc.setFontSize(8.5);
  doc.text("Department of ECE | MITS - Deemed to be University", ML, PH - 18);
  doc.line(ML, PH - 14, PW - MR, PH - 14);
  doc.save(`ECE_Fest_Attendance_Permission_${groups.flatMap(({ rollnumbers }) => rollnumbers).join("_")}.pdf`);
};

const DEPARTMENTS = [
  "ECE",
  "CSE",
  "CSE- AI",
  "CSE- DS",
  "CSE- Cyber security",
  "CSE- AIML",
  "EEE",
  "MECH",
  "CIVIL",
  "Other",
];
const emptyDepartment = () => ({ department: "", rollnumbersText: "" });

const inputStyle = {
  width: "100%",
  padding: "12px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  colorScheme: "dark",
};

const optionStyle = {
  backgroundColor: "#ffffff",
  color: "#0a1628",
};

export default function GeneratePermissionLetter() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [departments, setDepartments] = useState([emptyDepartment()]);
  const [college, setCollege] = useState("");
  const [generating, setGenerating] = useState(false);

  const updateDepartment = (index, field, value) => {
    setDepartments((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    const parsedDepartments = departments.map(({ department, rollnumbersText }) => ({
      department,
      rollnumbers: rollnumbersText.split(/[\s,;]+/).map((value) => value.trim().toUpperCase()).filter(Boolean),
    }));
    if (!college.trim() || parsedDepartments.some(({ department, rollnumbers }) => !department || !rollnumbers.length)) {
      alert("Please complete the college, select each department, and paste its roll numbers.");
      return;
    }
    setGenerating(true);
    try {
      await generatePDF({
        departments: parsedDepartments,
        college: college.trim(),
      });
      alert("Permission letter downloaded successfully!");
      setDepartments([emptyDepartment()]);
      setCollege("");
    } catch (error) {
      console.error("Error generating permission letter:", error);
      alert(`Failed to generate letter: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a1628 0%, #1a2d4d 100%)", padding: "20px" }}>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (loginEmail === "admin@ece.com" && loginPass === "eclectica2k26") {
            setLoggedIn(true);
            setLoginErr("");
          } else {
            setLoginErr("Invalid credentials");
          }
        }} style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: "12px", padding: "40px", maxWidth: "400px", width: "100%" }}>
          <h2 style={{ textAlign: "center", color: "#d4af37", marginBottom: "24px" }}>Admin Login</h2>
          <input type="email" placeholder="Admin email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} style={{ ...inputStyle, marginBottom: "12px" }} />
          <input type="password" placeholder="Password" required value={loginPass} onChange={(event) => setLoginPass(event.target.value)} style={{ ...inputStyle, marginBottom: "16px" }} />
          <button type="submit" style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #d4af37, #f4d03f)", color: "#0a1628", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>Login</button>
          {loginErr && <p style={{ color: "#f87171", textAlign: "center", marginTop: "12px" }}>{loginErr}</p>}
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #1a2d4d 100%)", padding: "40px 20px" }}>
      <button onClick={() => window.history.back()} style={{ marginBottom: "20px", padding: "8px 16px", background: "rgba(212, 175, 55, 0.2)", border: "1px solid rgba(212, 175, 55, 0.4)", color: "#d4af37", borderRadius: "6px", cursor: "pointer" }}>← Back</button>
      <div style={{ maxWidth: "680px", margin: "0 auto", background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: "12px", padding: "40px" }}>
        <h1 style={{ textAlign: "center", color: "#d4af37", marginBottom: "10px", fontSize: "28px" }}>Generate Permission Letter</h1>
        <p style={{ textAlign: "center", color: "#aaa", marginBottom: "28px" }}>Select a department and paste all its roll numbers. Add another department when needed.</p>
        <form onSubmit={handleGenerate}>
          <label style={{ display: "block", color: "#aaa", marginBottom: "6px" }}>College Name *</label>
          <input type="text" placeholder="College name" required value={college} onChange={(event) => setCollege(event.target.value)} style={{ ...inputStyle, marginBottom: "16px" }} />
          {departments.map((item, index) => (
            <div key={index} style={{ border: "1px solid rgba(212,175,55,0.25)", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
              <p style={{ color: "#f4d03f", marginBottom: "12px", fontWeight: "600" }}>Department {index + 1}</p>
              <select required value={item.department} onChange={(event) => updateDepartment(index, "department", event.target.value)} style={{ ...selectStyle, marginBottom: "10px" }}>
                <option value="" style={optionStyle}>Select Department</option>
                {DEPARTMENTS.map((item) => <option key={item} value={item} style={optionStyle}>{item}</option>)}
              </select>
              <textarea required rows={5} placeholder="Paste roll numbers separated by spaces, commas, semicolons, or new lines" value={item.rollnumbersText} onChange={(event) => updateDepartment(index, "rollnumbersText", event.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
              {departments.length > 1 && <button type="button" onClick={() => setDepartments((current) => current.filter((_, departmentIndex) => departmentIndex !== index))} style={{ marginTop: "10px", padding: "6px 10px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)", borderRadius: "6px", cursor: "pointer" }}>Remove department</button>}
            </div>
          ))}

          <button type="button" onClick={() => setDepartments((current) => [...current, emptyDepartment()])} style={{ width: "100%", padding: "11px", marginBottom: "20px", background: "rgba(212,175,55,0.12)", color: "#f4d03f", border: "1px dashed rgba(212,175,55,0.5)", borderRadius: "8px", cursor: "pointer" }}>+ Add department</button>
          <button type="submit" disabled={generating} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #d4af37, #f4d03f)", color: "#0a1628", border: "none", borderRadius: "8px", fontWeight: "600", cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1 }}>{generating ? "Generating..." : "Download Permission Letter"}</button>
          <button type="button" onClick={() => setLoggedIn(false)} style={{ width: "100%", padding: "12px", marginTop: "12px", background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", cursor: "pointer" }}>Logout</button>
        </form>
      </div>
    </div>
  );
}
