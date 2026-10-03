import { fetchUrl } from '../../lib/networkUtils.js';

const PUTER_CLOUD_QWEN_MODELS = [
    ['qwen/qwen3.8-max-prime', 'Qwen3.8 Max Prime'],
    ['qwen/qwen3.8-flash', 'Qwen3.8 Flash'],
    ['qwen/qwen3.8-max', 'Qwen3.8 Max'],
    ['qwen/qwen3.8-27b', 'Qwen3.8 27B'],
    ['qwen/qwen3.7-plus', 'Qwen3.7 Plus'],
    ['qwen/qwen3.7-max', 'Qwen3.7 Max'],
    ['qwen/qwen3.6-max-preview', 'Qwen3.6 Max Preview'],
    ['qwen/qwen3.6-plus', 'Qwen3.6 Plus'],
    ['qwen/qwen3.6-flash', 'Qwen3.6 Flash'],
    ['qwen/qwen3.6-27b', 'Qwen3.6 27B'],
    ['qwen/qwen3.6-35b-a3b', 'Qwen3.6 35B A3B'],
    ['qwen/qwen3.5-plus', 'Qwen3.5 Plus'],
    ['qwen/qwen3.5-27b', 'Qwen3.5 27B'],
    ['qwen/qwen3.5-35b-a3b', 'Qwen3.5 35B A3B'],
    ['qwen/qwen3-coder-flash', 'Qwen3 Coder Flash'],
];

const puterCloudQwenModels = () => PUTER_CLOUD_QWEN_MODELS.map(([id, name]) => ({
    id,
    puterId: id,
    name,
    provider: 'puter',
    context: 1000000,
    max_tokens: 128000,
    costs_currency: 'usd-cents',
    costs: { tokens: 1000000, prompt: 0, completion: 0 },
    modalities: { input: ['text'], output: ['text'] },
}));

/**
 * @overload
 * @param {string} [provider]
 * @returns {Promise<Record<string, unknown>[]>}
 */
/**
 * Returns a list of available AI models, optionally filtered by provider.
 * Prefers the public API endpoint and falls back to the legacy driver call.
 *
 * @this {import('./index.js').AIModule}
 * @param {string} [provider]
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function listModels (provider) {
    const { puter } = this;

    const byProvider = (models) =>
        (provider ? models.filter(model => model.provider === provider) : models);

    const tryFetchModels = async () => {
        // `includePuterAuth` attaches the global instance's token.
        const resp = await fetchUrl(`${puter.APIOrigin }/puterai/chat/models/details`, {
            includePuterAuth: !! puter.authToken,
        });
        if ( ! resp.ok ) return null;
        const data = await resp.json();
        const models = Array.isArray(data?.models) ? data.models : [];
        return byProvider([...puterCloudQwenModels(), ...models]);
    };

    const tryDriverModels = async () => {
        const models = /** @type {{ result?: unknown } | undefined} */ (
            await puter.drivers.call('puter-chat-completion', 'ai-chat', 'models')
        );
        const driverModels = Array.isArray(models?.result) ? models.result : [];
        return byProvider([...puterCloudQwenModels(), ...driverModels]);
    };

    try {
        const apiModels = await tryFetchModels();
        if ( apiModels !== null ) return apiModels;
    } catch (e) {
        // Ignore and fall back to the driver call below.
    }
    try {
        return await tryDriverModels();
    } catch (e) {
        return [];
    }
}

/**
 * @overload
 * @returns {Promise<string[]>}
 */
/**
 * Returns the distinct providers of the available models.
 *
 * @this {import('./index.js').AIModule}
 * @returns {Promise<string[]>}
 */
export async function listModelProviders () {
    const models = await listModels.call(this);
    const providers = new Set();
    (models ?? []).forEach(item => {
        if ( item?.provider ) providers.add(item.provider);
    });
    return Array.from(providers);
}
