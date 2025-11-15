import React from "react";
import "./Retro.css";
import Header from '../Header/Header';

export default function Retro() {
  return (
    <div className="retro-page">
         <Header/>
      <div className="boombox">
        <div className="speakers">
          <div className="speaker"></div>
          <div className="speaker"></div>
        </div>

        <div className="controls">
          <div className="tape-deck"></div>
          <div className="buttons">
            <div className="btn red"></div>
            <div className="btn yellow"></div>
            <div className="btn blue"></div>
          </div>
        </div>
      </div>

      <h1 className="retro-title">RETRO VIBES</h1>
    </div>
  );
}
