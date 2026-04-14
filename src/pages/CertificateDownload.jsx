import React, { useState } from "react";

// Get the PDF path dynamically
const getCertificatePDFPath = () => {
  const path = new URL("../assets/participation certificate final.pdf", import.meta.url).href;
  console.log("Certificate PDF path:", path);
  return path;
};

// Cache variables for performance
let cachedPDFBytes = null;
let cachedPDFLib = null;

// ── Load pdf-lib from CDN ────────────────────────────────────────────────────────
const loadPdfLib = () =>
  new Promise((resolve, reject) => {
    if (cachedPDFLib) { resolve(cachedPDFLib); return; }
    if (window.PDFLib) { 
      cachedPDFLib = window.PDFLib;
      resolve(window.PDFLib); 
      return; 
    }
    
    setTimeout(() => {
      if (window.PDFLib) {
        cachedPDFLib = window.PDFLib;
        resolve(window.PDFLib);
      } else {
        reject(new Error("PDF library is not available. Please reload the page."));
      }
    }, 100);
  });

// ── Fetch PDF from URL ───────────────────────────────────────────────────────────
const fetchPDF = async (url) => {
  if (cachedPDFBytes) return cachedPDFBytes;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    cachedPDFBytes = await response.arrayBuffer();
    return cachedPDFBytes;
  } catch (err) {
    console.error("PDF Fetch Error:", err);
    throw new Error("Failed to load certificate template. Please contact: 8125035960");
  }
};

// ── Generate Certificate ────────────────────────────────────────────────────────
const generateCertificatePDF = async (participantName, eventName) => {
  try {
    const PDFLib = await loadPdfLib();
    const { PDFDocument, rgb, StandardFonts } = PDFLib;

    const templateBytes = await fetchPDF(getCertificatePDFPath());
    
    if (!templateBytes || templateBytes.byteLength === 0) {
      throw new Error("PDF file is empty or not loaded correctly");
    }
    
    // Validate PDF header
    const view = new Uint8Array(templateBytes);
    const isValidPDF = view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46;
    if (!isValidPDF) {
      throw new Error("File downloaded is not a valid PDF");
    }
    
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const normalFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const nameSize = 16;
    const eventSize = 16;
    
    // Draw participant name
    const nameWidth = nameSize * 0.5 * participantName.length;
    firstPage.drawText(participantName.toUpperCase(), {
      x: (width - nameWidth) / 2 + 40,
      y: height * 0.52,
      size: nameSize,
      color: rgb(0, 0, 0),
      font: boldFont,
    });

    // Draw event name
    const eventWidth = eventSize * 0.5 * eventName.length;
    firstPage.drawText(eventName, {
      x: (width - eventWidth) / 2 - 50,
      y: height * 0.48,
      size: eventSize,
      color: rgb(0, 0, 0),
      font: normalFont,
    });

    // Download PDF
    const pdf = await pdfDoc.save();
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Certificate_${participantName.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating certificate:", error);
    throw error;
  }
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CertificateDownload() {
  const [name, setName] = useState("");
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const handleDownload = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      setShowErrorModal(true);
      return;
    }
    if (!eventName.trim()) {
      setError("Please enter the event name");
      setShowErrorModal(true);
      return;
    }

    setDownloadLoading(true);
    setError("");
    setElapsedSeconds(0);

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    try {
      await generateCertificatePDF(name.trim(), eventName.trim());
      clearInterval(timerInterval);
      setShowSuccessModal(true);
    } catch (err) {
      clearInterval(timerInterval);
      setError("Error generating certificate: " + err.message);
      setShowErrorModal(true);
    } finally {
      setDownloadLoading(false);
      clearInterval(timerInterval);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleDownload();
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────────
  const containerStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
  };

  const cardStyle = {
    maxWidth: "600px",
    margin: "0 auto",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    padding: "40px",
  };

  const titleStyle = {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "10px",
    textAlign: "center",
  };

  const subtitleStyle = {
    fontSize: "14px",
    color: "#666",
    marginBottom: "30px",
    textAlign: "center",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    border: "2px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    marginBottom: "15px",
    transition: "border-color 0.3s",
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    background: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: downloadLoading ? "not-allowed" : "pointer",
    transition: "background 0.3s",
    opacity: downloadLoading ? 0.7 : 1,
  };

  const modalOverlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalStyle = {
    background: "white",
    borderRadius: "12px",
    padding: "30px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
    textAlign: "center",
    maxWidth: "400px",
    width: "90%",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>🎓 Download Certificate</h1>
        <p style={subtitleStyle}>ECLECTICA-2K26</p>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
            Your Name
          </label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            style={inputStyle}
          />

          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#333" }}>
            Event Name
          </label>
          <input
            type="text"
            placeholder="e.g., ECLECTICA-2K26"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            onKeyPress={handleKeyPress}
            style={inputStyle}
          />

          <button
            onClick={handleDownload}
            disabled={downloadLoading}
            style={buttonStyle}
            onMouseOver={(e) => !downloadLoading && (e.target.style.background = "#5568d3")}
            onMouseOut={(e) => !downloadLoading && (e.target.style.background = "#667eea")}
          >
            {downloadLoading ? (
              <>
                ⏳ Generating... ({elapsedSeconds}s)
              </>
            ) : (
              "📥 Download Certificate"
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={modalOverlayStyle} onClick={() => setShowSuccessModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "50px", marginBottom: "15px" }}>✅</div>
            <h2 style={{ color: "#4caf50", marginBottom: "10px" }}>Success!</h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              Your certificate has been downloaded successfully.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                padding: "10px 20px",
                background: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div style={modalOverlayStyle} onClick={() => setShowErrorModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "50px", marginBottom: "15px" }}>❌</div>
            <h2 style={{ color: "#f44336", marginBottom: "10px" }}>Error</h2>
            <p style={{ color: "#666", marginBottom: "15px" }}>{error}</p>
            <p style={{ color: "#888", fontSize: "12px", marginBottom: "20px" }}>
              If the problem persists, contact: <strong>8125035960</strong>
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              style={{
                padding: "10px 20px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
