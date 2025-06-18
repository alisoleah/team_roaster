import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './src/AppWrapper.js';

// If you have a global stylesheet, you might import it here, e.g.:
// import './index.css'; // Assuming you have a global CSS file

// Assuming a div with id 'root' in your HTML structure
const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element. Ensure your HTML has an element with id='root'.");
}
