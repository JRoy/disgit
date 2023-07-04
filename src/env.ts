/**
 * Raw environment from Workers
 */
export interface Env {
    IGNORED_BRANCHES_REGEX: string;
    IGNORED_BRANCHES: string;
    IGNORED_USERS: string;

    PASTE_GG_API_KEY: string;
    GITHUB_WEBHOOK_SECRET: string;
}

/**
 * Parsed environment
 */
export class BoundEnv {
    private ignoredBranchPattern?: RegExp;
    private ignoredBranches: string[];
    private ignoredUsers: string[];
    private readonly pasteGgApiKey: string;
    readonly githubWebhookSecret: string;

    constructor(env: Env) {
        if (typeof env.IGNORED_BRANCHES_REGEX !== 'undefined') {
            this.ignoredBranchPattern = new RegExp(env.IGNORED_BRANCHES_REGEX);
        }
        this.ignoredBranches = env.IGNORED_BRANCHES?.split(",") || [];
        this.ignoredUsers = env.IGNORED_USERS?.split(",") || [];
        this.pasteGgApiKey = env.PASTE_GG_API_KEY;
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

        embed = await (await fetch("https://api.paste.gg/v1/pastes", {
            headers: {
                "user-agent": "disgit",
                "content-type": "application/json",
                "Authorization": `Key ${this.pasteGgApiKey}`
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
