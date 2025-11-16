import React, { useState } from 'react';
import './HomePage.css';
import RetroPage from '../Retro/RetroPage';
import ModernPage from '../Modern/ModernPage';

export default function HomePage() {
  const [ratio, setRatio] = useState(50);

  return (
    <div className="overlay-container">
      <div className="page modern">
        <ModernPage />
      </div>

      <div
        className="page retro"
        style={{ width: `${100 - ratio}%` }}
      >
        <RetroPage />
      </div>

      <div className="timeline-container">
        <span className="timeline-label">Retro</span>
        <input
          type="range"
          min="0"
          max="100"
          value={ratio}
          className="slider"
          onChange={(e) => setRatio(e.target.value)}
        />
        <span className="timeline-label">Modern</span>
      </div>
    </div>
  );
}
