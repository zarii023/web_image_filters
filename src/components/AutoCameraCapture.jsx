import { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

const AutoCameraCapture = ({ onCapture, onCancel, productName }) => {
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Inicializar cámara automáticamente
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          // Iniciar captura automática después de 2 segundos
          setTimeout(() => {
            if (!capturedImage) {
              handleAutoCapture();
            }
          }, 2000);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraReady(false);
  };

  const handleAutoCapture = () => {
    if (!cameraReady || isCapturing) return;
    
    setIsCapturing(true);
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          capturePhoto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar imagen espejada (como en un espejo)
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    context.scale(-1, 1);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setIsCapturing(false);
    
    // Detener cámara después de capturar
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCountdown(0);
    setIsCapturing(false);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Captura Automática</h2>
              <p className="text-blue-100 text-sm">Probando: {productName}</p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-6">
          {error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error de Cámara</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={startCamera}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reintentar
                </button>
                <button
                  onClick={handleCancel}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            // Vista de imagen capturada
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <img
                  src={capturedImage}
                  alt="Foto capturada"
                  className="max-w-full max-h-96 rounded-lg shadow-lg"
                />
                <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full">
                  <Check className="w-5 h-5" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">¡Foto Capturada!</h3>
              <p className="text-gray-600 mb-6">
                La imagen se procesará automáticamente con {productName}
              </p>

              <div className="flex space-x-3 justify-center">
                <button
                  onClick={handleConfirm}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Continuar</span>
                </button>
                <button
                  onClick={handleRetake}
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center space-x-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Repetir</span>
                </button>
              </div>
            </div>
          ) : (
            // Vista de cámara en vivo
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-w-full max-h-96 rounded-lg shadow-lg transform scale-x-[-1]"
                  style={{ maxHeight: '400px' }}
                />
                
                {/* Overlay de countdown */}
                {countdown > 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="text-white text-6xl font-bold animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}

                {/* Indicador de cámara lista */}
                {cameraReady && !isCapturing && countdown === 0 && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>En vivo</span>
                  </div>
                )}

                {/* Guía de posicionamiento */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-white border-dashed rounded-lg opacity-30"></div>
                </div>
              </div>

              {!cameraReady ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Iniciando Cámara...</h3>
                  <p className="text-gray-600">Preparando la captura automática</p>
                </div>
              ) : isCapturing ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">¡Preparado!</h3>
                  <p className="text-gray-600">La foto se tomará automáticamente</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Posiciónate en el Marco</h3>
                  <p className="text-gray-600 mb-4">
                    La captura comenzará automáticamente en unos segundos
                  </p>
                  
                  <button
                    onClick={handleAutoCapture}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 mx-auto"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Capturar Ahora</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default AutoCameraCapture;