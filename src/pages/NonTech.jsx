import React from "react";
import { useNavigate } from "react-router-dom";

const events = [
  { name: "Free Fire",      fee: 200 },
  { name: "BGMI",           fee: 200 },
  { name: "cineQuest",      fee: 50  },
  { name: "Balloon Spirit", fee: 50  },
  { name: "Rope Rumble",    fee: 50  },
  { name: "Ball Heist",     fee: 50  },
];

export default function NonTech() {
  const navigate = useNavigate();
  return (
    <div>
      <button className="back-btn" onClick={() => window.location.href = "https://eclectica2k26.netlify.app/"}>← Back</button>
      <section className="hero">
        <h1 className="fest-name"><span className="big-letter">E</span>CLECTIC<span className="big-letter">A</span></h1>
        <div className="year">2k26</div>
        <h2>Non-Technical Events</h2>
        <p>Register for fun non-technical events at Eclectica 2k26 🎉</p>
        <p className="contact-note">Issues? Call us: +91 8125035960</p>
      </section>
      <section className="events-section">
        <div className="events-grid">
          {events.map(ev => (
            <div className="event-card" key={ev.name}>
              <h3>{ev.name}</h3>
              <p className="event-fee">₹{ev.fee}</p>
              <button className="btn-register"
                onClick={() => navigate(`/register?event=${encodeURIComponent(ev.name)}&type=non-technical&fee=${ev.fee}`)}>
                Register
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
