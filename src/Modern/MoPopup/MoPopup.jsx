import React, { useRef, useState, useEffect } from "react";
import useAudioPlayer from "../../AudioComponent/useAudioPlayer";
import "./MoPopup.css";

export default function MoPopup({ closePopup }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [downloadFormat, setDownloadFormat] = useState('wav');

  // Use the audio player hook
  const audioPlayer = useAudioPlayer();

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const res = await audioPlayer.handleFileUpload(file);
    
    if (res.success && audioPlayer.audioRef.current) {
      audioPlayer.audioRef.current.src = audioPlayer.originalUrl;
    }
  }

  async function handleEffect(effectName) {
    // Set playback rates for specific effects
    const playbackRate = effectName === 'nightcore' ? 1.3 : 
                         effectName === 'slowedreverb' ? 0.85 : 1;
    
    const res = await audioPlayer.applyModernEffect(effectName, playbackRate);
    
    if (res.success) {
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
    <div className="mopop">
      <div className="popup-overlay">
        <div className="popup-content">
          <button className="close-btn" onClick={closePopup}>
            ✖
          </button>

          <div className="title">
            <h2>♫ Modern Audio Studio</h2>
          </div>
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
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Choose Audio File
            </button>
            <span className="file-name">{fileName}</span>
          </div>

          {audioPlayer.originalUrl && (
            <div className="audio-info">
              <div className="waveform-display">
                <div className="waveform-bars">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="bar" style={{height: `${20 + Math.random() * 60}%`}}></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="controls">
            <button 
              className="control-btn play-btn"
              onClick={audioPlayer.play} 
              disabled={!audioPlayer.originalUrl || audioPlayer.processing}
            >
              ▶️ Play
            </button>
            <button 
              className="control-btn"
              onClick={audioPlayer.pause} 
              disabled={!audioPlayer.originalUrl}
            >
              ⏸️ Pause
            </button>
            <button 
              className="control-btn"
              onClick={() => audioPlayer.skipBackward()} 
              disabled={!audioPlayer.originalUrl}
            >
              ⏪ -10s
            </button>
            <button 
              className="control-btn"
              onClick={() => audioPlayer.skipForward()} 
              disabled={!audioPlayer.originalUrl}
            >
              +10s ⏩
            </button>
            <button 
              className="control-btn reset-btn"
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
            <div className="volume-label">
              <span>🔊 Volume</span>
              <span className="volume-value">{Math.round(audioPlayer.volume * 100)}%</span>
            </div>
            <input
              type="range"
              className="volume-slider"
              min={0}
              max={1}
              step={0.01}
              value={audioPlayer.volume}
              onChange={(e) => audioPlayer.changeVolume(Number(e.target.value))}
            />
          </div>

          <div className="effects-section">
            <h3 className="effects-title">🎛️ Modern Effects</h3>
            <div className="effects-grid">
              {[
                { id: "bassboosted", label: "🔊 Bass Boosted", desc: "Heavy bass enhancement" },
                { id: "synthwave", label: "📼 Synthwave", desc: "80s retro vibes" },
                { id: "nightcore", label: "⚡ Nightcore", desc: "Sped up + pitch shift" },
                { id: "slowedreverb", label: "🌙 Slowed + Reverb", desc: "Chill atmospheric sound" },
                { id: "orchestral", label: "🎻 Orchestral", desc: "Classical instrument focus" }
              ].map((effect) => (
                <button 
                  key={effect.id}
                  className={`effect-card ${audioPlayer.activeEffect === effect.id ? 'active' : ''}`}
                  onClick={() => handleEffect(effect.id)}
                  disabled={!audioPlayer.originalUrl || audioPlayer.processing}
                >
                  <div className="effect-icon">{effect.label}</div>
                  <div className="effect-desc">{effect.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {audioPlayer.processing && (
            <div className="processing-indicator">
              <div className="spinner"></div>
              <span>⚙️ Processing audio...</span>
            </div>
          )}

          {audioPlayer.activeEffect && !audioPlayer.processing && (
            <div className="active-effect-banner">
              <div className="effect-status">
                <span className="status-icon">✅</span>
                <span>Active Effect: <strong>{audioPlayer.activeEffect}</strong></span>
              </div>
              <button 
                onClick={audioPlayer.useOriginalAudio}
                className="remove-effect-btn"
              >
                Remove Effect
              </button>
            </div>
          )}

          {audioPlayer.processedUrl && (
            <div className="audio-preview">
              <div className="preview-label">🎵 Processed Audio Preview:</div>
              <audio controls src={audioPlayer.processedUrl} className="preview-player"></audio>
            </div>
          )}

          <div className="download-section">
            <div className="format-selector">
              <label>Format:</label>
              <select 
                value={downloadFormat} 
                onChange={(e) => setDownloadFormat(e.target.value)}
                className="format-select"
              >
                <option value="wav">WAV (Lossless)</option>
                <option value="mp3">MP3 (Compressed)</option>
              </select>
            </div>
            <button 
              className="download-btn" 
              onClick={() => audioPlayer.downloadAudio(downloadFormat)}
              disabled={!audioPlayer.originalUrl}
            >
              ⬇️ Download {downloadFormat.toUpperCase()}
            </button>
          </div>

          <div className="info-footer">
            <small>💡 All processing happens locally in your browser. No uploads required.</small>
          </div>
        </div>
      </div>
    </div>
  );
}