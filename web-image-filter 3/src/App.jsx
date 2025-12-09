import React, { useEffect, useRef, useState } from "react";

// ================================================
// Web Image Filter (React, JS)
// - Upload image → paint mask → WebGL selective smoothing → export PNG
// - Pointer/mouse/touch paint; GLSL strings via array.join('')
// - Canvases keep bitmap at image size; visual size is responsive
// ================================================

export default function WebImageFilter() {
  // ---------------- UI STATE ----------------
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [intensity, setIntensity] = useState(0.5);
  const [sigma, setSigma] = useState(3); // 1..10
  const [brushSize, setBrushSize] = useState(40);
  const [hardness, setHardness] = useState(0.6); // 0..1
  const [brightness, setBrightness] = useState(0); // -0.3 a 0.3
  const [mode, setMode] = useState('paint'); // 'paint' | 'erase'
  const [view, setView] = useState('after'); // 'after' | 'before' | 'split' | 'mask'
  const [filterType, setFilterType] = useState('wrinkles'); // 'wrinkles' | 'brightness' | 'spots' | 'acne' | 'firmness'
  // Cuando un filtro está activo, el cliente no puede modificar ciertos parámetros
  const controlsLocked = ['wrinkles','brightness','spots','acne','firmness'].includes(filterType);
  const [splitPos, setSplitPos] = useState(0.5);
  const [error, setError] = useState("");
  const faceMeshRef = useRef(null);
  const [detectingFace, setDetectingFace] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);

  // --------------- CANVAS REFS ---------------
  const glCanvasRef = useRef(null);   // WebGL render target
  const maskCanvasRef = useRef(null); // 2D mask paint target
  const outCanvasRef = useRef(null);  // 2D final output / preview

  // --------------- WEBGL REFS ----------------
  const glRef = useRef(null);
  const progBlurRef = useRef(null);
  const progComposeRef = useRef(null);
  const quadRef = useRef(null);

  const texOrigRef = useRef(null);
  const texPingRef = useRef(null);
  const texPongRef = useRef(null);
  const texMaskRef = useRef(null);
  const fboPingRef = useRef(null);
  const fboPongRef = useRef(null);

  // --------------- WEBGL HELPERS -------------
  function createGL(canvas) {
    if (!canvas) throw new Error("Canvas WebGL inexistente");
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, preserveDrawingBuffer: true })
           || canvas.getContext("experimental-webgl");
    if (!gl) throw new Error("WebGL no disponible en este navegador");
    return gl;
  }

  function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      console.error('Shader source:\n', src);
      gl.deleteShader(sh);
      throw new Error("Shader error: " + log + "\n--- shader source (first 400 chars): ---\n" + String(src).slice(0,400));
    }
    return sh;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error("Program link error: " + log);
    }
    return prog;
  }

  // Avoid template literals, and join with empty string to prevent accidental unterminated strings
  const quadVS = [
    'attribute vec2 a_pos;',
    'attribute vec2 a_uv;',
    'varying vec2 v_uv;',
    'void main() {',
    '  v_uv = a_uv;',
    '  gl_Position = vec4(a_pos, 0.0, 1.0);',
    '}',
  ].join('\n');

  const blurFS = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_tex;',
    'uniform vec2 u_texel;',
    'uniform vec2 u_dir;',
    'uniform float u_sigma;',
    'float gaussian(float x, float s) { return exp(-(x*x)/(2.0*s*s)); }',
    'void main() {',
    '  vec2 stepDir = u_dir * u_sigma;',
    '  vec4 col = texture2D(u_tex, v_uv) * gaussian(0.0, 1.0);',
    '  float wsum = gaussian(0.0, 1.0);',
    '  for (int i = 1; i <= 4; i++) {',
    '    float f = float(i);',
    '    float w = gaussian(f, 1.0);',
    '    vec2 off = stepDir * f * u_texel;',
    '    col += texture2D(u_tex, v_uv + off) * w;',
    '    col += texture2D(u_tex, v_uv - off) * w;',
    '    wsum += 2.0 * w;',
    '  }',
    '  gl_FragColor = col / wsum;',
    '}',
  ].join('\n');

  const composeFS = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_orig;',
    'uniform sampler2D u_blur;',
    'uniform sampler2D u_mask;',
    'uniform float u_intensity;',
    'uniform float u_brightness;',
    'uniform int u_filterType;', // 0=wrinkles, 1=brightness, 2=spots, 3=acne, 4=firmness
    'void main() {',
    '  vec4 o = texture2D(u_orig, v_uv);',
    '  vec4 b = texture2D(u_blur, v_uv);',
    '  float a = clamp(texture2D(u_mask, v_uv).a, 0.0, 1.0);',
    '  float m = a * u_intensity;',
    '  vec4 blended = mix(o, b, m);', 
    '  blended.rgb += u_brightness * a;',
    '  blended.rgb = clamp(blended.rgb, 0.0, 1.0);',
    '  gl_FragColor = blended;',

    'if (u_filterType == 2) {',
      '// FILTRO SPOTS/MANCHAS - Unificación de tono',
      '',
      '// 1. Mezclar con blur para suavizar manchas',
      'vec3 smoothed = mix(o.rgb, b.rgb, m * 0.7);',
      '',
      '// 2. Calcular luminosidad para análisis',
      'float origLum = dot(o.rgb, vec3(0.299, 0.587, 0.114));',
      'float smoothLum = dot(smoothed, vec3(0.299, 0.587, 0.114));',
      '',
      '// 3. Detectar y reducir manchas oscuras',
      '//    Si el píxel es más oscuro que el suavizado, aclararlo progresivamente',
      'float darkness = max(0.0, smoothLum - origLum);',
      'smoothed.rgb += vec3(darkness * 0.4) * m;',
      '',
      '// 4. Igualar tono de piel (reducir variaciones de color)',
      '//    Mantener la luminosidad pero unificar el color',
      'float targetLum = dot(smoothed, vec3(0.299, 0.587, 0.114));',
      'vec3 uniformTone = vec3(targetLum * 1.02);', // Tono neutro ligeramente más claro
      'smoothed.rgb = mix(smoothed.rgb, uniformTone, m * 0.35);',
      '',
      '// 5. Reducir diferencias extremas de color (manchas hiperpigmentadas)',
      'float avgChannel = (smoothed.r + smoothed.g + smoothed.b) / 3.0;',
      'smoothed.r = mix(smoothed.r, avgChannel, m * 0.25);',
      'smoothed.g = mix(smoothed.g, avgChannel, m * 0.15);',
      'smoothed.b = mix(smoothed.b, avgChannel, m * 0.15);',
      '',
      '// 6. Aplicar ligera desaturación para piel más uniforme',
      'float gray = dot(smoothed, vec3(0.299, 0.587, 0.114));',
      'smoothed.rgb = mix(vec3(gray), smoothed.rgb, 0.85);', // 15% menos saturación
      '',
      '// 7. Pequeño boost de brillo para "limpiar" el aspecto',
      'smoothed.rgb = pow(smoothed.rgb, vec3(0.96));', // Gamma lift suave
      'smoothed.rgb += vec3(0.02) * m;',
      '',
      '// 8. Mantener resultado en escala de grises (B&W)',
      'float finalGray = dot(smoothed, vec3(0.299, 0.587, 0.114));',
      'finalGray = pow(finalGray, 0.88);', // Ajuste de gamma para más claridad
      'blended.rgb = vec3(finalGray);',
      '',
      'blended.rgb = clamp(blended.rgb, 0.0, 1.0);',
    '}',


    'if (u_filterType == 3) {',
      '// FILTRO ACNÉ - Separación de frecuencias avanzada',
      '',
      '// 1. Extraer luminosidad de original y blur',
      'float origLum = dot(o.rgb, vec3(0.299, 0.587, 0.114));',
      'float blurLum = dot(b.rgb, vec3(0.299, 0.587, 0.114));',
      '',
      '// 2. Calcular detalles de alta frecuencia (textura de piel)',
      'float detail = origLum - blurLum;',
      '',
      '// 3. Aplicar blur selectivo con preservación de detalle',
      'vec3 smoothed = mix(o.rgb, b.rgb, m * 0.85);', // Más blur que antes
      '',
      '// 4. Restaurar detalles finos (poros, textura natural)',
      '//    pero NO imperfecciones (que son de frecuencia media)',
      'float detailAmount = 0.25 * (1.0 - m * 0.5);', // Menos detalle donde hay más máscara
      'smoothed.rgb += detail * detailAmount * sign(detail);',
      '',
      '// 5. Reducir rojeces (común en acné)',
      'float avgColor = (smoothed.r + smoothed.g + smoothed.b) / 3.0;',
      'smoothed.r = mix(smoothed.r, avgColor, m * 0.35);', // Reducir canal rojo
      'smoothed.g = mix(smoothed.g, avgColor, m * 0.15);', // Mantener verde
      'smoothed.b = mix(smoothed.b, avgColor, m * 0.1);',  // Ligeramente aumentar azul
      '',
      '// 6. Igualar tono de piel (reducir manchas post-acné)',
      'smoothed.rgb = mix(smoothed.rgb, vec3(blurLum), m * 0.2);',
      '',
      '// 7. Ligero aumento de brillo (piel más saludable)',
      'smoothed.rgb += vec3(0.05) * m;',
      '',
      'blended.rgb = clamp(smoothed, 0.0, 1.0);',
        'blended.rgb = clamp(smoothed, 0.0, 1.0);',
      '',
      '// PASO EXTRA: Suavizado adaptativo basado en diferencia de color',
      '// (simula blur bilateral para suavizar más las imperfecciones)',
      'vec2 texelSize = vec2(1.0) / vec2(1024.0, 1024.0);', // Ajustar según tamaño
      'vec3 avgNeighbor = vec3(0.0);',
      'float weightSum = 0.0;',
      '',
      'for(int dx = -1; dx <= 1; dx++) {',
        'for(int dy = -1; dy <= 1; dy++) {',
          'vec2 offset = vec2(float(dx), float(dy)) * texelSize * 2.0;',
          'vec3 neighbor = texture2D(u_blur, v_uv + offset).rgb;',
          'float colorDiff = length(neighbor - blended.rgb);',
          'float weight = exp(-colorDiff * 5.0) * a;', // Solo donde hay máscara
          'avgNeighbor += neighbor * weight;',
          'weightSum += weight;',
        '}',
      '}',
      '',
      'if(weightSum > 0.01) {',
        'vec3 bilateralSmooth = avgNeighbor / weightSum;',
        'blended.rgb = mix(blended.rgb, bilateralSmooth, m * 0.3);',
      '}',
    '}',
    '// Filtro de firmeza (lift): desplaza sutilmente las muestras hacia arriba',
    'if (u_filterType == 4) {',
      'float lift = 0.02 * u_intensity;',
      'vec2 off = vec2(0.0, -lift);',
      'vec4 lifted = texture2D(u_orig, v_uv + off * a);',
      '// Mezcla entre la composición y la muestra desplazada para simular lifting',
      'blended.rgb = mix(blended.rgb, lifted.rgb, 0.5 * m);',
      '// Pequeño aumento de contraste y brillo local para realzar pómulos',
      'blended.rgb = pow(blended.rgb, vec3(1.0/(1.0 - 0.06 * u_intensity)));',
      'blended.rgb += vec3(0.02 * u_intensity * a);',
      'blended.rgb = clamp(blended.rgb, 0.0, 1.0);',
    '}',

    'gl_FragColor = blended;',



    '}',
  ].join('\n');

  function createTexture(gl, width, height, data) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (data) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    return tex;
  }

  function createFBO(gl, tex) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("FBO incomplete");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
  }

  function setViewport(gl, w, h) { gl.viewport(0, 0, w, h); }

  function makeFullscreenQuad(gl) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const verts = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
       1,  1, 1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    const idx = new Uint16Array([0,1,2,2,1,3]);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    return { vbo, ibo };
  }

  // --------------- APP LOGIC -----------------
  function handleFile(file) {
    // Limpia errores previos
    setError('');
    if (!file) return;

    // Algunos navegadores (Safari) traen type vacío: aceptamos por extensión
    const name = (file.name || '').toLowerCase();
    const mime = file.type || '';
    const isImageMime = mime.indexOf('image/') === 0;
    const isImageExt = /(\.jpg|\.jpeg|\.png|\.webp)$/i.test(name);
    if (!isImageMime && !isImageExt) {
      setError('El archivo seleccionado no parece una imagen (usa JPG/PNG/WebP).');
      return;
    }
    if (/heic|heif/i.test(mime) || /(\.heic|\.heif)$/i.test(name)) {
      setError('El formato HEIC/HEIF no es compatible en el navegador. Convierte a JPG/PNG/WebP.');
      return;
    }

    // Cargar como Data URL (más compatible que blob: en Safari)
    try {
      const reader = new FileReader();
      reader.onerror = function(ev) {
        console.error('FileReader error', ev);
        setError('No se pudo leer el archivo. Prueba con otro JPG/PNG/WebP.');
      };
      reader.onload = function() {
        try {
          const dataURL = String(reader.result || '');
          setImageURL(dataURL); // preview inmediata

          const img = new Image();
          try { img.decoding = 'async'; } catch(_) {}
          img.onload = function() {
            try {
              const canvas = glCanvasRef.current;
              const gl = glRef.current || (canvas ? createGL(canvas) : null);
              let maxTex = 4096;
              if (gl) maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

              const srcW = img.naturalWidth, srcH = img.naturalHeight;
              const scale = Math.min(1, maxTex / srcW, maxTex / srcH);
              if (scale < 1) {
                const rw = Math.floor(srcW * scale);
                const rh = Math.floor(srcH * scale);
                const off = document.createElement('canvas');
                off.width = rw; off.height = rh;
                const octx = off.getContext('2d');
                octx.drawImage(img, 0, 0, rw, rh);
                const resized = new Image();
                resized.onload = function() {
                  setImage(resized);
                  setImgSize({ w: rw, h: rh });
                  setImageAspectRatio(rw / rh);
                };
                resized.onerror = function(ev) {
                  console.error('Error creando imagen redimensionada', ev);
                  setImage(img);
                  setImgSize({ w: srcW, h: srcH });
                  setImageAspectRatio(srcW / srcH);
                };
                resized.src = off.toDataURL('image/png');
                return;
              }
              setImage(img);
              setImgSize({ w: srcW, h: srcH });
              setImageAspectRatio(srcW / srcH);
            } catch (e) {
              console.error('Post-carga/resize error', e);
              setImage(img);
              setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
              setImageAspectRatio(img.naturalWidth / img.naturalHeight);
            }
          };
          img.onerror = function(ev) {
            console.error('Error cargando imagen (dataURL)', ev);
            setError('No se pudo cargar la imagen (dataURL). Prueba con otro archivo.');
          };
          img.src = dataURL;
        } catch(err) {
          console.error('onload reader error', err);
          setError('Error procesando la imagen.');
        }
      };
      reader.readAsDataURL(file);
    } catch(err) {
      console.error('reader setup error', err);
      setError('No se pudo iniciar la lectura del archivo.');
    }
  }

  // Función para iniciar la cámara
  async function startCamera() {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
      // Esperar un frame para que el video ref esté disponible
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    }
  }

  // Función para detener la cámara
  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }

  // Función para capturar foto de la cámara
  function capturePhoto() {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    
    if (!video || !canvas) return;
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Calcular el tamaño máximo cuadrado que cabe en el video
    const squareSize = Math.min(videoWidth, videoHeight);
    
    // Calcular el offset para centrar el cuadrado
    const offsetX = (videoWidth - squareSize) / 2;
    const offsetY = (videoHeight - squareSize) / 2;
    
    // Configurar canvas como cuadrado
    canvas.width = squareSize;
    canvas.height = squareSize;
    
    // Dibujar el cuadrado centrado del video en el canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, offsetX, offsetY, squareSize, squareSize, 0, 0, squareSize, squareSize);
    
    // Convertir a blob y procesar como imagen
    canvas.toBlob(function(blob) {
      if (!blob) {
        setError('Error al capturar la foto');
        return;
      }
      
      // Crear File object desde el blob
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      
      // Detener cámara
      stopCamera();
      
      // Procesar la imagen capturada
      handleFile(file);
    }, 'image/jpeg', 0.95);
  }


  function onFile(e) {
    const f = e.target && e.target.files && e.target.files[0];
    handleFile(f);
  }

  function clearMask() {
    try {
      const m = maskCanvasRef.current; if (!m) return;
      const ctx = m.getContext('2d'); if (!ctx) return;
      ctx.clearRect(0, 0, m.width, m.height);
      syncMaskToGPU();
      renderGL();
    } catch (e) { console.error(e); }
  }

  function resetAll() {
    setIntensity(0.5);
    setSigma(3);
    setBrightness(0); // AÑADIR ESTA LÍNEA
    setBrushSize(40);
    setHardness(0.6);
    setMode('paint');
    setView('after');
    clearMask();
  }

  // Init GL once
  useEffect(() => {
    try {
      const canvas = glCanvasRef.current;
      if (!canvas) return;
      const gl = createGL(canvas);
      glRef.current = gl;

      const progBlur = createProgram(gl, quadVS, blurFS);
      const progCompose = createProgram(gl, quadVS, composeFS);
      progBlurRef.current = progBlur;
      progComposeRef.current = progCompose;
      quadRef.current = makeFullscreenQuad(gl);
      // Inicializar FaceMesh
      const faceMesh = new window.FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMeshRef.current = faceMesh;
      console.log('FaceMesh inicializado');
    
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    }
  }, []);

  // Resize canvases & init textures on image load / preview change
  useEffect(() => {
    if (!image) return;
    try {
      const w = image.naturalWidth, h = image.naturalHeight;
      // Set intrinsic pixel size; visual size responsive
      [glCanvasRef.current, maskCanvasRef.current, outCanvasRef.current].forEach(function(c){
        if (c) { 
          c.width = w; 
          c.height = h; 
          c.style.width = '100%';
          c.style.height = 'auto';
          c.style.display = 'block';
        }
      });

      // Imagen como fondo visual del canvas de máscara para guiar el pintado
      if (maskCanvasRef.current) {
        const mc = maskCanvasRef.current;
        mc.style.backgroundImage = imageURL ? `url(${imageURL})` : '';
        mc.style.backgroundSize = 'contain';
        mc.style.backgroundRepeat = 'no-repeat';
        mc.style.backgroundPosition = 'center';
      }

      // BEFORE preview into out canvas
      const oc = outCanvasRef.current; if (!oc) return;
      const octx = oc.getContext('2d'); if (!octx) return;
      octx.clearRect(0,0,w,h);
      octx.drawImage(image, 0, 0, w, h);

      // Reset mask
      const m = maskCanvasRef.current; if (!m) return;
      const mctx = m.getContext('2d'); if (!mctx) return;
      mctx.clearRect(0,0,w,h);

      // GL textures + FBOs
      const gl = glRef.current; if (!gl) return;
      texOrigRef.current = createTexture(gl, w, h, image);
      texPingRef.current = createTexture(gl, w, h, null);
      texPongRef.current = createTexture(gl, w, h, null);
      texMaskRef.current = createTexture(gl, w, h, null);
      fboPingRef.current = createFBO(gl, texPingRef.current);
      fboPongRef.current = createFBO(gl, texPongRef.current);

      // Empty mask to GPU
      const empty = new Uint8Array(w*h*4);
      const gl2 = glRef.current; if (!gl2) return;
      gl2.bindTexture(gl2.TEXTURE_2D, texMaskRef.current);
      gl2.pixelStorei(gl2.UNPACK_FLIP_Y_WEBGL, true);
      gl2.pixelStorei(gl2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl2.texImage2D(gl2.TEXTURE_2D, 0, gl2.RGBA, w, h, 0, gl2.RGBA, gl2.UNSIGNED_BYTE, empty);

      setError('');
      // Asegura visibilidad inmediata tras cargar: muestra el original primero
      setView('before');
      renderGL();
      // Detectar cara automáticamente con un pequeño delay para asegurar que todo esté listo
      setTimeout(function() {
        if (faceMeshRef.current) {
          detectAndMaskFace();
        } else {
          console.log('FaceMesh aún no inicializado, esperando...');
          setTimeout(function() {
            if (faceMeshRef.current) {
              detectAndMaskFace();
            } else {
              setError('Modelo de detección facial aún cargando. Usa el botón "Redetectar cara" en unos segundos.');
            }
          }, 2000);
        }
      }, 500);
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    }
  }, [image, imageURL]);

  // Redetectar cara automáticamente cuando cambia el tipo de filtro
  useEffect(function() {
    if (image && faceMeshRef.current && !detectingFace) {
      if (filterType === 'wrinkles') {
        setIntensity(0.5);
        setSigma(4);
        setBrightness(0);
        clearMask();
        setTimeout(detectAndMaskFace, 100);
      } 
      else if (filterType === 'brightness') {
        setIntensity(0);
        setSigma(0);
        setBrightness(0.07);
        clearMask();
        setTimeout(detectAndMaskFace, 100);
      }
      else if (filterType === 'spots') {
        setIntensity(0.65);  // ⬆️ Aumentar de 0.4 a 0.65
        setSigma(5);         // ⬆️ Aumentar de 4 a 5 (más suavizado)
        setBrightness(0.05); // ⬆️ Más brillo para "limpiar"
        clearMask();
        setTimeout(detectAndMaskFace, 100);
      }
      else if (filterType === 'acne') {
        setIntensity(0.55);
        setSigma(3.4); 
        setBrightness(0.1);
        clearMask();
        setTimeout(detectAndMaskFace, 100);
      }
      else if (filterType === 'firmness') {
        setIntensity(0.7);
        setSigma(2);
        setBrightness(0);
        clearMask();
        setTimeout(detectAndMaskFace, 100);
      }
      clearMask();
      setTimeout(function() {
        detectAndMaskFace();
      }, 100);
    }
  }, [filterType, brightness, intensity]);

  // Limpiar stream de cámara cuando se desmonta el componente
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);




  async function detectFaceWithMesh(imageElement) {
    return new Promise((resolve, reject) => {
      if (!faceMeshRef.current) {
        reject(new Error('FaceMesh no inicializado'));
        return;
      }

      // Crear canvas temporal para enviar a FaceMesh
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageElement.width;
      tempCanvas.height = imageElement.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(imageElement, 0, 0);

      // Configurar callback temporal
      faceMeshRef.current.onResults((results) => {
        resolve(results);
      });

      // Enviar imagen
      faceMeshRef.current.send({ image: tempCanvas }).catch(reject);
    });
  }

  // Índices de landmarks importantes en FaceMesh
  const FACEMESH_INDICES = {
    // Ojos
    rightEyeUpper: [246, 161, 160, 159, 158, 157, 173],
    rightEyeLower: [33, 7, 163, 144, 145, 153, 154, 155, 133],
    leftEyeUpper: [466, 388, 387, 386, 385, 384, 398],
    leftEyeLower: [263, 249, 390, 373, 374, 380, 381, 382, 362],
    
    // Cejas
    rightEyebrow: [70, 63, 105, 66, 107, 55, 65],
    leftEyebrow: [300, 293, 334, 296, 336, 285, 295],
    
    // Nariz
    noseBridge: [6, 197, 195, 5],
    noseBottom: [2, 98, 327],
    
    // Boca
    upperLip: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
    lowerLip: [146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
    lipOutline: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185],
    
    // Contorno facial
    faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
    
    // Frente
    forehead: [10, 338, 297, 332, 284, 251, 389, 356, 70, 63, 105, 66, 107, 336, 296, 334, 293, 300],
    
    // Mejillas
    rightCheek: [50, 101, 100, 47, 117, 118, 119, 120, 121, 128, 129],
    leftCheek: [280, 330, 329, 277, 346, 347, 348, 349, 350, 357, 358],
    
    // Zona nasolabial
    rightNasolabial: [36, 142, 126, 217, 174],
    leftNasolabial: [266, 371, 355, 437, 399]
  };

// Función para obtener el centro de un conjunto de puntos
function getCenterOfPoints(landmarks, indices) {
  let sumX = 0, sumY = 0;
  indices.forEach(idx => {
    sumX += landmarks[idx][0];
    sumY += landmarks[idx][1];
  });
  return [sumX / indices.length, sumY / indices.length];
}

// Función para obtener el bounding box de puntos
function getBoundingBox(landmarks, indices) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  indices.forEach(idx => {
    const [x, y] = landmarks[idx];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

// Función para dibujar región con gradiente suave usando puntos específicos
function drawSmoothRegion(ctx, landmarks, indices, intensity = 0.8, blur = 1.5) {
  const bbox = getBoundingBox(landmarks, indices);
  const center = getCenterOfPoints(landmarks, indices);
  
  const radiusX = bbox.width * blur;
  const radiusY = bbox.height * blur;
  const maxRadius = Math.max(radiusX, radiusY);
  
  ctx.save();
  ctx.translate(center[0], center[1]);
  ctx.scale(radiusX / maxRadius, radiusY / maxRadius);
  
  const gradient = ctx.createRadialGradient(0, 0, maxRadius * 0.2, 0, 0, maxRadius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
  gradient.addColorStop(0.6, `rgba(255, 255, 255, ${intensity * 0.7})`);
  gradient.addColorStop(0.85, `rgba(255, 255, 255, ${intensity * 0.3})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// Función para crear máscara excluyendo ciertas zonas
function excludeRegion(ctx, landmarks, indices) {
  ctx.globalCompositeOperation = 'destination-out';
  
  ctx.beginPath();
  indices.forEach((idx, i) => {
    const [x, y] = landmarks[idx];
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fill();
  
  ctx.globalCompositeOperation = 'source-over';
}



  async function detectAndMaskFace(retryCount = 0) {
    if (!faceMeshRef.current || !image) return;
    
    setDetectingFace(true);
    
    try {
      const results = await detectFaceWithMesh(image);
      
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        if (retryCount < 2) {
          console.log(`Reintentando detección (intento ${retryCount + 1})...`);
          setTimeout(() => {
            detectAndMaskFace(retryCount + 1);
          }, 500);
          return;
        }
        
        setError('No se detectó cara tras varios intentos. Verifica iluminación y encuadre.');
        return;
      }
      
      // Procesar landmarks (usamos la primera cara detectada)
      const landmarks = results.multiFaceLandmarks[0];
      
      const m = maskCanvasRef.current;
      const ctx = m.getContext('2d');
      
      ctx.clearRect(0, 0, m.width, m.height);
      
      const canvasW = m.width;
      const canvasH = m.height;
      const imgW = image.naturalWidth || image.width;
      const imgH = image.naturalHeight || image.height;
      const scaleX = canvasW / imgW;
      const scaleY = canvasH / imgH;
      
      // Convertir landmarks normalizados a coordenadas del canvas
      const scaledLandmarks = landmarks.map(function(point) {
        return [point.x * canvasW, point.y * canvasH];
      });
      
      // Extraer puntos clave de FaceMesh (índices específicos)
      // FaceMesh tiene 468 puntos, los principales son:
      const rightEye = scaledLandmarks[33];   // Ojo derecho
      const leftEye = scaledLandmarks[263];   // Ojo izquierdo
      const nose = scaledLandmarks[1];        // Punta de la nariz
      const forehead = scaledLandmarks[10];   // Frente
      const chin = scaledLandmarks[152];      // Barbilla
      
      const eyesCenterX = (rightEye[0] + leftEye[0]) / 2;
      const eyesCenterY = (rightEye[1] + leftEye[1]) / 2;
      
      const eyesDistance = Math.sqrt(
        Math.pow(leftEye[0] - rightEye[0], 2) + 
        Math.pow(leftEye[1] - rightEye[1], 2)
      );
      
      const height = Math.abs(chin[1] - forehead[1]);
      
      ctx.globalCompositeOperation = 'source-over';
      
      // APLICAR MÁSCARA SEGÚN EL FILTRO (usando FaceMesh landmarks completos)
      if (filterType === 'wrinkles') {
        applyWrinklesMaskWithFaceMesh(ctx, scaledLandmarks);
      } else if (filterType === 'firmness') {
        applyFirmnessMaskWithFaceMesh(ctx, scaledLandmarks);
      } else if (filterType === 'brightness') {
        applyBrightnessMaskWithFaceMesh(ctx, scaledLandmarks);
      } else if (filterType === 'spots') {
        applySpotsMaskWithFaceMesh(ctx, scaledLandmarks);
      } else if (filterType === 'acne') {
        applyAcneMaskWithFaceMesh(ctx, scaledLandmarks);
      }
      
      console.log('Máscara aplicada correctamente para filtro:', filterType);
      
      syncMaskToGPU();
      setView('split');
      renderGL();
      setFaceDetected(true);
      
    } catch (err) {
      console.error('Error en detección:', err);
      setError('Error al detectar la cara: ' + err.message);
    } finally {
      setDetectingFace(false);
    }
  }






  function applyWrinklesMaskWithFaceMesh(ctx, scaledLandmarks) {
    ctx.globalCompositeOperation = 'source-over';
    
    // 1. FRENTE - zona superior
    const foreheadIndices = FACEMESH_INDICES.forehead;
    drawSmoothRegion(ctx, scaledLandmarks, foreheadIndices, 0.85, 1.3);
    
    // 2. ZONA ENTRE CEJAS (glabela)
    const glabellaIndices = [6, 197, 195, 5, 168, 8, 9];
    drawSmoothRegion(ctx, scaledLandmarks, glabellaIndices, 0.75, 1.0);
    
    // 3. CONTORNO DE OJOS (patas de gallo) - sin cubrir el ojo mismo
    // Ojo derecho - zona externa
    const rightEyeOuterCorner = [33, 133, 155, 154, 153, 145, 144, 163];
    drawSmoothRegion(ctx, scaledLandmarks, rightEyeOuterCorner, 0.8, 1.4);
    
    // Ojo izquierdo - zona externa
    const leftEyeOuterCorner = [263, 362, 382, 381, 380, 374, 373, 390];
    drawSmoothRegion(ctx, scaledLandmarks, leftEyeOuterCorner, 0.8, 1.4);
    
    // 4. ZONA BAJO LOS OJOS (ojeras/bolsas)
    const rightUnderEye = [133, 155, 154, 153, 145, 144, 163, 7];
    drawSmoothRegion(ctx, scaledLandmarks, rightUnderEye, 0.7, 1.2);
    
    const leftUnderEye = [362, 382, 381, 380, 374, 373, 390, 249];
    drawSmoothRegion(ctx, scaledLandmarks, leftUnderEye, 0.7, 1.2);
    
    // 5. LÍNEAS NASOLABIALES (desde nariz a comisura)
    const rightNasolabial = FACEMESH_INDICES.rightNasolabial;
    drawSmoothRegion(ctx, scaledLandmarks, rightNasolabial, 0.75, 1.5);
    
    const leftNasolabial = FACEMESH_INDICES.leftNasolabial;
    drawSmoothRegion(ctx, scaledLandmarks, leftNasolabial, 0.75, 1.5);
    
    // 6. ZONA ALREDEDOR DE LA BOCA 
    // 6a. ZONA SUPERIOR (filtrum - entre nariz y labio superior) - MÁS DENSA
    // Expandido para abarcar todo el espacio entre la nariz y el labio superior
    const upperMouthArea = [2, 98, 97, 99, 75, 60, 20, 242, 97, 98, 2, 327, 326, 328, 305, 290, 250, 462, 1, 10, 164, 393];
    drawSmoothRegion(ctx, scaledLandmarks, upperMouthArea, 0.85, 1.4);

    // 6b. ZONA INFERIOR (líneas de marioneta - desde comisuras hacia abajo)
    const lowerMouthArea = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375];
    drawSmoothRegion(ctx, scaledLandmarks, lowerMouthArea, 0.85, 1.6);
    
    // 7. BARBILLA (arrugas horizontales)
    const chinArea = [152, 377, 400, 378, 379, 365, 397, 288, 361];
    drawSmoothRegion(ctx, scaledLandmarks, chinArea, 0.65, 1.3);
    
    // EXCLUIR ojos, cejas y boca para no desenfocarlos
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightEyeUpper.concat(FACEMESH_INDICES.rightEyeLower));
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftEyeUpper.concat(FACEMESH_INDICES.leftEyeLower));
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightEyebrow);
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftEyebrow);
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.lipOutline);
  }

  function applyBrightnessMaskWithFaceMesh(ctx, scaledLandmarks) {
    // Aplicar luminosidad en toda la zona facial, respetando contorno natural
    const faceOvalIndices = FACEMESH_INDICES.faceOval;
    
    // Obtener el centro de la cara
    const center = getCenterOfPoints(scaledLandmarks, faceOvalIndices);
    const bbox = getBoundingBox(scaledLandmarks, faceOvalIndices);
    
    const radiusX = bbox.width * 0.6;
    const radiusY = bbox.height * 0.7;
    const maxRadius = Math.max(radiusX, radiusY);
    
    ctx.save();
    ctx.translate(center[0], center[1]);
    ctx.scale(radiusX / maxRadius, radiusY / maxRadius);
    
    const gradient = ctx.createRadialGradient(0, 0, maxRadius * 0.3, 0, 0, maxRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.90, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.97, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  function applySpotsMaskWithFaceMesh(ctx, scaledLandmarks) {
    // Cobertura uniforme y completa de toda la zona facial
    const faceOvalIndices = FACEMESH_INDICES.faceOval;
    const center = getCenterOfPoints(scaledLandmarks, faceOvalIndices);
    const bbox = getBoundingBox(scaledLandmarks, faceOvalIndices);
    
    const radiusX = bbox.width * 0.72;
    const radiusY = bbox.height * 0.82;
    const maxRadius = Math.max(radiusX, radiusY);
    
    ctx.save();
    ctx.translate(center[0], center[1]);
    ctx.scale(radiusX / maxRadius, radiusY / maxRadius);
    
    // Gradiente muy uniforme para cobertura pareja
    const gradient = ctx.createRadialGradient(0, 0, maxRadius * 0.1, 0, 0, maxRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.92)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.92, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Reforzar zonas propensas a manchas
    // Frente
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.forehead, 0.95, 1.3);
    
    // Mejillas (zona común de manchas)
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightCheek, 0.95, 1.4);
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftCheek, 0.95, 1.4);
    
    // Zona de bigote/labio superior (melasma común)
    const upperLipArea = [2, 98, 97, 99, 75, 60, 20, 242, 327, 326, 328, 305, 290, 250, 462];
    drawSmoothRegion(ctx, scaledLandmarks, upperLipArea, 0.9, 1.2);
    
    // Pómulos (manchas solares comunes)
    const rightCheekbone = [205, 206, 207, 187, 123, 116, 111];
    const leftCheekbone = [425, 426, 427, 411, 352, 345, 340];
    drawSmoothRegion(ctx, scaledLandmarks, rightCheekbone, 0.92, 1.2);
    drawSmoothRegion(ctx, scaledLandmarks, leftCheekbone, 0.92, 1.2);
    
    // Excluir zonas sensibles
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightEyeUpper.concat(FACEMESH_INDICES.rightEyeLower));
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftEyeUpper.concat(FACEMESH_INDICES.leftEyeLower));
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightEyebrow);
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftEyebrow);
    
    const innerLips = [
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
      146, 91, 181, 84, 17, 314, 405, 321, 375
    ];
    excludeRegion(ctx, scaledLandmarks, innerLips);
  }

  function applyAcneMaskWithFaceMesh(ctx, scaledLandmarks) {
    // Estrategia: Cobertura MUY densa y uniforme en toda la piel facial
    // con múltiples capas para asegurar cobertura completa
    
    const faceOvalIndices = FACEMESH_INDICES.faceOval;
    const center = getCenterOfPoints(scaledLandmarks, faceOvalIndices);
    const bbox = getBoundingBox(scaledLandmarks, faceOvalIndices);
    
    // CAPA BASE - Cobertura principal más amplia
    const radiusX = bbox.width * 0.75;
    const radiusY = bbox.height * 0.85;
    const maxRadius = Math.max(radiusX, radiusY);
    
    ctx.save();
    ctx.translate(center[0], center[1]);
    ctx.scale(radiusX / maxRadius, radiusY / maxRadius);
    
    // Gradiente más uniforme y denso
    const gradient = ctx.createRadialGradient(0, 0, maxRadius * 0.15, 0, 0, maxRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');      // 100% en el centro
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)'); // Mantener casi al 100%
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.92)'); // Degradado muy suave
    gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.95, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // CAPAS REFORZADAS - Zonas críticas con acné
    // Frente (zona T)
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.forehead, 1.0, 1.4);
    
    // Mejillas (cobertura máxima)
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightCheek, 1.0, 1.5);
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftCheek, 1.0, 1.5);
    
    // Nariz (zona T)
    const noseArea = [6, 197, 195, 5, 4, 1, 19, 94, 2];
    drawSmoothRegion(ctx, scaledLandmarks, noseArea, 0.98, 1.3);
    
    // Barbilla (propensa al acné)
    const chinArea = [152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 93];
    drawSmoothRegion(ctx, scaledLandmarks, chinArea, 0.98, 1.4);
    
    // Zona entre cejas (propensa al acné)
    const glabellaArea = [8, 9, 168, 6, 197, 195, 5];
    drawSmoothRegion(ctx, scaledLandmarks, glabellaArea, 0.95, 1.0);
    
    // Zona alrededor de la nariz (laterales)
    const noseSidesRight = [218, 126, 142, 36, 205, 206];
    const noseSidesLeft = [438, 355, 371, 266, 425, 426];
    drawSmoothRegion(ctx, scaledLandmarks, noseSidesRight, 0.95, 1.2);
    drawSmoothRegion(ctx, scaledLandmarks, noseSidesLeft, 0.95, 1.2);
    
    // IMPORTANTE: Excluir ojos y cejas ANTES de la boca
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightEyeUpper.concat(FACEMESH_INDICES.rightEyeLower));
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftEyeUpper.concat(FACEMESH_INDICES.leftEyeLower));
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightEyebrow);
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftEyebrow);
    
    // Zona alrededor de la boca (reducir acné peribucal)
    const mouthPerimeter = [
      // Expandir más allá del contorno de labios
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
      146, 91, 181, 84, 17, 314, 405, 321, 375,
      // Agregar puntos circundantes
      62, 96, 89, 179, 86, 16, 315, 403, 319, 325, 292
    ];
    drawSmoothRegion(ctx, scaledLandmarks, mouthPerimeter, 0.85, 1.3);
    
    // Excluir SOLO el interior de los labios (más pequeño)
    const innerLips = [
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
      146, 91, 181, 84, 17, 314, 405, 321, 375
    ];
    excludeRegion(ctx, scaledLandmarks, innerLips);
  }

  function applyFirmnessMaskWithFaceMesh(ctx, scaledLandmarks) {
    // MEJILLAS (zona de pómulos) - lift principal
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightCheek, 0.95, 1.4);
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftCheek, 0.95, 1.4);
    
    // PÁRPADOS SUPERIORES - levantamiento
    const rightUpperLidExtended = FACEMESH_INDICES.rightEyeUpper.concat([70, 63, 105, 66, 107]);
    drawSmoothRegion(ctx, scaledLandmarks, rightUpperLidExtended, 0.9, 1.1);
    
    const leftUpperLidExtended = FACEMESH_INDICES.leftEyeUpper.concat([300, 293, 334, 296, 336]);
    drawSmoothRegion(ctx, scaledLandmarks, leftUpperLidExtended, 0.9, 1.1);
    
    // ZONA NASOLABIAL - para suavizar surcos
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightNasolabial, 0.8, 1.3);
    drawSmoothRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftNasolabial, 0.8, 1.3);
    
    // ZONA CENTRAL DE PÓMULOS (lift extra)
    const centerCheekboneRight = [205, 206, 207, 187, 123];
    drawSmoothRegion(ctx, scaledLandmarks, centerCheekboneRight, 0.85, 1.0);
    
    const centerCheekboneLeft = [425, 426, 427, 411, 352];
    drawSmoothRegion(ctx, scaledLandmarks, centerCheekboneLeft, 0.85, 1.0);
    
    // LÍNEA DE LA MANDÍBULA - definición
    const jawlineRight = [172, 136, 150, 149, 176, 148];
    drawSmoothRegion(ctx, scaledLandmarks, jawlineRight, 0.75, 1.2);
    
    const jawlineLeft = [397, 365, 379, 378, 400, 377];
    drawSmoothRegion(ctx, scaledLandmarks, jawlineLeft, 0.75, 1.2);

    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.rightEyeUpper.concat(FACEMESH_INDICES.rightEyeLower));
    excludeRegion(ctx, scaledLandmarks, FACEMESH_INDICES.leftEyeUpper.concat(FACEMESH_INDICES.leftEyeLower));
  }




  // Paint mask (Pointer + mouse/touch fallbacks)
  useEffect(() => {
    const canvas = maskCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    let painting = false;

    function getCoordsFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = ('touches' in e && e.touches[0] ? e.touches[0].clientX : e.clientX);
      const cy = ('touches' in e && e.touches[0] ? e.touches[0].clientY : e.clientY);
      const x = (cx - rect.left) * scaleX;
      const y = (cy - rect.top) * scaleY;
      return { x: x, y: y };
    }

    function paintAt(x, y) {
      const r = brushSize / 2;
      const grad = ctx.createRadialGradient(x, y, r * Math.max(0, Math.min(1, hardness)), x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = (mode === 'paint') ? 'source-over' : 'destination-out';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function onPointerDown(e) {
      e.preventDefault(); painting = true;
      try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch(_){ }
      const p = getCoordsFromEvent(e);
      paintAt(p.x, p.y); syncMaskToGPU(); renderGL();
    }
    function onPointerMove(e) {
      if (!painting) return; e.preventDefault();
      const p = getCoordsFromEvent(e);
      paintAt(p.x, p.y); syncMaskToGPU(); renderGL();
    }
    function onPointerUp(e) { painting = false; try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch(_){ } }

    function onMouseDown(e){ e.preventDefault(); painting = true; const p = getCoordsFromEvent(e); paintAt(p.x,p.y); syncMaskToGPU(); renderGL(); }
    function onMouseMove(e){ if(!painting) return; e.preventDefault(); const p = getCoordsFromEvent(e); paintAt(p.x,p.y); syncMaskToGPU(); renderGL(); }
    function onMouseUp(){ painting = false; }

    function onTouchStart(e){ painting = true; const p = getCoordsFromEvent(e); paintAt(p.x,p.y); syncMaskToGPU(); renderGL(); }
    function onTouchMove(e){ if(!painting) return; const p = getCoordsFromEvent(e); paintAt(p.x,p.y); syncMaskToGPU(); renderGL(); }
    function onTouchEnd(){ painting = false; }

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [brushSize, hardness, mode, imgSize.w, imgSize.h]);

  function syncMaskToGPU() {
    const w = imgSize.w, h = imgSize.h; if (!w || !h) return;
    const gl = glRef.current; if (!gl) return;
    const texMask = texMaskRef.current; if (!texMask) return;
    const maskCanvas = maskCanvasRef.current; if (!maskCanvas) return;
    gl.bindTexture(gl.TEXTURE_2D, texMask);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
  }

  function bindQuad(gl, prog) {
    const locPos = gl.getAttribLocation(prog, 'a_pos');
    const locUV  = gl.getAttribLocation(prog, 'a_uv');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadRef.current.vbo);
    gl.enableVertexAttribArray(locPos);
    gl.enableVertexAttribArray(locUV);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(locUV,  2, gl.FLOAT, false, 16, 8);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadRef.current.ibo);
  }

  function drawTo(gl, fbo, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    setViewport(gl, w, h);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function renderGL() {
    try {
      const gl = glRef.current; if (!gl || !image) {
        const oc = outCanvasRef.current; if (oc && image) {
          const octx = oc.getContext('2d');
          const w = imgSize.w, h = imgSize.h; if (w && h) {
            octx.clearRect(0,0,w,h);
            octx.drawImage(image, 0, 0, w, h);
          }
        }
        return;
      }
      const w = imgSize.w, h = imgSize.h; if (!w || !h) return;

      // Pass A: horizontal blur (orig -> ping)
      gl.useProgram(progBlurRef.current);
      bindQuad(gl, progBlurRef.current);
      const u_texelA = gl.getUniformLocation(progBlurRef.current, 'u_texel');
      const u_dirA   = gl.getUniformLocation(progBlurRef.current, 'u_dir');
      const u_sigmaA = gl.getUniformLocation(progBlurRef.current, 'u_sigma');
      const u_texA   = gl.getUniformLocation(progBlurRef.current, 'u_tex');

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texOrigRef.current);
      gl.uniform1i(u_texA, 0);
      gl.uniform2f(u_texelA, 1/w, 1/h);
      gl.uniform2f(u_dirA, 1, 0);
      gl.uniform1f(u_sigmaA, sigma);
      drawTo(gl, fboPingRef.current, w, h);

      // Pass B: vertical blur (ping -> pong)
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texPingRef.current);
      gl.uniform1i(u_texA, 0);
      gl.uniform2f(u_texelA, 1/w, 1/h);
      gl.uniform2f(u_dirA, 0, 1);
      gl.uniform1f(u_sigmaA, sigma);
      drawTo(gl, fboPongRef.current, w, h);

      // Pass C: compose to screen
      gl.useProgram(progComposeRef.current);
      bindQuad(gl, progComposeRef.current);
      const u_orig = gl.getUniformLocation(progComposeRef.current, 'u_orig');
      const u_blur = gl.getUniformLocation(progComposeRef.current, 'u_blur');
      const u_mask = gl.getUniformLocation(progComposeRef.current, 'u_mask');
      const u_int  = gl.getUniformLocation(progComposeRef.current, 'u_intensity');
      const u_bright = gl.getUniformLocation(progComposeRef.current, 'u_brightness');
      const u_filterType = gl.getUniformLocation(progComposeRef.current, 'u_filterType');



      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texOrigRef.current);
      gl.uniform1i(u_orig, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texPongRef.current);
      gl.uniform1i(u_blur, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texMaskRef.current);
      gl.uniform1i(u_mask, 2);
      gl.uniform1f(u_int, intensity);
      gl.uniform1f(u_bright, brightness);
      let filterId = 0;
      if (filterType === 'brightness') filterId = 1;
      else if (filterType === 'spots') filterId = 2;
      else if (filterType === 'acne') filterId = 3;
      else if (filterType === 'firmness') filterId = 4;
      gl.uniform1i(u_filterType, filterId);


      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      setViewport(gl, w, h);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      // Mirror to outCanvas
      const srcCanvas = glCanvasRef.current; // WebGL canvas as source
      const octx = outCanvasRef.current && outCanvasRef.current.getContext('2d');
      if (!octx) return;
      gl.finish(); // ensure GPU commands completed before sampling the canvas
      octx.clearRect(0,0,w,h);

      octx.clearRect(0,0,w,h);
      if (view === 'before') {
        octx.drawImage(image, 0, 0, w, h);
        
        if (filterType === 'spots') {
          try {
            const imgData = octx.getImageData(0, 0, w, h);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              d[i] = d[i + 1] = d[i + 2] = gray;
            }
            octx.putImageData(imgData, 0, 0);
          } catch (err) {
            console.error('Error aplicando escala de grises en "antes":', err);
          }
        }
      } else if (view === 'after') {
        // Si por cualquier causa el canvas GL aún no tiene contenido, muestra el original como fallback
        const hasGL = !!srcCanvas && srcCanvas.width && srcCanvas.height;
        if (hasGL) {
          octx.drawImage(srcCanvas, 0, 0, w, h);
        } else {
          octx.drawImage(image, 0, 0, w, h);
        }
        octx.drawImage(srcCanvas, 0, 0, w, h);
      } else if (view === 'mask') {
        // Mostrar solo la máscara sobre fondo negro
        octx.fillStyle = '#000000';
        octx.fillRect(0, 0, w, h);
        octx.drawImage(maskCanvasRef.current, 0, 0, w, h);
      } else {
      // split view con posición variable
      const splitPx = Math.max(0, Math.min(1, splitPos)) * w;
      
      // izquierda: original (o en B&N si es filtro spots)
      if (splitPx > 0) {
          octx.drawImage(image, 0, 0, splitPx, h, 0, 0, splitPx, h);
          
          // Si es filtro spots, convertir el lado izquierdo a B&N
          if (filterType === 'spots') {
            try {
              const imgData = octx.getImageData(0, 0, splitPx, h);
              const d = imgData.data;
              for (let i = 0; i < d.length; i += 4) {
                const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                d[i] = d[i + 1] = d[i + 2] = gray;
              }
              octx.putImageData(imgData, 0, 0);
            } catch (err) {
              console.error('Error aplicando B&N en split izquierda:', err);
            }
          }
        }
        
        // derecha: procesado
        const rightW = w - splitPx;
        if (rightW > 0) octx.drawImage(srcCanvas, splitPx, 0, rightW, h, splitPx, 0, rightW, h);
        
        // Línea divisoria + asidero
        octx.fillStyle = 'rgba(0,0,0,0.7)';
        octx.fillRect(Math.floor(splitPx)-1, 0, 2, h);
        octx.fillStyle = 'rgba(255,255,255,0.9)';
        octx.fillRect(Math.floor(splitPx)-12, h/2-16, 24, 32);
      }
    } catch (err) {
      console.error('[renderGL] error:', err);
      setError(String(err.message || err));
    }
  }

  // Fallback interactivo: arrastrar la línea divisoria en el canvas de salida
  useEffect(() => {
    const canvas = outCanvasRef.current; if (!canvas) return;
    let dragging = false;

    function getX(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left; // px en CSS
      const p = x / rect.width; // 0..1
      return Math.max(0, Math.min(1, p));
    }

    function onDown(e) {
      if (view !== 'split') return;
      dragging = true;
      try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch(_){}
      setSplitPos(getX(e));
    }
    function onMove(e) {
      if (!dragging || view !== 'split') return;
      setSplitPos(getX(e));
    }
    function onUp(e) {
      dragging = false;
      try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch(_){}
    }

    canvas.style.cursor = (view === 'split') ? 'col-resize' : 'default';
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [view]);

  function downloadPNG() {
    if (!outCanvasRef.current) return;
    const url = outCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered.png';
    a.click();
  }

  useEffect(function() { 
    renderGL(); 
  }, [intensity, sigma, brightness, view, splitPos]);

  // --------------------- UI -----------------------
  return (
    <div className="min-h-screen w-full bg-neutral-100 text-neutral-900">
      <div className="mx-auto max-w-6xl p-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Web Image Filter</h1>
            <p className="text-sm opacity-70">Sube una imagen, la cara se detecta automáticamente. Ajusta o pinta más si lo necesitas.</p>
            {detectingFace && <p className="text-sm text-blue-600 mt-1">Detectando cara...</p>}
            {faceDetected && <p className="text-sm text-green-600 mt-1">Cara detectada</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" 
              onChange={onFile} 
              className="hidden"
              id="fileInput"
            />
            <label 
              htmlFor="fileInput" 
              className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md cursor-pointer"
            >
              Subir foto
            </label>
            
            <button 
              onClick={startCamera} 
              className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md"
              disabled={showCamera}
            >
              Tomar foto
            </button>
            
            <button 
              onClick={detectAndMaskFace} 
              className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md disabled:opacity-50" 
              disabled={!image || detectingFace}
            >
              {detectingFace ? 'Detectando...' : 'Redetectar cara'}
            </button>
            
            <button 
              onClick={downloadPNG} 
              className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md disabled:opacity-50" 
              disabled={!image}
            >
              Descargar PNG
            </button>
          </div>
        </header>

        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Tomar foto</h2>
                <button 
                  onClick={stopCamera}
                  className="text-neutral-500 hover:text-neutral-900 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="relative bg-black" style={{aspectRatio: '1/1'}}>
                <video 
                  ref={cameraVideoRef}
                  autoPlay 
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{transform: 'scaleX(-1)'}}
                />
                
                {/* Canvas oculto para captura */}
                <canvas ref={cameraCanvasRef} className="hidden" />
              </div>
              
              <div className="p-4 flex gap-3 justify-center">
                <button 
                  onClick={capturePhoto}
                  className="rounded-xl bg-neutral-900 text-white px-6 py-3 text-sm font-medium shadow-lg hover:bg-neutral-800"
                >
                  Capturar foto
                </button>
                <button 
                  onClick={stopCamera}
                  className="rounded-xl border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-50"
                >
                  Cancelar
                </button>
              </div>
              
              <div className="px-4 pb-4 text-xs text-neutral-500 text-center">
                Asegúrate de tener buena iluminación frontal y mantén tu rostro centrado
              </div>
            </div>
          </div>
        )}





        {/* Zona drag & drop */}
        <div
          onDragOver={(e)=>{ try { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect='copy'; } catch(_){} }}
          onDrop={(e)=>{
            try {
              e.preventDefault();
              e.stopPropagation();
              const dt = e.dataTransfer;
              const file = dt && dt.files && dt.files.length > 0 ? dt.files[0] : null;
              if (file) {
                handleFile(file);
              } else {
                setError('No se detectó ningún archivo en el arrastre. Arrastra un JPG/PNG/WebP desde tu equipo.');
              }
            } catch(err) {
              console.error('drop error', err);
              setError('Error al procesar el arrastre. Usa el botón "Elegir archivo" como alternativa.');
            }
          }}
          className="mb-4 rounded-xl border-2 border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
          Arrastra **un archivo de imagen** (JPG/PNG/WebP) desde tu ordenador o usa el selector de archivo de arriba.
        </div>

        {error ? (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 p-3 text-sm">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-1 bg-white rounded-2xl shadow p-4 flex flex-col gap-4">
            <h2 className="font-semibold">Controles</h2>
              <div className="border-t pt-3">
                <h3 className="font-medium text-sm mb-2">Tipo de Filtro</h3>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={function(){
                        setFilterType('wrinkles'); 
                        if(image) {
                          setTimeout(function() {
                            detectAndMaskFace();
                          }, 100);
                        }
                      }} 
                      className={'rounded-lg px-3 py-2 text-sm border ' + (filterType==='wrinkles'?'bg-neutral-900 text-white':'bg-white')}>
                      Arrugas
                    </button>
                    <button 
                      onClick={function(){
                        setFilterType('brightness'); 
                        if(image) {
                          setTimeout(function() {
                            detectAndMaskFace();
                          }, 100);
                        }
                      }} 
                      className={'rounded-lg px-3 py-2 text-sm border ' + (filterType==='brightness'?'bg-neutral-900 text-white':'bg-white')}>
                      Luminosidad
                    </button>
                    <button 
                      onClick={function(){
                        setFilterType('spots'); 
                        if(image) {
                          setTimeout(function() {
                            detectAndMaskFace();
                          }, 100);
                        }
                      }} 
                      className={'rounded-lg px-3 py-2 text-sm border ' + (filterType==='spots'?'bg-neutral-900 text-white':'bg-white')}>
                      Manchas / Tono
                    </button>
                    <button 
                      onClick={function(){
                        setFilterType('acne'); 
                        if(image) {
                          setTimeout(function() {
                            detectAndMaskFace();
                          }, 100);
                        }
                      }} 
                      className={'rounded-lg px-3 py-2 text-sm border ' + (filterType==='acne'?'bg-neutral-900 text-white':'bg-white')}>
                      Acné / Imperfecciones
                    </button>
                    <button 
                      onClick={function(){
                        setFilterType('firmness'); 
                        if(image) {
                          setTimeout(function() {
                            detectAndMaskFace();
                          }, 100);
                        }
                      }} 
                      className={'rounded-lg px-3 py-2 text-sm border ' + (filterType==='firmness'?'bg-neutral-900 text-white':'bg-white')}>
                      Firmeza (lift)
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    {filterType === 'wrinkles' && 'Aplica en zonas específicas: frente, mejillas y líneas nasolabiales'}
                    {filterType === 'brightness' && 'Aplica en toda la cara de forma uniforme'}
                    {filterType === 'spots' && 'Aplica en toda la piel para reducir manchas y unificar tono'}
                    {filterType === 'acne' && 'Reduce acné, granos y unifica el tono de la piel'}
                    {filterType === 'firmness' && 'Efecto de firmeza: eleva párpados superiores y realza pómulos'}
                  </p>
                </div>
            <label className={'text-sm'}>
              Intensidad: {intensity.toFixed(2)}
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.01} 
                value={intensity} 
                onChange={function(e){setIntensity(parseFloat(e.target.value));}} 
                className="w-full"
                disabled={controlsLocked}
              />
            </label>
            <label className={'text-sm'}>
              Suavizado (sigma): {sigma}
              <input 
                type="range" 
                min={1} 
                max={10} 
                step={1} 
                value={sigma} 
                onChange={function(e){setSigma(parseInt(e.target.value));}} 
                className="w-full"
                disabled={controlsLocked}
              />
            </label>
            <label className={'text-sm'}>
              Luminosidad: {brightness > 0 ? '+' : ''}{brightness.toFixed(2)}
              <input 
                type="range" 
                min={-0.3} 
                max={0.3} 
                step={0.01} 
                value={brightness} 
                onChange={function(e){setBrightness(parseFloat(e.target.value));}} 
                className="w-full"
                disabled={controlsLocked}
              />
            </label>

            <div className="border-t pt-3">
              <h3 className="font-medium text-sm mb-2">Pincel de máscara</h3>
              <label className="text-sm">
                Tamaño: {brushSize}px
                <input type="range" min={10} max={200} step={1} value={brushSize} onChange={function(e){setBrushSize(parseInt(e.target.value));}} className="w-full"/>
              </label>
              <label className="text-sm">
                Dureza: {Math.round(hardness*100)}%
                <input type="range" min={0} max={1} step={0.05} value={hardness} onChange={function(e){setHardness(parseFloat(e.target.value));}} className="w-full"/>
              </label>
              <div className="flex gap-2">
                <button onClick={function(){setMode('paint');}} className={'flex-1 rounded-lg px-3 py-2 text-sm border ' + (mode==='paint'?'bg-neutral-900 text-white':'bg-white')}>Pintar</button>
                <button onClick={function(){setMode('erase');}} className={'flex-1 rounded-lg px-3 py-2 text-sm border ' + (mode==='erase'?'bg-neutral-900 text-white':'bg-white')}>Borrar</button>
              </div>
              <div className="flex gap-2">
                <button onClick={clearMask} className="flex-1 rounded-lg px-3 py-2 text-sm border">Borrar máscara</button>
                <button onClick={resetAll} className="flex-1 rounded-lg px-3 py-2 text-sm border">Reset</button>
              </div>
              <p className="text-xs text-neutral-500">Consejo: pinta sólo en zonas de piel donde quieras suavizar (frente, ojeras, nasolabial). Mantén rasgos definidos sin cubrir bordes.</p>
            </div>

            <div className="border-t pt-3">
              <h3 className="font-medium text-sm mb-2">Vista</h3>
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={function(){setView('after');}} className={'rounded-lg px-3 py-2 text-sm border ' + (view==='after'?'bg-neutral-900 text-white':'bg-white')}>Después</button>
                <button onClick={function(){setView('before');}} className={'rounded-lg px-3 py-2 text-sm border ' + (view==='before'?'bg-neutral-900 text-white':'bg-white')}>Antes</button>
                <button onClick={function(){setView('split');}} className={'rounded-lg px-3 py-2 text-sm border ' + (view==='split'?'bg-neutral-900 text-white':'bg-white')}>Split</button>
                <button onClick={function(){setView('mask');}} className={'rounded-lg px-3 py-2 text-sm border ' + (view==='mask'?'bg-neutral-900 text-white':'bg-white')}>Mostrar máscara</button>
              </div>
              {view==='split' && (
                <div className="mt-2 text-xs">
                  Línea: {(splitPos*100).toFixed(0)}%
                  <input type="range" min={0} max={1} step={0.01} value={splitPos} onChange={function(e){ setSplitPos(parseFloat(e.target.value)); }} className="w-full"/>
                  <p className="opacity-60">También puedes arrastrar la línea directamente en el canvas de salida.</p>
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-4">
            <div className="relative bg-white rounded-2xl shadow overflow-hidden">
              <div className="p-2 flex items-center justify-between text-xs text-neutral-600">
                <span>Canvas GPU</span>
                <span>Canvas Máscara (pinta aquí)</span>
                <span>Salida</span>
              </div>
              <div className="p-2 text-xs text-neutral-600">
                <div className="mb-2">Previsualización rápida de la imagen cargada (para comprobar carga):</div>
                <div className="w-full overflow-hidden rounded-lg border bg-white p-2">
                  {imageURL ? <img src={imageURL} alt="preview" style={{maxHeight:'256px', objectFit:'contain', display:'block', margin:'0 auto'}}/> : <div className="text-neutral-400">(sin imagen)</div>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2">
                <div className="relative border rounded-xl overflow-hidden" style={{aspectRatio: imageAspectRatio}}>
                  <canvas ref={glCanvasRef} className="w-full h-full block" style={{background:'#fafafa'}} />
                </div>
                <div className="relative border rounded-xl overflow-hidden" style={{aspectRatio: imageAspectRatio}}>
                  <canvas ref={maskCanvasRef} className="cursor-crosshair w-full h-full block" style={{background:'#ffffff'}} />
                </div>
                <div className="relative border rounded-xl overflow-hidden" style={{aspectRatio: imageAspectRatio}}>
                  <canvas ref={outCanvasRef} className="w-full h-full block" style={{background:'#ffffff'}} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-6 text-xs text-neutral-500">
          <p>Starter: suavizado selectivo en zonas pintadas. Para un look de piel más realista, sustituye el blur por separación de frecuencias y curvas locales.</p>
        </footer>
      </div>
    </div>
  );
}