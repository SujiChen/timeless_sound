import React, { useState, useRef } from "react";
import AudioPlayerCore from "../RetroAudioCore";
import "./RePopup.css";

export default function RePopup({ closePopup }) {
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
    audioCore.applyRetroEffect(effectName).then((res) => {
      if (res.success) audioCore.useProcessedAudio();
    });
  }

  return (
    <div className="repop">

      <div className="popup-overlay">
        <div className="popup-content">
          <button className="popup-close" onClick={closePopup}>
            ✖
          </button>
          <h1>🎵 Retro Cassette Tape</h1>
          <div className="boombox-container">
            <audio ref={audioRef} />
            <input type="file" onChange={handleUpload} />
            <div className="controls">
              <button onClick={audioCore.play}>Play</button>
              <button onClick={audioCore.pause}>Pause</button>
              <button onClick={() => audioCore.skipBackward()}>⏪ 10s</button>
              <button onClick={() => audioCore.skipForward()}>10s ⏩</button>
              <button onClick={audioCore.reset}>Reset</button>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audioCore.volume}
              onChange={(e) => audioCore.changeVolume(Number(e.target.value))}
            />
            <div className="effects">
              {["pcspeaker", "8bit", "arcade", "fmsynth", "16bit", "lofi", "bardcore"].map(
                (effect) => (
                  <button key={effect} onClick={() => handleEffect(effect)}>
                    {effect}
                  </button>
                )
              )}
            </div>
            <button onClick={() => audioCore.downloadAudio()}>Download</button>
          </div>
        </div>
      </div>
    </div>
  );
}
