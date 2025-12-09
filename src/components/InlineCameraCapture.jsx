import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

const InlineCameraCapture = forwardRef(({ onCapture }, ref) => {
  const [stream, setStream] = useState(null);
  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.onloadedmetadata = () => {
          setReady(true);
          const p = videoRef.current.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        };
        const p = videoRef.current.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (e) {
      setReady(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState < 2 || !(video.videoWidth > 0 && video.videoHeight > 0)) {
      await new Promise((resolve) => {
        const onReady = () => {
          resolve();
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('canplay', onReady);
          video.removeEventListener('playing', onReady);
        };
        video.addEventListener('loadeddata', onReady);
        video.addEventListener('canplay', onReady);
        video.addEventListener('playing', onReady);
      });
    }
    const canvas = canvasRef.current || document.createElement('canvas');
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const squareSize = Math.min(vw, vh);
    const offsetX = (vw - squareSize) / 2;
    const offsetY = (vh - squareSize) / 2;
    canvas.width = squareSize;
    canvas.height = squareSize;
    const ctx = canvas.getContext('2d');
    ctx.filter = 'none';
    ctx.drawImage(video, offsetX, offsetY, squareSize, squareSize, 0, 0, squareSize, squareSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    if (onCapture) onCapture(dataUrl);
  };

  useImperativeHandle(ref, () => ({ capture }));

  return (
    <div className="w-full h-full relative">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black" style={{transform:'scaleX(-1)'}} />
      <canvas ref={canvasRef} className="hidden" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800"></div>
        </div>
      )}
    </div>
  );
});

export default InlineCameraCapture;
