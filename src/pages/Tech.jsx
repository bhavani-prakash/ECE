import React from "react";
import { useNavigate } from "react-router-dom";

const events = [
  { name: "Tech Quiz",           fee: 70  },
  { name: "Bug Hunters",         fee: 70  },
  { name: "Circuit Detective",   fee: 70  },
  { name: "Paper Presentation",  fee: 70  },
  { name: "Poster Presentation", fee: 70  },
  { name: "Project Expo",        fee: 100, note: "₹100 per team (2–3 members)" },
  { name: "Debate",              fee: 40 },
];

export default function Tech() {
  const navigate = useNavigate();
  return (
    <div>
      <button className="back-btn" onClick={() => window.location.href = "https://eclectica2k26.netlify.app/"}>← Back</button>
      <section className="hero">
        <h1 className="fest-name"><span className="big-letter">E</span>CLECTIC<span className="big-letter">A</span></h1>
        <div className="year">2k26</div>
        <h2>Technical Events</h2>
        <p>Register for exciting technical events at Eclectica 2k26 🚀</p>
        <p className="contact-note">Issues? Call us: +91 8125035960</p>
      </section>
      <section className="events-section">
        <div className="events-grid">
          {events.map(ev => (
            <div className="event-card" key={ev.name}>
              <h3>{ev.name}</h3>
              <p className="event-fee">{ev.fee === 0 ? "Free" : `₹${ev.fee}`}</p>
              {ev.note && <p className="event-note">{ev.note}</p>}
              <button className="btn-register"
                onClick={() => navigate(`/register?event=${encodeURIComponent(ev.name)}&type=technical&fee=${ev.fee}`)}>
                Register
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
