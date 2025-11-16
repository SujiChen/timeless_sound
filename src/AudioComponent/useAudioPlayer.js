import { useState, useRef } from 'react';

export default function useAudioPlayer() {
  const [originalUrl, setOriginalUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [activeEffect, setActiveEffect] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const audioBufferRef = useRef(null);
  const originalFileRef = useRef(null);

  // File upload handler
  async function handleFileUpload(file) {
    try {
      // Store original file
      originalFileRef.current = file;
      
      // Create URL for original audio
      const url = URL.createObjectURL(file);
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setOriginalUrl(url);
      
      // Decode audio for processing
      const arrayBuffer = await file.arrayBuffer();
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await ac.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      
      // Reset processed audio
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(null);
      setActiveEffect(null);
      
      return { success: true };
    } catch (error) {
      console.error('Error loading file:', error);
      return { success: false, error };
    }
  }

  // Audio playback controls
  function play() {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Play error:', err));
      setIsPlaying(true);
    }
  }

  function pause() {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }

  function skipForward(seconds = 10) {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  }

  function skipBackward(seconds = 10) {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
    }
  }

  function changeVolume(newVolume) {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }

  function useOriginalAudio() {
    if (audioRef.current && originalUrl) {
      const wasPlaying = isPlaying;
      const currentTime = audioRef.current.currentTime;
      
      audioRef.current.src = originalUrl;
      audioRef.current.currentTime = currentTime;
      
      if (wasPlaying) {
        audioRef.current.play().catch(err => console.log('Play error:', err));
      }
    }
    setActiveEffect(null);
  }

  function useProcessedAudio() {
    if (audioRef.current && processedUrl) {
      const wasPlaying = isPlaying;
      const currentTime = audioRef.current.currentTime;
      
      audioRef.current.src = processedUrl;
      audioRef.current.currentTime = currentTime;
      
      if (wasPlaying) {
        audioRef.current.play().catch(err => console.log('Play error:', err));
      }
    }
  }

  function reset() {
    pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl);
      setProcessedUrl(null);
    }
    setActiveEffect(null);
  }

  // Helper functions for audio processing
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

  // Effect functions
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

  // Main effect application function
  async function applyRetroEffect(effectName, playbackRate = 1) {
    if (!audioBufferRef.current) {
      return { success: false, error: 'No audio loaded' };
    }

    setProcessing(true);
    setActiveEffect(effectName);

    try {
      const orig = audioBufferRef.current;
      const newDuration = orig.duration / Math.abs(playbackRate);
      const sampleRate = 44100;

      const offlineCtx = new OfflineAudioContext(
        orig.numberOfChannels,
        Math.ceil(newDuration * sampleRate),
        sampleRate
      );

      const src = offlineCtx.createBufferSource();
      src.buffer = orig;
      src.playbackRate.value = playbackRate;

      // Apply the appropriate effect
      const effectMap = {
        'pcspeaker': effectPCSpeaker,
        '8bit': effect8Bit,
        'arcade': effectArcade,
        '16bit': effect16Bit,
        'fmsynth': effectFMSynth,
        'lofi': effectLofi,
        'bardcore': effectBardcore
      };

      const effectFn = effectMap[effectName];
      if (effectFn) {
        await effectFn(offlineCtx, src);
      } else {
        src.connect(offlineCtx.destination);
      }

      src.start();

      const blob = await renderToWav(offlineCtx);
      const url = URL.createObjectURL(blob);

      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setProcessedUrl(url);
      setProcessing(false);

      return { success: true, url };
    } catch (error) {
      console.error('Error applying effect:', error);
      setProcessing(false);
      return { success: false, error };
    }
  }

  // Download function
  function downloadAudio(format = 'wav') {
    const url = processedUrl || originalUrl;
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    const fileName = originalFileRef.current?.name || 'audio';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    a.download = `${baseName}_${activeEffect || 'original'}.${format}`;
    a.click();
  }

  return {
    // State
    originalUrl,
    processedUrl,
    activeEffect,
    processing,
    volume,
    isPlaying,
    
    // Refs
    audioRef,
    
    // Functions
    handleFileUpload,
    play,
    pause,
    skipForward,
    skipBackward,
    changeVolume,
    useOriginalAudio,
    useProcessedAudio,
    reset,
    applyRetroEffect,
    downloadAudio
  };
}