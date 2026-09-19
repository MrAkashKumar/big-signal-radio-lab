import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProductApp } from './ProductApp';
import './style.css';
import './workshop-theme.css';
import './human-radio.css';
import './interface-polish.css';
export type { Graphics } from './missions';
createRoot(document.getElementById('root')!).render(<StrictMode><ProductApp/></StrictMode>);
