import { fetchUrl } from '../../lib/networkUtils.js';

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
const selectFeaturedModels = (models) => {
    const unique = [];
    const seen = new Set();

    for (const model of models ?? []) {
        const id = model?.id ?? model?.puterId;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        unique.push(model);
    }

    // Use Puter's live catalog as the source of truth. Qwen models first.
    unique.sort((a, b) => {
        const aq = /qwen/i.test(`${a?.id ?? ''} ${a?.name ?? ''}`) ? 0 : 1;
        const bq = /qwen/i.test(`${b?.id ?? ''} ${b?.name ?? ''}`) ? 0 : 1;
        return aq - bq;
    });

    return unique.slice(0, 20);
};

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
        return selectFeaturedModels(byProvider(models));
    };

    const tryDriverModels = async () => {
        const models = /** @type {{ result?: unknown } | undefined} */ (
            await puter.drivers.call('puter-chat-completion', 'ai-chat', 'models')
        );
        const driverModels = Array.isArray(models?.result) ? models.result : [];
        return selectFeaturedModels(byProvider(driverModels));
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
