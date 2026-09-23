import { Credential, Integration } from "@opencode/plugin";
import { getCachedCredentials, loadPersistedAccountSource, refreshAccountsList, refreshViaOAuth, reloadCredentialsFromSource, saveAccountSource, setActiveAccountSource, } from "./credentials.js";
import { writeBackCredentials, } from "./keychain.js";
import { log } from "./logger.js";
export const INTEGRATION_ID = Integration.ID.make("anthropic");
export const METHOD_ID = Integration.MethodID.make("claude-code");
/** Identifies credentials created by this plugin when OpenCode builds provider options. */
export const CLAUDE_CODE_OAUTH_METADATA_KEY = "opencode-claude-auth/claude-code-oauth";
export const CLAUDE_CODE_OAUTH_METADATA_VALUE = "v1";
/** Form field key the account chooser collects its answer under. */
const ACCOUNT_FIELD_KEY = "account";
/**
 * `/connect` shows this when the user picks the Claude Code method. With more
 * than one account on the machine it carries a chooser: OpenCode renders a
 * `string` field that has `options` as a pick list (no `custom`, so only a
 * listed account can be chosen) and hands the selection back to `authorize`
 * under the field's key. Each option is described by its credential source,
 * which is what tells two accounts on the same subscription tier apart.
 */
export function oauthMethodDescriptor(accounts) {
    const method = {
        id: METHOD_ID,
        type: "oauth",
        label: "Import Claude Code subscription",
    };
    if (accounts.length <= 1)
        return method;
    return {
        ...method,
        form: [
            {
                type: "string",
                key: ACCOUNT_FIELD_KEY,
                title: "Select a Claude Code account",
                required: true,
                options: accounts.map((account) => ({
                    value: account.source,
                    label: account.label,
                    description: account.source,
                })),
            },
        ],
    };
}
export function resolveAuthorizeSource(inputs, fallbackAccounts, deps) {
    const latest = deps.refreshAccountsList();
    const chosen = inputs[ACCOUNT_FIELD_KEY];
    return ((typeof chosen === "string" ? chosen : undefined) ??
        deps.loadPersistedAccountSource() ??
        latest[0]?.source ??
        fallbackAccounts[0]?.source);
}
export async function buildOAuthCredential(source, deps) {
    const accounts = deps.refreshAccountsList();
    const account = accounts.find((item) => item.source === source) ?? accounts[0];
    if (!account)
        throw new Error("No Claude Code credentials found. Run `claude` to authenticate first.");
    deps.setActiveAccountSource(account.source);
    deps.saveAccountSource(account.source);
    const value = (await deps.getCachedCredentials()) ?? account.credentials;
    return Credential.OAuth.make({
        type: "oauth",
        methodID: METHOD_ID,
        access: value.accessToken,
        refresh: value.refreshToken,
        expires: value.expiresAt,
        metadata: {
            [CLAUDE_CODE_OAUTH_METADATA_KEY]: CLAUDE_CODE_OAUTH_METADATA_VALUE,
            source: account.source,
            label: account.label,
            ...(account.configDir ? { configDir: account.configDir } : {}),
            ...(value.subscriptionType
                ? { subscriptionType: value.subscriptionType }
                : {}),
        },
    });
}
export async function authorizeOAuth(inputs, fallbackAccounts, deps) {
    const source = resolveAuthorizeSource(inputs, fallbackAccounts, deps);
    if (!source)
        throw new Error("No Claude Code credentials found. Run `claude` to authenticate first.");
    return buildOAuthCredential(source, deps);
}
export async function refreshOAuthCredential(value, deps) {
    const source = typeof value.metadata?.source === "string"
        ? value.metadata.source
        : undefined;
    const configDir = typeof value.metadata?.configDir === "string"
        ? value.metadata.configDir
        : undefined;
    // OpenCode persists whatever this returns and replays that same value on
    // every future refresh, forever, until we return something different. If
    // `claude` has since rotated credentials independently of this connection
    // (a fresh interactive login, its own periodic refresh, ...), the stored
    // refresh token goes permanently stale and every refresh fails with
    // invalid_grant even though a working credential is sitting in the
    // keychain right now. The keychain is the real source of truth, so check
    // it before ever attempting a network refresh with a token that may
    // already be dead.
    if (source)
        deps.setActiveAccountSource(source);
    const fresh = deps.reloadCredentialsFromSource();
    if (fresh && fresh.refreshToken !== value.refresh) {
        deps.log("refresh_resynced_from_keychain", { source });
        return Credential.OAuth.make({
            ...value,
            methodID: METHOD_ID,
            access: fresh.accessToken,
            refresh: fresh.refreshToken,
            expires: fresh.expiresAt,
        });
    }
    const refreshed = await deps.refreshViaOAuth(value.refresh);
    if (!refreshed)
        throw new Error("Claude OAuth refresh failed. Run `claude` to re-authenticate.");
    if (source)
        deps.writeBackCredentials(source, refreshed, configDir, value.access);
    return Credential.OAuth.make({
        ...value,
        methodID: METHOD_ID,
        access: refreshed.accessToken,
        refresh: refreshed.refreshToken,
        expires: refreshed.expiresAt,
    });
}
export function labelOAuthCredential(value) {
    return typeof value.metadata?.label === "string"
        ? value.metadata.label
        : undefined;
}
/** The real, non-test wiring - shared by both the Effect and Promise plugin entrypoints. */
export const realOAuthDeps = {
    refreshAccountsList,
    loadPersistedAccountSource,
    getCachedCredentials,
    setActiveAccountSource,
    saveAccountSource,
    reloadCredentialsFromSource,
    refreshViaOAuth,
    writeBackCredentials,
    log,
};
//# sourceMappingURL=oauth-method.js.map