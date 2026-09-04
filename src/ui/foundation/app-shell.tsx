import type { ReactNode } from 'react';
import { Menu, Tabs, type TabItem, type ToastMessage, ToastRegion } from './primitives';

export const AppShell = ({
  title,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
  toasts = [],
}: {
  readonly title: string;
  readonly tabs: readonly TabItem[];
  readonly activeTab: string;
  readonly onTabChange: (id: string) => void;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly toasts?: readonly ToastMessage[];
}) => (
  <div className="al-root">
    <header className="al-shell-header">
      <div className="al-brand">
        <div className="al-brand-mark" aria-hidden="true">
          AL
        </div>
        <div>
          <strong>{title}</strong>
          <div className="al-muted">Localization workspace</div>
        </div>
      </div>
      {actions && <Menu label="アプリ操作">{actions}</Menu>}
    </header>
    <main className="al-shell-main al-stack">
      <Tabs items={tabs} activeId={activeTab} onChange={onTabChange} />
      <section id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {children}
      </section>
    </main>
    <ToastRegion messages={toasts} />
  </div>
);
