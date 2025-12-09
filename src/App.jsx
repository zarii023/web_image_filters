import React, { useEffect, useRef, useState } from "react";
import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs"; // asegura que TensorFlow.js se inicialice

// ================================================
// Web Image Filter (React, JS)
// - Upload image → paint mask → WebGL selective smoothing → export PNG
// - Pointer/mouse/touch paint; GLSL strings via array.join('')
// - Canvases keep bitmap at image size; visual size is responsive
// ================================================

export default function WebImageFilter() {
  // ---------------- UI STATE ----------------
  const [image, setImage] = useState(null); // HTMLImageElement
  const [imageURL, setImageURL] = useState(null); // string for <img> preview
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [intensity, setIntensity] = useState(0.5); // 0..1
  const [sigma, setSigma] = useState(3); // 1..10
  const [brushSize, setBrushSize] = useState(40);
  const [hardness, setHardness] = useState(0.6); // 0..1
  const [brightness, setBrightness] = useState(0); // -0.3 a 0.3
  const [mode, setMode] = useState('paint'); // 'paint' | 'erase'
  const [view, setView] = useState('after'); // 'after' | 'before' | 'split' | 'mask'
  const [filterType, setFilterType] = useState('wrinkles'); // 'wrinkles' | 'brightness'
  const [splitPos, setSplitPos] = useState(0.5); // 0..1, línea divisoria en Split
  const [error, setError] = useState("");
  const [tests, setTests] = useState([]);
  const [detectingFace, setDetectingFace] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const modelRef = useRef(null);

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
      gl.deleteShader(sh);
      throw new Error("Shader error: " + log);
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
  ].join('');

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
  ].join('');

  const composeFS = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_orig;',
    'uniform sampler2D u_blur;',
    'uniform sampler2D u_mask;',
    'uniform float u_intensity;',
    'uniform float u_brightness;',
    'void main() {',
    '  vec4 o = texture2D(u_orig, v_uv);',
    '  vec4 b = texture2D(u_blur, v_uv);',
    '  float a = clamp(texture2D(u_mask, v_uv).a, 0.0, 1.0);',
    '  float m = a * u_intensity;',
    '  vec4 blended = mix(o, b, m);',
    '  blended.rgb += u_brightness * a;',
    '  blended.rgb = clamp(blended.rgb, 0.0, 1.0);',
    '  gl_FragColor = blended;',
    '}',
  ].join('');

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
                };
                resized.onerror = function(ev) {
                  console.error('Error creando imagen redimensionada', ev);
                  setImage(img);
                  setImgSize({ w: srcW, h: srcH });
                };
                resized.src = off.toDataURL('image/png');
                return;
              }
              setImage(img);
              setImgSize({ w: srcW, h: srcH });
            } catch (e) {
              console.error('Post-carga/resize error', e);
              setImage(img);
              setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
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
      // Cargar modelo BlazeFace
      blazeface.load().then(function(model) {
        modelRef.current = model;
        console.log('Modelo BlazeFace cargado');
      }).catch(function(err) {
        console.error('Error cargando BlazeFace:', err);
      });
      // Detectar cara automáticamente
    
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
        if (modelRef.current) {
          detectAndMaskFace();
        } else {
          console.log('Modelo aún no cargado, esperando...');
          // Reintentar después de 2 segundos
          setTimeout(function() {
            if (modelRef.current) {
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
    if (image && modelRef.current && !detectingFace) {
      if (filterType === 'wrinkles') {
        if (brightness !== 0) {
          setBrightness(0);
          return; // Salir y esperar al próximo render
        }
      } else if (filterType === 'brightness') {
        if (intensity !== 0) {
          setIntensity(0);
          setSigma(3);
          return; // Salir y esperar al próximo render
        }
      }
      
      clearMask();
      setTimeout(function() {
        detectAndMaskFace();
      }, 100);
    }
  }, [filterType, brightness, intensity]); // Añadir brightness e intensity como dependencias




  async function detectAndMaskFace() {
    if (!modelRef.current || !image) return;
    
    setDetectingFace(true);
    setFaceDetected(false);
    
    try {
      const predictions = await modelRef.current.estimateFaces(image, false);
      
      if (predictions.length > 0) {
        const m = maskCanvasRef.current;
        const ctx = m.getContext('2d');
        
        ctx.clearRect(0, 0, m.width, m.height);
        
        const canvasW = m.width;
        const canvasH = m.height;
        const imgW = image.naturalWidth || image.width;
        const imgH = image.naturalHeight || image.height;
        const scaleX = canvasW / imgW;
        const scaleY = canvasH / imgH;
        
        predictions.forEach(function(prediction) {
          const start = prediction.topLeft;
          const end = prediction.bottomRight;
          const landmarks = prediction.landmarks;
          
          const x1 = start[0] * scaleX;
          const y1 = start[1] * scaleY;
          const x2 = end[0] * scaleX;
          const y2 = end[1] * scaleY;
          
          const width = x2 - x1;
          const height = y2 - y1;
          
          const scaledLandmarks = landmarks.map(function(point) {
            return [point[0] * scaleX, point[1] * scaleY];
          });
          
          const rightEye = scaledLandmarks[0];
          const leftEye = scaledLandmarks[1];
          const nose = scaledLandmarks[2];
          
          const eyesCenterX = (rightEye[0] + leftEye[0]) / 2;
          const eyesCenterY = (rightEye[1] + leftEye[1]) / 2;
          
          const eyesDistance = Math.sqrt(
            Math.pow(leftEye[0] - rightEye[0], 2) + 
            Math.pow(leftEye[1] - rightEye[1], 2)
          );
          
          ctx.globalCompositeOperation = 'source-over';
          
          // APLICAR MÁSCARA SEGÚN EL FILTRO
          if (filterType === 'wrinkles') {
            applyWrinklesMask(ctx, eyesCenterX, eyesCenterY, eyesDistance, height, rightEye, leftEye, nose);
          } else if (filterType === 'brightness') {
            applyBrightnessMask(ctx, eyesCenterX, eyesCenterY, eyesDistance, height);
          }
          
          console.log('Máscara aplicada correctamente para filtro:', filterType);
        });
        
        syncMaskToGPU();
        setView('split');
        renderGL();
        setFaceDetected(true);
      } else {
        setError('No se detectó ninguna cara. Puedes pintar manualmente.');
      }
    } catch (err) {
      console.error('Error en detección:', err);
      setError('Error al detectar la cara: ' + err.message);
    } finally {
      setDetectingFace(false);
    }
  }










  // MÁSCARA PARA FILTRO DE ARRUGAS (zonas específicas)
  function applyWrinklesMask(ctx, eyesCenterX, eyesCenterY, eyesDistance, height, rightEye, leftEye, nose) {
    // ========== 1. FRENTE (igual que antes) ==========
    const foreheadY = eyesCenterY - height * 0.35;
    const foreheadWidth = eyesDistance * 0.8;
    const foreheadHeight = height * 0.25;

    const foreheadGrad = ctx.createRadialGradient(
      eyesCenterX, foreheadY, foreheadWidth * 0.4,
      eyesCenterX, foreheadY, foreheadWidth
    );
    foreheadGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    foreheadGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.5)');
    foreheadGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = foreheadGrad;
    ctx.beginPath();
    ctx.ellipse(eyesCenterX, foreheadY, foreheadWidth, foreheadHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // ========== 2. CONTORNO DE OJOS - Óvalos horizontales SIN centro (anillo) ==========
    // Ojo derecho (del lado derecho de la imagen, izquierdo del usuario)
    const rightEyeRadiusX = eyesDistance * 0.55;
    const rightEyeRadiusY = eyesDistance * 0.35;

    // Ajustar posición hacia el centro (hacia la nariz)
    const rightEyeX = rightEye[0] + eyesDistance * 0.05; // Mover hacia la derecha
    const rightEyeY = rightEye[1] - eyesDistance * 0.05; // Mantener Y
        
    ctx.save();
    ctx.translate(rightEyeX, rightEyeY); // Usar posición ajustada
        
    const rightEyeMaxRadius = Math.max(rightEyeRadiusX, rightEyeRadiusY);
    ctx.scale(rightEyeRadiusX / rightEyeMaxRadius, rightEyeRadiusY / rightEyeMaxRadius);
        
    const rightEyeGrad = ctx.createRadialGradient(
      0, 0, rightEyeMaxRadius * 0.15,
      0, 0, rightEyeMaxRadius
    );
    rightEyeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rightEyeGrad.addColorStop(0.15, 'rgba(255, 255, 255, 0)');
    rightEyeGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    rightEyeGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.5)');
    rightEyeGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.3)');
    rightEyeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
    ctx.fillStyle = rightEyeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, rightEyeMaxRadius, 0, Math.PI * 2);
    ctx.fill();
        
    ctx.restore();
        
    // Ojo izquierdo (del lado izquierdo de la imagen, derecho del usuario)
    const leftEyeRadiusX = eyesDistance * 0.55;
    const leftEyeRadiusY = eyesDistance * 0.35;

    // Ajustar posición hacia el centro (hacia la nariz)
    const leftEyeX = leftEye[0] - eyesDistance * 0.05; // Mover hacia la derecha
    const leftEyeY = leftEye[1] - eyesDistance * 0.05; // Mantener Y
        
    ctx.save();
    ctx.translate(leftEyeX, leftEyeY); // Usar posición ajustada
        
    const leftEyeMaxRadius = Math.max(leftEyeRadiusX, leftEyeRadiusY);
    ctx.scale(leftEyeRadiusX / leftEyeMaxRadius, leftEyeRadiusY / leftEyeMaxRadius);
        
    const leftEyeGrad = ctx.createRadialGradient(
      0, 0, leftEyeMaxRadius * 0.15,
      0, 0, leftEyeMaxRadius
    );
    leftEyeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    leftEyeGrad.addColorStop(0.15, 'rgba(255, 255, 255, 0)');
    leftEyeGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    leftEyeGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.5)');
    leftEyeGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.3)');
    leftEyeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
    ctx.fillStyle = leftEyeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, leftEyeMaxRadius, 0, Math.PI * 2);
    ctx.fill();
        
    ctx.restore();
    
    // ========== 3. ZONA DE LA BOCA Y ALREDEDOR (nuevo) ==========
    const mouthCenterX = eyesCenterX;
    const mouthCenterY = nose[1] + height * 0.3; // Más abajo para cubrir barbilla
    const mouthRadiusX = eyesDistance * 0.85;    // Más ancho
    const mouthRadiusY = height * 0.35;          // Más alto para barbilla
    
    // Crear elipse con gradiente para la zona de la boca
    ctx.save();
    ctx.translate(mouthCenterX, mouthCenterY);
    
    const mouthMaxRadius = Math.max(mouthRadiusX, mouthRadiusY);
    ctx.scale(mouthRadiusX / mouthMaxRadius, mouthRadiusY / mouthMaxRadius);
    
    const mouthGrad = ctx.createRadialGradient(
      0, 0, mouthMaxRadius * 0.3,
      0, 0, mouthMaxRadius
    );
    mouthGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    mouthGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
    mouthGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.4)');
    mouthGrad.addColorStop(0.95, 'rgba(255, 255, 255, 0.15)');
    mouthGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = mouthGrad;
    ctx.beginPath();
    ctx.arc(0, 0, mouthMaxRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // ========== 4. LÍNEAS NASOLABIALES (opcional, menos intenso que antes) ==========
    const nasolabialRadius = eyesDistance * 0.25;
    const nasoY = nose[1] + height * 0.08;
    
    // Línea derecha
    const nasoGradR = ctx.createRadialGradient(
      rightEye[0] - eyesDistance * 0.1, nasoY, nasolabialRadius * 0.25,
      rightEye[0] - eyesDistance * 0.1, nasoY, nasolabialRadius
    );
    nasoGradR.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    nasoGradR.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
    nasoGradR.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = nasoGradR;
    ctx.beginPath();
    ctx.arc(rightEye[0] - eyesDistance * 0.1, nasoY, nasolabialRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Línea izquierda
    const nasoGradL = ctx.createRadialGradient(
      leftEye[0] + eyesDistance * 0.1, nasoY, nasolabialRadius * 0.25,
      leftEye[0] + eyesDistance * 0.1, nasoY, nasolabialRadius
    );
    nasoGradL.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    nasoGradL.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
    nasoGradL.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = nasoGradL;
    ctx.beginPath();
    ctx.arc(leftEye[0] + eyesDistance * 0.1, nasoY, nasolabialRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  function applyBrightnessMask(ctx, eyesCenterX, eyesCenterY, eyesDistance, height) {
    // Dimensiones del óvalo vertical
    const faceRadiusX = eyesDistance * 1.2;  // Ancho (horizontal)
    const faceRadiusY = height * 0.8;        // Alto (vertical) - más alto para incluir frente
    const faceCenterY = eyesCenterY + height * 0.05; // Centro ligeramente más abajo
    
    ctx.save();
    
    // Mover al centro de la cara
    ctx.translate(eyesCenterX, faceCenterY);
    
    // Escalar para crear óvalo vertical (más alto que ancho)
    const maxRadius = Math.max(faceRadiusX, faceRadiusY);
    ctx.scale(faceRadiusX / maxRadius, faceRadiusY / maxRadius);
    
    // Crear gradiente radial con transición más natural
    const gradient = ctx.createRadialGradient(
      0, 0, maxRadius * 0.3,   // Centro del gradiente (más pequeño para efecto uniforme)
      0, 0, maxRadius          // Borde del gradiente
    );
    
    // Gradiente más suave y natural
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');      // Centro al 100%
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');    // Mantén 100% hasta la mitad
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.85)'); // Empieza transición suave
    gradient.addColorStop(0.90, 'rgba(255, 255, 255, 0.5)');  // Continúa degradado
    gradient.addColorStop(0.97, 'rgba(255, 255, 255, 0.2)');  // Casi transparente
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');       // Totalmente transparente
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
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


      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texOrigRef.current);
      gl.uniform1i(u_orig, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texPongRef.current);
      gl.uniform1i(u_blur, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texMaskRef.current);
      gl.uniform1i(u_mask, 2);
      gl.uniform1f(u_int, intensity);
      gl.uniform1f(u_bright, brightness);

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
      if (view === 'before') {
        octx.drawImage(image, 0, 0, w, h);
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
        // Mostrar solo la máscara sobre fondo blanco (evitar fondo negro)
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, w, h);
        octx.drawImage(maskCanvasRef.current, 0, 0, w, h);
      } else {
        // split view con posición variable
        const splitPx = Math.max(0, Math.min(1, splitPos)) * w;
        // izquierda: original
        if (splitPx > 0) octx.drawImage(image, 0, 0, splitPx, h, 0, 0, splitPx, h);
        // derecha: procesado
        const rightW = w - splitPx;
        if (rightW > 0) octx.drawImage(srcCanvas, splitPx, 0, rightW, h, splitPx, 0, rightW, h);
        // Línea divisoria + asidero
        octx.fillStyle = 'rgba(255,255,255,0.9)';
        octx.fillRect(Math.floor(splitPx)-1, 0, 2, h);
        octx.fillStyle = 'rgba(255,255,255,0.9)';
        octx.fillRect(Math.floor(splitPx)-12, h/2-16, 24, 32);
      }
      
      // Asegurar fondo blanco bajo cualquier vista
      octx.globalCompositeOperation = 'destination-over';
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, w, h);
      octx.globalCompositeOperation = 'source-over';
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

  // --------------- DIAGNOSTIC TESTS -----------------
  async function runTests() {
    const results = [];
    function pass(name) { results.push({ name: name, ok: true }); }
    function fail(name, err) { results.push({ name: name, ok: false, err: String(err) }); }

    try {
      // T0: Shaders strings non-empty
      if (quadVS.indexOf('void main()') !== -1 && blurFS.indexOf('void main()') !== -1 && composeFS.indexOf('void main()') !== -1) {
        pass('T0: Shaders strings presentes');
      } else {
        throw new Error('Shader strings vacías');
      }

      // T1: GL context
      const canvas = glCanvasRef.current;
      const gl = glRef.current || (canvas ? createGL(canvas) : null);
      if (gl) pass('T1: WebGL context'); else throw new Error('No WebGL');

      // T2: Shader & program (blur)
      try {
        const prog = createProgram(gl, quadVS, blurFS);
        if (prog) pass('T2: Shader blur compila');
      } catch (e) { fail('T2: Shader blur', e); }

      // T2b: Shader & program (compose)
      try {
        const prog2 = createProgram(gl, quadVS, composeFS);
        if (prog2) pass('T2b: Shader compose compila');
      } catch (e) { fail('T2b: Shader compose', e); }

      // T3: Textures & FBO
      try {
        const tex = createTexture(gl, 4, 4, null);
        const fbo = createFBO(gl, tex);
        if (fbo) pass('T3: FBO completo');
      } catch (e) { fail('T3: Texturas/FBO', e); }

      // T4: Mask canvas paint
      try {
        const m = maskCanvasRef.current; const ctx = m.getContext('2d');
        ctx.clearRect(0,0,m.width,m.height);
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillRect(0,0,10,10);
        const px = ctx.getImageData(5,5,1,1).data;
        if (px[3] > 0) pass('T4: Pintado en máscara (alpha>0)'); else throw new Error('Alpha no cambia');
        syncMaskToGPU();
      } catch (e) { fail('T4: Pintado máscara', e); }

      // T5: Render pipeline produces dataURL
      try {
        renderGL();
        const url = glCanvasRef.current.toDataURL();
        if (url && url.indexOf('data:image') === 0) pass('T5: Pipeline genera imagen'); else throw new Error('toDataURL vacío');
      } catch (e) { fail('T5: Pipeline', e); }

      // T6: onFile tolerates event without file
      try {
        onFile({ target: {} });
        pass('T6: onFile sin archivo no lanza');
      } catch (e) { fail('T6: onFile sin archivo', e); }

      // T7: WebGL MAX_TEXTURE_SIZE reported
      try {
        const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        if (typeof maxTex === 'number' && maxTex >= 2048) pass('T7: MAX_TEXTURE_SIZE=' + maxTex);
        else throw new Error('MAX_TEXTURE_SIZE inválido');
      } catch (e) { fail('T7: MAX_TEXTURE_SIZE', e); }

      // T8: handleFile rechaza no-imagen sin lanzar
      try {
        handleFile({ type: 'application/pdf', name: 'x.pdf' });
        pass('T8: handleFile no-imagen no lanza');
      } catch (e) { fail('T8: handleFile no-imagen', e); }

      // T9: handleFile acepta mimetype vacío si extensión es .jpg
      try {
        handleFile({ type: '', name: 'foto.jpg' });
        pass('T9: handleFile acepta extensión .jpg con type vacío');
      } catch (e) { fail('T9: handleFile type vacío .jpg', e); }

      // T10: Composición usa canal alpha de la máscara
      try {
        const m = maskCanvasRef.current; const ctx = m.getContext('2d');
        ctx.clearRect(0,0,m.width,m.height);
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillRect(0,0, m.width, m.height);
        syncMaskToGPU();
        renderGL();
        pass('T10: Composición con alpha ejecutada');
      } catch (e) { fail('T10: Composición alpha', e); }

      // T11: composeFS usa canal .a explícitamente
      try {
        if (composeFS.indexOf('.a') !== -1) pass('T11: compose usa alpha (.a)');
        else throw new Error('compose no usa alpha');
      } catch (e) { fail('T11: compose alpha', e); }

      // T12: mover split no rompe render
      try {
        const prev = splitPos;
        setSplitPos(0.25); renderGL();
        setSplitPos(0.75); renderGL();
        setSplitPos(prev);
        pass('T12: Split mueve línea y renderiza');
      } catch (e) { fail('T12: Split mover', e); }

      // T13: Pintar realmente cambia salida (pixel cambia)
      try {
        const oc = outCanvasRef.current; const octx = oc.getContext('2d');
        setView('before'); renderGL();
        const pxBefore = octx.getImageData(5,5,1,1).data;
        const m = maskCanvasRef.current; const mctx = m.getContext('2d');
        mctx.fillStyle = 'rgba(255,255,255,1)'; mctx.fillRect(0,0,20,20);
        syncMaskToGPU();
        setView('after'); renderGL();
        const pxAfter = octx.getImageData(5,5,1,1).data;
        const changed = (pxBefore[0]!==pxAfter[0]||pxBefore[1]!==pxAfter[1]||pxBefore[2]!==pxAfter[2]);
        if (changed) pass('T13: Pintar cambia el resultado'); else throw new Error('pixel no cambia');
      } catch (e) { fail('T13: Cambio de pixel por máscara', e); }

      // T14: preserveDrawingBuffer activo
      try {
        const attrs = gl.getContextAttributes();
        if (attrs && attrs.preserveDrawingBuffer === true) pass('T14: preserveDrawingBuffer = true');
        else throw new Error('preserveDrawingBuffer no activo');
      } catch (e) { fail('T14: preserveDrawingBuffer', e); }

    } catch (e) {
      fail('Setup', e);
    }

    setTests(results);
    if (results.every(function(r){return r.ok;})) setError('');
  }

  // --------------------- UI -----------------------
  return (
    <div className="min-h-screen w-full bg-neutral-100 text-neutral-900">
      <div className="mx-auto max-w-6xl p-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Web Image Filter</h1>
            <p className="text-sm opacity-70">Sube una imagen, la cara se detecta automáticamente. Ajusta o pinta más si lo necesitas.</p>
            {detectingFace && <p className="text-sm text-blue-600 mt-1">🔍 Detectando cara...</p>}
            {faceDetected && <p className="text-sm text-green-600 mt-1">✅ Cara detectada</p>}
          </div>
          <div className="flex items-center gap-2">
            <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={onFile} className="block text-sm" />
            <button onClick={detectAndMaskFace} className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md disabled:opacity-50" disabled={!image || detectingFace}>{detectingFace ? 'Detectando...' : 'Redetectar cara'}</button>
            <button onClick={downloadPNG} className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md disabled:opacity-50" disabled={!image}>Descargar PNG</button>
            <button onClick={runTests} className="rounded-xl border px-3 py-2 text-sm bg-white shadow hover:shadow-md">Run tests</button>
          </div>
        </header>

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

        {tests.length > 0 && (
          <div className="mb-4 rounded-xl bg-white border p-3 text-sm">
            <div className="font-medium mb-2">Diagnostics</div>
            <ul className="space-y-1">
              {tests.map(function(t, i){
                return (
                  <li key={i} className={t.ok ? 'text-green-700' : 'text-red-700'}>
                    {t.ok ? '✅' : '❌'} {t.name}{!t.ok && t.err ? ' — ' + t.err : ''}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-1 bg-white rounded-2xl shadow p-4 flex flex-col gap-4">
            <h2 className="font-semibold">Controles</h2>
              <div className="border-t pt-3">
                <h3 className="font-medium text-sm mb-2">Tipo de Filtro</h3>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={function(){
                        setFilterType('wrinkles'); 
                        if(image && modelRef.current) {
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
                        if(image && modelRef.current) {
                          setTimeout(function() {
                            detectAndMaskFace();
                          }, 100);
                        }
                      }} 
                      className={'rounded-lg px-3 py-2 text-sm border ' + (filterType==='brightness'?'bg-neutral-900 text-white':'bg-white')}>
                      Luminosidad
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    {filterType === 'wrinkles' && 'Aplica en zonas específicas: frente, mejillas y líneas nasolabiales'}
                    {filterType === 'brightness' && 'Aplica en toda la cara de forma uniforme'}
                  </p>
                </div>
            <label className={'text-sm ' + (filterType !== 'wrinkles' ? 'opacity-50' : '')}>
              Intensidad: {intensity.toFixed(2)}
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.01} 
                value={intensity} 
                onChange={function(e){setIntensity(parseFloat(e.target.value));}} 
                className="w-full"
                disabled={filterType !== 'wrinkles'}
              />
            </label>
            <label className={'text-sm ' + (filterType !== 'wrinkles' ? 'opacity-50' : '')}>
              Suavizado (sigma): {sigma}
              <input 
                type="range" 
                min={1} 
                max={10} 
                step={1} 
                value={sigma} 
                onChange={function(e){setSigma(parseInt(e.target.value));}} 
                className="w-full"
                disabled={filterType !== 'wrinkles'}
              />
            </label>
            <label className={'text-sm ' + (filterType !== 'brightness' ? 'opacity-50' : '')}>
              Luminosidad: {brightness > 0 ? '+' : ''}{brightness.toFixed(2)}
              <input 
                type="range" 
                min={-0.3} 
                max={0.3} 
                step={0.01} 
                value={brightness} 
                onChange={function(e){setBrightness(parseFloat(e.target.value));}} 
                className="w-full"
                disabled={filterType !== 'brightness'}
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
                <div className="relative border rounded-xl overflow-hidden">
                  <canvas ref={glCanvasRef} className="w-full h-auto block" style={{minHeight:'200px', background:'#fafafa'}} />
                </div>
                <div className="relative border rounded-xl overflow-hidden">
                  <canvas ref={maskCanvasRef} className="cursor-crosshair w-full h-auto block" style={{minHeight:'200px', background:'#ffffff'}} />
                </div>
                <div className="relative border rounded-xl overflow-hidden">
                  <canvas ref={outCanvasRef} className="w-full h-auto block" style={{minHeight:'200px', background:'#ffffff'}} />
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
