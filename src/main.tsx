import React from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './AppRouter';

const root = createRoot(document.getElementById('root')!);
root.render(<AppRouter />);
