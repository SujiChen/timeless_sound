import React, { useRef, useState } from "react";
import AudioPlayerCore from "../ModernAudioCore"; // Core player
import "./MoPopup.css";

export default function MoPopup({ closePopup }) {
  const audioRef = useRef(null);
  const [fileLoaded, setFileLoaded] = useState(false);
  const audioCore = AudioPlayerCore();

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const res = await audioCore.handleFileUpload(file);
    if (res.success) {
      setFileLoaded(true);
      audioRef.current.src = URL.createObjectURL(file);
    }
  }

  function handleEffect(effectName) {
    audioCore.applyModernEffect(effectName).then((res) => {
      if (res.success) {
        audioCore.useProcessedAudio();
      }
    });
  }

  return (
    <div className="mopop">

    <div className="popup-overlay">
      <div className="popup-content">
        <button className="close-btn" onClick={closePopup}>
          ✖
        </button>

        <h2>Modern Audio Player</h2>
        <audio ref={audioRef} />

        <input type="file" onChange={handleUpload} />

        <div className="controls">
          <button onClick={audioCore.play}>Play</button>
          <button onClick={audioCore.pause}>Pause</button>
          <button onClick={() => audioCore.skipBackward()}>⏪ 10s</button>
          <button onClick={() => audioCore.skipForward()}>10s ⏩</button>
          <button onClick={audioCore.reset}>Reset</button>
        </div>

        <div className="volume">
          <label>Volume:</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={audioCore.volume}
            onChange={(e) => audioCore.changeVolume(Number(e.target.value))}
          />
        </div>

        <div className="effects">
          {["bassboosted", "synthwave", "nightcore", "slowedreverb", "orchestral"].map(
            (effect) => (
              <button key={effect} onClick={() => handleEffect(effect)}>
                {effect}
              </button>
            )
          )}
        </div>

        <button className="download-btn" onClick={() => audioCore.downloadAudio()}>
          Download
        </button>
      </div>
    </div>
    </div>
  );
}
