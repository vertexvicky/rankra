export function startTour(steps, force = false) {
  if (!force && localStorage.getItem('rankra_tour_done')) return;

  if (!document.getElementById('driver-css')) {
    const link = document.createElement('link');
    link.id = 'driver-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css';
    document.head.appendChild(link);
  }
  
  // Custom theme overrides to match Rankra's aesthetic
  if (!document.getElementById('driver-theme-css')) {
    const style = document.createElement('style');
    style.id = 'driver-theme-css';
    style.textContent = `
      .driver-popover {
        background: var(--bg-card) !important;
        color: var(--text-primary) !important;
        border-radius: var(--radius-lg) !important;
        box-shadow: var(--shadow-md) !important;
      }
      .driver-popover-title {
        font-family: 'Inter', sans-serif !important;
        font-size: 1.1rem !important;
        font-weight: 700 !important;
        color: var(--accent) !important;
      }
      .driver-popover-description {
        font-family: 'Inter', sans-serif !important;
        font-size: 0.9rem !important;
        color: var(--text-secondary) !important;
        line-height: 1.4 !important;
      }
      .driver-popover-footer button {
        background: var(--bg-hover) !important;
        color: var(--text-primary) !important;
        border-radius: var(--radius) !important;
        text-shadow: none !important;
        border: 1px solid var(--border) !important;
        font-family: 'Inter', sans-serif !important;
        font-weight: 500 !important;
      }
      .driver-popover-footer button.driver-next-btn {
        background: var(--accent) !important;
        color: #fff !important;
        border: none !important;
      }
      
      /* Dark mode support */
      body.dark .driver-popover {
        background: var(--bg-card) !important;
      }
      body.dark .driver-popover-footer button {
        background: var(--bg-elevated) !important;
        border-color: var(--border) !important;
      }
      body.dark .driver-popover-footer button.driver-next-btn {
        background: var(--accent) !important;
      }
    `;
    document.head.appendChild(style);
  }

  import('https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.mjs').then(({ driver }) => {
    const d = driver({
      showProgress: true,
      animate: true,
      allowClose: false,
      overlayColor: 'rgba(0, 0, 0, 0.75)',
      steps: steps,
      onDestroyStarted: () => {
        if (!d.hasNextStep() || confirm("Skip the interactive tour?")) {
          d.destroy();
          localStorage.setItem('rankra_tour_done', 'true');
        }
      }
    });
    
    // Slight delay to ensure UI has fully rendered and settled
    setTimeout(() => {
      d.drive();
    }, 500);
  });
}
