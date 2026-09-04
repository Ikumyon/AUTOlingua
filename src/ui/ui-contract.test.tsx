import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ApplicationSettings } from '../application';
import { makeConfiguration } from '../application/testing/fixtures';
import { AutoLinguaUi } from './auto-lingua-ui';
import { DataGrid, Dialog, IconButton, Progress } from './foundation';
import type { UiActions, UiModel } from './features/ui-contract';

const settings: ApplicationSettings = {
  translation: { ...makeConfiguration(), providerId: '', modelId: '' },
  providers: [
    { id: 'openai', name: 'OpenAI', models: [{ id: 'model', name: 'Model', enabled: true }] },
  ],
  appearance: { theme: 'system', surfaceOpacity: 0.9, blurPx: 8, columnWidths: {} },
  parallelism: 10,
  reviewMode: false,
};

const actions = (): UiActions => ({
  readAndImportFile: vi.fn(async () => undefined),
  exportProject: vi.fn(async () => undefined),
  exportGlossary: vi.fn(async () => undefined),
  exportLogCsv: vi.fn(async () => undefined),
  translateEntry: vi.fn(async () => undefined),
  requestSuggestions: vi.fn(async () => undefined),
  applySuggestion: vi.fn(),
  translateVisible: vi.fn(async () => undefined),
  translateEntries: vi.fn(async () => undefined),
  cancelBulk: vi.fn(),
  editTranslation: vi.fn(),
  editGroup: vi.fn(),
  deleteEntry: vi.fn(),
  setEntryStage: vi.fn(),
  setEntryTone: vi.fn(),
  setFilter: vi.fn(),
  saveSettings: vi.fn(async () => undefined),
  setColumnWidth: vi.fn(),
  saveCredential: vi.fn(async () => undefined),
  unlockCredential: vi.fn(async () => undefined),
  lockCredential: vi.fn(),
  deleteCredential: vi.fn(async () => undefined),
  replaceGlossary: vi.fn(),
  addGlossaryTerm: vi.fn(),
  importGlossaryFile: vi.fn(async () => undefined),
  replaceTones: vi.fn(),
  addTone: vi.fn(),
  replaceModifiers: vi.fn(),
  addModifier: vi.fn(),
  resetModifiers: vi.fn(),
  migrateLegacySettings: vi.fn(async () => undefined),
  exportLegacySettingsRecovery: vi.fn(async () => undefined),
  clearLog: vi.fn(),
});

const model: UiModel = {
  project: null,
  visibleEntries: [],
  settings,
  filter: {
    query: '',
    stage: 'all',
    toneId: '',
    caseSensitive: false,
    regularExpression: false,
    advancedExpression: '',
  },
  bulkProgress: null,
  migrationReport: null,
  suggestions: [],
};

describe('UI foundation contracts', () => {
  it('renders every phase 8 feature boundary without a runtime composition root', () => {
    const html = renderToStaticMarkup(<AutoLinguaUi model={model} actions={actions()} />);
    for (const label of [
      '入力',
      '翻訳',
      '用語集',
      'トーン',
      '修飾子',
      '設定',
      '出力',
      '設定変換',
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('role="tablist"');
    expect(html).toContain('プロジェクト入力');
  });

  it('renders accessible progress, dialog, icon actions, and data grids', () => {
    const html = renderToStaticMarkup(
      <>
        <Progress value={140} label="進捗" />
        <Dialog open title="確認" onClose={() => undefined}>
          本文
        </Dialog>
        <IconButton aria-label="削除">×</IconButton>
        <DataGrid
          rows={[]}
          columns={[{ id: 'name', label: '名前', render: String }]}
          rowKey={String}
          emptyMessage="空"
        />
      </>,
    );
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="削除"');
    expect(html).toContain('<table');
  });

  it('rejects icon-only buttons without an accessible name', () => {
    expect(() => renderToStaticMarkup(<IconButton>×</IconButton>)).toThrow(
      'IconButton requires an accessible name.',
    );
  });
});
