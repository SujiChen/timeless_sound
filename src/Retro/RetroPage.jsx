import React, { useState } from "react";
import "./Retro.css";
import Header from "../Header/Header";
import RePopup from "./RePopup/RePopup";   // ← USE THIS POPUP

export default function Retro() {
  const [showTapePopup, setShowTapePopup] = useState(false);
 const openPopup = () => setShowTapePopup(true);
  const closePopup = () => setShowTapePopup(false);
  return (
    <div className="retro-page">
      <Header />
      <h1 className="retro-title1">RETRO VIBES</h1>

      <div className="boombox">
        {/* Handle */}
        <div className="handle"></div>

        {/* Antenna */}
        <div className="antenna"></div>

        {/* Top panels */}
        <div className="panels">
          <div className="panel"></div>
          <div className="panel gradient"></div>
          <div className="panel"></div>
        </div>

        {/* Middle row: speakers + tape deck */}
        <div className="middle-row">
          <div className="speaker-container">
            <div className="speaker">
              <div className="led"></div>
            </div>
          </div>

          {/* CLICK TO OPEN POPUP */}
          <div
            className="tape-deck-container"
            onClick={() => setShowTapePopup(true)}
          >
            <div className="tape-deck">
              <div className="spool"></div>
              <div className="spool"></div>
            </div>
          </div>

          <div className="speaker-container">
            <div className="speaker">
              <div className="led"></div>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="controls">
          <div className="buttons">
            <div className="btn red"></div>
            <div className="btn yellow"></div>
            <div className="btn blue"></div>
          </div>
          <div className="knobs">
            <div className="knob"></div>
            <div className="knob"></div>
          </div>
          <div className="switches">
            <div className="switch"></div>
            <div className="switch"></div>
          </div>
          <div className="volume-slider"></div>
        </div>

        {/* Equalizer */}
        <div className="equalizer">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      </div>

      {/* POPUP COMPONENT */}
      {showTapePopup && <RePopup closePopup={() => setShowTapePopup(false)} />}
    </div>
  );
}
