import React, { useState, useEffect } from "react";
import { ref, getBytes } from "firebase/storage";
import { storage } from "../config/firebase.js";

export default function BugHuntersRound3() {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState({ size: "Loading...", exists: false });

  const STORAGE_PATH = "bug-hunters/Bug_Hunters_Final_Round_Question_1.pdf";
  const FILE_NAME = "Bug_Hunters_Final_Round_Question_1.pdf";

  // Check if file exists in Firebase Storage
  useEffect(() => {
    const checkFileExists = async () => {
      try {
        const fileRef = ref(storage, STORAGE_PATH);
        // Try to get metadata or just attempt to fetch bytes
        const bytes = await getBytes(fileRef);
        const sizeMB = (bytes.length / (1024 * 1024)).toFixed(2);
        setFileInfo({ size: `${sizeMB} MB`, exists: true });
      } catch (err) {
        if (err.code === "storage/object-not-found") {
          setFileInfo({ 
            size: "File not uploaded yet", 
            exists: false,
            error: "Please upload the PDF to Firebase Storage first"
          });
        } else {
          setFileInfo({ 
            size: "Unable to check", 
            exists: false,
            error: err.message 
          });
        }
      }
    };
    checkFileExists();
  }, []);

  const handleDownload = async () => {
    if (!fileInfo.exists) {
      setError("File not available for download. Please contact admin.");
      return;
    }

    setLoading(true);
    setError("");
    setDownloadStarted(true);

    try {
      const fileRef = ref(storage, STORAGE_PATH);
      const bytes = await getBytes(fileRef);
      
      // Create blob and download
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = FILE_NAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Reset after a delay
      setTimeout(() => setDownloadStarted(false), 2000);
    } catch (err) {
      console.error("Download error:", err);
      setError(`Download failed: ${err.message}`);
      setDownloadStarted(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628 0%, #1a2d4d 100%)",
      padding: "40px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <button
        onClick={() => window.history.back()}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
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
        width: "100%",
        background: "rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(212, 175, 55, 0.2)",
        borderRadius: "12px",
        padding: "60px 40px",
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          fontSize: "80px",
          marginBottom: "24px",
        }}>📥</div>

        {/* Title */}
        <h1 style={{
          fontSize: "32px",
          fontWeight: "bold",
          color: "#d4af37",
          marginBottom: "16px",
          margin: "0 0 16px 0",
        }}>Bug Hunters</h1>

        <h2 style={{
          fontSize: "24px",
          fontWeight: "600",
          color: "#aaa",
          marginBottom: "12px",
          margin: "0 0 12px 0",
        }}>3rd Round Question</h2>

        {/* Description */}
        <p style={{
          fontSize: "16px",
          color: "#888",
          lineHeight: "1.8",
          marginBottom: "32px",
          margin: "0 0 32px 0",
        }}>
          Download the final round question paper for Bug Hunters event at ECLECTICA 2K26.
        </p>

        {/* File Info */}
        <div style={{
          background: fileInfo.exists ? "rgba(212, 175, 55, 0.1)" : "rgba(248, 113, 113, 0.1)",
          border: fileInfo.exists ? "1px solid rgba(212, 175, 55, 0.2)" : "1px solid rgba(248, 113, 113, 0.3)",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "32px",
        }}>
          <p style={{
            fontSize: "14px",
            color: fileInfo.exists ? "#d4af37" : "#f87171",
            fontWeight: "600",
            margin: "0 0 8px 0",
          }}>📄 File Information</p>
          <p style={{
            fontSize: "13px",
            color: "#aaa",
            margin: "0 0 4px 0",
          }}>
            <strong>Name:</strong> {FILE_NAME}
          </p>
          <p style={{
            fontSize: "13px",
            color: fileInfo.exists ? "#aaa" : "#f87171",
            margin: "0",
          }}>
            <strong>Size:</strong> {fileInfo.size}
          </p>
          {fileInfo.error && (
            <p style={{
              fontSize: "12px",
              color: "#f87171",
              margin: "8px 0 0 0",
            }}>
              ⚠️ {fileInfo.error}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
          }}>
            <p style={{
              fontSize: "13px",
              color: "#f87171",
              margin: "0",
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloadStarted || loading || !fileInfo.exists}
          style={{
            width: "100%",
            padding: "16px",
            background: (downloadStarted || loading || !fileInfo.exists)
              ? "rgba(150, 150, 150, 0.3)" 
              : "linear-gradient(135deg, #d4af37, #f4d03f)",
            color: (downloadStarted || loading || !fileInfo.exists) ? "#999" : "#0a1628",
            border: (downloadStarted || loading) ? "1px solid rgba(52, 211, 153, 0.4)" : "none",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "16px",
            cursor: (downloadStarted || loading || !fileInfo.exists) ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            marginBottom: "16px",
          }}
          onMouseOver={e => {
            if (!downloadStarted && !loading && fileInfo.exists) {
              e.target.style.transform = "scale(1.02)";
              e.target.style.boxShadow = "0 8px 24px rgba(212, 175, 55, 0.3)";
            }
          }}
          onMouseOut={e => {
            if (!downloadStarted && !loading) {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "none";
            }
          }}
        >
          {loading ? "⏳ Loading..." : downloadStarted ? "✓ Downloading..." : !fileInfo.exists ? "⚠️ File Not Available" : "⬇️ Download Question Paper"}
        </button>

        {/* Info Text */}
        <p style={{
          fontSize: "12px",
          color: "#666",
          lineHeight: "1.6",
          margin: "0",
        }}>
          The file will download to your default download folder. <br />
          If the download doesn't start, please refresh the page and try again.
        </p>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: "60px",
        textAlign: "center",
        color: "#666",
        fontSize: "12px",
      }}>
        <p>© 2026 ECLECTICA — ECE Dept, MITS Deemed University</p>
      </div>
    </div>
  );
}
