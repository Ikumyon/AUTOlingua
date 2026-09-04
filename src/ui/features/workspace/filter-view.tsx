import { Checkbox, Field, Input, Select, Textarea } from '../../foundation';
import { translationStages } from '../../../domain';
import type { UiActions, WorkspaceFilterDraft } from '../ui-contract';

export const FilterView = ({
  value,
  actions,
}: {
  readonly value: WorkspaceFilterDraft;
  readonly actions: UiActions;
}) => {
  const patch = (next: Partial<WorkspaceFilterDraft>): void =>
    actions.setFilter({ ...value, ...next });
  return (
    <aside className="al-panel al-stack" aria-labelledby="filter-heading">
      <h2 id="filter-heading">絞り込み</h2>
      <Field label="検索" htmlFor="filter-query">
        <Input
          id="filter-query"
          value={value.query}
          onChange={(event) => patch({ query: event.currentTarget.value })}
        />
      </Field>
      <Field label="ステージ" htmlFor="filter-stage">
        <Select
          id="filter-stage"
          value={value.stage}
          onChange={(event) =>
            patch({ stage: event.currentTarget.value as WorkspaceFilterDraft['stage'] })
          }
        >
          <option value="all">すべて</option>
          {translationStages.map((stage) => (
            <option value={stage} key={stage}>
              {stage}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="トーンID" htmlFor="filter-tone">
        <Input
          id="filter-tone"
          value={value.toneId}
          onChange={(event) => patch({ toneId: event.currentTarget.value })}
        />
      </Field>
      <Checkbox
        checked={value.caseSensitive}
        onChange={(event) => patch({ caseSensitive: event.currentTarget.checked })}
      >
        大文字小文字を区別
      </Checkbox>
      <Checkbox
        checked={value.regularExpression}
        onChange={(event) => patch({ regularExpression: event.currentTarget.checked })}
      >
        正規表現
      </Checkbox>
      <Field label="高度な式" htmlFor="advanced-filter" help="AND、OR、NOTを使用できます。">
        <Textarea
          id="advanced-filter"
          value={value.advancedExpression}
          onChange={(event) => patch({ advancedExpression: event.currentTarget.value })}
        />
      </Field>
    </aside>
  );
};
