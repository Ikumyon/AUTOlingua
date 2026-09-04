import type { MigrationReport } from '../../../application';
import { Button } from '../../foundation';
import type { UiActions } from '../ui-contract';

export const MigrationView = ({
  report,
  actions,
}: {
  readonly report: MigrationReport | null;
  readonly actions: UiActions;
}) => (
  <section className="al-panel al-stack" aria-labelledby="migration-heading">
    <div>
      <h2 id="migration-heading">旧ブラウザ設定の変換</h2>
      <p className="al-muted">
        旧設定を読み取り、新形式へ原子的に変換します。旧データは自動削除しません。
      </p>
    </div>
    <Button variant="primary" onClick={() => void actions.migrateLegacySettings()}>
      旧設定を検出して変換
    </Button>
    <Button onClick={() => void actions.exportLegacySettingsRecovery()}>
      旧設定を復旧用JSONとして保存
    </Button>
    {report && (
      <div role="status">
        <strong>結果: {report.status}</strong>
        <p>資格情報: {report.migratedCredentialProviders.length}件</p>
        {report.warningCodes.length > 0 && (
          <ul>
            {report.warningCodes.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>
    )}
  </section>
);
