import React, { useState } from "react";
import './HomePage.css';
import Header from '../Header/Header';
import RetroPage from "../Retro/RetroPage";
import ModernPage from "../Modern/ModernPage";

export default function HomePage() {
    const [ratio, setRatio] = useState(50); // 50% by default

  return (
    <div className="overlay-container">
      {/* Modern Page at the back */}
      <div className="page modern">
        <ModernPage />
      </div>

      {/* Retro Page on top, width controlled by slider */}
      <div
        className="page retro"
        style={{ width: `${ratio}%` }}
      >
        <RetroPage />
      </div>

      {/* Slider */}
      <input
        type="range"
        min="0"
        max="100"
        value={ratio}
        className="slider"
        onChange={(e) => setRatio(e.target.value)}
      />
    </div>
    )
}
