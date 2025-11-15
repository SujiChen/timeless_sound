import React, { useState, useRef, useEffect } from 'react';

/**
 * AudioPlayerCore - Minimal audio player with reusable functions
 * 
 * This component provides all the core audio functionality without heavy styling.
 * You can extract and use individual functions in your Modern/Retro pages.
 */

export default function AudioPlayerCore() {
  // ===== STATE =====
  const [audioFile, setAudioFile] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [activeEffect, setActiveEffect] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // ===== 1. FILE UPLOAD HANDLER =====
  // Usage: Attach to file input onChange
  // Purpose: Loads audio file and decodes it for processing
  async function handleFileUpload(file) {
    if (!file) return;
    
    try {
      setAudioFile(file);
      
      // Decode audio for processing
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
      
      // Create URL for playback
      const url = URL.createObjectURL(file);
      setOriginalUrl(url);
      
      return { success: true, duration: decoded.duration };
    } catch (error) {
      console.error('Failed to load audio:', error);
      return { success: false, error };
    }
  }

  // ===== 2. PLAY FUNCTION =====
  // Usage: Attach to play button onClick
  // Purpose: Starts audio playback
  function play() {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      startTimeTracking();
    }
  }

  // ===== 3. PAUSE FUNCTION =====
  // Usage: Attach to pause button onClick
  // Purpose: Pauses audio playback
  function pause() {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopTimeTracking();
    }
  }

  // ===== 4. TOGGLE PLAY/PAUSE =====
  // Usage: Single button that switches between play/pause
  // Purpose: Convenient play/pause toggle
  function togglePlayPause() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  // ===== 5. SKIP FORWARD =====
  // Usage: Attach to skip forward button
  // Purpose: Skips ahead by X seconds (default 10)
  function skipForward(seconds = 10) {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + seconds,
        audioRef.current.duration
      );
    }
  }

  // ===== 6. SKIP BACKWARD =====
  // Usage: Attach to skip backward button
  // Purpose: Skips back by X seconds (default 10)
  function skipBackward(seconds = 10) {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - seconds,
        0
      );
    }
  }

  // ===== 7. SEEK TO TIME =====
  // Usage: Attach to progress bar onChange
  // Purpose: Jump to specific time in audio
  function seekTo(timeInSeconds) {
    if (audioRef.current) {
      audioRef.current.currentTime = timeInSeconds;
      setCurrentTime(timeInSeconds);
    }
  }

  // ===== 8. VOLUME CONTROL =====
  // Usage: Attach to volume slider onChange
  // Purpose: Adjusts playback volume (0 to 1)
  function changeVolume(volumeLevel) {
    if (audioRef.current) {
      const vol = Math.max(0, Math.min(1, volumeLevel));
      audioRef.current.volume = vol;
      setVolume(vol);
    }
  }

  // ===== 9. MUTE/UNMUTE =====
  // Usage: Attach to mute button
  // Purpose: Toggles mute
  function toggleMute() {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
  }

  // ===== 10. GET TIME REMAINING =====
  // Usage: Display time left in song
  // Purpose: Returns formatted time remaining
  function getTimeRemaining() {
    const remaining = duration - currentTime;
    return formatTime(remaining);
  }

  // ===== 11. GET CURRENT TIME FORMATTED =====
  // Usage: Display current position
  // Purpose: Returns formatted current time
  function getCurrentTimeFormatted() {
    return formatTime(currentTime);
  }

  // ===== 12. FORMAT TIME HELPER =====
  // Purpose: Converts seconds to MM:SS format
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ===== 13A. APPLY RETRO EFFECT =====
  // Usage: Process audio with retro/vintage effects
  // Purpose: Applies retro effect and creates new audio URL
  // Effects: pcspeaker, 8bit, arcade, fmsynth, 16bit, lofi, bardcore
  async function applyRetroEffect(effectName, playbackRate = 1) {
    if (!audioBuffer) return;
    
    setProcessing(true);
    
    try {
      const retroEffects = {
        'pcspeaker': effectPCSpeaker,
        '8bit': effect8Bit,
        'arcade': effectArcade,
        'fmsynth': effectFMSynth,
        '16bit': effect16Bit,
        'lofi': effectLofi,
        'bardcore': effectBardcore,
      };
      
      const effectFunc = retroEffects[effectName];
      if (!effectFunc) return;
      
      const newDuration = audioBuffer.duration / Math.abs(playbackRate);
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil(newDuration * 44100),
        44100
      );
      
      const src = offlineCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.playbackRate.value = playbackRate;
      
      await effectFunc(offlineCtx, src);
      src.start();
      
      const blob = await renderToWav(offlineCtx);
      const url = URL.createObjectURL(blob);
      
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(url);
      setActiveEffect(effectName);
      
      return { success: true, url };
    } catch (error) {
      console.error('Effect failed:', error);
      return { success: false, error };
    } finally {
      setProcessing(false);
    }
  }

  // ===== 13B. APPLY MODERN EFFECT =====
  // Usage: Process audio with modern effects
  // Purpose: Applies modern effect and creates new audio URL
  // Effects: bassboosted, synthwave, nightcore, slowedreverb, orchestral
  async function applyModernEffect(effectName, playbackRate = 1) {
    if (!audioBuffer) return;
    
    setProcessing(true);
    
    try {
      const modernEffects = {
        'bassboosted': effectBassBoosted,
        'synthwave': effectSynthwave,
        'nightcore': effectNightcore,
        'slowedreverb': effectSlowedReverb,
        'orchestral': effectOrchestral,
      };
      
      const effectFunc = modernEffects[effectName];
      if (!effectFunc) return;
      
      const newDuration = audioBuffer.duration / Math.abs(playbackRate);
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil(newDuration * 44100),
        44100
      );
      
      const src = offlineCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.playbackRate.value = playbackRate;
      
      await effectFunc(offlineCtx, src);
      src.start();
      
      const blob = await renderToWav(offlineCtx);
      const url = URL.createObjectURL(blob);
      
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(url);
      setActiveEffect(effectName);
      
      return { success: true, url };
    } catch (error) {
      console.error('Effect failed:', error);
      return { success: false, error };
    } finally {
      setProcessing(false);
    }
  }

  // ===== 14. DOWNLOAD AUDIO =====
  // Usage: Attach to download button
  // Purpose: Downloads current audio (processed or original)
  function downloadAudio(format = 'wav') {
    const url = processedUrl || originalUrl;
    if (!url) return;
    
    const a = document.createElement('a');
    a.href = url;
    const filename = audioFile ? audioFile.name.replace(/\.[^.]+$/, '') : 'audio';
    const ext = format === 'mp3' ? 'mp3' : 'wav';
    a.download = `${filename}_${activeEffect || 'original'}.${ext}`;
    a.click();
  }

  // ===== 15. RESET/CLEAR =====
  // Usage: Clear all audio and start over
  // Purpose: Resets player to initial state
  function reset() {
    pause();
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    
    setAudioFile(null);
    setAudioBuffer(null);
    setOriginalUrl(null);
    setProcessedUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setActiveEffect(null);
    setIsPlaying(false);
  }

  // ===== 16. SWITCH TO PROCESSED/ORIGINAL =====
  // Usage: Toggle between processed and original audio
  // Purpose: Switches audio source
  function useProcessedAudio() {
    if (processedUrl && audioRef.current) {
      const wasPlaying = isPlaying;
      const currentTimeStamp = currentTime;
      
      pause();
      audioRef.current.src = processedUrl;
      audioRef.current.currentTime = currentTimeStamp;
      
      if (wasPlaying) {
        setTimeout(() => play(), 100);
      }
    }
  }

  function useOriginalAudio() {
    if (originalUrl && audioRef.current) {
      const wasPlaying = isPlaying;
      const currentTimeStamp = currentTime;
      
      pause();
      audioRef.current.src = originalUrl;
      audioRef.current.currentTime = currentTimeStamp;
      
      if (wasPlaying) {
        setTimeout(() => play(), 100);
      }
    }
  }

  // ===== TIME TRACKING =====
  function startTimeTracking() {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);
  }

  function stopTimeTracking() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // Update duration when audio loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      stopTimeTracking();
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [originalUrl, processedUrl]);

  // ===== RETRO EFFECT IMPLEMENTATIONS =====
  async function effectPCSpeaker(ctx, src) {
    const beeper = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      curve[i] = Math.round(x * 8) / 8;
    }
    beeper.curve = curve;
    beeper.oversample = 'none';

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    lp.Q.value = 3;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;
    hp.Q.value = 2;

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

  async function effect8Bit(ctx, src) {
    const bitCrusher = ctx.createWaveShaper();
    const bits = 6;
    const steps = Math.pow(2, bits);
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 2048) - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    bitCrusher.curve = curve;
    bitCrusher.oversample = 'none';

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2500;
    lp.Q.value = 1.5;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 150;

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

  async function effectArcade(ctx, src) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4500;
    lp.Q.value = 1.5;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;

    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1200;
    mid.Q.value = 2;
    mid.gain.value = 5;

    const crusher = ctx.createWaveShaper();
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 2048) - 1;
      curve[i] = Math.round(x * 64) / 64;
    }
    crusher.curve = curve;
    crusher.oversample = 'none';

    src.connect(crusher);
    crusher.connect(hp);
    hp.connect(mid);
    mid.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effectFMSynth(ctx, src) {
    const fmDistortion = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      curve[i] = Math.sin(x * Math.PI) * 0.9 + Math.sin(x * 3 * Math.PI) * 0.3;
    }
    fmDistortion.curve = curve;

    const glassy = ctx.createBiquadFilter();
    glassy.type = "peaking";
    glassy.frequency.value = 3500;
    glassy.Q.value = 2;
    glassy.gain.value = 8;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 100;
    hp.Q.value = 1.5;

    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 150;
    bass.gain.value = 5;

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

  async function effect16Bit(ctx, src) {
    const crusher = ctx.createWaveShaper();
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 2048) - 1;
      curve[i] = Math.round(x * 128) / 128;
    }
    crusher.curve = curve;
    crusher.oversample = 'none';

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 8000;
    lp.Q.value = 0.7;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 80;

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

  // ===== MODERN EFFECT IMPLEMENTATIONS =====
  async function effectBassBoosted(ctx, src) {
    const subBass = ctx.createBiquadFilter();
    subBass.type = "lowshelf";
    subBass.frequency.value = 60;
    subBass.gain.value = 15;

    const midBass = ctx.createBiquadFilter();
    midBass.type = "peaking";
    midBass.frequency.value = 120;
    midBass.Q.value = 1.5;
    midBass.gain.value = 12;

    const upperBass = ctx.createBiquadFilter();
    upperBass.type = "peaking";
    upperBass.frequency.value = 250;
    upperBass.Q.value = 1;
    upperBass.gain.value = 8;

    const trebleReduce = ctx.createBiquadFilter();
    trebleReduce.type = "highshelf";
    trebleReduce.frequency.value = 4000;
    trebleReduce.gain.value = -3;

    const distortion = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      curve[i] = Math.tanh(x * 2.5) * 0.9;
    }
    distortion.curve = curve;

    src.connect(subBass);
    subBass.connect(midBass);
    midBass.connect(upperBass);
    upperBass.connect(distortion);
    distortion.connect(trebleReduce);
    trebleReduce.connect(ctx.destination);
  }

  async function effectSynthwave(ctx, src) {
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowshelf";
    warmth.frequency.value = 250;
    warmth.gain.value = 6;

    const synthPad = ctx.createBiquadFilter();
    synthPad.type = "peaking";
    synthPad.frequency.value = 1500;
    synthPad.Q.value = 1;
    synthPad.gain.value = 5;

    const sparkle = ctx.createBiquadFilter();
    sparkle.type = "highshelf";
    sparkle.frequency.value = 6000;
    sparkle.gain.value = 4;

    const saturation = ctx.createWaveShaper();
    const satCurve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 1024) - 1;
      satCurve[i] = Math.tanh(x * 1.5) * 0.95;
    }
    saturation.curve = satCurve;

    const reverb = ctx.createConvolver();
    reverb.buffer = createIR(ctx, 1.8, 3);

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

  async function effectNightcore(ctx, src) {
    const treble = ctx.createBiquadFilter();
    treble.type = "highshelf";
    treble.frequency.value = 3000;
    treble.gain.value = 4;

    src.connect(treble);
    treble.connect(ctx.destination);
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

  async function effectOrchestral(ctx, src) {
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

    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    bass.frequency.value = 150;
    bass.gain.value = 8;

    const lowMid = ctx.createBiquadFilter();
    lowMid.type = "peaking";
    lowMid.frequency.value = 250;
    lowMid.Q.value = 1.2;
    lowMid.gain.value = 6;

    const strings1 = ctx.createBiquadFilter();
    strings1.type = "peaking";
    strings1.frequency.value = 800;
    strings1.Q.value = 1.5;
    strings1.gain.value = 5;

    const strings2 = ctx.createBiquadFilter();
    strings2.type = "peaking";
    strings2.frequency.value = 2500;
    strings2.Q.value = 1.3;
    strings2.gain.value = 6;

    const strings3 = ctx.createBiquadFilter();
    strings3.type = "peaking";
    strings3.frequency.value = 5000;
    strings3.Q.value = 1.5;
    strings3.gain.value = 7;

    const air = ctx.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 8000;
    air.gain.value = 5;

    const reverb = ctx.createConvolver();
    reverb.buffer = createIR(ctx, 3.5, 2.2);

    const dry = ctx.createGain();
    const wet = ctx.createGain();
    dry.gain.value = 0.5;
    wet.gain.value = 0.5;

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

  // ===== DEMO UI (MINIMAL STYLING) =====
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Audio Player Core Functions Demo</h2>
      
      {/* 1. FILE UPLOAD */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>1. Upload File</h3>
        <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e.target.files[0])} />
        {audioFile && <div>Loaded: {audioFile.name}</div>}
      </div>

      {/* 2-3. PLAY/PAUSE */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>2-4. Playback Controls</h3>
        <button onClick={play} disabled={!originalUrl}>▶ Play</button>
        <button onClick={pause} disabled={!originalUrl}>⏸ Pause</button>
        <button onClick={togglePlayPause} disabled={!originalUrl}>⏯ Toggle</button>
        <div>Status: {isPlaying ? 'Playing' : 'Paused'}</div>
      </div>

      {/* 5-6. SKIP CONTROLS */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>5-6. Skip Controls</h3>
        <button onClick={() => skipBackward(10)}>⏮ -10s</button>
        <button onClick={() => skipForward(10)}>⏭ +10s</button>
      </div>

      {/* 7. SEEK BAR */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>7. Seek Bar</h3>
        <input 
          type="range" 
          min="0" 
          max={duration || 0} 
          value={currentTime} 
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* 8-9. VOLUME */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>8-9. Volume Control</h3>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          value={volume} 
          onChange={(e) => changeVolume(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <button onClick={toggleMute}>🔇 Mute/Unmute</button>
        <div>Volume: {Math.round(volume * 100)}%</div>
      </div>

      {/* 10-11. TIME DISPLAY */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>10-11. Time Display</h3>
        <div>Current: {getCurrentTimeFormatted()}</div>
        <div>Remaining: {getTimeRemaining()}</div>
        <div>Duration: {formatTime(duration)}</div>
      </div>

      {/* 13A. RETRO EFFECTS */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>13A. Apply Retro Effects</h3>
        <button onClick={() => applyRetroEffect('pcspeaker', 1)} disabled={!audioBuffer || processing}>💾 PC Speaker</button>
        <button onClick={() => applyRetroEffect('8bit', 1)} disabled={!audioBuffer || processing}>🎮 8-bit</button>
        <button onClick={() => applyRetroEffect('arcade', 1)} disabled={!audioBuffer || processing}>🏁 Arcade</button>
        <button onClick={() => applyRetroEffect('fmsynth', 1)} disabled={!audioBuffer || processing}>🧿 FM Synth</button>
        <button onClick={() => applyRetroEffect('16bit', 1)} disabled={!audioBuffer || processing}>🕹️ 16-bit</button>
        <button onClick={() => applyRetroEffect('lofi', 1)} disabled={!audioBuffer || processing}>📻 Lofi</button>
        <button onClick={() => applyRetroEffect('bardcore', 0.92)} disabled={!audioBuffer || processing}>🏰 Bardcore</button>
        {processing && <div>Processing...</div>}
        {activeEffect && <div>Active: {activeEffect}</div>}
      </div>

      {/* 13B. MODERN EFFECTS */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>13B. Apply Modern Effects</h3>
        <button onClick={() => applyModernEffect('bassboosted', 1)} disabled={!audioBuffer || processing}>🔊 Bass Boosted</button>
        <button onClick={() => applyModernEffect('synthwave', 1)} disabled={!audioBuffer || processing}>📼 Synthwave</button>
        <button onClick={() => applyModernEffect('nightcore', 1.3)} disabled={!audioBuffer || processing}>⚡ Nightcore</button>
        <button onClick={() => applyModernEffect('slowedreverb', 0.85)} disabled={!audioBuffer || processing}>🌙 Slowed + Reverb</button>
        <button onClick={() => applyModernEffect('orchestral', 1)} disabled={!audioBuffer || processing}>🎻 Orchestral</button>
        {processing && <div>Processing...</div>}
      </div>

      {/* 14. DOWNLOAD */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>14. Download</h3>
        <button onClick={() => downloadAudio('wav')} disabled={!originalUrl}>Download WAV</button>
        <button onClick={() => downloadAudio('mp3')} disabled={!originalUrl}>Download MP3</button>
      </div>

      {/* 15. RESET */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>15. Reset</h3>
        <button onClick={reset}>Clear All</button>
      </div>

      {/* 16. SWITCH AUDIO SOURCE */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>16. Switch Audio Source</h3>
        <button onClick={useOriginalAudio} disabled={!originalUrl}>Use Original</button>
        <button onClick={useProcessedAudio} disabled={!processedUrl}>Use Processed</button>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={originalUrl} />
    </div>
  );
}