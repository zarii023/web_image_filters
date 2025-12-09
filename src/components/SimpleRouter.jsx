import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Componente simple de prueba
const SimpleHome = () => (
  <div style={{ padding: '20px' }}>
    <h1>Simple Home - Router funcionando</h1>
    <p>Si ves esto, el problema no es con React Router básico</p>
  </div>
);

const SimpleRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SimpleHome />} />
        <Route path="*" element={<SimpleHome />} />
      </Routes>
    </BrowserRouter>
  );
};

export default SimpleRouter;