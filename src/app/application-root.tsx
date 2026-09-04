import { useEffect, useSyncExternalStore } from 'react';
import { AutoLinguaUi } from '../ui/auto-lingua-ui';
import type { ApplicationController } from './application-controller';

const resolveTheme = (theme: 'light' | 'dark' | 'system'): 'light' | 'dark' =>
  theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme;

export const ApplicationRoot = ({ controller }: { readonly controller: ApplicationController }) => {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    void controller.initialize();
  }, [controller]);

  useEffect(() => {
    const appearance = snapshot.model.settings.appearance;
    const root = document.documentElement;
    root.dataset.theme = resolveTheme(appearance.theme);
    root.style.setProperty('--al-user-surface-opacity', String(appearance.surfaceOpacity));
    root.style.setProperty('--al-user-blur', `${appearance.blurPx}px`);
    if (appearance.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (): void => {
      root.dataset.theme = media.matches ? 'dark' : 'light';
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [snapshot.model.settings.appearance]);

  if (!snapshot.initialized) {
    return (
      <div className="al-root al-loading" role="status">
        <div className="al-brand-mark" aria-hidden="true">
          AL
        </div>
        <p>AUTOlinguaを準備しています…</p>
      </div>
    );
  }
  return <AutoLinguaUi model={snapshot.model} actions={controller} toasts={snapshot.toasts} />;
};
