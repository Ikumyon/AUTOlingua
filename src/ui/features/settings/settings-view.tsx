import { useEffect, useState } from 'react';
import type { ApplicationSettings, ThemeMode } from '../../../application';
import { Button, Checkbox, ConfirmButton, Field, Input, Select } from '../../foundation';
import type { UiActions } from '../ui-contract';

export const SettingsView = ({
  settings,
  actions,
}: {
  readonly settings: ApplicationSettings;
  readonly actions: UiActions;
}) => {
  const [draft, setDraft] = useState(settings);
  const [newProviderId, setNewProviderId] = useState('');
  const [newModelId, setNewModelId] = useState('');
  useEffect(() => setDraft(settings), [settings]);
  const selectedProvider = draft.providers.find(
    (provider) => provider.id === draft.translation.providerId,
  );
  return (
    <section className="al-panel al-stack" aria-labelledby="settings-heading">
      <h2 id="settings-heading">設定</h2>
      <Field label="プロバイダー" htmlFor="provider">
        <Select
          id="provider"
          value={draft.translation.providerId}
          onChange={(event) =>
            setDraft({
              ...draft,
              translation: {
                ...draft.translation,
                providerId: event.currentTarget.value,
                modelId: '',
              },
            })
          }
        >
          <option value="">未選択</option>
          {draft.providers.map((provider) => (
            <option value={provider.id} key={provider.id}>
              {provider.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="モデル" htmlFor="model">
        <Select
          id="model"
          value={draft.translation.modelId}
          onChange={(event) =>
            setDraft({
              ...draft,
              translation: { ...draft.translation, modelId: event.currentTarget.value },
            })
          }
        >
          <option value="">未選択</option>
          {selectedProvider?.models
            .filter((model) => model.enabled)
            .map((model) => (
              <option value={model.id} key={model.id}>
                {model.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="既定トーン" htmlFor="default-tone">
        <Select
          id="default-tone"
          value={draft.translation.defaultToneId ?? ''}
          onChange={(event) =>
            setDraft({
              ...draft,
              translation: {
                ...draft.translation,
                defaultToneId:
                  (event.currentTarget
                    .value as ApplicationSettings['translation']['defaultToneId']) || null,
              },
            })
          }
        >
          <option value="">指定なし</option>
          {draft.translation.tones.map((tone) => (
            <option value={tone.id} key={tone.id}>
              {tone.name}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="al-panel al-stack">
        <legend>プロバイダーとモデル</legend>
        <Field label="新しいプロバイダーID" htmlFor="new-provider">
          <Input
            id="new-provider"
            value={newProviderId}
            onChange={(event) => setNewProviderId(event.currentTarget.value)}
          />
        </Field>
        <Button
          onClick={() => {
            const value = newProviderId.trim();
            if (!value || draft.providers.some((provider) => provider.id === value)) return;
            const providers = [...draft.providers, { id: value, name: value, models: [] }];
            setDraft({ ...draft, providers });
            setNewProviderId('');
          }}
        >
          プロバイダーを追加
        </Button>
        {selectedProvider && (
          <>
            <Field label="新しいモデルID" htmlFor="new-model">
              <Input
                id="new-model"
                value={newModelId}
                onChange={(event) => setNewModelId(event.currentTarget.value)}
              />
            </Field>
            <Button
              onClick={() => {
                const value = newModelId.trim();
                if (!value || selectedProvider.models.some((model) => model.id === value)) return;
                const providers = draft.providers.map((provider) =>
                  provider.id === selectedProvider.id
                    ? {
                        ...provider,
                        models: [...provider.models, { id: value, name: value, enabled: true }],
                      }
                    : provider,
                );
                setDraft({ ...draft, providers });
                setNewModelId('');
              }}
            >
              モデルを追加
            </Button>
            <ul>
              {selectedProvider.models.map((model) => (
                <li className="al-cluster" key={model.id}>
                  <input
                    type="checkbox"
                    aria-label={`${model.name}を有効化`}
                    checked={model.enabled}
                    onChange={(event) => {
                      const enabled = event.currentTarget.checked;
                      const providers = draft.providers.map((provider) =>
                        provider.id === selectedProvider.id
                          ? {
                              ...provider,
                              models: provider.models.map((candidate) =>
                                candidate.id === model.id ? { ...candidate, enabled } : candidate,
                              ),
                            }
                          : provider,
                      );
                      setDraft({ ...draft, providers });
                    }}
                  />
                  <span>{model.name}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </fieldset>
      <Field label="並列数" htmlFor="parallelism">
        <Input
          id="parallelism"
          type="number"
          min={1}
          max={50}
          value={draft.parallelism}
          onChange={(event) =>
            setDraft({ ...draft, parallelism: Number(event.currentTarget.value) })
          }
        />
      </Field>
      <Checkbox
        checked={draft.reviewMode}
        onChange={(event) => setDraft({ ...draft, reviewMode: event.currentTarget.checked })}
      >
        レビューモード
      </Checkbox>
      <Field label="テーマ" htmlFor="theme">
        <Select
          id="theme"
          value={draft.appearance.theme}
          onChange={(event) =>
            setDraft({
              ...draft,
              appearance: { ...draft.appearance, theme: event.currentTarget.value as ThemeMode },
            })
          }
        >
          <option value="system">システム</option>
          <option value="light">ライト</option>
          <option value="dark">ダーク</option>
        </Select>
      </Field>
      <Field label="面の不透明度" htmlFor="opacity">
        <Input
          id="opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={draft.appearance.surfaceOpacity}
          onChange={(event) =>
            setDraft({
              ...draft,
              appearance: {
                ...draft.appearance,
                surfaceOpacity: Number(event.currentTarget.value),
              },
            })
          }
        />
      </Field>
      <Field label="ぼかし" htmlFor="blur">
        <Input
          id="blur"
          type="range"
          min={0}
          max={40}
          value={draft.appearance.blurPx}
          onChange={(event) =>
            setDraft({
              ...draft,
              appearance: { ...draft.appearance, blurPx: Number(event.currentTarget.value) },
            })
          }
        />
      </Field>
      <Button variant="primary" onClick={() => void actions.saveSettings(draft)}>
        設定を保存
      </Button>
    </section>
  );
};

export const CredentialView = ({
  settings,
  actions,
}: {
  readonly settings: ApplicationSettings;
  readonly actions: UiActions;
}) => {
  const [providerId, setProviderId] = useState(settings.providers[0]?.id ?? '');
  const [secret, setSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  return (
    <section className="al-panel al-stack" aria-labelledby="credential-heading">
      <h2 id="credential-heading">API資格情報</h2>
      <p className="al-muted">APIキーは一般設定と分離して暗号化保存されます。</p>
      <Field label="プロバイダー" htmlFor="credential-provider">
        <Select
          id="credential-provider"
          value={providerId}
          onChange={(event) => setProviderId(event.currentTarget.value)}
        >
          {settings.providers.map((provider) => (
            <option value={provider.id} key={provider.id}>
              {provider.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="APIキー" htmlFor="api-key">
        <Input
          id="api-key"
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(event) => setSecret(event.currentTarget.value)}
        />
      </Field>
      <Field label="パスフレーズ" htmlFor="passphrase">
        <Input
          id="passphrase"
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.currentTarget.value)}
        />
      </Field>
      <div className="al-cluster">
        <Button
          variant="primary"
          disabled={!providerId || !secret || !passphrase}
          onClick={() => void actions.saveCredential(providerId, secret, passphrase)}
        >
          暗号化して保存
        </Button>
        <Button
          disabled={!providerId || !passphrase}
          onClick={() => void actions.unlockCredential(providerId, passphrase)}
        >
          解除
        </Button>
        <Button disabled={!providerId} onClick={() => actions.lockCredential(providerId)}>
          ロック
        </Button>
        <ConfirmButton
          variant="danger"
          disabled={!providerId}
          title="API資格情報を削除"
          message="保存したAPI資格情報を削除します。"
          onConfirm={() => void actions.deleteCredential(providerId)}
        >
          削除
        </ConfirmButton>
      </div>
    </section>
  );
};
