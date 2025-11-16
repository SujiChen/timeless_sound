import React, { useState } from "react";
import "./Modern.css";
import Header from '../Header/Header';
import MoPopup from "./MoPopup/MoPopup";   // ← USE THIS POPUP

export default function Modern() {
    const [showTapePopup, setShowTapePopup] = useState(false);
    const openPopup = () => setShowTapePopup(true);
    const closePopup = () => setShowTapePopup(false);
  return (
    <div className="modern-page">
      <Header />
      <h1 className="modern-title">MODERN SOUND</h1>

      <div className="modern-layout">
        {/* Left Speaker */}
        <div className="modern-speaker">
          <div className="speaker-circle tweeter"></div>
          <div className="speaker-circle mid"></div>
          <div className="speaker-circle bass"></div>
        </div>

        {/* Monitor */}
        <div className="modern-monitor">
          <div className="screen" onClick={() => setShowTapePopup(true)}>
            <div className="monitor-buttons">
              <button className="monitor-btn">⏮</button>
              <button className="monitor-btn">⏯</button>
              <button className="monitor-btn">⏭</button>
            </div>
          </div>
          <div className="monitor-stand"></div>
        </div>

        {/* Right Speaker */}
        <div className="modern-speaker">
          <div className="speaker-circle tweeter"></div>
          <div className="speaker-circle mid"></div>
          <div className="speaker-circle bass"></div>
        </div>
      </div>
{/* POPUP COMPONENT */}
      {showTapePopup && <MoPopup closePopup={() => setShowTapePopup(false)} />}
    
    </div>
  );
}
