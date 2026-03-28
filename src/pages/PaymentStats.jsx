import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase.js";
import "./PaymentStats.css";

export default function PaymentStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const snapshot = await getDocs(collection(db, "registrations"));
        const registrations = snapshot.docs.map(doc => doc.data());

        // Calculate total amount and group by event
        let totalAmount = 0;
        let totalRegistrations = 0;
        const eventStats = {};
        const paymentStatusCount = { paid: 0, pending: 0, free: 0 };

        registrations.forEach(reg => {
          totalAmount += reg.paymentAmount || 0;
          totalRegistrations += 1;
          paymentStatusCount[reg.paymentStatus]++;

          // Group by event
          if (!eventStats[reg.event]) {
            eventStats[reg.event] = {
              count: 0,
              totalAmount: 0,
              byStatus: { paid: 0, pending: 0, free: 0 },
            };
          }
          eventStats[reg.event].count += 1;
          eventStats[reg.event].totalAmount += reg.paymentAmount || 0;
          eventStats[reg.event].byStatus[reg.paymentStatus]++;
        });

        setStats({
          totalAmount,
          totalRegistrations,
          paymentStatusCount,
          eventStats,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError("Failed to load payment stats. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="payment-stats-container"><p>Loading stats...</p></div>;
  }

  if (error) {
    return <div className="payment-stats-container"><p className="error">{error}</p></div>;
  }

  if (!stats) {
    return <div className="payment-stats-container"><p>No data available</p></div>;
  }

  return (
    <div className="payment-stats-container">
      <button className="back-btn" onClick={() => window.history.back()}>← Back</button>
      
      <h1>💰 Payment Statistics</h1>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card total-amount">
          <h3>Total Amount</h3>
          <p className="amount">₹{stats.totalAmount.toLocaleString()}</p>
        </div>
        <div className="card total-registrations">
          <h3>Total Registrations</h3>
          <p className="count">{stats.totalRegistrations}</p>
        </div>
        <div className="card paid">
          <h3>Paid</h3>
          <p className="count">{stats.paymentStatusCount.paid}</p>
        </div>
        <div className="card pending">
          <h3>Pending</h3>
          <p className="count">{stats.paymentStatusCount.pending}</p>
        </div>
        <div className="card free">
          <h3>Free Events</h3>
          <p className="count">{stats.paymentStatusCount.free}</p>
        </div>
      </div>

      {/* Event-wise Breakdown */}
      <div className="event-breakdown">
        <h2>Event-wise Breakdown</h2>
        <div className="table-wrapper">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Registrations</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Free</th>
                <th>Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.eventStats)
                .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
                .map(([eventName, eventData]) => (
                  <tr key={eventName}>
                    <td className="event-name">{eventName}</td>
                    <td>{eventData.count}</td>
                    <td className="status-paid">{eventData.byStatus.paid}</td>
                    <td className="status-pending">{eventData.byStatus.pending}</td>
                    <td className="status-free">{eventData.byStatus.free}</td>
                    <td className="amount">{eventData.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
