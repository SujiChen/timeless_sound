import React, { useState, useRef, useEffect } from "react";

export default function RetroAudioCore() {
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

  /* ---------------------------------------------------
     FILE UPLOAD
  --------------------------------------------------- */
  async function handleFileUpload(file) {
    if (!file) return;

    try {
      setAudioFile(file);

      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);

      const url = URL.createObjectURL(file);
      setOriginalUrl(url);

      return { success: true, duration: decoded.duration };
    } catch (error) {
      console.error("Failed to load audio:", error);
      return { success: false, error };
    }
  }

  /* ---------------------------------------------------
     PLAYBACK CONTROLS
  --------------------------------------------------- */

  function play() {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      startTimeTracking();
    }
  }

  function pause() {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopTimeTracking();
    }
  }

  function togglePlayPause() {
    isPlaying ? pause() : play();
  }

  function skipForward(sec = 10) {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + sec,
        audioRef.current.duration
      );
    }
  }

  function skipBackward(sec = 10) {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - sec,
        0
      );
    }
  }

  function seekTo(time) {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }

  function changeVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    if (audioRef.current) audioRef.current.volume = vol;
    setVolume(vol);
  }

  function toggleMute() {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
    }
  }

  /* ---------------------------------------------------
     RETRO EFFECT PROCESSING (ONLY RETRO)
  --------------------------------------------------- */

  async function applyRetroEffect(effectName, playbackRate = 1) {
    if (!audioBuffer) return;
    setProcessing(true);

    try {
      const retroEffects = {
        pcspeaker: effectPCSpeaker,
        "8bit": effect8Bit,
        arcade: effectArcade,
        fmsynth: effectFMSynth,
        "16bit": effect16Bit,
        lofi: effectLofi,
        bardcore: effectBardcore,
      };

      const effectFunc = retroEffects[effectName];
      if (!effectFunc) return;

      const newDuration =
        audioBuffer.duration / Math.abs(playbackRate);

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
    } catch (err) {
      console.error("Effect error:", err);
      return { success: false, err };
    } finally {
      setProcessing(false);
    }
  }

  /* ---------------------------------------------------
     RESET
  --------------------------------------------------- */

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
    setIsPlaying(false);
    setActiveEffect(null);
  }

  /* ---------------------------------------------------
     TIME TRACKING
  --------------------------------------------------- */

  function startTimeTracking() {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (audioRef.current)
        setCurrentTime(audioRef.current.currentTime);
    }, 100);
  }

  function stopTimeTracking() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function updateDur() {
      setDuration(audio.duration);
    }

    function onEnd() {
      setIsPlaying(false);
      stopTimeTracking();
    }

    audio.addEventListener("loadedmetadata", updateDur);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("loadedmetadata", updateDur);
      audio.removeEventListener("ended", onEnd);
    };
  }, [originalUrl, processedUrl]);

  /* ---------------------------------------------------
     RETRO EFFECT IMPLEMENTATIONS (NO MODERN)
  --------------------------------------------------- */

  async function effectPCSpeaker(ctx, src) {
    const ws = ctx.createWaveShaper();
    const c = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = i / 1024 - 1;
      c[i] = Math.round(x * 8) / 8;
    }
    ws.curve = c;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;

    src.connect(ws);
    ws.connect(hp);
    hp.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effect8Bit(ctx, src) {
    const ws = ctx.createWaveShaper();
    const bits = 6;
    const steps = Math.pow(2, bits);
    const curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = i / 2048 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    ws.curve = curve;

    src.connect(ws);
    ws.connect(ctx.destination);
  }

  async function effectArcade(ctx, src) {
    const crusher = ctx.createWaveShaper();
    const c = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = i / 2048 - 1;
      c[i] = Math.round(x * 64) / 64;
    }
    crusher.curve = c;

    src.connect(crusher);
    crusher.connect(ctx.destination);
  }

  async function effectFMSynth(ctx, src) {
    const ws = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = i / 1024 - 1;
      curve[i] = Math.sin(x * Math.PI) * 0.9;
    }
    ws.curve = curve;

    src.connect(ws);
    ws.connect(ctx.destination);
  }

  async function effect16Bit(ctx, src) {
    const ws = ctx.createWaveShaper();
    const c = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = i / 2048 - 1;
      c[i] = Math.round(x * 128) / 128;
    }
    ws.curve = c;

    src.connect(ws);
    ws.connect(ctx.destination);
  }

  async function effectLofi(ctx, src) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3000;
    src.connect(lp);
    lp.connect(ctx.destination);
  }

  async function effectBardcore(ctx, src) {
    const notch = ctx.createBiquadFilter();
    notch.type = "notch";
    notch.frequency.value = 1200;
    notch.Q.value = 1.5;
    src.connect(notch);
    notch.connect(ctx.destination);
  }

  /* ---------------------------------------------------
     WAV EXPORT
  --------------------------------------------------- */

  function renderToWav(ctx) {
    return new Promise((resolve) => {
      ctx.startRendering().then((rendered) => {
        const wav = audioBufferToWav(rendered);
        resolve(new Blob([wav], { type: "audio/wav" }));
      });
    });
  }

  function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);

    let pos = 0;

    function writeString(s) {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(pos++, s.charCodeAt(i));
      }
    }

    writeString("RIFF");
    view.setUint32(pos, 36 + buffer.length * numOfChan * 2, true);
    pos += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(pos, 16, true);
    pos += 4;
    view.setUint16(pos, 1, true);
    pos += 2;
    view.setUint16(pos, numOfChan, true);
    pos += 2;
    view.setUint32(pos, buffer.sampleRate, true);
    pos += 4;
    view.setUint32(pos, buffer.sampleRate * numOfChan * 2, true);
    pos += 4;
    view.setUint16(pos, numOfChan * 2, true);
    pos += 2;
    view.setUint16(pos, 16, true);
    pos += 2;

    writeString("data");
    view.setUint32(pos, buffer.length * numOfChan * 2, true);
    pos += 4;

    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 0;

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = channels[i][offset];
        sample = Math.max(-1, Math.min(1, sample));
        view.setInt16(
          pos,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        pos += 2;
      }
      offset++;
    }

    return bufferArray;
  }

  /* ---------------------------------------------------
     RENDER
  --------------------------------------------------- */
  return (
    <>
      <audio ref={audioRef} src={processedUrl || originalUrl}></audio>
    </>
  );
}
