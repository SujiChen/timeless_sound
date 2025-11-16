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

      <h1 className="modern-title4">MODERN SOUND</h1>
      
      <div className="modern-layout">
        {/* Left Speaker */}
        <div className="modern-speaker led-border">
           <div className="speaker-circle tweeter">
            <div className="speaker-inner tweeter-inner"></div>
          </div>
          <div className="speaker-circle mid">
            <div className="speaker-inner mid-inner"></div>
          </div>
          <div className="speaker-circle bass">
            <div className="speaker-inner bass-inner"></div>
          </div>
         </div>

        {/* Monitor */}
        <div className="modern-monitor led-border">

        <div className="screen">
            <div className="desktop-apps" onClick={() => setShowTapePopup(true)}>
              <div className="app-icon music">
                <span className="app-emoji ">♫</span>
                {/* ♪ */}
                <span className="app-label"></span>
              </div>
              {/* <div className="app-icon video">
                <span className="app-emoji">🎬</span>
                <span className="app-label"></span>
              </div>
              <div className="app-icon settings">
                <span className="app-emoji">⚙️</span>
                <span className="app-label"></span>
              </div> */}
            </div>
          </div>
          <div className="monitor-stand"></div>
        </div>

        {/* Right Speaker */}
        <div className="modern-speaker led-border">
           <div className="speaker-circle tweeter">
            <div className="speaker-inner tweeter-inner"></div>
          </div>
          <div className="speaker-circle mid">
            <div className="speaker-inner mid-inner"></div>
          </div>
          <div className="speaker-circle bass">
            <div className="speaker-inner bass-inner"></div>
          </div>
        </div>
      </div>
{/* POPUP COMPONENT */}
      {showTapePopup && <MoPopup closePopup={() => setShowTapePopup(false)} />}
    
    </div>
  );
}