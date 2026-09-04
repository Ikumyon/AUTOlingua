import { useRef, useState } from 'react';
import { Button, Progress } from '../../foundation';
import type { UiActions } from '../ui-contract';

export const ProjectIoView = ({
  actions,
  progress,
}: {
  readonly actions: UiActions;
  readonly progress: number | null;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);
  const importFile = async (file: File): Promise<void> => {
    controller.current?.abort();
    controller.current = new AbortController();
    await actions.readAndImportFile(file, controller.current.signal);
  };
  return (
    <section className="al-panel al-stack" aria-labelledby="project-input-heading">
      <div>
        <h2 id="project-input-heading">プロジェクト入力</h2>
        <p className="al-muted">
          Localization YML、AUTOlingua進捗JSON、ParaTranz JSONを読み込みます。
        </p>
      </div>
      <div
        className="al-panel"
        data-dragging={dragging}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void importFile(file);
        }}
      >
        <p>ここへファイルをドロップするか、ファイルを選択してください。</p>
        <input
          ref={input}
          hidden
          type="file"
          accept=".yml,.yaml,.txt,.json"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void importFile(file);
          }}
        />
        <div className="al-cluster">
          <Button variant="primary" onClick={() => input.current?.click()}>
            ファイルを選択
          </Button>
          <Button onClick={() => controller.current?.abort()}>読み込みをキャンセル</Button>
        </div>
      </div>
      {progress !== null && <Progress value={progress} label="処理進捗" />}
    </section>
  );
};

export const ExportView = ({
  actions,
  hasProject,
}: {
  readonly actions: UiActions;
  readonly hasProject: boolean;
}) => (
  <section className="al-panel al-stack" aria-labelledby="export-heading">
    <div>
      <h2 id="export-heading">エクスポート</h2>
      <p className="al-muted">翻訳結果、作業状態、外部連携データをダウンロードします。</p>
    </div>
    <div className="al-cluster">
      <Button disabled={!hasProject} onClick={() => void actions.exportProject('yml')}>
        翻訳済みYML
      </Button>
      <Button disabled={!hasProject} onClick={() => void actions.exportProject('progress-json')}>
        進捗JSON
      </Button>
      <Button disabled={!hasProject} onClick={() => void actions.exportProject('paratranz-json')}>
        ParaTranz JSON
      </Button>
      <Button disabled={!hasProject} onClick={() => void actions.exportLogCsv()}>
        翻訳ログCSV
      </Button>
      <Button onClick={() => void actions.exportGlossary()}>用語集JSON</Button>
      <Button disabled={!hasProject} variant="danger" onClick={actions.clearLog}>
        ログを消去
      </Button>
    </div>
  </section>
);
