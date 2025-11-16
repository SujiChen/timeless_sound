import React from "react";
import "./Modern.css";
import Header from '../Header/Header';

export default function Modern() {
  return (
    <div className="modern-page">
      <Header />

      <h1 className="modern-title4">MODERN SOUND</h1>
      
      <div className="modern-layout">
        {/* Left Speaker */}
        <div className="modern-speaker">
          <div className="speaker-circle tweeter"></div>
          <div className="speaker-circle mid"></div>
          <div className="speaker-circle bass"></div>
        </div>

        {/* Monitor */}
        <div className="modern-monitor">
          <div className="screen">
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

    </div>
  );
}
