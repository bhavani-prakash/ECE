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

const generatePDF = async ({ students, college, department }) => {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const PH = 297;
  const ML = 18;
  const MR = 18;
  const TW = PW - ML - MR;

  const watermark = await imgToBase64(logoSrc);
  if (watermark) {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.1 }));
    doc.addImage(watermark, "JPEG", 37, 72, 136, 136);
    doc.restoreGraphicsState();
  }

  doc.setTextColor(20, 35, 65);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("MITS - DEEMED TO BE UNIVERSITY", PW / 2, 17, { align: "center" });
  doc.setFontSize(10.5);
  doc.text("DEPARTMENT OF ELECTRONICS AND COMMUNICATION ENGINEERING", PW / 2, 24, { align: "center" });
  doc.setLineWidth(0.4);
  doc.line(ML, 28, PW - MR, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Date: 11-11-2026", PW - MR, 36, { align: "right" });

  let y = 43;
  doc.setFont("helvetica", "bold");
  doc.text("To:", ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("The Head of the Department", ML, y);
  y += 5;
  doc.text(`Department of ${department || "____________"}.`, ML, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  const subject = doc.splitTextToSize(
    "Subject: Request for Attendance Permission for ECE Department Fest Participants",
    TW
  );
  doc.text(subject, ML, y);
  y += subject.length * 5 + 3;
  doc.setFont("helvetica", "normal");
  doc.text("Respected Sir/Madam,", ML, y);
  y += 7;

  const paragraphs = [
    "We are pleased to inform you that the Department of Electronics and Communication Engineering is organizing its Department Fest on 11th November 2026, featuring various technical and non-technical events.",
    "A few students from your department have registered to participate in these events. We kindly request you to grant them permission to attend the fest and consider their attendance for the respective programme hours.",
    "The list of participating students, with their names and roll numbers, is provided below for your reference.",
    "We assure you that the students will maintain discipline and actively participate in the events. We sincerely request your support and cooperation in making this event a success.",
  ];
  paragraphs.forEach((paragraph) => {
    const lines = doc.splitTextToSize(paragraph, TW);
    doc.text(lines, ML, y, { maxWidth: TW, lineHeightFactor: 1.35 });
    y += lines.length * 5.2 + 3;
  });

  doc.text("Thank you.", ML, y);
  y += 5;
  doc.text("Yours faithfully,", ML, y);
  y += 5;
  doc.text("Department of Electronics and Communication Engineering", ML, y);
  y += 5;
  doc.text("MITS - Deemed to be University", ML, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("LIST OF PARTICIPATING STUDENTS", PW / 2, y, { align: "center" });
  y += 5;

  const rowHeight = 7;
  const columns = [18, 70, 48, 38];
  const tableY = y;
  doc.setFillColor(20, 35, 65);
  doc.setTextColor(255, 255, 255);
  doc.rect(ML, tableY, TW, rowHeight, "F");
  ["S. No.", "Name", "Roll No.", "Year"].forEach((label, index) => {
    const x = ML + columns.slice(0, index).reduce((sum, width) => sum + width, 0);
    doc.text(label, x + columns[index] / 2, tableY + 4.7, { align: "center" });
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 35, 65);
  students.forEach((student, index) => {
    const rowY = tableY + rowHeight * (index + 1);
    doc.rect(ML, rowY, TW, rowHeight);
    doc.text(String(index + 1), ML + columns[0] / 2, rowY + 4.7, { align: "center" });
    doc.text(student.name, ML + columns[0] + 3, rowY + 4.7, { maxWidth: columns[1] - 6 });
    doc.text(student.rollnumber, ML + columns[0] + columns[1] + 3, rowY + 4.7, { maxWidth: columns[2] - 6 });
    doc.text(student.year, ML + columns[0] + columns[1] + columns[2] + columns[3] / 2, rowY + 4.7, { align: "center" });
  });
  let columnX = ML;
  columns.slice(0, -1).forEach((width) => {
    columnX += width;
    doc.line(columnX, tableY, columnX, tableY + rowHeight * (students.length + 1));
  });

  const qrText = JSON.stringify({
    date: "11-11-2026",
    college,
    department,
    students,
  });
  const qrDataUrl = await generateQR(qrText);
  if (qrDataUrl) {
    const qrSize = 31;
    const qrX = PW - MR - qrSize;
    const qrY = Math.min(tableY + rowHeight * (students.length + 1) + 7, PH - 52);
    doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan for all participant details", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });
  }

  doc.setTextColor(20, 35, 65);
  doc.setFontSize(8.5);
  doc.text("Department of ECE | MITS - Deemed to be University", ML, PH - 18);
  doc.line(ML, PH - 14, PW - MR, PH - 14);
  doc.save(`ECE_Fest_Attendance_Permission_${students.map(({ rollnumber }) => rollnumber).join("_")}.pdf`);
};

const DEPARTMENTS = ["ECE", "CSE", "EEE", "MECH", "CIVIL", "Other"];
const YEARS = ["I B.Tech", "II B.Tech", "III B.Tech", "IV B.Tech"];
const emptyStudent = () => ({ name: "", rollnumber: "", year: "I B.Tech" });

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
  const [students, setStudents] = useState([emptyStudent()]);
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [generating, setGenerating] = useState(false);

  const updateStudent = (index, field, value) => {
    setStudents((current) => current.map((student, studentIndex) =>
      studentIndex === index ? { ...student, [field]: value } : student
    ));
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!college.trim() || !department || students.some(({ name, rollnumber }) => !name.trim() || !rollnumber.trim())) {
      alert("Please complete the college, department, and all student fields.");
      return;
    }
    setGenerating(true);
    try {
      await generatePDF({
        students: students.map(({ name, rollnumber, year }) => ({
          name: name.trim(),
          rollnumber: rollnumber.trim().toUpperCase(),
          year,
        })),
        college: college.trim(),
        department,
      });
      alert("Permission letter downloaded successfully!");
      setStudents([emptyStudent()]);
      setCollege("");
      setDepartment("");
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
        <p style={{ textAlign: "center", color: "#aaa", marginBottom: "28px" }}>Add up to 5 students to one attendance permission letter.</p>
        <form onSubmit={handleGenerate}>
          <label style={{ display: "block", color: "#aaa", marginBottom: "6px" }}>College Name *</label>
          <input type="text" placeholder="College name" required value={college} onChange={(event) => setCollege(event.target.value)} style={{ ...inputStyle, marginBottom: "16px" }} />
          <label style={{ display: "block", color: "#aaa", marginBottom: "6px" }}>Department *</label>
          <select required value={department} onChange={(event) => setDepartment(event.target.value)} style={{ ...selectStyle, marginBottom: "24px" }}>
            <option value="" style={optionStyle}>Select Department</option>
            {DEPARTMENTS.map((item) => <option key={item} value={item} style={optionStyle}>{item}</option>)}
          </select>

          {students.map((student, index) => (
            <div key={index} style={{ border: "1px solid rgba(212,175,55,0.25)", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
              <p style={{ color: "#f4d03f", marginBottom: "12px", fontWeight: "600" }}>Student {index + 1}</p>
              <input type="text" placeholder="Student name" required value={student.name} onChange={(event) => updateStudent(index, "name", event.target.value)} style={{ ...inputStyle, marginBottom: "10px" }} />
              <input type="text" placeholder="Roll number" required value={student.rollnumber} onChange={(event) => updateStudent(index, "rollnumber", event.target.value)} style={inputStyle} />
              <select required value={student.year} onChange={(event) => updateStudent(index, "year", event.target.value)} style={{ ...selectStyle, marginTop: "10px" }}>
                {YEARS.map((year) => <option key={year} value={year} style={optionStyle}>{year}</option>)}
              </select>
              {students.length > 1 && <button type="button" onClick={() => setStudents((current) => current.filter((_, studentIndex) => studentIndex !== index))} style={{ marginTop: "10px", padding: "6px 10px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)", borderRadius: "6px", cursor: "pointer" }}>Remove student</button>}
            </div>
          ))}

          {students.length < 5 && <button type="button" onClick={() => setStudents((current) => [...current, emptyStudent()])} style={{ width: "100%", padding: "11px", marginBottom: "20px", background: "rgba(212,175,55,0.12)", color: "#f4d03f", border: "1px dashed rgba(212,175,55,0.5)", borderRadius: "8px", cursor: "pointer" }}>+ Add student ({students.length}/5)</button>}
          <button type="submit" disabled={generating} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #d4af37, #f4d03f)", color: "#0a1628", border: "none", borderRadius: "8px", fontWeight: "600", cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1 }}>{generating ? "Generating..." : "Download Permission Letter"}</button>
          <button type="button" onClick={() => setLoggedIn(false)} style={{ width: "100%", padding: "12px", marginTop: "12px", background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", cursor: "pointer" }}>Logout</button>
        </form>
      </div>
    </div>
  );
}
