import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase.js";
import "./RegistrationManager.css";

export default function RegistrationManager() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [registrations, setRegistrations] = useState([]);
  const [deleteHistory, setDeleteHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showDeleteHistory, setShowDeleteHistory] = useState(false);

  const ADMIN_EMAIL = "admin@ece.com";
  const ADMIN_PASSWORD = "eclectica2k26";

  useEffect(() => {
    if (loggedIn) {
      fetchRegistrations();
      fetchDeleteHistory();
    }
  }, [loggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === ADMIN_EMAIL && loginPass === ADMIN_PASSWORD) {
      setLoggedIn(true);
      setLoginErr("");
    } else {
      setLoginErr("Invalid credentials");
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "registrations"));
      const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegistrations(regs);
    } catch (err) {
      console.error("Error fetching registrations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeleteHistory = async () => {
    try {
      const snapshot = await getDocs(collection(db, "deletedRegistrations"));
      const history = snapshot.docs.map(doc => ({ historyId: doc.id, ...doc.data() }));
      setDeleteHistory(history);
    } catch (err) {
      console.error("Error fetching delete history:", err);
    }
  };

  const handleDeleteRegistration = async (reg) => {
    if (!window.confirm(`Are you sure you want to delete the registration for ${reg.name}?`)) {
      return;
    }

    try {
      // Save to delete history before deleting
      await addDoc(collection(db, "deletedRegistrations"), {
        ...reg,
        originalId: reg.id,
        deletedAt: serverTimestamp(),
        deletedBy: loginEmail,
      });

      // Delete from registrations
      await deleteDoc(doc(db, "registrations", reg.id));

      // Update local state
      setRegistrations(registrations.filter(r => r.id !== reg.id));
      await fetchDeleteHistory();

      alert(`Registration for ${reg.name} deleted successfully!`);
    } catch (err) {
      console.error("Error deleting registration:", err);
      alert("Failed to delete registration: " + err.message);
    }
  };

  const handleRestoreRegistration = async (deletedReg) => {
    if (!window.confirm(`Are you sure you want to restore the registration for ${deletedReg.name}?`)) {
      return;
    }

    try {
      const originalId = deletedReg.originalId;
      
      // Re-add to registrations
      await addDoc(collection(db, "registrations"), {
        name: deletedReg.name,
        email: deletedReg.email,
        college: deletedReg.college,
        rollnumber: deletedReg.rollnumber,
        contactnumber: deletedReg.contactnumber,
        whatsappnumber: deletedReg.whatsappnumber,
        year: deletedReg.year,
        department: deletedReg.department,
        eventType: deletedReg.eventType,
        event: deletedReg.event,
        paymentAmount: deletedReg.paymentAmount,
        paymentStatus: deletedReg.paymentStatus,
        utrNumber: deletedReg.utrNumber,
        screenshotURL: deletedReg.screenshotURL,
        createdAt: deletedReg.createdAt,
      });

      // Remove from delete history
      await deleteDoc(doc(db, "deletedRegistrations", deletedReg.historyId));

      // Update local state
      setDeleteHistory(deleteHistory.filter(h => h.historyId !== deletedReg.historyId));
      await fetchRegistrations();

      alert(`Registration for ${deletedReg.name} restored successfully!`);
    } catch (err) {
      console.error("Error restoring registration:", err);
      alert("Failed to restore registration: " + err.message);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  // Calculate event-wise registration counts
  const getEventWiseCounts = () => {
    const eventCounts = {};
    registrations.forEach(r => {
      if (r.event) {
        if (!eventCounts[r.event]) {
          eventCounts[r.event] = { total: 0, pending: 0, verified: 0, free: 0 };
        }
        eventCounts[r.event].total++;
        eventCounts[r.event][r.paymentStatus] = (eventCounts[r.event][r.paymentStatus] || 0) + 1;
      }
    });
    return eventCounts;
  };

  const filteredRegistrations = registrations.filter(r =>
    (r.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.rollnumber || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.college || "").toLowerCase().includes(search.toLowerCase())
  );

  if (!loggedIn) {
    return (
      <div className="rm-login">
        <div className="rm-card">
          <h2>🔐 Admin Login</h2>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Admin email" required
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <input type="password" placeholder="Password" required
              value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            <button type="submit">Login</button>
            {loginErr && <p className="error-msg">{loginErr}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-manager">
      <button className="back-btn" onClick={() => window.history.back()}>← Back</button>

      <div className="header">
        <h1>📋 Registration Manager</h1>
        <div className="header-buttons">
          <button className="btn-refresh" onClick={fetchRegistrations}>↻ Refresh</button>
          <button className="btn-history" onClick={() => setShowDeleteHistory(!showDeleteHistory)}>
            🗑️ Delete History ({deleteHistory.length})
          </button>
          <button className="btn-logout" onClick={() => setLoggedIn(false)}>Logout</button>
        </div>
      </div>

      {!showDeleteHistory ? (
        <>
          {/* Active Registrations */}
          <div className="section">
            <h2>Active Registrations ({registrations.length})</h2>

            {/* Event-wise Summary */}
            <div className="event-summary">
              <h3>📊 Event-wise Breakdown</h3>
              <div className="event-grid">
                {Object.entries(getEventWiseCounts())
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([eventName, counts]) => (
                    <div key={eventName} className="event-card">
                      <div className="event-name">{eventName}</div>
                      <div className="event-total">{counts.total}</div>
                      <div className="event-breakdown">
                        {counts.pending > 0 && <span className="badge-small pending">{counts.pending} pending</span>}
                        {counts.verified > 0 && <span className="badge-small verified">{counts.verified} verified</span>}
                        {counts.free > 0 && <span className="badge-small free">{counts.free} free</span>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Search by name, roll no, or college..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />

            {loading ? (
              <p className="loading">Loading...</p>
            ) : filteredRegistrations.length === 0 ? (
              <p className="no-data">No registrations found.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Roll No</th>
                      <th>College</th>
                      <th>Event</th>
                      <th>Amount (₹)</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.rollnumber}</td>
                        <td>{r.college}</td>
                        <td>{r.event}</td>
                        <td>₹{(r.paymentAmount || 0).toLocaleString()}</td>
                        <td><span className={`badge ${r.paymentStatus}`}>{r.paymentStatus}</span></td>
                        <td className="time-cell">{formatTime(r.createdAt)}</td>
                        <td>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteRegistration(r)}
                            title="Delete this registration"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Delete History */}
          <div className="section delete-history-section">
            <h2>🗑️ Delete History ({deleteHistory.length})</h2>

            {deleteHistory.length === 0 ? (
              <p className="no-data">No deleted registrations.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Roll No</th>
                      <th>Event</th>
                      <th>Amount (₹)</th>
                      <th>Deleted At</th>
                      <th>Deleted By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deleteHistory.map((h, i) => (
                      <tr key={h.historyId} className="deleted-row">
                        <td>{i + 1}</td>
                        <td><strong>{h.name}</strong></td>
                        <td>{h.rollnumber}</td>
                        <td>{h.event}</td>
                        <td>₹{(h.paymentAmount || 0).toLocaleString()}</td>
                        <td className="time-cell">{formatTime(h.deletedAt)}</td>
                        <td>{h.deletedBy || "—"}</td>
                        <td>
                          <button
                            className="btn-restore"
                            onClick={() => handleRestoreRegistration(h)}
                            title="Restore this registration"
                          >
                            ↩️ Undo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
