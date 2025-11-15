import React, { useState } from "react";
import './HomePage.css';
import Header from '../Header/Header';
import RetroPage from "../Retro/RetroPage";
import ModernPage from "../Modern/ModernPage";



export default function HomePage() {
    const [ratio, setRatio] = useState(50);
    const handleSlide = (e) => {
        setRatio(e.target.value);
    };

    return(
        <div className="home-container">
            
        {/* <Header/> */}

        <div className="retro-half" style={{ width: `${ratio}%` }}>
            <RetroPage />
        </div>

      <div className="modern-half" style={{ width: `${100 - ratio}%` }}>
        <ModernPage />
      </div>

      {/* Slider Control */}
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