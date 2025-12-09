import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-backend-webgl',
      'three',
      '@react-three/fiber'
    ]
  },
  worker: {
    format: 'es'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ml-libs': ['@tensorflow/tfjs', '@mediapipe/face_mesh'],
          'three-libs': ['three', '@react-three/fiber', '@react-three/drei'],
          'animation-libs': ['framer-motion']
        }
      }
    }
  }
})
