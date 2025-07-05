/**
 * Raw environment from Workers
 */
export interface Env {
    IGNORED_BRANCHES_REGEX: string;
    IGNORED_BRANCHES: string;
    IGNORED_USERS: string;
    IGNORED_PAYLOADS: string;

    GITHUB_WEBHOOK_SECRET: string;

    DEBUG_PASTE: string;
    AWAIT_ERRORS: string;
    EXECUTE_MERGE_QUEUE_BRANCHES: string;
}

/**
 * Parsed environment
 */
export class BoundEnv {
    private ignoredBranchPattern?: RegExp;
    private ignoredBranches: string[];
    private ignoredUsers: string[];
    private ignoredPayloads: string[];
    readonly githubWebhookSecret: string;
    readonly debugPaste: boolean;
    readonly awaitErrors: boolean;
    readonly executeMergeQueueBranches: boolean;

    constructor(env: Env) {
        if (typeof env.IGNORED_BRANCHES_REGEX !== 'undefined') {
            this.ignoredBranchPattern = new RegExp(env.IGNORED_BRANCHES_REGEX);
        }
        this.ignoredBranches = env.IGNORED_BRANCHES?.split(",") || [];
        this.ignoredUsers = env.IGNORED_USERS?.split(",") || [];
        this.ignoredPayloads = env.IGNORED_PAYLOADS?.split(",") || [];
        this.githubWebhookSecret = env.GITHUB_WEBHOOK_SECRET;
        this.debugPaste = env.DEBUG_PASTE == "true" || env.DEBUG_PASTE == "1";
        this.awaitErrors = env.AWAIT_ERRORS == "true" || env.AWAIT_ERRORS == "1";
        this.executeMergeQueueBranches = env.EXECUTE_MERGE_QUEUE_BRANCHES == "true" || env.EXECUTE_MERGE_QUEUE_BRANCHES == "1";
    }

    /**
     * @param {String} branch
     * @return {boolean}
     */
    isIgnoredBranch(branch: string): boolean {
        if (!this.executeMergeQueueBranches && branch.startsWith('gh-readonly-queue/')) {
            return true;
        }

        return (this.ignoredBranchPattern && branch.match(this.ignoredBranchPattern) != null) || this.ignoredBranches.includes(branch);
    }

    /**
     * @param {String} user
     * @return {boolean}
     */
    isIgnoredUser(user: string): boolean {
        return this.ignoredUsers.includes(user);
    }

    /**
     * @param {String} payload
     * @return {boolean}
     */
    isIgnoredPayload(payload: string): boolean {
        return this.ignoredPayloads.includes(payload);
    }

    async buildDebugPaste(embed: any): Promise<string> {
        embed = JSON.stringify({
            "files": [
                {
                    "content": {
                        "format": "text",
                        "value": embed
                    }
                }
            ]
        });

        embed = await (await fetch("https://api.pastes.dev/post", {
            headers: {
                "user-agent": "disgit",
                "content-type": "application/json",
            },
            method: "POST",
            body: embed
        })).text();

        embed = JSON.stringify({
            "content": embed
        });
        return embed;
    }
}
