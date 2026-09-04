import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/foundation/design-tokens.css';
import { ApplicationRoot } from './application-root';
import { createBrowserApplicationController } from './composition-root';

const container = document.getElementById('app');
if (!container) throw new Error('Application root element was not found.');

createRoot(container).render(
  <StrictMode>
    <ApplicationRoot controller={createBrowserApplicationController()} />
  </StrictMode>,
);
