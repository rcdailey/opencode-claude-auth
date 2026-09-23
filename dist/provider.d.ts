type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export { fetchWithRetry } from "./http.ts";
export declare function buildRequestHeaders(input: RequestInfo | URL, init: RequestInit, accessToken: string, modelID?: string, excludedBetas?: Set<string>): Headers;
/**
 * `source` names the account the credential behind `accessToken` was imported
 * from, as carried in its metadata. Freshness lookups and 401/429 recovery are
 * scoped to that account, so a request is never re-signed with the token of
 * whichever account happens to be process-wide active. Omit it and the active
 * account is used, which is the single-account case.
 */
export declare function claudeSubscriptionFetch(accessToken: string, upstream?: Fetch, source?: string): Fetch;
export declare function createClaudeSubscription(options: Record<string, unknown>): import("@ai-sdk/anthropic").AnthropicProvider;
//# sourceMappingURL=provider.d.ts.map