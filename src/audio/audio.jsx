import React, { useState, useRef } from "react";
import "./audio.css";

export default function AudioConverter() {
  const [fileName, setFileName] = useState(null);
  const [status, setStatus] = useState("No file loaded");
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [format, setFormat] = useState("wav");
  const [activeEffect, setActiveEffect] = useState(null);

  const audioBufferRef = useRef(null);
  const processedAudioUrlRef = useRef(null);
  const originalAudioUrlRef = useRef(null);
  const inputRef = useRef(null);

  async function handleFile(file) {
    setStatus("Decoding...");
    setDownloadUrl(null);

    const arrayBuffer = await file.arrayBuffer();
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await ac.decodeAudioData(arrayBuffer);
    audioBufferRef.current = audioBuffer;

    if (originalAudioUrlRef.current) URL.revokeObjectURL(originalAudioUrlRef.current);
    originalAudioUrlRef.current = URL.createObjectURL(file);

    setFileName(file.name);
    setDuration(audioBuffer.duration);
    setStatus("Ready – choose a conversion");
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    handleFile(f).catch((err) => {
      console.error(err);
      setStatus("Failed to decode file");
    });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  async function renderToWav(offlineCtx) {
    const rendered = await offlineCtx.startRendering();
    const numOfChan = rendered.numberOfChannels;
    const length = rendered.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + rendered.length * numOfChan * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, rendered.sampleRate, true);
    view.setUint32(28, rendered.sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, rendered.length * numOfChan * 2, true);

    let offset = 44;
    const channels = [];
    for (let i = 0; i < numOfChan; i++) channels.push(rendered.getChannelData(i));

    for (let i = 0; i < rendered.length; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: "audio/wav" });
  }

  async function buildAndRender(effectBuilder, rate, effectName) {
    if (!audioBufferRef.current) return;

    setProcessing(true);
    setStatus("Rendering...");
    setActiveEffect(effectName);

    const orig = audioBufferRef.current;
    const newDuration = orig.duration / Math.abs(rate);
    const sampleRate = 44100;

    const offlineCtx = new OfflineAudioContext(
      orig.numberOfChannels,
      Math.ceil(newDuration * sampleRate),
      sampleRate
    );

    const src = offlineCtx.createBufferSource();
    src.buffer = orig;
    src.playbackRate.value = rate;

    await effectBuilder(offlineCtx, src);
    src.start();

    const blob = await renderToWav(offlineCtx);
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);

    if (processedAudioUrlRef.current) URL.revokeObjectURL(processedAudioUrlRef.current);
    processedAudioUrlRef.current = url;

    setProcessing(false);
    setStatus("Done – ready to download");
  }

  async function effect8Bit(ctx, src) {
    // Extreme bit crushing for that NES/Game Boy sound
    const bitCrusher = ctx.createWaveShaper();
    const bits = 6; // Reduced from 4 to 6 for less harsh static
    const steps = Math.pow(2, bits);
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 2048) - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    bitCrusher.curve = curve;
    bitCrusher.oversample = 'none';

    // Aggressive low-pass for that muffled chip sound
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2500;
    lp.Q.value = 1.5;

    // High-pass to remove deep bass (chips couldn't do deep bass)
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 150;

    // Add some resonance for that "bright" chip character
    const peaking = ctx.createBiquadFilter();
    peaking.type = "peaking";
    peaking.frequency.value = 1000;
    peaking.Q.value = 2;
    peaking.gain.value = 6;

    src.connect(bitCrusher);
    bitCrusher.connect(hp);
    hp.connect(peaking);
    peaking.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effectNightcore(ctx, src) {
    // Boost high frequencies for that energetic anime feel
    const treble = ctx.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 3000;
    treble.gain.value = 4;

    src.connect(treble);
    treble.connect(ctx.destination);
  }

  async function effectArcade(ctx, src) {
    // Bright, energetic arcade sound
    // Very limited frequency range like old arcade machines
    
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4500; // Brighter than 8-bit
    lp.Q.value = 1.5;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;

    // Boost mids for punch
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1200;
    mid.Q.value = 2;
    mid.gain.value = 5;

    // Lighter bit crushing for arcade character
    const crusher = ctx.createWaveShaper();
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 2048) - 1;
      curve[i] = Math.round(x * 64) / 64; // Gentler crushing
    }
    crusher.curve = curve;
    crusher.oversample = 'none';

    src.connect(crusher);
    crusher.connect(hp);
    hp.connect(mid);
    mid.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effect16Bit(ctx, src) {
    // SNES/Genesis sound - better than 8-bit but still limited
    
    // Less aggressive bit crushing than 8-bit
    const crusher = ctx.createWaveShaper();
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 2048) - 1;
      curve[i] = Math.round(x * 128) / 128; // 8-bit depth (better than NES)
    }
    crusher.curve = curve;
    crusher.oversample = 'none';

    // Wider frequency range than 8-bit
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 8000; // Much wider than 8-bit
    lp.Q.value = 0.7;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 80;

    // Boost console character frequencies
    const consoleChar = ctx.createBiquadFilter();
    consoleChar.type = "peaking";
    consoleChar.frequency.value = 2500;
    consoleChar.Q.value = 1.5;
    consoleChar.gain.value = 4;

    src.connect(crusher);
    crusher.connect(hp);
    hp.connect(consoleChar);
    consoleChar.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effectFMSynth(ctx, src) {
    // Yamaha YM2612 / FM synthesis sound
    // Metallic, punchy, glassy character
    
    // Add harmonic distortion for FM "metallic" character
    const fmDistortion = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      // Create harmonic-rich distortion
      curve[i] = Math.sin(x * Math.PI) * 0.9 + Math.sin(x * 3 * Math.PI) * 0.3;
    }
    fmDistortion.curve = curve;

    // Boost high-mids for "glassy" FM sound
    const glassy = ctx.createBiquadFilter();
    glassy.type = "peaking";
    glassy.frequency.value = 3500;
    glassy.Q.value = 2;
    glassy.gain.value = 8;

    // Sharp high-pass for punchy FM bass
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 100;
    hp.Q.value = 1.5;

    // Boost bass for that "FM bass" punch
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 150;
    bass.gain.value = 5;

    // Limit highs slightly
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 12000;

    src.connect(fmDistortion);
    fmDistortion.connect(hp);
    hp.connect(bass);
    bass.connect(glassy);
    glassy.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effectPCSpeaker(ctx, src) {
    // PC Speaker beeper - extremely primitive
    // Single tone, very computer-y
    
    // Less extreme bit crushing to reduce static
    const beeper = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      curve[i] = Math.round(x * 8) / 8; // Reduced harshness
    }
    beeper.curve = curve;
    beeper.oversample = 'none';

    // Very narrow frequency range
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    lp.Q.value = 3;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;
    hp.Q.value = 2;

    // Resonance for "beepy" sound
    const beepy = ctx.createBiquadFilter();
    beepy.type = "peaking";
    beepy.frequency.value = 1000;
    beepy.Q.value = 5;
    beepy.gain.value = 10;

    src.connect(beeper);
    beeper.connect(hp);
    hp.connect(beepy);
    beepy.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effectSynthwave(ctx, src) {
    // 80s Synthwave / Outrun style
    // Warm analog pads, gated reverb, big 80s snares
    
    // Warm analog character
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowshelf";
    warmth.frequency.value = 250;
    warmth.gain.value = 6;

    // Boost 80s synth frequencies
    const synthPad = ctx.createBiquadFilter();
    synthPad.type = "peaking";
    synthPad.frequency.value = 1500;
    synthPad.Q.value = 1;
    synthPad.gain.value = 5;

    // High-end sparkle
    const sparkle = ctx.createBiquadFilter();
    sparkle.type = "highshelf";
    sparkle.frequency.value = 6000;
    sparkle.gain.value = 4;

    // Analog saturation
    const saturation = ctx.createWaveShaper();
    const satCurve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      satCurve[i] = Math.tanh(x * 1.5) * 0.95; // Soft saturation
    }
    saturation.curve = satCurve;

    // 80s reverb (gated style)
    const reverb = ctx.createConvolver();
    reverb.buffer = createIR(ctx, 1.8, 3); // Shorter but dense reverb

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 0.65;
    wet.gain.value = 0.35;

    src.connect(saturation);
    saturation.connect(warmth);
    warmth.connect(synthPad);
    synthPad.connect(sparkle);
    sparkle.connect(dry);
    dry.connect(ctx.destination);

    sparkle.connect(reverb);
    reverb.connect(wet);
    wet.connect(ctx.destination);
  }

  async function effectBassBoosted(ctx, src) {
    // Extreme bass boost with distortion
    
    // Sub-bass boost
    const subBass = ctx.createBiquadFilter();
    subBass.type = "lowshelf";
    subBass.frequency.value = 60;
    subBass.gain.value = 15;

    // Mid-bass boost
    const midBass = ctx.createBiquadFilter();
    midBass.type = "peaking";
    midBass.frequency.value = 120;
    midBass.Q.value = 1.5;
    midBass.gain.value = 12;

    // Upper bass boost
    const upperBass = ctx.createBiquadFilter();
    upperBass.type = "peaking";
    upperBass.frequency.value = 250;
    upperBass.Q.value = 1;
    upperBass.gain.value = 8;

    // Slight high-end reduction to emphasize bass
    const trebleReduce = ctx.createBiquadFilter();
    trebleReduce.type = "highshelf";
    trebleReduce.frequency.value = 4000;
    trebleReduce.gain.value = -3;

    // Bass distortion/saturation for that "blown out" effect
    const distortion = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      curve[i] = Math.tanh(x * 2.5) * 0.9; // Heavy saturation
    }
    distortion.curve = curve;

    src.connect(subBass);
    subBass.connect(midBass);
    midBass.connect(upperBass);
    upperBass.connect(distortion);
    distortion.connect(trebleReduce);
    trebleReduce.connect(ctx.destination);
  }

  async function effectSlowedReverb(ctx, src) {
    const con = ctx.createConvolver();
    con.buffer = createIR(ctx, 2.5, 2);
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 0.6;
    wet.gain.value = 0.4;

    src.connect(dry);
    dry.connect(ctx.destination);
    src.connect(con);
    con.connect(wet);
    wet.connect(ctx.destination);
  }

  function createIR(ctx, duration, decay) {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const ir = ctx.createBuffer(2, length, rate);

    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return ir;
  }

  async function effectOrchestral(ctx, src) {
    // Advanced vocal removal using phase cancellation simulation
    // Enhanced with string instrument characteristics
    
    // Multiple notch filters at vocal formant frequencies
    const vocalNotch1 = ctx.createBiquadFilter();
    vocalNotch1.type = "notch";
    vocalNotch1.frequency.value = 350;
    vocalNotch1.Q.value = 2;

    const vocalNotch2 = ctx.createBiquadFilter();
    vocalNotch2.type = "notch";
    vocalNotch2.frequency.value = 900;
    vocalNotch2.Q.value = 2;

    const vocalNotch3 = ctx.createBiquadFilter();
    vocalNotch3.type = "notch";
    vocalNotch3.frequency.value = 1500;
    vocalNotch3.Q.value = 2.5;

    const vocalNotch4 = ctx.createBiquadFilter();
    vocalNotch4.type = "notch";
    vocalNotch4.frequency.value = 2500;
    vocalNotch4.Q.value = 2;

    const vocalNotch5 = ctx.createBiquadFilter();
    vocalNotch5.type = "notch";
    vocalNotch5.frequency.value = 3500;
    vocalNotch5.Q.value = 1.5;

    // Boost orchestral frequencies
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 150;
    bass.gain.value = 8; // Strong bass for cellos, basses

    const lowMid = ctx.createBiquadFilter();
    lowMid.type = "peaking";
    lowMid.frequency.value = 250;
    lowMid.Q.value = 1.2;
    lowMid.gain.value = 6; // Warmth

    // String section emphasis (violins, violas, cellos)
    const strings1 = ctx.createBiquadFilter();
    strings1.type = "peaking";
    strings1.frequency.value = 800; // Cello/viola body resonance
    strings1.Q.value = 1.5;
    strings1.gain.value = 5;

    const strings2 = ctx.createBiquadFilter();
    strings2.type = "peaking";
    strings2.frequency.value = 2500; // Violin warmth
    strings2.Q.value = 1.3;
    strings2.gain.value = 6;

    const strings3 = ctx.createBiquadFilter();
    strings3.type = "peaking";
    strings3.frequency.value = 5000; // String brightness and bow articulation
    strings3.Q.value = 1.5;
    strings3.gain.value = 7;

    const air = ctx.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 8000;
    air.gain.value = 5; // Orchestral "air"

    // Large concert hall reverb
    const reverb = ctx.createConvolver();
    reverb.buffer = createIR(ctx, 3.5, 2.2);

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 0.5;
    wet.gain.value = 0.5;

    // Chain everything together
    src.connect(vocalNotch1);
    vocalNotch1.connect(vocalNotch2);
    vocalNotch2.connect(vocalNotch3);
    vocalNotch3.connect(vocalNotch4);
    vocalNotch4.connect(vocalNotch5);
    vocalNotch5.connect(bass);
    bass.connect(lowMid);
    lowMid.connect(strings1);
    strings1.connect(strings2);
    strings2.connect(strings3);
    strings3.connect(air);
    air.connect(dry);
    dry.connect(ctx.destination);

    air.connect(reverb);
    reverb.connect(wet);
    wet.connect(ctx.destination);
  }

  async function effectLofi(ctx, src) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3000;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 300;

    src.connect(hp);
    hp.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effectBardcore(ctx, src) {
    const vocalKiller1 = ctx.createBiquadFilter();
    vocalKiller1.type = "notch";
    vocalKiller1.frequency.value = 800;
    vocalKiller1.Q.value = 1.5;

    const vocalKiller2 = ctx.createBiquadFilter();
    vocalKiller2.type = "notch";
    vocalKiller2.frequency.value = 1500;
    vocalKiller2.Q.value = 1.5;

    const vocalKiller3 = ctx.createBiquadFilter();
    vocalKiller3.type = "notch";
    vocalKiller3.frequency.value = 3000;
    vocalKiller3.Q.value = 1.2;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3500;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;

    const reverb = ctx.createConvolver();
    reverb.buffer = createIR(ctx, 4, 3);

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 0.4;
    wet.gain.value = 0.6;

    src.connect(vocalKiller1);
    vocalKiller1.connect(vocalKiller2);
    vocalKiller2.connect(vocalKiller3);
    vocalKiller3.connect(hp);
    hp.connect(lp);
    lp.connect(dry);
    dry.connect(ctx.destination);

    lp.connect(reverb);
    reverb.connect(wet);
    wet.connect(ctx.destination);
  }

  function handleClear() {
    setFileName(null);
    setStatus("No file loaded");
    setActiveEffect(null);
    audioBufferRef.current = null;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    if (processedAudioUrlRef.current) URL.revokeObjectURL(processedAudioUrlRef.current);
    processedAudioUrlRef.current = null;
    if (originalAudioUrlRef.current) URL.revokeObjectURL(originalAudioUrlRef.current);
    originalAudioUrlRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDownload() {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    const ext = format === "mp3" ? "mp3" : "wav";
    a.download = `${fileName.replace(/\.[^.]+$/, "")}_converted.${ext}`;
    a.click();
  }

  return (
    <div className="converter-container">
      {/* <h2 className="converter-title">Browser Music Converter</h2> */}
      <p className="converter-description">Transform your audio with creative effects – all processing happens in your browser!</p>

      <div className="file-row">
        <input ref={inputRef} type="file" accept="audio/*" id="file-input" className="hidden-input" onChange={onFileChange} />
        <label htmlFor="file-input" className="file-button choose-file">
          Choose File
        </label>
        <button className="file-button" onClick={handleClear}>Clear</button>
        <div className="status-text">{status}</div>
      </div>

      {fileName && (
        <div className="loaded-info">
          <div>Loaded: <strong>{fileName}</strong> ({Math.round(duration)}s)</div>
          <div className="player-section">
            <div className="player-label">Original:</div>
            <audio controls src={originalAudioUrlRef.current} className="audio-player"></audio>
          </div>
        </div>
      )}

      <div className="effect-grid">
        <h3 style={{gridColumn: '1 / -1', fontSize: '16px', fontWeight: '600', marginBottom: '4px', marginTop: '8px', color: '#4f46e5'}}>🕹️ RETRO</h3>
        
        <button className="effect-button" style={{background: activeEffect === 'pcspeaker' ? '#4f46e5' : '#f8f8f8', color: activeEffect === 'pcspeaker' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectPCSpeaker, 1, 'pcspeaker')}>💾 PC Speaker</button>
        <button className="effect-button" style={{background: activeEffect === '8bit' ? '#4f46e5' : '#f8f8f8', color: activeEffect === '8bit' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effect8Bit, 1, '8bit')}>🎮 8-bit (NES)</button>
        <button className="effect-button" style={{background: activeEffect === 'arcade' ? '#4f46e5' : '#f8f8f8', color: activeEffect === 'arcade' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectArcade, 1, 'arcade')}>🏁 Arcade</button>
        <button className="effect-button" style={{background: activeEffect === 'fmsynth' ? '#4f46e5' : '#f8f8f8', color: activeEffect === 'fmsynth' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectFMSynth, 1, 'fmsynth')}>🧿 FM Synth</button>
        <button className="effect-button" style={{background: activeEffect === '16bit' ? '#4f46e5' : '#f8f8f8', color: activeEffect === '16bit' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effect16Bit, 1, '16bit')}>🕹️ 16-bit (SNES)</button>
        <button className="effect-button" style={{background: activeEffect === 'lofi' ? '#4f46e5' : '#f8f8f8', color: activeEffect === 'lofi' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectLofi, 1, 'lofi')}>📻 Lofi</button>
        <button className="effect-button" style={{background: activeEffect === 'bardcore' ? '#4f46e5' : '#f8f8f8', color: activeEffect === 'bardcore' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectBardcore, 0.92, 'bardcore')}>🏰 Bardcore</button>
        
        <h3 style={{gridColumn: '1 / -1', fontSize: '16px', fontWeight: '600', marginBottom: '4px', marginTop: '16px', color: '#ec4899'}}>✨ MODERN</h3>
        
        <button className="effect-button" style={{background: activeEffect === 'bassboosted' ? '#ec4899' : '#f8f8f8', color: activeEffect === 'bassboosted' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectBassBoosted, 1, 'bassboosted')}>🔊 Bass Boosted</button>
        <button className="effect-button" style={{background: activeEffect === 'synthwave' ? '#ec4899' : '#f8f8f8', color: activeEffect === 'synthwave' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectSynthwave, 1, 'synthwave')}>📼 Synthwave</button>
        <button className="effect-button" style={{background: activeEffect === 'nightcore' ? '#ec4899' : '#f8f8f8', color: activeEffect === 'nightcore' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectNightcore, 1.3, 'nightcore')}>⚡ Nightcore</button>
        <button className="effect-button" style={{background: activeEffect === 'slowedreverb' ? '#ec4899' : '#f8f8f8', color: activeEffect === 'slowedreverb' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectSlowedReverb, 0.85, 'slowedreverb')}>🌙 Slowed + Reverb</button>
        <button className="effect-button" style={{background: activeEffect === 'orchestral' ? '#ec4899' : '#f8f8f8', color: activeEffect === 'orchestral' ? 'white' : 'inherit'}} disabled={!fileName || processing} onClick={() => buildAndRender(effectOrchestral, 1, 'orchestral')}>🎻 Orchestral</button>
      </div>

      {processedAudioUrlRef.current && (
        <div className="processed-section">
          <div className="player-label">Processed:</div>
          <audio controls src={processedAudioUrlRef.current} className="audio-player"></audio>
        </div>
      )}

      <div className="download-section">
        <select 
          value={format} 
          onChange={(e) => setFormat(e.target.value)}
          className="file-button"
        >
          <option value="wav">WAV</option>
          <option value="mp3">MP3</option>
        </select>
        <button onClick={handleDownload} disabled={!downloadUrl} className="download-button">
          Download {format.toUpperCase()}
        </button>
      </div>

      <div className="notes">
        <p>Note: All processing happens locally in your browser. No files are uploaded to any server.</p>
      </div>
    </div>
  );
}