import React, { useState, useRef, useEffect } from "react";
import useAudioPlayer from "../../AudioComponent/useAudioPlayer";
import "./RePopup.css";

export default function RePopup({ closePopup }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [downloadFormat, setDownloadFormat] = useState('wav');

  // Use the audio player hook
  const audioPlayer = useAudioPlayer();

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    await audioPlayer.handleFileUpload(file);
  }

  async function handleEffect(effectName) {
    const playbackRate = effectName === 'bardcore' ? 0.92 : 
                         effectName === 'nightcore' ? 1.3 : 
                         effectName === 'slowedreverb' ? 0.85 : 1;
    
    const result = await audioPlayer.applyRetroEffect(effectName, playbackRate);
    
    if (result.success) {
      // Automatically switch to the processed audio after a brief delay
      setTimeout(() => {
        if (audioPlayer.audioRef.current && audioPlayer.processedUrl) {
          const wasPlaying = audioPlayer.isPlaying;
          audioPlayer.audioRef.current.src = audioPlayer.processedUrl;
          if (wasPlaying) {
            audioPlayer.play();
          }
        }
      }, 100);
    }
  }

  // Setup audio element event listeners
  useEffect(() => {
    const audio = audioPlayer.audioRef.current;
    if (!audio) return;

    const handlePlay = () => audioPlayer.play();
    const handlePause = () => audioPlayer.pause();

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioPlayer.audioRef.current]);

  return (
    <div className="repop">
      <div className="popup-overlay">
        <div className="popup-content">
          <button className="popup-close" onClick={closePopup}>
            ✖
          </button>
          <h1 className="title">🎵 Retro Audio Player</h1>
          <div className="boombox-container">
            <audio 
              ref={audioPlayer.audioRef} 
              src={audioPlayer.processedUrl || audioPlayer.originalUrl}
            />
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleUpload}
              style={{ display: 'none' }}
              accept="audio/*"
            />
            
            <div className="file-upload-wrapper">
              <button 
                className="file-upload-button"
                onClick={() => fileInputRef.current.click()}
              >
                Choose File
              </button>
              <span className="file-name">{fileName}</span>
            </div>

            <div className="controls">
              <button 
                onClick={audioPlayer.play} 
                disabled={!audioPlayer.originalUrl || audioPlayer.processing}
              >
                ▶️ Play
              </button>
              <button 
                onClick={audioPlayer.pause} 
                disabled={!audioPlayer.originalUrl}
              >
                ⏸️ Pause
              </button>
              <button 
                onClick={() => audioPlayer.skipBackward()} 
                disabled={!audioPlayer.originalUrl}
              >
                ⏪ 10s
              </button>
              <button 
                onClick={() => audioPlayer.skipForward()} 
                disabled={!audioPlayer.originalUrl}
              >
                10s ⏩
              </button>
              <button 
                onClick={() => {
                  audioPlayer.useOriginalAudio();
                  audioPlayer.reset();
                }} 
                disabled={!audioPlayer.originalUrl}
              >
                🔄 Reset
              </button>
            </div>
            
            <div className="volume-control">
              <label>Volume: {Math.round(audioPlayer.volume * 100)}%</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={audioPlayer.volume}
                onChange={(e) => audioPlayer.changeVolume(Number(e.target.value))}
              />
            </div>
            
            <div className="effects">
              <h3>Retro Effects</h3>
              <div className="effects-grid">
                {[
                  { id: "pcspeaker", label: "💾 PC Speaker" },
                  { id: "8bit", label: "🎮 8-bit (NES)" },
                  { id: "arcade", label: "🏁 Arcade" },
                  { id: "fmsynth", label: "🧿 FM Synth" },
                  { id: "16bit", label: "🕹️ 16-bit (SNES)" },
                  { id: "lofi", label: "📻 Lofi" },
                  { id: "bardcore", label: "🏰 Bardcore" }
                ].map((effect) => (
                  <button 
                    key={effect.id} 
                    onClick={() => handleEffect(effect.id)}
                    disabled={!audioPlayer.originalUrl || audioPlayer.processing}
                    className={audioPlayer.activeEffect === effect.id ? 'active' : ''}
                  >
                    {effect.label}
                  </button>
                ))}
              </div>
            </div>
            
            {audioPlayer.processing && (
              <div className="processing-indicator">
                <span>⚙️ Processing...</span>
              </div>
            )}
            
            {audioPlayer.activeEffect && !audioPlayer.processing && (
              <div className="active-effect-info">
                <span>Active Effect: <strong>{audioPlayer.activeEffect}</strong></span>
                <button 
                  onClick={audioPlayer.useOriginalAudio}
                  className="remove-effect-btn"
                >
                  Remove Effect
                </button>
              </div>
            )}
            
            <div className="download-section">
              <select 
                value={downloadFormat} 
                onChange={(e) => setDownloadFormat(e.target.value)}
                className="format-select"
              >
                <option value="wav">WAV</option>
                <option value="mp3">MP3</option>
              </select>
              <button 
                onClick={() => audioPlayer.downloadAudio(downloadFormat)} 
                disabled={!audioPlayer.originalUrl}
                className="download-btn"
              >
                ⬇️ Download {downloadFormat.toUpperCase()}
              </button>
            </div>

            <div className="info-note">
              <small>💡 All processing happens in your browser. No files are uploaded.</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}