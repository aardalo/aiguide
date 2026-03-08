'use client';

/**
 * AiProviderForm — configure the AI provider, model, and batch mode for discovery.
 * Location: src/app/settings/components/AiProviderForm.tsx
 */

import { useEffect, useState } from 'react';

type AiProviderId = 'chatgpt' | 'claude';

interface SettingRow {
  key: string;
  value: string;
}

interface ModelOption {
  id: string;
  label: string;
  description: string;
}

const AI_PROVIDERS: { id: AiProviderId; label: string; description: string }[] = [
  { id: 'chatgpt', label: 'ChatGPT', description: 'OpenAI with web search' },
  { id: 'claude', label: 'Claude', description: 'Anthropic with web search' },
];

const OPENAI_MODELS: ModelOption[] = [
  { id: 'gpt-4o', label: 'GPT-4o', description: 'Best quality, higher cost' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Good quality, lower cost' },
  { id: 'gpt-4.1', label: 'GPT-4.1', description: 'Latest flagship model' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Latest, balanced cost' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Latest, lowest cost' },
];

const CLAUDE_MODELS: ModelOption[] = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Best balance of quality and cost' },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', description: 'Highest quality, highest cost' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fast and affordable' },
];

export default function AiProviderForm() {
  const [aiProvider, setAiProvider] = useState<AiProviderId>('chatgpt');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [chatgptModel, setChatgptModel] = useState('gpt-4o');
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-20250514');
  const [claudeBatch, setClaudeBatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const rows: SettingRow[] = await res.json();
        const sm: Record<string, string> = {};
        for (const row of rows) sm[row.key] = row.value;
        setAiProvider((sm['ai.provider'] as AiProviderId) ?? 'chatgpt');
        setChatgptModel(sm['ai.model.chatgpt'] || 'gpt-4o');
        setClaudeModel(sm['ai.model.claude'] || 'claude-sonnet-4-20250514');
        setClaudeBatch(sm['ai.claude_batch'] === 'true');
        setApiKeys(sm);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const save = async (key: string, value: string) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to save');
    }
  };

  const handleProviderChange = async (id: AiProviderId) => {
    setAiProvider(id);
    setSuccessMessage(null);
    setError(null);
    try {
      await save('ai.provider', id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    }
  };

  const handleModelChange = async (provider: AiProviderId, modelId: string) => {
    setSuccessMessage(null);
    setError(null);
    const key = provider === 'chatgpt' ? 'ai.model.chatgpt' : 'ai.model.claude';
    if (provider === 'chatgpt') setChatgptModel(modelId);
    else setClaudeModel(modelId);
    try {
      await save(key, modelId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model');
    }
  };

  const handleBatchToggle = async (enabled: boolean) => {
    setClaudeBatch(enabled);
    setSuccessMessage(null);
    setError(null);
    try {
      await save('ai.claude_batch', enabled ? 'true' : 'false');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save batch setting');
    }
  };

  const handleKeySubmit = async (e: React.FormEvent<HTMLFormElement>, keyField: string, label: string) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setError(null);
    const value = apiKeys[keyField] ?? '';
    try {
      await save(keyField, value);
      setSuccessMessage(`${label} saved.`);
      setApiKeys((prev) => ({ ...prev, [keyField]: '[SET]' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading settings...</p>;
  }

  const currentModels = aiProvider === 'chatgpt' ? OPENAI_MODELS : CLAUDE_MODELS;
  const currentModel = aiProvider === 'chatgpt' ? chatgptModel : claudeModel;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-error-50 p-3 border border-error-200">
          <p className="text-sm text-error-800">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-success-50 p-3 border border-success-200">
          <p className="text-sm text-success-800">{successMessage}</p>
        </div>
      )}

      {/* AI provider selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          AI Provider
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProviderChange(p.id)}
              className={[
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left',
                aiProvider === p.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
              ].join(' ')}
            >
              <div>{p.label}</div>
              <div className="text-xs font-normal text-neutral-500 mt-0.5">{p.description}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Discovered places are tagged with the AI provider that found them.
        </p>
      </div>

      {/* Model selector */}
      <div>
        <label htmlFor="aiModel" className="block text-sm font-medium text-neutral-700 mb-2">
          Model
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {currentModels.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModelChange(aiProvider, m.id)}
              className={[
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left',
                currentModel === m.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span>{m.label}</span>
                <span className="text-xs font-normal text-neutral-500">{m.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Batch mode toggle (Claude only) */}
      {aiProvider === 'claude' && (
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={claudeBatch}
            onClick={() => handleBatchToggle(!claudeBatch)}
            className={[
              'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              claudeBatch ? 'bg-primary-600' : 'bg-neutral-300',
            ].join(' ')}
          >
            <span
              className={[
                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform',
                claudeBatch ? 'translate-x-4' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
          <div>
            <label className="text-sm font-medium text-neutral-700">
              Batch API
            </label>
            <p className="text-xs text-neutral-500">
              50% cost reduction. Requests are queued and may take a few minutes to complete.
            </p>
          </div>
        </div>
      )}

      {/* ChatGPT: OpenAI API key */}
      {aiProvider === 'chatgpt' && (
        <form
          onSubmit={(e) => handleKeySubmit(e, 'openai.api_key', 'OpenAI API Key')}
          className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
        >
          <h3 className="text-sm font-semibold text-neutral-900">ChatGPT — API Key</h3>
          <div>
            <label htmlFor="openaiKey" className="block text-sm font-medium text-neutral-700 mb-1">
              API Key
              {apiKeys['openai.api_key'] === '[SET]' && (
                <span className="ml-2 text-xs text-success-600 font-normal">(configured)</span>
              )}
            </label>
            <input
              id="openaiKey"
              type="password"
              autoComplete="off"
              placeholder={
                apiKeys['openai.api_key'] === '[SET]'
                  ? '--------  (leave blank to keep current)'
                  : 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxx'
              }
              value={apiKeys['openai.api_key'] === '[SET]' ? '' : (apiKeys['openai.api_key'] ?? '')}
              onChange={(e) =>
                setApiKeys((prev) => ({ ...prev, 'openai.api_key': e.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Get a key at{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                platform.openai.com/api-keys
              </a>
              . Set the{' '}
              <code className="bg-neutral-100 px-1 rounded text-neutral-700">OPENAI_API_KEY</code>
              {' '}environment variable to override.
            </p>
          </div>
          <button
            type="submit"
            disabled={
              isSaving ||
              !apiKeys['openai.api_key'] ||
              apiKeys['openai.api_key'] === '[SET]'
            }
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Saving...' : 'Save API Key'}
          </button>
        </form>
      )}

      {/* Claude: Anthropic API key */}
      {aiProvider === 'claude' && (
        <form
          onSubmit={(e) => handleKeySubmit(e, 'anthropic.api_key', 'Anthropic API Key')}
          className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
        >
          <h3 className="text-sm font-semibold text-neutral-900">Claude — API Key</h3>
          <div>
            <label htmlFor="anthropicKey" className="block text-sm font-medium text-neutral-700 mb-1">
              API Key
              {apiKeys['anthropic.api_key'] === '[SET]' && (
                <span className="ml-2 text-xs text-success-600 font-normal">(configured)</span>
              )}
            </label>
            <input
              id="anthropicKey"
              type="password"
              autoComplete="off"
              placeholder={
                apiKeys['anthropic.api_key'] === '[SET]'
                  ? '--------  (leave blank to keep current)'
                  : 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxx'
              }
              value={apiKeys['anthropic.api_key'] === '[SET]' ? '' : (apiKeys['anthropic.api_key'] ?? '')}
              onChange={(e) =>
                setApiKeys((prev) => ({ ...prev, 'anthropic.api_key': e.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Get a key at{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                console.anthropic.com/settings/keys
              </a>
              . Set the{' '}
              <code className="bg-neutral-100 px-1 rounded text-neutral-700">ANTHROPIC_API_KEY</code>
              {' '}environment variable to override.
            </p>
          </div>
          <button
            type="submit"
            disabled={
              isSaving ||
              !apiKeys['anthropic.api_key'] ||
              apiKeys['anthropic.api_key'] === '[SET]'
            }
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Saving...' : 'Save API Key'}
          </button>
        </form>
      )}
    </div>
  );
}
