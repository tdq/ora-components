import { ButtonBuilder } from '@tdq/ora-components';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { themeManager } from '@tdq/ora-components';
import { Theme } from '@tdq/ora-components';
import { of, Subject } from 'rxjs';

export default {
  title: 'System/ThemeManager',
};

export const ThemeSwitcher = () => {
  const layout = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.LARGE);

  const title = document.createElement('h2');
  title.textContent = 'Theme Switcher';
  title.className = 'text-xl font-bold mb-4 text-on-surface';

  layout.addSlot().withContent({ build: () => title });

  const buttonsLayout = new LayoutBuilder()
    .asHorizontal()
    .withGap(LayoutGap.MEDIUM);

  const themes: Theme[] = ['light', 'dark', 'system'];
  
  const statusParagraph = document.createElement('p');
  statusParagraph.className = 'mt-4 text-on-surface';

  const updateStatus = (theme: Theme) => {
      statusParagraph.textContent = `Current Theme: ${theme}`;
  };

  themes.forEach((theme) => {
    const click$ = new Subject<void>();
    click$.subscribe(() => {
        themeManager.setTheme(theme);
    });

    buttonsLayout.addSlot().withContent(
      new ButtonBuilder()
        .withCaption(of(theme.charAt(0).toUpperCase() + theme.slice(1)))
        .withClick(() => click$.next())
    );
  });

  layout.addSlot().withContent(buttonsLayout);
  
  // Subscribe to theme changes
  themeManager.theme$.subscribe(theme => {
    updateStatus(theme);
  });

  layout.addSlot().withContent({ build: () => statusParagraph });

  const container = layout.build();
  container.classList.add('p-8', 'bg-surface');

  return container;
};
