import { useState } from 'react';
import { AppShell, Button, Dialog, type TabItem, type ToastMessage } from './foundation';
import { GlossaryView, ModifierView, ToneView } from './features/libraries/library-views';
import { MigrationView } from './features/migration/migration-view';
import { ExportView, ProjectIoView } from './features/project/project-io-view';
import { CredentialView, SettingsView } from './features/settings/settings-view';
import type { UiActions, UiModel } from './features/ui-contract';
import { TranslationWorkspaceView } from './features/workspace/translation-workspace-view';

const tabs = [
  { id: 'project', label: '入力' },
  { id: 'workspace', label: '翻訳' },
  { id: 'glossary', label: '用語集' },
  { id: 'tones', label: 'トーン' },
  { id: 'modifiers', label: '修飾子' },
  { id: 'settings', label: '設定' },
  { id: 'export', label: '出力' },
  { id: 'migration', label: '設定変換' },
] as const satisfies readonly TabItem[];

type FeatureId = (typeof tabs)[number]['id'];

export interface AutoLinguaUiProps {
  readonly model: UiModel;
  readonly actions: UiActions;
  readonly toasts?: readonly ToastMessage[];
}

export const AutoLinguaUi = ({ model, actions, toasts = [] }: AutoLinguaUiProps) => {
  const [active, setActive] = useState<FeatureId>('project');
  const [information, setInformation] = useState<'help' | 'about' | null>(null);
  const content = (() => {
    switch (active) {
      case 'project':
        return <ProjectIoView actions={actions} progress={model.bulkProgress} />;
      case 'workspace':
        return <TranslationWorkspaceView model={model} actions={actions} />;
      case 'glossary':
        return <GlossaryView terms={model.settings.translation.glossary} actions={actions} />;
      case 'tones':
        return <ToneView tones={model.settings.translation.tones} actions={actions} />;
      case 'modifiers':
        return <ModifierView modifiers={model.settings.translation.modifiers} actions={actions} />;
      case 'settings':
        return (
          <div className="al-stack">
            <SettingsView settings={model.settings} actions={actions} />
            <CredentialView settings={model.settings} actions={actions} />
          </div>
        );
      case 'export':
        return <ExportView actions={actions} hasProject={model.project !== null} />;
      case 'migration':
        return <MigrationView report={model.migrationReport} actions={actions} />;
    }
  })();
  return (
    <AppShell
      title="AUTOlingua"
      tabs={tabs}
      activeTab={active}
      onTabChange={(value) => setActive(value as FeatureId)}
      toasts={toasts}
      actions={
        <>
          <Button onClick={() => setActive('project')}>開く</Button>
          <Button onClick={() => setInformation('help')}>ヘルプ</Button>
          <Button onClick={() => setInformation('about')}>このアプリについて</Button>
          <Button
            variant="primary"
            disabled={!model.project}
            onClick={() => setActive('workspace')}
          >
            翻訳へ
          </Button>
        </>
      }
    >
      {content}
      <Dialog open={information === 'help'} title="ヘルプ" onClose={() => setInformation(null)}>
        <p>入力タブでファイルを開き、翻訳タブで絞り込みと翻訳を行い、出力タブから保存します。</p>
      </Dialog>
      <Dialog
        open={information === 'about'}
        title="AUTOlinguaについて"
        onClose={() => setInformation(null)}
      >
        <p>AUTOlinguaは構造化されたローカライゼーション翻訳ワークスペースです。</p>
      </Dialog>
    </AppShell>
  );
};
