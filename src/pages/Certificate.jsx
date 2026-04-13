import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";

// Get the PDF path dynamically
const getCertificatePDFPath = () => {
  // In production (Netlify), assets are served from dist folder
  const path = new URL("../assets/participation certificate final.pdf", import.meta.url).href;
  console.log("Certificate PDF path:", path);
  return path;
};

// Cache variables for performance
let cachedPDFBytes = null;
let cachedPDFLib = null;

// ── Load pdf-lib from CDN with timeout ────────────────────────────────────────
const loadPdfLib = () =>
  new Promise((resolve, reject) => {
    if (cachedPDFLib) { resolve(cachedPDFLib); return; }
    if (window.PDFLib) { 
      cachedPDFLib = window.PDFLib;
      resolve(window.PDFLib); 
      return; 
    }
    
    const timeoutId = setTimeout(() => {
      reject(new Error("PDF library failed to load. Please check your internet connection."));
    }, 15000); // 15 second timeout
    
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.13.0/pdf-lib.min.js";
    s.onload = () => {
      clearTimeout(timeoutId);
      cachedPDFLib = window.PDFLib;
      resolve(window.PDFLib);
    };
    s.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error("Failed to load PDF library from CDN."));
    };
    document.head.appendChild(s);
  });

// ── Fetch PDF from URL with caching and timeout ────────────────────────────────
const fetchPDF = async (url) => {
  if (cachedPDFBytes) return cachedPDFBytes;
  
  try {
    // Add timeout for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch PDF`);
    }
    
    cachedPDFBytes = await response.arrayBuffer();
    return cachedPDFBytes;
  } catch (err) {
    console.error("PDF Fetch Error:", err);
    throw new Error("Failed to load certificate template. Please try again or contact: 8125035960");
  }
};

// ── Generate Certificate by overlaying text on template ────────────────────────
const generateCertificatePDF = async (participantName, eventName, rollNumber) => {
  try {
    const PDFLib = await loadPdfLib();
    const { PDFDocument, rgb, StandardFonts } = PDFLib;

    // Fetch the template PDF
    const templateBytes = await fetchPDF(getCertificatePDFPath());
    
    if (!templateBytes || templateBytes.byteLength === 0) {
      throw new Error("PDF file is empty or not loaded correctly");
    }
    
    // Check if PDF header is valid
    const view = new Uint8Array(templateBytes);
    const isValidPDF = view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46; // Check for %PDF
    if (!isValidPDF) {
      console.error("Invalid PDF header. First bytes:", Array.from(view.slice(0, 20)).map(b => b.toString(16)));
      throw new Error("File downloaded is not a valid PDF. This might be an HTML error page.");
    }
    
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Get first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed fonts - using Times Roman for formal certificate look
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const normalFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    // Calculate text width for proper centering
    const nameSize = 16;
    const eventSize = 16;
    
    // Add participant name (centered, on the first blank line)
    const nameWidth = nameSize * 0.5 * participantName.length; // Approximate width
    firstPage.drawText(participantName.toUpperCase(), {
      x: (width - nameWidth) / 2 + 40,
      y: height * 0.52,
      size: nameSize,
      color: rgb(0, 0, 0),
      font: boldFont,
    });

    // Add event name (centered, on the second blank line)
    // Positioned lower than name with proper spacing
    const eventWidth = eventSize * 0.5 * eventName.length; // Approximate width
    firstPage.drawText(eventName, {
      x: (width - eventWidth) / 2-50,
      y: height * 0.48,
      size: eventSize,
      color: rgb(0, 0, 0),
      font: normalFont,
    });

    // Generate PDF
    const pdf = await pdfDoc.save();
    
    // Download
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Certificate_${participantName.replace(/\s+/g, "_")}_${rollNumber}.pdf`;
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
export default function Certificate() {
  const [searchRoll, setSearchRoll] = useState("");
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── Search for participant by roll number ────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchRoll.trim()) {
      setError("Please enter a roll number");
      return;
    }

    setLoading(true);
    setError("");
    setShowErrorModal(false);
    setShowSuccessModal(false);
    setParticipants([]);
    setSelectedParticipant(null);

    try {
      const q = query(
        collection(db, "registrations"),
        where("rollnumber", "==", searchRoll.trim().toUpperCase())
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError("Download server error: Please contact: 8125035960 to get certificate");
        setShowErrorModal(true);
        setParticipants([]);
      } else {
        const results = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (results.length === 1) {
          setSelectedParticipant(results[0]);
        } else {
          setParticipants(results);
        }
      }
    } catch (err) {
      setError("Error searching for participant: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Download certificate ──────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!selectedParticipant) return;

    setDownloadLoading(true);
    setError("");
    setElapsedSeconds(0);

    // Timer to track elapsed time
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    try {
      await generateCertificatePDF(
        selectedParticipant.name,
        selectedParticipant.event || "ECLECTICA-2K26",
        selectedParticipant.rollnumber || "N/A"
      );
      clearInterval(timerInterval);
      setShowSuccessModal(true);
    } catch (err) {
      clearInterval(timerInterval);
      setError("Error generating certificate: " + err.message);
    } finally {
      setDownloadLoading(false);
      clearInterval(timerInterval);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
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
    cursor: "pointer",
    transition: "background 0.3s",
    marginBottom: "15px",
  };

  const buttonHoverStyle = {
    background: "#5568d3",
  };

  const downloadButtonStyle = {
    ...buttonStyle,
    background: "#48bb78",
  };

  const downloadButtonHoverStyle = {
    background: "#38a169",
  };

  const errorStyle = {
    padding: "12px",
    background: "#fed7d7",
    color: "#c53030",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
  };

  const participantCardStyle = {
    background: "#f7fafc",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
  };

  const participantFieldStyle = {
    marginBottom: "12px",
    fontSize: "14px",
    color: "black"
  };

  const fieldLabelStyle = {
    fontWeight: "bold",
    color: "#1d5ac4",
    display: "inline-block",
    minWidth: "120px",
  };

  const eventTitleStyle = {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#667eea",
    marginBottom: "5px",
    textAlign: "center",
    letterSpacing: "1px",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={eventTitleStyle}>ECLECTICA 2K26</h2>
        <h1 style={titleStyle}>📜 Certificate of participation </h1>
        <p style={subtitleStyle}>
          Enter your roll number to download your participation certificate
        </p>

        <div>
          {/* Error modal will be shown below */}
          <input
            type="text"
            placeholder="Enter your roll number"
            value={searchRoll}
            onChange={(e) => setSearchRoll(e.target.value)}
            onKeyPress={handleKeyPress}
            style={inputStyle}
          />

          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => !loading && (e.target.style.background = buttonHoverStyle.background)}
            onMouseLeave={(e) => (e.target.style.background = buttonStyle.background)}
          >
            {loading ? "Searching..." : "Search"}
          </button>

          {selectedParticipant && (
            <div style={participantCardStyle}>
              <h3 style={{ marginBottom: "15px", color: "#2d3748" }}>
                ✓ Participant Details
              </h3>
              <div style={participantFieldStyle}>
                <span style={fieldLabelStyle}>Name:</span> {selectedParticipant.name}
              </div>
              <div style={participantFieldStyle}>
                <span style={fieldLabelStyle}>Event:</span> {selectedParticipant.event || "ECLECTICA-2K26"}
              </div>
              <div style={participantFieldStyle}>
                <span style={fieldLabelStyle}>Roll Number:</span> {selectedParticipant.rollnumber}
              </div>
              <div style={participantFieldStyle}>
                <span style={fieldLabelStyle}>Email:</span> {selectedParticipant.email || "N/A"}
              </div>
              <div style={participantFieldStyle}>
                <span style={fieldLabelStyle}>College:</span> {selectedParticipant.college || "N/A"}
              </div>
              <div style={participantFieldStyle}>
                <span style={fieldLabelStyle}>Year:</span> {selectedParticipant.year || "N/A"}
              </div>
              <div style={participantFieldStyle}>
                <span style={fieldLabelStyle}>Department:</span> {selectedParticipant.department || "N/A"}
              </div>

              <button
                onClick={handleDownload}
                disabled={downloadLoading}
                style={{
                  ...downloadButtonStyle,
                  marginTop: "20px",
                  width: "100%",
                  opacity: downloadLoading ? 0.6 : 1,
                  cursor: downloadLoading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => !downloadLoading && (e.target.style.background = downloadButtonHoverStyle.background)}
                onMouseLeave={(e) => (e.target.style.background = downloadButtonStyle.background)}
              >
                {downloadLoading ? (
                  <span>⏱️ {elapsedSeconds}s - Generating...</span>
                ) : (
                  "⬇️ Download Certificate"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Modal Popup */}
      {showErrorModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: "48px",
              marginBottom: "20px",
            }}>⚠️</div>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#c53030",
              marginBottom: "20px",
            }}>Download Server Error</h2>
            <p style={{
              fontSize: "16px",
              color: "#4a5568",
              marginBottom: "20px",
              lineHeight: "1.6",
            }}>
              {error}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              style={{
                padding: "12px 30px",
                background: "#f56565",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background 0.3s",
              }}
              onMouseEnter={(e) => e.target.style.background = "#e53e3e"}
              onMouseLeave={(e) => e.target.style.background = "#f56565"}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Success Modal Popup */}
      {showSuccessModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "40px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: "48px",
              marginBottom: "20px",
            }}>✓</div>
            <h2 style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#22543d",
              marginBottom: "20px",
            }}>Certificate Downloaded Successfully!</h2>
            <p style={{
              fontSize: "16px",
              color: "#4a5568",
              marginBottom: "20px",
              lineHeight: "1.6",
            }}>
              If there is any mistake or displacement of the name in the certificate, please contact:
            </p>
            <p style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#667eea",
              marginBottom: "30px",
            }}>
              8125035960
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                padding: "12px 30px",
                background: "#48bb78",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background 0.3s",
              }}
              onMouseEnter={(e) => e.target.style.background = "#38a169"}
              onMouseLeave={(e) => e.target.style.background = "#48bb78"}
            >
              Got it, Thank you!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
