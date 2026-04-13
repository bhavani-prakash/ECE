import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, query, where, doc } from "firebase/firestore";
import { db } from "../config/firebase.js";

export default function DownloadHistory() {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryLoading, setRetryLoading] = useState({});

  // ── Fetch all downloads with participant details ─────────────────────────────
  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      setLoading(true);
      setError("");

      // Get all downloads
      const downloadCollection = collection(db, "certificate_downloads");
      const downloadsSnapshot = await getDocs(downloadCollection);

      // Fetch participant details for each download
      const downloadList = await Promise.all(
        downloadsSnapshot.docs.map(async (downloadDoc) => {
          const downloadData = downloadDoc.data();
          
          try {
            // Get participant details from registrations
            const regQuery = query(
              collection(db, "registrations"),
              where("rollnumber", "==", downloadData.rollnumber)
            );
            const regSnapshot = await getDocs(regQuery);
            
            const participantData = regSnapshot.empty 
              ? null 
              : regSnapshot.docs[0].data();

            return {
              id: downloadDoc.id,
              ...downloadData,
              participantName: participantData?.name || "N/A",
              participantEmail: participantData?.email || "N/A",
              participantEvent: participantData?.event || "N/A",
              downloadedAtFormatted: downloadData.downloadedAt?.toDate?.()?.toLocaleString() || 
                                    new Date(downloadData.timestamp).toLocaleString(),
            };
          } catch (err) {
            return {
              id: downloadDoc.id,
              ...downloadData,
              participantName: "Error loading",
              participantEmail: "N/A",
              participantEvent: "N/A",
              downloadedAtFormatted: downloadData.downloadedAt?.toDate?.()?.toLocaleString() || 
                                    new Date(downloadData.timestamp).toLocaleString(),
            };
          }
        })
      );

      setDownloads(downloadList);
    } catch (err) {
      setError("Error fetching downloads: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Allow retry - delete the download record ───────────────────────────────────
  const handleRetry = async (downloadId, rollNumber) => {
    try {
      setRetryLoading({ ...retryLoading, [downloadId]: true });
      
      // Delete the download record
      const downloadRef = doc(db, "certificate_downloads", downloadId);
      await deleteDoc(downloadRef);

      // Remove from UI
      setDownloads(downloads.filter(d => d.id !== downloadId));
      
      // Show success message
      setError(`✓ Retry enabled for Roll #${rollNumber}. They can now download again.`);
      setTimeout(() => setError(""), 3000);
    } catch (err) {
      setError("Error enabling retry: " + err.message);
    } finally {
      setRetryLoading({ ...retryLoading, [downloadId]: false });
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────────
  const containerStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
  };

  const pageStyle = {
    maxWidth: "1200px",
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

  const tableContainerStyle = {
    overflowX: "auto",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  };

  const thStyle = {
    background: "#667eea",
    color: "white",
    padding: "12px",
    textAlign: "left",
    fontWeight: "bold",
    fontSize: "14px",
    borderBottom: "2px solid #5568d3",
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "14px",
  };

  const rowHoverStyle = {
    background: "#f7fafc",
  };

  const errorStyle = {
    padding: "12px",
    background: "#fed7d7",
    color: "#c53030",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
  };

  const successStyle = {
    padding: "12px",
    background: "#c6f6d5",
    color: "#22543d",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px",
  };

  const retryButtonStyle = {
    padding: "8px 16px",
    background: "#f6ad55",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    transition: "background 0.3s",
  };

  const loadingStyle = {
    textAlign: "center",
    padding: "40px",
    fontSize: "16px",
    color: "#666",
  };

  const emptyStyle = {
    textAlign: "center",
    padding: "40px",
    fontSize: "16px",
    color: "#999",
  };

  return (
    <div style={containerStyle}>
      <div style={pageStyle}>
        <h1 style={titleStyle}>📊 Certificate Download History</h1>
        <p style={subtitleStyle}>
          View all downloaded certificates and manage retry options
        </p>

        {error && (
          <div style={error.includes("✓") ? successStyle : errorStyle}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={loadingStyle}>Loading download history...</div>
        ) : downloads.length === 0 ? (
          <div style={emptyStyle}>
            No certificates have been downloaded yet.
          </div>
        ) : (
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Roll Number</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Event</th>
                  <th style={thStyle}>Downloaded At</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((download, idx) => (
                  <tr key={download.id} style={idx % 2 === 0 ? rowHoverStyle : {}}>
                    <td style={tdStyle}>
                      <strong>{download.rollnumber}</strong>
                    </td>
                    <td style={tdStyle}>{download.participantName}</td>
                    <td style={tdStyle}>{download.participantEmail}</td>
                    <td style={tdStyle}>{download.participantEvent}</td>
                    <td style={tdStyle}>{download.downloadedAtFormatted}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleRetry(download.id, download.rollnumber)}
                        disabled={retryLoading[download.id]}
                        style={{
                          ...retryButtonStyle,
                          opacity: retryLoading[download.id] ? 0.6 : 1,
                          cursor: retryLoading[download.id] ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={(e) => {
                          if (!retryLoading[download.id]) {
                            e.target.style.background = "#ed8936";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = "#f6ad55";
                        }}
                      >
                        {retryLoading[download.id] ? "Processing..." : "Allow Retry"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <p style={{ color: "#666", fontSize: "12px" }}>
            Total Downloads: <strong>{downloads.length}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
