/**
 * Raw environment from Workers
 */
export interface Env {
    IGNORED_BRANCHES_REGEX: string;
    IGNORED_BRANCHES: string;
    IGNORED_USERS: string;
    IGNORED_PAYLOADS: string;

    GITHUB_WEBHOOK_SECRET: string;
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

    constructor(env: Env) {
        if (typeof env.IGNORED_BRANCHES_REGEX !== 'undefined') {
            this.ignoredBranchPattern = new RegExp(env.IGNORED_BRANCHES_REGEX);
        }
        this.ignoredBranches = env.IGNORED_BRANCHES?.split(",") || [];
        this.ignoredUsers = env.IGNORED_USERS?.split(",") || [];
        this.ignoredPayloads = env.IGNORED_PAYLOADS?.split(",") || [];
        this.githubWebhookSecret = env.GITHUB_WEBHOOK_SECRET;
    }

    /**
     * @param {String} branch
     * @return {boolean}
     */
    isIgnoredBranch(branch: string): boolean {
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
