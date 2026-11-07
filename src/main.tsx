import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { startLiquidGlass } from './components/ui/liquidGlass.js';

createRoot(document.getElementById('root')!).render(<App />);
// Real refraction for the floating layer where the browser supports it; frosted glass elsewhere.
startLiquidGlass();
