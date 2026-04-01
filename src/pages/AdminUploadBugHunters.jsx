import React, { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase.js";

export default function AdminUploadBugHunters() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const ADMIN_EMAIL = "admin@ece.com";
  const ADMIN_PASSWORD = "eclectica2k26";
  const STORAGE_PATH = "bug-hunters/Bug_Hunters_Final_Round_Question_1.pdf";

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === ADMIN_EMAIL && loginPass === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setLoginErr("");
    } else {
      setLoginErr("Invalid credentials");
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate PDF
    if (!selectedFile.type.includes("pdf")) {
      setError("Please upload a PDF file");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size must be under 50 MB");
      return;
    }

    setFile(selectedFile);
    setError("");
    setPreview(`📄 ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setUploadStatus("Starting upload...");
    setUploadProgress(0);

    try {
      console.log("Starting upload for file:", file.name, "Size:", file.size);
      const fileRef = ref(storage, STORAGE_PATH);
      console.log("File reference created:", STORAGE_PATH);
      
      // Use uploadBytesResumable for progress tracking
      const uploadTask = uploadBytesResumable(fileRef, file);
      console.log("Upload task started");

      // Monitor upload progress
      uploadTask.on("state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          console.log("Upload progress:", progress + "%");
          setUploadProgress(progress);
          setUploadStatus(`Uploading... ${progress}%`);
        },
        (error) => {
          // Error handler
          console.error("Upload error - Code:", error.code, "Message:", error.message);
          let errorMsg = error.message;
          
          if (error.code === "storage/unauthorized") {
            errorMsg = "Permission denied. Check Firebase Storage rules.";
          } else if (error.code === "storage/project-not-found") {
            errorMsg = "Firebase project not found.";
          } else if (error.code === "storage/quota-exceeded") {
            errorMsg = "Storage quota exceeded.";
          }
          
          setError(`Upload failed: ${errorMsg}`);
          setUploading(false);
          setUploadProgress(0);
          setUploadStatus("");
        },
        async () => {
          // Success handler
          try {
            console.log("Upload completed, getting download URL...");
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Download URL:", downloadURL);
            setSuccess(`✓ File uploaded successfully!`);
            setFile(null);
            setPreview("");
            setUploadProgress(0);
            setUploadStatus("");
            setUploading(false);
          } catch (err) {
            console.error("Error getting download URL:", err.code, err.message);
            setError(`Upload succeeded but could not get URL: ${err.message}`);
            setUploading(false);
          }
        }
      );
    } catch (err) {
      console.error("Upload setup error:", err);
      setError(`Upload failed: ${err.message}`);
      setUploading(false);
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
        }}>📤 Upload Bug Hunters PDF</h1>

        <form onSubmit={handleUpload}>
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              color: "#aaa",
              fontSize: "14px",
              marginBottom: "12px",
              fontWeight: "500",
            }}>Select PDF File *</label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              required={!file}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255,255,255,0.07)",
                border: "2px dashed rgba(212,175,55,0.3)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            />
            {preview && (
              <p style={{
                fontSize: "12px",
                color: "#34d399",
                marginTop: "8px",
                fontWeight: "500",
              }}>✓ {preview}</p>
            )}
          </div>

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
              }}>❌ {error}</p>
            </div>
          )}

          {success && (
            <div style={{
              background: "rgba(52, 211, 153, 0.1)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
            }}>
              <p style={{
                fontSize: "13px",
                color: "#34d399",
                margin: "0",
              }}>{success}</p>
            </div>
          )}

          {uploading && (
            <div style={{
              background: "rgba(100, 150, 255, 0.1)",
              border: "1px solid rgba(100, 150, 255, 0.3)",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
            }}>
              <p style={{
                fontSize: "13px",
                color: "#6496ff",
                margin: "0 0 8px 0",
              }}>{uploadStatus}</p>
              <div style={{
                background: "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                overflow: "hidden",
                height: "6px",
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  background: "#d4af37",
                  height: "100%",
                  transition: "width 0.3s",
                }} />
              </div>
              <p style={{
                fontSize: "12px",
                color: "#d4af37",
                margin: "6px 0 0 0",
              }}>{uploadProgress}% Complete</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !file}
            style={{
              width: "100%",
              padding: "14px",
              background: uploading || !file 
                ? "rgba(150, 150, 150, 0.3)" 
                : "linear-gradient(135deg, #d4af37, #f4d03f)",
              color: uploading || !file ? "#999" : "#0a1628",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: uploading || !file ? "not-allowed" : "pointer",
              fontSize: "16px",
              transition: "transform 0.2s",
            }}
            onMouseOver={e => !uploading && file && (e.target.style.transform = "scale(1.02)")}
            onMouseOut={e => !uploading && file && (e.target.style.transform = "scale(1)")}
          >
            {uploading ? "⏳ Uploading..." : "📤 Upload PDF"}
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

        <div style={{
          marginTop: "32px",
          padding: "16px",
          background: "rgba(212, 175, 55, 0.05)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          borderRadius: "8px",
        }}>
          <p style={{
            fontSize: "12px",
            color: "#d4af37",
            fontWeight: "600",
            margin: "0 0 8px 0",
          }}>ℹ️ Instructions:</p>
          <ul style={{
            fontSize: "12px",
            color: "#aaa",
            lineHeight: "1.6",
            margin: "0",
            paddingLeft: "16px",
          }}>
            <li>Select the Bug Hunters question PDF file</li>
            <li>Click "Upload PDF" to upload to Firebase Storage</li>
            <li>Once uploaded, the file will be available on the download page</li>
            <li>File is stored at: <code style={{ color: "#34d399" }}>bug-hunters/Bug_Hunters_Final_Round_Question_1.pdf</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
