import { useState } from 'react';
import type { GlossaryTerm, ModifierKind, ModifierRule, Tone } from '../../../domain';
import {
  Button,
  ConfirmButton,
  DataGrid,
  Field,
  Input,
  Select,
  Textarea,
  type DataGridColumn,
} from '../../foundation';
import type { UiActions } from '../ui-contract';

export const GlossaryView = ({
  terms,
  actions,
}: {
  readonly terms: readonly GlossaryTerm[];
  readonly actions: UiActions;
}) => {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [query, setQuery] = useState('');
  const visible = terms.filter((term) =>
    `${term.sourceTerm} ${term.targetTerm} ${term.alternatives.join(' ')}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const columns: readonly DataGridColumn<GlossaryTerm>[] = [
    {
      id: 'source',
      label: '原語',
      render: (term) => (
        <Input
          aria-label="原語を編集"
          defaultValue={term.sourceTerm}
          onBlur={(event) =>
            actions.replaceGlossary(
              terms.map((candidate) =>
                candidate.id === term.id
                  ? { ...candidate, sourceTerm: event.currentTarget.value }
                  : candidate,
              ),
            )
          }
        />
      ),
    },
    { id: 'alternatives', label: '表記揺れ', render: (term) => term.alternatives.join(', ') },
    {
      id: 'target',
      label: '訳語',
      render: (term) => (
        <Input
          aria-label="訳語を編集"
          defaultValue={term.targetTerm}
          onBlur={(event) =>
            actions.replaceGlossary(
              terms.map((candidate) =>
                candidate.id === term.id
                  ? { ...candidate, targetTerm: event.currentTarget.value }
                  : candidate,
              ),
            )
          }
        />
      ),
    },
    { id: 'note', label: '注記', render: (term) => term.note },
    {
      id: 'actions',
      label: '操作',
      render: (term) => (
        <Button
          variant="danger"
          onClick={() =>
            actions.replaceGlossary(terms.filter((candidate) => candidate.id !== term.id))
          }
        >
          削除
        </Button>
      ),
    },
  ];
  const add = (): void => {
    if (!source.trim() || !target.trim()) return;
    actions.addGlossaryTerm({
      sourceTerm: source.trim(),
      alternatives: [],
      targetTerm: target.trim(),
      partOfSpeech: null,
      note: null,
    });
    setSource('');
    setTarget('');
  };
  return (
    <section className="al-panel al-stack" aria-labelledby="glossary-heading">
      <h2 id="glossary-heading">用語集</h2>
      <div className="al-cluster">
        <Field label="原語" htmlFor="new-source-term">
          <Input
            id="new-source-term"
            value={source}
            onChange={(event) => setSource(event.currentTarget.value)}
          />
        </Field>
        <Field label="訳語" htmlFor="new-target-term">
          <Input
            id="new-target-term"
            value={target}
            onChange={(event) => setTarget(event.currentTarget.value)}
          />
        </Field>
        <Button variant="primary" onClick={add}>
          追加
        </Button>
      </div>
      <Field label="用語を検索" htmlFor="glossary-search">
        <Input
          id="glossary-search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </Field>
      <label className="al-button" data-variant="secondary">
        用語集JSONを読み込む
        <input
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            void actions.importGlossaryFile(file, new AbortController().signal);
          }}
        />
      </label>
      <ConfirmButton
        variant="danger"
        disabled={terms.length === 0}
        title="用語集を空にする"
        message="登録されている用語をすべて削除します。"
        onConfirm={() => actions.replaceGlossary([])}
      >
        用語集をすべて削除
      </ConfirmButton>
      <DataGrid
        rows={visible}
        columns={columns}
        rowKey={(term) => term.id}
        emptyMessage="用語がありません。"
      />
    </section>
  );
};

export const ToneView = ({
  tones,
  actions,
}: {
  readonly tones: readonly Tone[];
  readonly actions: UiActions;
}) => {
  const [name, setName] = useState('');
  const [instruction, setInstruction] = useState('');
  const [kind, setKind] = useState<'standard' | 'conditional'>('standard');
  const [conditionPattern, setConditionPattern] = useState('');
  const [conditionInstruction, setConditionInstruction] = useState('');
  const columns: readonly DataGridColumn<Tone>[] = [
    {
      id: 'name',
      label: '名前',
      render: (tone) => (
        <Input
          aria-label={`${tone.name}の名前`}
          defaultValue={tone.name}
          onBlur={(event) =>
            actions.replaceTones(
              tones.map((candidate) =>
                candidate.id === tone.id
                  ? { ...candidate, name: event.currentTarget.value }
                  : candidate,
              ),
            )
          }
        />
      ),
    },
    {
      id: 'kind',
      label: '種類',
      render: (tone) => (tone.kind === 'standard' ? '標準' : '条件付き'),
    },
    {
      id: 'instruction',
      label: '指示',
      render: (tone) =>
        tone.kind === 'standard' ? (
          <Textarea
            aria-label={`${tone.name}の指示`}
            defaultValue={tone.instruction}
            onBlur={(event) =>
              actions.replaceTones(
                tones.map((candidate) =>
                  candidate.id === tone.id && candidate.kind === 'standard'
                    ? { ...candidate, instruction: event.currentTarget.value }
                    : candidate,
                ),
              )
            }
          />
        ) : (
          <div className="al-stack">
            <Textarea
              aria-label={`${tone.name}のfallback指示`}
              defaultValue={tone.fallbackInstruction}
              onBlur={(event) =>
                actions.replaceTones(
                  tones.map((candidate) =>
                    candidate.id === tone.id && candidate.kind === 'conditional'
                      ? { ...candidate, fallbackInstruction: event.currentTarget.value }
                      : candidate,
                  ),
                )
              }
            />
            {tone.conditions.map((condition, index) => (
              <div className="al-stack" key={`${condition.pattern}-${index}`}>
                <Select
                  aria-label={`${tone.name}の条件${index + 1}の対象`}
                  value={condition.target}
                  onChange={(event) =>
                    actions.replaceTones(
                      tones.map((candidate) =>
                        candidate.id === tone.id && candidate.kind === 'conditional'
                          ? {
                              ...candidate,
                              conditions: candidate.conditions.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      target: event.currentTarget.value as typeof item.target,
                                    }
                                  : item,
                              ),
                            }
                          : candidate,
                      ),
                    )
                  }
                >
                  <option value="key">キー</option>
                  <option value="source">原文</option>
                  <option value="file-name">ファイル名</option>
                </Select>
                <Input
                  aria-label={`${tone.name}の条件${index + 1}の正規表現`}
                  defaultValue={condition.pattern}
                  onBlur={(event) =>
                    actions.replaceTones(
                      tones.map((candidate) =>
                        candidate.id === tone.id && candidate.kind === 'conditional'
                          ? {
                              ...candidate,
                              conditions: candidate.conditions.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, pattern: event.currentTarget.value }
                                  : item,
                              ),
                            }
                          : candidate,
                      ),
                    )
                  }
                />
                <Textarea
                  aria-label={`${tone.name}の条件${index + 1}の指示`}
                  defaultValue={condition.instruction}
                  onBlur={(event) =>
                    actions.replaceTones(
                      tones.map((candidate) =>
                        candidate.id === tone.id && candidate.kind === 'conditional'
                          ? {
                              ...candidate,
                              conditions: candidate.conditions.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, instruction: event.currentTarget.value }
                                  : item,
                              ),
                            }
                          : candidate,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ),
    },
    {
      id: 'actions',
      label: '操作',
      render: (tone) => (
        <Button
          variant="danger"
          onClick={() =>
            actions.replaceTones(tones.filter((candidate) => candidate.id !== tone.id))
          }
        >
          削除
        </Button>
      ),
    },
  ];
  const add = (): void => {
    if (!name.trim() || !instruction.trim()) return;
    if (kind === 'standard') {
      actions.addTone({
        kind: 'standard',
        name: name.trim(),
        instruction: instruction.trim(),
      });
    } else {
      actions.addTone({
        kind: 'conditional',
        name: name.trim(),
        conditions: conditionPattern.trim()
          ? [
              {
                target: 'key',
                pattern: conditionPattern,
                instruction: conditionInstruction,
              },
            ]
          : [],
        fallbackInstruction: instruction.trim(),
      });
    }
    setName('');
    setInstruction('');
  };
  return (
    <section className="al-panel al-stack" aria-labelledby="tone-heading">
      <h2 id="tone-heading">トーン</h2>
      <Field label="名前" htmlFor="tone-name">
        <Input
          id="tone-name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
      </Field>
      <Field label="翻訳指示" htmlFor="tone-instruction">
        <Textarea
          id="tone-instruction"
          value={instruction}
          onChange={(event) => setInstruction(event.currentTarget.value)}
        />
      </Field>
      <Field label="種類" htmlFor="tone-kind">
        <Select
          id="tone-kind"
          value={kind}
          onChange={(event) => setKind(event.currentTarget.value as 'standard' | 'conditional')}
        >
          <option value="standard">標準</option>
          <option value="conditional">条件付き</option>
        </Select>
      </Field>
      {kind === 'conditional' && (
        <>
          <Field label="キー条件（正規表現）" htmlFor="tone-condition">
            <Input
              id="tone-condition"
              value={conditionPattern}
              onChange={(event) => setConditionPattern(event.currentTarget.value)}
            />
          </Field>
          <Field label="条件一致時の指示" htmlFor="tone-condition-instruction">
            <Textarea
              id="tone-condition-instruction"
              value={conditionInstruction}
              onChange={(event) => setConditionInstruction(event.currentTarget.value)}
            />
          </Field>
        </>
      )}
      <Button variant="primary" onClick={add}>
        トーンを追加
      </Button>
      <DataGrid
        rows={tones}
        columns={columns}
        rowKey={(tone) => tone.id}
        emptyMessage="トーンがありません。"
      />
    </section>
  );
};

export const ModifierView = ({
  modifiers,
  actions,
}: {
  readonly modifiers: readonly ModifierRule[];
  readonly actions: UiActions;
}) => {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [kind, setKind] = useState<ModifierKind>('variable');
  const columns: readonly DataGridColumn<ModifierRule>[] = [
    {
      id: 'enabled',
      label: '有効',
      render: (modifier) => (
        <input
          aria-label={`${modifier.name}を有効化`}
          type="checkbox"
          checked={modifier.enabled}
          onChange={(event) =>
            actions.replaceModifiers(
              modifiers.map((candidate) =>
                candidate.id === modifier.id
                  ? { ...candidate, enabled: event.currentTarget.checked }
                  : candidate,
              ),
            )
          }
        />
      ),
    },
    {
      id: 'name',
      label: '名前',
      render: (modifier) => (
        <Input
          aria-label="修飾子名を編集"
          defaultValue={modifier.name}
          onBlur={(event) =>
            actions.replaceModifiers(
              modifiers.map((candidate) =>
                candidate.id === modifier.id
                  ? { ...candidate, name: event.currentTarget.value }
                  : candidate,
              ),
            )
          }
        />
      ),
    },
    {
      id: 'pattern',
      label: '正規表現',
      render: (modifier) => (
        <Input
          aria-label="修飾子の正規表現を編集"
          defaultValue={modifier.pattern}
          onBlur={(event) =>
            actions.replaceModifiers(
              modifiers.map((candidate) =>
                candidate.id === modifier.id
                  ? { ...candidate, pattern: event.currentTarget.value }
                  : candidate,
              ),
            )
          }
        />
      ),
    },
    { id: 'kind', label: '種類', render: (modifier) => modifier.kind },
    {
      id: 'actions',
      label: '操作',
      render: (modifier) => (
        <Button
          variant="danger"
          onClick={() =>
            actions.replaceModifiers(modifiers.filter((candidate) => candidate.id !== modifier.id))
          }
        >
          削除
        </Button>
      ),
    },
  ];
  const add = (): void => {
    if (!name.trim() || !pattern.trim()) return;
    actions.addModifier({
      name: name.trim(),
      pattern,
      enabled: true,
      kind,
      category: 'custom',
    });
    setName('');
    setPattern('');
  };
  return (
    <section className="al-panel al-stack" aria-labelledby="modifier-heading">
      <h2 id="modifier-heading">マスキング修飾子</h2>
      <Field label="名前" htmlFor="modifier-name">
        <Input
          id="modifier-name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
      </Field>
      <Field label="正規表現" htmlFor="modifier-pattern">
        <Input
          id="modifier-pattern"
          value={pattern}
          onChange={(event) => setPattern(event.currentTarget.value)}
        />
      </Field>
      <Field label="種類" htmlFor="modifier-kind">
        <Select
          id="modifier-kind"
          value={kind}
          onChange={(event) => setKind(event.currentTarget.value as ModifierKind)}
        >
          <option value="variable">変数</option>
          <option value="decoration">装飾</option>
        </Select>
      </Field>
      <Button variant="primary" onClick={add}>
        修飾子を追加
      </Button>
      <div className="al-cluster">
        <Button
          onClick={() =>
            actions.replaceModifiers(modifiers.map((modifier) => ({ ...modifier, enabled: true })))
          }
        >
          すべて有効化
        </Button>
        <Button onClick={actions.resetModifiers}>既定値へリセット</Button>
      </div>
      <DataGrid
        rows={modifiers}
        columns={columns}
        rowKey={(modifier) => modifier.id}
        emptyMessage="修飾子がありません。"
      />
    </section>
  );
};
