export interface LogoOptions {
  text?: string;
  subtitle?: string;
  onClick?: () => void;
}

export function getThemeAccents(theme: string | null) {
  if (theme === 'dark') return { bg: 'rgba(20, 18, 24, 0.75)', gradient: 'linear-gradient(135deg, #4F378B, #633B48)', shadow: 'rgba(79,55,139,0.3)' };
  if (theme === 'pink') return { bg: 'rgba(255, 240, 245, 0.75)', gradient: 'linear-gradient(135deg, #7D2950, #5F1138)', shadow: 'rgba(125,41,80,0.3)' };
  return { bg: 'rgba(255, 255, 255, 0.75)', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', shadow: 'rgba(79,70,229,0.3)' };
}

export function createLogo(options: LogoOptions = {}): HTMLElement {
  const { text = 'Ora Components', subtitle, onClick } = options;

  const container = document.createElement('div');
  container.className = 'flex items-center gap-px-12 cursor-pointer group';

  const subtitleHtml = subtitle
    ? `<span class="text-label-small text-on-surface-variant" style="opacity: 0.5;">${subtitle}</span>`
    : '';

  container.innerHTML = `
    <div class="logo-icon relative w-9 h-9 rounded-large flex items-center justify-center flex-shrink-0 overflow-hidden" style="background: var(--logo-gradient);">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 2L15.5 14H2.5L9 2Z" fill="white" fill-opacity="0.9"/>
        <circle cx="9" cy="10" r="2.5" fill="white" fill-opacity="0.6"/>
      </svg>
      <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style="background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);"></div>
    </div>
    <div class="flex flex-col">
      <span class="text-title-small font-semibold text-on-surface group-hover:text-primary transition-colors duration-200">${text}</span>
      ${subtitleHtml}
    </div>
  `;

  if (onClick) {
    container.onclick = onClick;
  }

  return container;
}
