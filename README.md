# MartiDerm – AI Beauty Mirror  
**Simulador cosmètic amb detecció facial i filtres basats en WebGL + FaceMesh**

Aquest projecte implementa una eina de *virtual try-on* per al sector cosmètic, creada en el context del repte MartiDerm. El sistema permet que un usuari pugi una fotografia i visualitzi, de manera realista, l'efecte de diferents productes dermatològics sobre la seva pròpia pell.

La solució combina **detecció facial amb MediaPipe FaceMesh**, **processament d’imatge en GPU amb WebGL** i un **frontend en React** pensat per integrar-se tant en espais comercials com en pàgines web corporatives.

---

## Funcionalitats principals

-  **Pujada i visualització d’imatges**
-  **Detecció facial automàtica amb MediaPipe FaceMesh (468 landmarks)**
-  **Generació de màscares facials adaptades a cada zona**
-  **Aplicació de filtres cosmètics realistes**:
  - Reducció d’arrugues  
  - Millora de fermesa  
  - Increment d’il·luminació  
  - Reducció de taques  
  - Atenuació de marques d’acné  
-  **Processament en GPU amb WebGL per millorar rendiment**
- **Comparació "abans / després" integrada**
- **Frontend modular i fàcil d'adaptar a diferents marques**

---

## 🧬 Arquitectura del projecte

web_image_filters/
│
├── public/ # Recursos estàtics i arxius públics
│
├── src/
│ ├── components/ # Components React i interfície
│ ├── filters/ # Definició dels filtres cosmètics
│ ├── face/ # Implementació FaceMesh + generació de màscares
│ ├── rendering/ # Shaders WebGL, buffers i pipeline de GPU
│ ├── utils/ # Funcions auxiliars de càlcul i transformació
│ └── App.jsx # Punt d’entrada de l’aplicació
│
├── package.json # Dependències, scripts i metadades
└── vite.config.js # Configuració del bundler Vite




El sistema està organitzat de manera modular per facilitar-ne l'escalabilitat, manteniment i reutilització.

---

## Tecnologies utilitzades

### Detecció facial
- **MediaPipe FaceMesh**  
Model de detecció facial amb 468 landmarks que ens permet:
- obtenir geometria detallada del rostre  
- identificar zones com pòmuls, ulls, front, llavis i contorn facial  
- generar màscares personalitzades per a cada filtre  

### Processament d’imatge
- **WebGL (fragment + vertex shaders)**  
Operacions principals:
- Suavitzat gaussià multipàs  
- Ajustos de lluminositat i contrast  
- Reducció de vermellors i unificació del to  
- Barreja de textures per píxel en GPU  

### Frontend
- **React + Vite**  
- Interfície orientada a usabilitat  
- Component de comparació abans/després  
- Adaptació del disseny a la identitat de MartiDerm  
- Arquitectura desacoblada, reutilitzable amb altres marques

---

## Instal·lació i execució

### 1. Clonar el repositori

```bash
git clone https://github.com/zarii023/web_image_filters.git
cd web_image_filters

### 2. Instalar dependències
npm install
### 3. Executar en mode desenvolupament
npm run dev

#L’aplicació estarà disponible a:
http://localhost:5173


