import { seedDemoData } from './demoData';

/**
 * Web preview only: exposes `window.__formkurveDemo()` to fill the database
 * with sample data (used for screenshots and for trying out the UI).
 */
export function registerDemoData(): void {
  (globalThis as { __formkurveDemo?: () => Promise<void> }).__formkurveDemo = seedDemoData;
}
