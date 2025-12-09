import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import LoadingSpinner from '../components/LoadingSpinner';

const SimulatorPage = () => {
  console.log('SimulatorPage component mounted');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    selectedProduct, 
    setSelectedProduct, 
    loading, 
    setLoading,
    addSimulationResult,
    setFaceAnalysis
  } = useStore();

  // Estados del simulador original
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState('');
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [intensity, setIntensity] = useState(0.5);
  const [sigma, setSigma] = useState(3);
  const [brushSize, setBrushSize] = useState(50);
  const [hardness, setHardness] = useState(0.8);
  const [brightness, setBrightness] = useState(0);
  const [mode, setMode] = useState('paint');
  const [view, setView] = useState('after');
  const [filterType, setFilterType] = useState('wrinkles');
  const [splitPos, setSplitPos] = useState(0.5);
  const [error, setError] = useState('');
  const [tests, setTests] = useState([]);
  const [detectingFace, setDetectingFace] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tfLoading, setTfLoading] = useState(true);

  // Referencias WebGL
  const glCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const outCanvasRef = useRef(null);
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
  const modelRef = useRef(null);
  const lastPaintPosRef = useRef(null);

  // Shaders GLSL
  const quadVS = `
    attribute vec2 a_pos;
    attribute vec2 a_uv;
    varying vec2 v_uv;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
      v_uv = a_uv;
    }
  `;

  const blurFS = `
    precision mediump float;
    uniform sampler2D u_tex;
    uniform vec2 u_texel;
    uniform vec2 u_dir;
    uniform float u_sigma;
    varying vec2 v_uv;
    void main() {
      vec4 sum = vec4(0.0);
      float total = 0.0;
      int radius = int(u_sigma * 3.0);
      for (int i = -10; i <= 10; i++) {
        if (i > radius || i < -radius) continue;
        float weight = exp(-float(i*i) / (2.0 * u_sigma * u_sigma));
        vec2 offset = u_texel * u_dir * float(i);
        sum += texture2D(u_tex, v_uv + offset) * weight;
        total += weight;
      }
      gl_FragColor = sum / total;
    }
  `;

  const composeFS = `
    precision mediump float;
    uniform sampler2D u_orig;
    uniform sampler2D u_blur;
    uniform sampler2D u_mask;
    uniform float u_intensity;
    uniform float u_brightness;
    varying vec2 v_uv;
    void main() {
      vec4 orig = texture2D(u_orig, v_uv);
      vec4 blur = texture2D(u_blur, v_uv);
      vec4 mask = texture2D(u_mask, v_uv);
      float alpha = mask.a;
      vec3 mixed = mix(orig.rgb, blur.rgb, alpha * u_intensity);
      mixed += u_brightness;
      gl_FragColor = vec4(mixed, orig.a);
    }
  `;

  // Funciones WebGL helper
  function createGL(canvas) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL no disponible');
    return gl;
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Error compilando shader: ' + info);
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    if (!gl || !vsSource || !fsSource) {
      throw new Error('Parámetros inválidos para createProgram');
    }

    let vs = null;
    let fs = null;
    let prog = null;

    try {
      vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
      fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
      
      prog = gl.createProgram();
      if (!prog) {
        throw new Error('No se pudo crear el programa WebGL');
      }

      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(prog);
        throw new Error('Error enlazando programa: ' + (info || 'Error desconocido'));
      }

      // Validar que el programa se creó correctamente
      if (!gl.isProgram(prog)) {
        throw new Error('El programa creado no es válido');
      }

      // Limpiar shaders ya que están enlazados al programa
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      return prog;
    } catch (error) {
      // Limpiar recursos en caso de error
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (prog) gl.deleteProgram(prog);
      
      console.error('Error creando programa WebGL:', error);
      throw error;
    }
  }

  function createTexture(gl, w, h, data) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return tex;
  }

  function createFBO(gl, tex) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('FBO incompleto');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
  }

  function setViewport(gl, w, h) {
    gl.viewport(0, 0, w, h);
  }

  function makeFullscreenQuad(gl) {
    const vertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
       1,  1, 1, 1,
      -1,  1, 0, 1
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    
    return { vbo, ibo };
  }

  // Funciones de manejo de archivos
  function handleFile(file) {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const isValidType = validTypes.includes(file.type);
    const isValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType && !isValidExt) {
      setError('Formato no válido. Usa JPG, PNG o WebP.');
      return;
    }
    
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = glRef.current ? glRef.current.getParameter(glRef.current.MAX_TEXTURE_SIZE) : 2048;
        let { width, height } = img;
        
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
        }
        
        setImage(img);
        setImageURL(e.target.result);
        setImgSize({ w: width, h: height });
        setFaceDetected(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // Funciones de máscara
  function clearMask() {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    syncMaskToGPU();
  }

  function resetAll() {
    setIntensity(0.5);
    setSigma(3);
    setBrushSize(50);
    setHardness(0.8);
    setBrightness(0);
    setMode('paint');
    setView('after');
    setSplitPos(0.5);
    clearMask();
  }

  function syncMaskToGPU() {
    const gl = glRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!gl || !maskCanvas) return;
    
    gl.bindTexture(gl.TEXTURE_2D, texMaskRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
  }

  // Funciones específicas para productos Martiderm
  function applyProductWrinklesMask(ctx, landmarks, product) {
    const scaleX = maskCanvasRef.current.width / image.width;
    const scaleY = maskCanvasRef.current.height / image.height;
    
    // Aplicar máscara según el producto específico
    if (product?.webglEffects?.wrinkleAreas) {
      const areas = product.webglEffects.wrinkleAreas;
      areas.forEach(area => {
        applyWrinklesMask(ctx, landmarks, scaleX, scaleY, area);
      });
    } else {
      // Máscara por defecto para arrugas
      applyWrinklesMask(ctx, landmarks, scaleX, scaleY);
    }
  }

  function applyProductBrightnessMask(ctx, landmarks, product) {
    // Validar que landmarks existe y tiene la estructura correcta
    if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
      console.warn('Landmarks no válidos para aplicar máscara de luminosidad');
      return;
    }

    const scaleX = maskCanvasRef.current.width / image.width;
    const scaleY = maskCanvasRef.current.height / image.height;
    
    // Validar que cada landmark es un array con al menos 2 elementos
    const isValidLandmark = (landmark) => {
      return landmark && Array.isArray(landmark) && landmark.length >= 2 && 
             typeof landmark[0] === 'number' && typeof landmark[1] === 'number';
    };

    // Filtrar landmarks válidos
    const validLandmarks = landmarks.filter(isValidLandmark);
    if (validLandmarks.length === 0) {
      console.warn('No hay landmarks válidos para aplicar máscara de luminosidad');
      return;
    }

    // Calcular área facial para luminosidad usando landmarks válidos
    let topLeft, bottomRight;
    
    if (isValidLandmark(landmarks[0]) && landmarks.length > 1 && isValidLandmark(landmarks[landmarks.length-1])) {
      // Usar primer y último landmark si son válidos
      topLeft = [landmarks[0][0], landmarks[0][1]];
      bottomRight = [landmarks[landmarks.length-1][0], landmarks[landmarks.length-1][1]];
    } else {
      // Calcular bounding box de todos los landmarks válidos
      const xCoords = validLandmarks.map(lm => lm[0]);
      const yCoords = validLandmarks.map(lm => lm[1]);
      
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);
      
      topLeft = [minX, minY];
      bottomRight = [maxX, maxY];
    }
    
    applyBrightnessMask(ctx, topLeft, bottomRight, scaleX, scaleY);
  }

  // Análisis facial con efectos específicos del producto Martiderm
  async function detectAndMaskFace() {
    if (!image || !modelRef.current) {
      console.warn('Imagen o modelo no disponible para detección facial');
      return;
    }
    
    setDetectingFace(true);
    setError('');
    
    try {
      const predictions = await modelRef.current.estimateFaces(image, false);
      
      if (!predictions || predictions.length === 0) {
        setError('No se detectó ninguna cara en la imagen');
        setFaceDetected(false);
        setDetectingFace(false);
        return;
      }
      
      const face = predictions[0];
      
      // Validar que la predicción tiene la estructura esperada
      if (!face || typeof face !== 'object') {
        throw new Error('Estructura de predicción facial inválida');
      }

      const landmarks = face.landmarks;
      
      // Validar que landmarks existe y es un array
      if (!landmarks || !Array.isArray(landmarks)) {
        throw new Error('Landmarks faciales no válidos o no encontrados');
      }

      console.log(`Detectados ${landmarks.length} landmarks faciales`);
      
      const canvas = maskCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!canvas || !ctx) {
        throw new Error('Canvas de máscara no disponible');
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Obtener producto seleccionado
      const currentProduct = selectedProduct;
      
      // Aplicar máscara según el tipo de filtro y producto específico
      try {
        if (filterType === 'wrinkles') {
          applyProductWrinklesMask(ctx, landmarks, currentProduct);
        } else if (filterType === 'brightness') {
          applyProductBrightnessMask(ctx, landmarks, currentProduct);
        }
      } catch (maskError) {
        console.error('Error aplicando máscara:', maskError);
        // Continuar sin aplicar máscara específica
      }
      
      syncMaskToGPU();
      setView('after');
      setFaceDetected(true);
      
      // Actualizar análisis facial en el store con información del producto
      setFaceAnalysis({
        landmarks: landmarks,
        confidence: face.probability || 0,
        detectedAt: new Date().toISOString(),
        productApplied: currentProduct?.id || null,
        effectsApplied: currentProduct?.webglEffects || {}
      });
      
      renderGL();
      
    } catch (err) {
      console.error('Error en detección facial:', err);
      setError('Error en la detección facial: ' + err.message);
      setFaceDetected(false);
    }
    
    setDetectingFace(false);
  }

  function applyWrinklesMask(ctx, landmarks, scaleX, scaleY, area = null) {
    // Validar que landmarks existe y tiene la estructura correcta
    if (!landmarks || !Array.isArray(landmarks) || landmarks.length === 0) {
      console.warn('Landmarks no válidos para aplicar máscara de arrugas');
      return;
    }

    // Validar que cada landmark es un array con al menos 2 elementos
    const isValidLandmark = (landmark) => {
      return landmark && Array.isArray(landmark) && landmark.length >= 2 && 
             typeof landmark[0] === 'number' && typeof landmark[1] === 'number';
    };

    // Frente - usar landmark 10 si existe, sino usar el centro calculado
    let foreheadCenterX, foreheadY;
    if (landmarks.length > 10 && isValidLandmark(landmarks[10])) {
      foreheadY = landmarks[10][1] * scaleY - 40;
      foreheadCenterX = landmarks[10][0] * scaleX;
    } else {
      // Fallback: calcular centro aproximado de la cara
      const validLandmarks = landmarks.filter(isValidLandmark);
      if (validLandmarks.length === 0) return;
      
      const avgX = validLandmarks.reduce((sum, lm) => sum + lm[0], 0) / validLandmarks.length;
      const avgY = validLandmarks.reduce((sum, lm) => sum + lm[1], 0) / validLandmarks.length;
      foreheadCenterX = avgX * scaleX;
      foreheadY = avgY * scaleY - 60; // Más arriba para la frente
    }
    
    const gradient1 = ctx.createRadialGradient(
      foreheadCenterX, foreheadY, 0,
      foreheadCenterX, foreheadY, 60
    );
    gradient1.addColorStop(0, 'rgba(255,255,255,0.8)');
    gradient1.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient1;
    ctx.beginPath();
    ctx.arc(foreheadCenterX, foreheadY, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Contorno de ojos - solo procesar landmarks válidos
    const maxEyeLandmarks = Math.min(6, landmarks.length);
    for (let i = 0; i < maxEyeLandmarks; i++) {
      if (!isValidLandmark(landmarks[i])) continue;
      
      const x = landmarks[i][0] * scaleX;
      const y = landmarks[i][1] * scaleY;
      
      const gradient2 = ctx.createRadialGradient(x, y, 0, x, y, 25);
      gradient2.addColorStop(0, 'rgba(255,255,255,0.6)');
      gradient2.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.fillStyle = gradient2;
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function applyBrightnessMask(ctx, topLeft, bottomRight, scaleX, scaleY) {
    const x = topLeft[0] * scaleX;
    const y = topLeft[1] * scaleY;
    const w = (bottomRight[0] - topLeft[0]) * scaleX;
    const h = (bottomRight[1] - topLeft[1]) * scaleY;
    
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(x, y, w, h);
  }

  // Renderizado WebGL
  function bindQuad(gl, prog) {
    // Validar que el programa WebGL es válido
    if (!prog || !gl.isProgram(prog)) {
      console.error('Programa WebGL inválido o no inicializado:', prog);
      throw new Error('Programa WebGL inválido para bindQuad');
    }

    // Validar que el quad está inicializado
    if (!quadRef.current || !quadRef.current.vbo || !quadRef.current.ibo) {
      console.error('Quad no inicializado correctamente');
      throw new Error('Quad no está inicializado');
    }

    try {
      const locPos = gl.getAttribLocation(prog, 'a_pos');
      const locUV = gl.getAttribLocation(prog, 'a_uv');
      
      // Validar que los atributos se encontraron
      if (locPos === -1) {
        console.warn('Atributo a_pos no encontrado en el shader');
      }
      if (locUV === -1) {
        console.warn('Atributo a_uv no encontrado en el shader');
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, quadRef.current.vbo);
      
      if (locPos !== -1) {
        gl.enableVertexAttribArray(locPos);
        gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 16, 0);
      }
      
      if (locUV !== -1) {
        gl.enableVertexAttribArray(locUV);
        gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 16, 8);
      }
      
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadRef.current.ibo);
    } catch (error) {
      console.error('Error en bindQuad:', error);
      throw error;
    }
  }

  function drawTo(gl, fbo, w, h) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    setViewport(gl, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function renderGL() {
    try {
      const gl = glRef.current;
      if (!gl || !image) {
        const oc = outCanvasRef.current;
        if (oc && image) {
          const octx = oc.getContext('2d');
          const w = imgSize.w, h = imgSize.h;
          if (w && h) {
            octx.clearRect(0, 0, w, h);
            octx.drawImage(image, 0, 0, w, h);
          }
        }
        return;
      }

      // Validar que los programas WebGL están inicializados
      if (!progBlurRef.current || !progComposeRef.current) {
        console.warn('Programas WebGL no inicializados, saltando renderizado');
        return;
      }

      // Validar que los programas son válidos
      if (!gl.isProgram(progBlurRef.current) || !gl.isProgram(progComposeRef.current)) {
        console.error('Programas WebGL inválidos');
        return;
      }
      
      const w = imgSize.w, h = imgSize.h;
      if (!w || !h) return;

      // Pass A: horizontal blur
      gl.useProgram(progBlurRef.current);
      bindQuad(gl, progBlurRef.current);
      const u_texelA = gl.getUniformLocation(progBlurRef.current, 'u_texel');
      const u_dirA = gl.getUniformLocation(progBlurRef.current, 'u_dir');
      const u_sigmaA = gl.getUniformLocation(progBlurRef.current, 'u_sigma');
      const u_texA = gl.getUniformLocation(progBlurRef.current, 'u_tex');

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texOrigRef.current);
      gl.uniform1i(u_texA, 0);
      gl.uniform2f(u_texelA, 1/w, 1/h);
      gl.uniform2f(u_dirA, 1, 0);
      gl.uniform1f(u_sigmaA, sigma);
      drawTo(gl, fboPingRef.current, w, h);

      // Pass B: vertical blur
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
      const u_int = gl.getUniformLocation(progComposeRef.current, 'u_intensity');
      const u_bright = gl.getUniformLocation(progComposeRef.current, 'u_brightness');

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texOrigRef.current);
      gl.uniform1i(u_orig, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texPongRef.current);
      gl.uniform1i(u_blur, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texMaskRef.current);
      gl.uniform1i(u_mask, 2);
      gl.uniform1f(u_int, intensity);
      gl.uniform1f(u_bright, brightness);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      setViewport(gl, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      // Mirror to outCanvas
      const srcCanvas = glCanvasRef.current;
      const octx = outCanvasRef.current && outCanvasRef.current.getContext('2d');
      if (!octx) return;
      
      gl.finish();
      octx.clearRect(0, 0, w, h);
      
      if (view === 'before') {
        octx.drawImage(image, 0, 0, w, h);
      } else if (view === 'after') {
        const hasGL = !!srcCanvas && srcCanvas.width && srcCanvas.height;
        if (hasGL) {
          octx.drawImage(srcCanvas, 0, 0, w, h);
        } else {
          octx.drawImage(image, 0, 0, w, h);
        }
      } else if (view === 'mask') {
        // Fondo blanco en modo máscara para evitar overlay negro
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, w, h);
        octx.drawImage(maskCanvasRef.current, 0, 0, w, h);
      } else {
        // split view
        const splitPx = Math.max(0, Math.min(1, splitPos)) * w;
        if (splitPx > 0) octx.drawImage(image, 0, 0, splitPx, h, 0, 0, splitPx, h);
        const rightW = w - splitPx;
        if (rightW > 0) octx.drawImage(srcCanvas, splitPx, 0, rightW, h, splitPx, 0, rightW, h);
        // Línea divisoria más clara para evitar banda oscura
        octx.fillStyle = 'rgba(255,255,255,0.9)';
        octx.fillRect(Math.floor(splitPx)-1, 0, 2, h);
        octx.fillStyle = 'rgba(255,255,255,0.9)';
        octx.fillRect(Math.floor(splitPx)-12, h/2-16, 24, 32);
      }
      
      // Underlay blanco bajo cualquier vista para evitar negros por transparencia
      octx.globalCompositeOperation = 'destination-over';
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, w, h);
      octx.globalCompositeOperation = 'source-over';
    } catch (err) {
      console.error('[renderGL] error:', err);
      setError(String(err.message || err));
    }
  }

  function downloadPNG() {
    if (!outCanvasRef.current) return;
    const url = outCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `martiderm-simulation-${Date.now()}.png`;
    a.click();
  }

  function saveSimulation() {
    if (!outCanvasRef.current || !selectedProduct) return;
    
    const beforeUrl = image ? image.src : '';
    const afterUrl = outCanvasRef.current.toDataURL('image/png');
    
    const result = {
      id: Date.now().toString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      beforeImage: beforeUrl,
      afterImage: afterUrl,
      settings: {
        intensity,
        sigma,
        brightness,
        filterType
      },
      timestamp: new Date().toISOString()
    };
    
    addSimulationResult(result);
    navigate(`/results/${result.id}`);
  }

  const runTests = () => {
    const testResults = [];
    
    // Test 1: WebGL Shaders
    try {
      const gl = glRef.current;
      if (!gl) throw new Error('No WebGL context');
      
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, quadVS);
      gl.compileShader(vertexShader);
      
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error('Vertex shader compilation failed');
      }
      
      testResults.push({ name: 'WebGL Shaders', status: 'PASS', details: 'Shaders compiled successfully' });
    } catch (error) {
      testResults.push({ name: 'WebGL Shaders', status: 'FAIL', details: error.message });
    }
    
    // Test 2: WebGL Context
    try {
      const gl = glRef.current;
      if (!gl) throw new Error('No WebGL context available');
      
      const version = gl.getParameter(gl.VERSION);
      testResults.push({ name: 'WebGL Context', status: 'PASS', details: `WebGL version: ${version}` });
    } catch (error) {
      testResults.push({ name: 'WebGL Context', status: 'FAIL', details: error.message });
    }
    
    // Test 3: Textures
    try {
      const gl = glRef.current;
      if (!gl) throw new Error('No WebGL context');
      
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
      
      testResults.push({ name: 'Textures', status: 'PASS', details: 'Texture creation successful' });
    } catch (error) {
      testResults.push({ name: 'Textures', status: 'FAIL', details: error.message });
    }
    
    // Test 4: FBOs
    try {
      const gl = glRef.current;
      if (!gl) throw new Error('No WebGL context');
      
      // Crear una textura para adjuntar al framebuffer
      const testTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, testTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, testTexture, 0);
      
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`FBO incomplete: ${status}`);
      }
      
      // Limpiar
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fbo);
      gl.deleteTexture(testTexture);
      
      testResults.push({ name: 'FBOs', status: 'PASS', details: 'Framebuffer objects working' });
    } catch (error) {
      testResults.push({ name: 'FBOs', status: 'FAIL', details: error.message });
    }
    
    // Test 5: Mask Canvas Painting
    try {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) throw new Error('No mask canvas');
      
      const ctx = maskCanvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 10, 10);
      
      const imageData = ctx.getImageData(0, 0, 1, 1);
      if (imageData.data[0] !== 255) {
        throw new Error('Canvas painting failed');
      }
      
      testResults.push({ name: 'Mask Canvas Painting', status: 'PASS', details: 'Canvas 2D operations working' });
    } catch (error) {
      testResults.push({ name: 'Mask Canvas Painting', status: 'FAIL', details: error.message });
    }
    
    // Test 6: Render Pipeline
    try {
      const gl = glRef.current;
      if (!gl) throw new Error('No WebGL context');
      
      // Verificar programas de shader
      if (!progBlurRef.current) {
        throw new Error('Blur shader program not initialized');
      }
      if (!progComposeRef.current) {
        throw new Error('Compose shader program not initialized');
      }
      
      // Verificar que los programas son válidos
      if (!gl.isProgram(progBlurRef.current)) {
        throw new Error('Blur program is not a valid WebGL program');
      }
      if (!gl.isProgram(progComposeRef.current)) {
        throw new Error('Compose program is not a valid WebGL program');
      }
      
      // Verificar texturas solo si hay imagen cargada
      if (image && (!texOrigRef.current || !texMaskRef.current)) {
        throw new Error('Textures not initialized for loaded image');
      }
      
      testResults.push({ name: 'Render Pipeline', status: 'PASS', details: 'All render components initialized' });
    } catch (error) {
      testResults.push({ name: 'Render Pipeline', status: 'FAIL', details: error.message });
    }
    
    // Test 7: File Handling
    try {
      if (!image) {
        throw new Error('No image loaded');
      }
      
      if (!imgSize.w || !imgSize.h) {
        throw new Error('Invalid image dimensions');
      }
      
      testResults.push({ name: 'File Handling', status: 'PASS', details: `Image loaded: ${imgSize.w}x${imgSize.h}` });
    } catch (error) {
      testResults.push({ name: 'File Handling', status: 'FAIL', details: error.message });
    }
    
    // Test 8: Split View
    try {
      if (view === 'split' && (splitPos < 0 || splitPos > 1)) {
        throw new Error('Invalid split position');
      }
      
      testResults.push({ name: 'Split View', status: 'PASS', details: `Split position: ${splitPos}` });
    } catch (error) {
      testResults.push({ name: 'Split View', status: 'FAIL', details: error.message });
    }
    
    setTests(testResults);
  };

  // Effects
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId) {
      setSelectedProduct(productId);
    }
  }, [searchParams, setSelectedProduct]);

  // Inicialización optimizada WebGL y modelo
  useEffect(() => {
    let isMounted = true;
    
    async function initTensorFlow() {
      try {
        setTfLoading(true);
        
        // Importar TensorFlow.js de forma asíncrona
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        
        // Cargar modelo BlazeFace de forma asíncrona
        const blazefaceModule = await import('@tensorflow-models/blazeface');
        const model = await blazefaceModule.load();
        
        if (isMounted) {
          modelRef.current = model;
          setTfLoading(false);
        }
      } catch (err) {
        console.error('Error cargando TensorFlow:', err);
        if (isMounted) {
          setError('Error cargando el modelo de IA: ' + err.message);
          setTfLoading(false);
        }
      }
    }
    
    async function initWebGL() {
      try {
        console.log('Iniciando initWebGL...');
        setLoading(true);
        
        // Inicializar WebGL
        const glCanvas = glCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const outCanvas = outCanvasRef.current;
        
        if (!glCanvas || !maskCanvas || !outCanvas) {
          console.log('Canvas no disponibles:', { glCanvas: !!glCanvas, maskCanvas: !!maskCanvas, outCanvas: !!outCanvas });
          return;
        }
        
        const gl = createGL(glCanvas);
        glRef.current = gl;
        
        // Crear programas de shaders inmediatamente
        try {
          progBlurRef.current = createProgram(gl, quadVS, blurFS);
          progComposeRef.current = createProgram(gl, quadVS, composeFS);
          console.log('Programas WebGL creados exitosamente en initWebGL');
        } catch (shaderError) {
          console.error('Error creando programas de shader en initWebGL:', shaderError);
          throw shaderError;
        }
        
        // Crear quad
        quadRef.current = makeFullscreenQuad(gl);
        
        if (isMounted) {
          setIsInitialized(true);
          setLoading(false);
        }
        
      } catch (err) {
        console.error('Error inicializando WebGL:', err);
        if (isMounted) {
          setError('Error inicializando el simulador: ' + err.message);
          setLoading(false);
        }
      }
    }
    
    // Inicializar WebGL inmediatamente
    initWebGL();
    
    // Inicializar TensorFlow.js en paralelo
    initTensorFlow();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Redimensionar canvas cuando cambia la imagen
  useEffect(() => {
    if (!image || !imgSize.w || !imgSize.h) return;
    
    const gl = glRef.current;
    const glCanvas = glCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const outCanvas = outCanvasRef.current;
    
    if (!gl || !glCanvas || !maskCanvas || !outCanvas) return;
    
    // Redimensionar canvas
    [glCanvas, maskCanvas, outCanvas].forEach(canvas => {
      canvas.width = imgSize.w;
      canvas.height = imgSize.h;
    });
    
    // Crear texturas
    texOrigRef.current = createTexture(gl, imgSize.w, imgSize.h, null);
    texPingRef.current = createTexture(gl, imgSize.w, imgSize.h, null);
    texPongRef.current = createTexture(gl, imgSize.w, imgSize.h, null);
    texMaskRef.current = createTexture(gl, imgSize.w, imgSize.h, null);
    
    // Crear FBOs
    fboPingRef.current = createFBO(gl, texPingRef.current);
    fboPongRef.current = createFBO(gl, texPongRef.current);
    
    // Cargar imagen original a textura
    gl.bindTexture(gl.TEXTURE_2D, texOrigRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Detección facial automática después de 2 segundos
    setTimeout(() => {
      if (modelRef.current) {
        detectAndMaskFace();
      }
    }, 2000);
    
  }, [image, imgSize]);

  // Re-detectar cara cuando cambia el tipo de filtro
  useEffect(() => {
    if (!image || !modelRef.current) return;
    
    if (filterType === 'wrinkles') {
      setBrightness(0);
    } else if (filterType === 'brightness') {
      setIntensity(0.5);
      setSigma(3);
    }
    
    setTimeout(() => {
      detectAndMaskFace();
    }, 100);
  }, [filterType, brightness, intensity]);

  // Renderizar cuando cambian los parámetros
  useEffect(() => {
    renderGL();
  }, [intensity, sigma, brightness, view, splitPos]);

  // Función para pintar en la máscara
  function paintOnMask(x, y, continuous) {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || !image) return;
    
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    
    // Configurar el pincel
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'white';
    ctx.globalAlpha = 0.8;
    
    // Dibujar círculo en la posición
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Si es continuo (movimiento), conectar con línea
    if (continuous && lastPaintPosRef.current) {
      ctx.lineWidth = brushSize * 2;
      ctx.strokeStyle = 'white';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPaintPosRef.current.x, lastPaintPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    lastPaintPosRef.current = { x, y };
  }

  // Manejo de arrastre en split view y pintura
  useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    
    let dragging = false;
    let painting = false;
    let lastPaintPos = null;
    
    function getX(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const p = x / rect.width;
      return Math.max(0, Math.min(1, p));
    }
    
    function onDown(e) {
      if (view === 'split') {
        dragging = true;
        try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch(_){}
        setSplitPos(getX(e));
      } else if (image && (view === 'before' || view === 'after')) {
        // Modo de pintura
        painting = true;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        paintOnMask(x, y, false);
        try { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); } catch(_){}
      }
    }
    
    function onMove(e) {
      if (dragging && view === 'split') {
        setSplitPos(getX(e));
      } else if (painting && image && (view === 'before' || view === 'after')) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        paintOnMask(x, y, true);
      }
    }
    
    function onUp(e) {
      if (dragging) {
        dragging = false;
        try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch(_){}
      }
      if (painting) {
        painting = false;
        lastPaintPosRef.current = null; // Limpiar posición de pintura
        syncMaskToGPU();
        renderGL();
        try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch(_){}
      }
    }
    
    canvas.style.cursor = (view === 'split') ? 'col-resize' : (image && (view === 'before' || view === 'after')) ? 'crosshair' : 'default';
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [view]);

  if (loading && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" text="Inicializando simulador..." />
          {tfLoading && (
            <p className="mt-4 text-sm text-gray-600">
              Cargando modelo de inteligencia artificial...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-martiderm-blue">Simulador Cosmético Martiderm</h1>
            <p className="text-sm opacity-70">Sube una imagen y descubre cómo los productos Martiderm pueden transformar tu piel</p>
            {tfLoading && <p className="text-sm text-orange-600 mt-1">⏳ Cargando modelo de IA...</p>}
            {detectingFace && <p className="text-sm text-blue-600 mt-1">🔍 Detectando cara...</p>}
            {faceDetected && <p className="text-sm text-green-600 mt-1">✅ Cara detectada</p>}
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" 
              onChange={onFile} 
              className="block text-sm" 
            />
            <button 
              onClick={detectAndMaskFace} 
              className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md disabled:opacity-50" 
              disabled={!image || detectingFace || tfLoading}
            >
              {tfLoading ? 'Cargando IA...' : detectingFace ? 'Detectando...' : 'Redetectar cara'}
            </button>
            <button 
              onClick={downloadPNG} 
              className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md disabled:opacity-50" 
              disabled={!image}
            >
              Descargar PNG
            </button>
            <button 
              onClick={saveSimulation} 
              className="rounded-xl border px-3 py-2 text-sm bg-martiderm-blue text-white shadow hover:shadow-md disabled:opacity-50" 
              disabled={!image || !selectedProduct}
            >
              Guardar Resultado
            </button>
          </div>
        </header>

        {/* Zona drag & drop */}
        <div
          onDragOver={(e) => { 
            try { 
              e.preventDefault(); 
              if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; 
            } catch(_){} 
          }}
          onDrop={(e) => {
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
          className="mb-4 rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600"
        >
          Arrastra **un archivo de imagen** (JPG/PNG/WebP) desde tu ordenador o usa el selector de archivo de arriba.
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 p-3 text-sm">
            {error}
          </div>
        )}

        {selectedProduct && (
          <div className="mb-4 rounded-xl bg-martiderm-blue/10 border border-martiderm-blue/20 p-3 text-sm">
            <div className="font-medium text-martiderm-blue mb-1">Producto Seleccionado:</div>
            <div className="text-gray-700">{selectedProduct.name}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-1 bg-white rounded-2xl shadow p-4 flex flex-col gap-4">
            <h2 className="font-semibold text-martiderm-blue">Controles</h2>
            
            <div className="border-t pt-3">
              <h3 className="font-medium text-sm mb-2">Tipo de Efecto</h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setFilterType('wrinkles'); 
                    if(image && modelRef.current) {
                      setTimeout(() => detectAndMaskFace(), 100);
                    }
                  }} 
                  className={`rounded-lg px-3 py-2 text-sm border ${filterType === 'wrinkles' ? 'bg-martiderm-blue text-white' : 'bg-white'}`}
                >
                  Anti-Arrugas
                </button>
                <button 
                  onClick={() => {
                    setFilterType('brightness'); 
                    if(image && modelRef.current) {
                      setTimeout(() => detectAndMaskFace(), 100);
                    }
                  }} 
                  className={`rounded-lg px-3 py-2 text-sm border ${filterType === 'brightness' ? 'bg-martiderm-blue text-white' : 'bg-white'}`}
                >
                  Luminosidad
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {filterType === 'wrinkles' && 'Aplica en zonas específicas: frente, mejillas y líneas nasolabiales'}
                {filterType === 'brightness' && 'Aplica en toda la cara de forma uniforme'}
              </p>
            </div>

            <label className={`text-sm ${filterType !== 'wrinkles' ? 'opacity-50' : ''}`}>
              Intensidad: {intensity.toFixed(2)}
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.01} 
                value={intensity} 
                onChange={(e) => setIntensity(parseFloat(e.target.value))} 
                className="w-full"
                disabled={filterType !== 'wrinkles'}
              />
            </label>

            <label className={`text-sm ${filterType !== 'wrinkles' ? 'opacity-50' : ''}`}>
              Suavizado (sigma): {sigma}
              <input 
                type="range" 
                min={1} 
                max={10} 
                step={1} 
                value={sigma} 
                onChange={(e) => setSigma(parseInt(e.target.value))} 
                className="w-full"
                disabled={filterType !== 'wrinkles'}
              />
            </label>

            <label className={`text-sm ${filterType !== 'brightness' ? 'opacity-50' : ''}`}>
              Luminosidad: {brightness > 0 ? '+' : ''}{brightness.toFixed(2)}
              <input 
                type="range" 
                min={-0.3} 
                max={0.3} 
                step={0.01} 
                value={brightness} 
                onChange={(e) => setBrightness(parseFloat(e.target.value))} 
                className="w-full"
                disabled={filterType !== 'brightness'}
              />
            </label>

            <div className="border-t pt-3">
              <h3 className="font-medium text-sm mb-2">Herramientas de Pintura</h3>
              <label className="text-sm">
                Tamaño del Pincel: {brushSize}px
                <input 
                  type="range" 
                  min={5} 
                  max={50} 
                  step={1} 
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                  className="w-full"
                />
              </label>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => {
                    const maskCanvas = maskCanvasRef.current;
                    if (maskCanvas) {
                      const ctx = maskCanvas.getContext('2d');
                      ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                      syncMaskToGPU();
                      renderGL();
                    }
                  }}
                  className="rounded-lg px-3 py-1 text-xs border bg-red-50 hover:bg-red-100 text-red-700"
                >
                  Limpiar Máscara
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pinta en las vistas "Antes" o "Después" para aplicar el efecto solo en esas zonas
              </p>
            </div>

            <div className="border-t pt-3">
              <h3 className="font-medium text-sm mb-2">Vista</h3>
              <div className="flex gap-2 flex-wrap items-center">
                <button 
                  onClick={() => setView('after')} 
                  className={`rounded-lg px-3 py-2 text-sm border ${view === 'after' ? 'bg-martiderm-blue text-white' : 'bg-white'}`}
                >
                  Después
                </button>
                <button 
                  onClick={() => setView('before')} 
                  className={`rounded-lg px-3 py-2 text-sm border ${view === 'before' ? 'bg-martiderm-blue text-white' : 'bg-white'}`}
                >
                  Antes
                </button>
                <button 
                  onClick={() => setView('split')} 
                  className={`rounded-lg px-3 py-2 text-sm border ${view === 'split' ? 'bg-martiderm-blue text-white' : 'bg-white'}`}
                >
                  Comparar
                </button>
                <button 
                  onClick={() => setView('mask')} 
                  className={`rounded-lg px-3 py-2 text-sm border ${view === 'mask' ? 'bg-martiderm-blue text-white' : 'bg-white'}`}
                >
                  Máscara
                </button>
              </div>
              {view === 'split' && (
                <div className="mt-2 text-xs">
                  Línea: {(splitPos * 100).toFixed(0)}%
                  <input 
                    type="range" 
                    min={0} 
                    max={1} 
                    step={0.01} 
                    value={splitPos} 
                    onChange={(e) => setSplitPos(parseFloat(e.target.value))} 
                    className="w-full"
                  />
                  <p className="opacity-60">También puedes arrastrar la línea directamente en el canvas de salida.</p>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <div className="flex gap-2">
                <button 
                  onClick={clearMask} 
                  className="flex-1 rounded-lg px-3 py-2 text-sm border bg-white hover:bg-gray-50"
                >
                  Limpiar
                </button>
                <button 
                  onClick={resetAll} 
                  className="flex-1 rounded-lg px-3 py-2 text-sm border bg-white hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
              <button 
                onClick={runTests} 
                className="w-full mt-2 rounded-lg px-3 py-2 text-sm border bg-gray-100 hover:bg-gray-200"
              >
                Ejecutar Tests
              </button>
            </div>
          </section>

          <section className="lg:col-span-4">
            <div className="relative bg-white rounded-2xl shadow overflow-hidden">
              <div className="p-2 flex items-center justify-between text-xs text-gray-600 bg-gray-50">
                <span>Canvas GPU</span>
                <span>Canvas Máscara</span>
                <span>Resultado</span>
              </div>
              
              {imageURL && (
                <div className="p-2 text-xs text-gray-600">
                  <div className="mb-2">Previsualización de la imagen cargada:</div>
                  <div className="w-full overflow-hidden rounded-lg border bg-white p-2">
                    <img 
                      src={imageURL} 
                      alt="preview" 
                      style={{maxHeight:'256px', objectFit:'contain', display:'block', margin:'0 auto'}}
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2">
                <div className="relative border rounded-xl overflow-hidden">
                  <canvas 
                    ref={glCanvasRef} 
                    width={400}
                    height={300}
                    className="w-full h-auto block" 
                    style={{minHeight:'200px', background:'#fafafa'}} 
                  />
                </div>
                <div className="relative border rounded-xl overflow-hidden">
                  <canvas 
                    ref={maskCanvasRef} 
                    width={400}
                    height={300}
                    className="cursor-crosshair w-full h-auto block" 
                    style={{minHeight:'200px', background:'#ffffff'}} 
                  />
                </div>
                <div className="relative border rounded-xl overflow-hidden">
                  <canvas 
                    ref={outCanvasRef} 
                    width={400}
                    height={300}
                    className="w-full h-auto block" 
                    style={{minHeight:'200px', background:'#ffffff'}} 
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Resultados de Tests */}
        {tests.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow p-4">
            <h3 className="font-semibold text-martiderm-blue mb-4">Resultados de Tests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {tests.map((test, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    test.status === 'PASS' 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="font-medium text-sm">{test.name}</div>
                  <div className={`text-xs font-bold ${
                    test.status === 'PASS' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {test.status}
                  </div>
                  <div className="text-xs mt-1 opacity-80">{test.details}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-6 text-xs text-gray-500 text-center">
          <p>Simulador Cosmético Martiderm - Tecnología avanzada para visualizar los efectos de nuestros productos</p>
        </footer>
      </div>
    </div>
  );
};

export default SimulatorPage;