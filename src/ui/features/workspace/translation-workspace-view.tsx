import { useMemo, useState, type ReactNode } from 'react';
import type { TranslationEntry, TranslationStage } from '../../../domain';
import { translationStages } from '../../../domain';
import {
  Button,
  ConfirmButton,
  DataGrid,
  Select,
  Textarea,
  type DataGridColumn,
} from '../../foundation';
import type { UiActions, UiModel } from '../ui-contract';
import { FilterView } from './filter-view';

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HighlightedText = ({
  text,
  query,
  regularExpression,
  caseSensitive,
}: {
  readonly text: string;
  readonly query: string;
  readonly regularExpression: boolean;
  readonly caseSensitive: boolean;
}) => {
  const parts = useMemo<ReactNode[]>(() => {
    if (!query) return [text];
    try {
      const pattern = regularExpression ? query : escapeRegularExpression(query);
      const expression = new RegExp(`(${pattern})`, caseSensitive ? 'g' : 'gi');
      return text
        .split(expression)
        .map((part, index) =>
          index % 2 === 1 ? <mark key={`${part}-${index}`}>{part}</mark> : part,
        );
    } catch {
      return [text];
    }
  }, [caseSensitive, query, regularExpression, text]);
  return <>{parts}</>;
};

export const TranslationWorkspaceView = ({
  model,
  actions,
}: {
  readonly model: UiModel;
  readonly actions: UiActions;
}) => {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const selectedVisible = model.visibleEntries.filter((entry) => selected.has(entry.id));
  const columns: readonly DataGridColumn<TranslationEntry>[] = [
    {
      id: 'selection',
      label: '選択',
      render: (entry) => (
        <input
          type="checkbox"
          aria-label={`${entry.sourceKey}を選択`}
          checked={selected.has(entry.id)}
          onChange={(event) => {
            const checked = event.currentTarget.checked;
            setSelected((current) => {
              const next = new Set(current);
              if (checked) next.add(entry.id);
              else next.delete(entry.id);
              return next;
            });
          }}
        />
      ),
    },
    {
      id: 'key',
      label: 'キー',
      width: model.settings.appearance.columnWidths.key,
      render: (entry) => <HighlightedText text={entry.sourceKey} {...model.filter} />,
    },
    {
      id: 'source',
      label: '原文',
      width: model.settings.appearance.columnWidths.source,
      render: (entry) => <HighlightedText text={entry.sourceText} {...model.filter} />,
    },
    {
      id: 'translation',
      label: '翻訳',
      width: model.settings.appearance.columnWidths.translation,
      render: (entry) => (
        <div className="al-stack">
          <Textarea
            aria-label={`${entry.sourceKey}の翻訳`}
            defaultValue={entry.translatedText}
            onBlur={(event) => actions.editTranslation(entry.id, event.currentTarget.value)}
          />
          {model.filter.query && entry.translatedText && (
            <span className="al-search-preview" aria-label="翻訳内の検索一致">
              <HighlightedText text={entry.translatedText} {...model.filter} />
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'stage',
      label: 'ステージ',
      render: (entry) => (
        <Select
          aria-label={`${entry.sourceKey}のステージ`}
          value={entry.stage}
          onChange={(event) =>
            actions.setEntryStage(entry.id, event.currentTarget.value as TranslationStage)
          }
        >
          {translationStages.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: 'tone',
      label: 'トーン',
      render: (entry) => (
        <Select
          aria-label={`${entry.sourceKey}のトーン`}
          value={entry.toneId ?? ''}
          onChange={(event) => actions.setEntryTone(entry.id, event.currentTarget.value || null)}
        >
          <option value="">既定</option>
          {model.settings.translation.tones.map((tone) => (
            <option key={tone.id} value={tone.id}>
              {tone.name}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: 'actions',
      label: '操作',
      render: (entry) => (
        <div className="al-cluster">
          <Button
            loading={entry.operation === 'translating'}
            onClick={() => void actions.translateEntry(entry.id)}
          >
            翻訳
          </Button>
          <Button onClick={() => void actions.requestSuggestions(entry.id)}>候補</Button>
          {entry.structureGroup && (
            <ConfirmButton
              title="構造グループへ反映"
              message="同じ構造を持つ項目へこの翻訳を反映します。構造が不足する項目にも適用します。"
              onConfirm={() => actions.editGroup(entry.id, entry.translatedText)}
            >
              グループ反映
            </ConfirmButton>
          )}
          <ConfirmButton
            variant="danger"
            title="項目を削除"
            message={`${entry.sourceKey}をプロジェクトから削除します。`}
            onConfirm={() => actions.deleteEntry(entry.id)}
          >
            削除
          </ConfirmButton>
          {entry.lastError && <span className="al-error">{entry.lastError.message}</span>}
        </div>
      ),
    },
  ];
  return (
    <div className="al-workspace-grid">
      <FilterView value={model.filter} actions={actions} />
      <section className="al-panel al-stack" aria-labelledby="workspace-heading">
        <div className="al-cluster">
          <div>
            <h2 id="workspace-heading">翻訳ワークスペース</h2>
            <p className="al-muted">
              {model.project
                ? `${model.project.source.fileName} — ${model.visibleEntries.length}/${model.project.entries.length}件`
                : 'プロジェクト未読込'}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={!model.project || model.bulkProgress !== null}
            onClick={() => void actions.translateVisible()}
          >
            表示分を翻訳
          </Button>
          <Button
            variant="primary"
            disabled={selectedVisible.length === 0 || model.bulkProgress !== null}
            onClick={() => void actions.translateEntries(selectedVisible.map((entry) => entry.id))}
          >
            選択を翻訳（{selectedVisible.length}）
          </Button>
          <Button disabled={selected.size === 0} onClick={() => setSelected(new Set())}>
            選択解除
          </Button>
          <Button disabled={model.bulkProgress === null} onClick={actions.cancelBulk}>
            一括処理を中止
          </Button>
        </div>
        {model.bulkProgress !== null && (
          <progress value={model.bulkProgress} max={100} aria-label="一括翻訳進捗" />
        )}
        <DataGrid
          rows={model.visibleEntries}
          columns={columns}
          rowKey={(entry) => entry.id}
          emptyMessage="表示する翻訳項目がありません。"
          onColumnWidthChange={actions.setColumnWidth}
        />
        {model.suggestions.length > 0 && (
          <section className="al-panel al-stack" aria-labelledby="suggestions-heading">
            <h3 id="suggestions-heading">翻訳候補</h3>
            {model.suggestions.map((suggestion) => (
              <div
                className="al-panel al-stack"
                key={`${suggestion.entryId}-${suggestion.modelId}`}
              >
                <strong>{suggestion.modelId}</strong>
                <p>{suggestion.text}</p>
                <Button
                  onClick={() => actions.applySuggestion(suggestion.entryId, suggestion.text)}
                >
                  この候補を適用
                </Button>
              </div>
            ))}
          </section>
        )}
      </section>
    </div>
  );
};
