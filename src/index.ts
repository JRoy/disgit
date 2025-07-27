import {BoundEnv, Env} from './env';
import {Sender, shortCommit, truncate} from './util';

// Handles event sent by cloudflare
async function handleRequest(request: Request, env: BoundEnv): Promise<Response> {
    const event = request.headers.get("X-GitHub-Event");
    const contentType = request.headers.get("content-type");
    if (event != null && contentType != null) {
        /*if (!(await validateRequest(request, env.githubWebhookSecret))) {
            return new Response('Invalid secret', { status: 403 });
        }*/
        let json: any;
        if (contentType.includes("application/json")) {
            json = await request.json();
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
            json = JSON.parse((await request.formData()).get("payload") as string);
        } else {
            return new Response(`Unknown content type ${contentType}`, { status: 400 });
        }

        let embed = buildEmbed(json, event, env);
        if (embed == null) {
            return new Response('Webhook NO-OP', {status: 200})
        }

        if (env.debugPaste) {
            embed = await env.buildDebugPaste(embed);
        }

        const url = new URL(request.url)
        let [hookId, hookToken] = (url.pathname + url.search).substring(1).split("/");

        if (typeof(hookToken) == 'undefined') {
            return new Response('Missing Webhook Authorization', { status: 400 });
        }

        const result = await fetch(`https://discord.com/api/webhooks/${hookId}/${hookToken}`, {
            headers: {
                "content-type": "application/json;charset=UTF=8"
            },
            method: "POST",
            body: embed
        })

        if (result.ok) {
            return new Response(`disgit successfully executed webhook ${hookId}`, { status: 200 });
        }

        return new Response(`Failed to send webhook ${hookId}: Got ${result.status} from discord: ${await result.text()}`, { status: 400 });
    } else {
        return new Response('Bad Request', { status: 400 })
    }
}

function buildEmbed(json: any, event: string, env: BoundEnv): string | null {
    const { action } = json;

    if (env.isIgnoredPayload(event)) {
        return null;
    }

    switch (event) {
        case "check_run": {
            if (action !== "completed") {
                break;
            }
            return buildCheck(json, env);
        }
        case "commit_comment": {
            if (action !== "created") {
                break;
            }
            return buildCommitComment(json, env);
        }
        case "create": {
            return buildCreateBranch(json, env);
        }
        case "delete": {
            return buildDeleteBranch(json, env);
        }
        case "discussion": {
            if (action !== "created") {
                break;
            }
            return buildDiscussion(json, env);
        }
        case "discussion_comment": {
            if (action !== "created") {
                break;
            }
            return buildDiscussionComment(json, env);
        }
        case "fork": {
            return buildFork(json, env);
        }
        case "issue_comment": {
            if (action !== "created") {
                break;
            }
            return buildIssueComment(json, env);
        }
        case "issues": {
            switch (action) {
                case "opened": {
                    return buildIssue(json, env);
                }
                case "reopened": {
                    return buildIssueReOpen(json, env);
                }
                case "closed": {
                    return buildIssueClose(json, env);
                }
                default: {
                    return null;
                }
            }
        }
        case "package": {
            switch (action) {
                case "published": {
                    return buildPackagePublished(json, env);
                }
                case "updated": {
                    return buildPackageUpdated(json, env);
                }
                default : {
                    return null;
                }
            }
        }
        case "ping": {
            return buildPing(json, env);
        }
        case "pull_request": {
            switch (action) {
                case "opened": {
                    return buildPull(json, env);
                }
                case "closed": {
                    return buildPullClose(json, env);
                }
                case "reopened": {
                    return buildPullReopen(json, env);
                }
                case "converted_to_draft": {
                    return buildPullDraft(json, env);
                }
                case "ready_for_review": {
                    return buildPullReadyReview(json, env);
                }
                case "enqueued": {
                    return buildPullEnqueue(json, env);
                }
                case "dequeued": {
                    return buildPullDequeue(json, env);
                }
                default: {
                    return null;
                }
            }
        }
        case "pull_request_review": {
            switch (action) {
                case "submitted":
                case "dismissed": {
                    return buildPullReview(json, env);
                }
                default: {
                    return null;
                }
            }
        }
        case "pull_request_review_comment": {
            if (action !== "created") {
                break;
            }
            return buildPullReviewComment(json, env);
        }
        case "push": {
            return buildPush(json, env);
        }
        case "release": {
            if (action === "released" || action === "prereleased") {
                return buildRelease(json, env);
            }
            break;
        }
        case "star": {
            if (action !== "created") {
                break;
            }
            return buildStar(json, env);
        }
        case "deployment": {
            if (action !== "created") {
                break;
            }
            return buildDeployment(json, env);
        }
        case "deployment_status": {
            return buildDeploymentStatus(json, env);
        }
        // Wiki
        case "gollum": {
            return buildWiki(json, env);
        }
    }

    return null;
}

function buildEmbedBody(env: BoundEnv, title: string, url: string | undefined, sender: Sender, color: number, description?: string, footer?: string, fields?: any[]): string {
    const date = new Date();
    const avatarHash = `${date.getFullYear()}${date.getMonth()}${date.getDay()}`;
    return JSON.stringify({
        embeds: [
            {
                title: truncate(title, 255, env.hideDetailsBody),
                url,
                description: description ? truncate(description, 1000, env.hideDetailsBody) : undefined,
                author: {
                    name: truncate(sender.login, 255, env.hideDetailsBody),
                    url: sender.html_url,
                    icon_url: `${sender.avatar_url}?=${avatarHash}`
                },
                color,
                footer: footer ? {
                    text: truncate(footer, 255, env.hideDetailsBody),
                } : undefined,
                fields: fields ?? [],
            }
        ]
    });
}

function buildPing(json: any, env: BoundEnv): string {
    const { zen, hook, repository, sender, organization } = json;

    const isOrg = hook['type'] == 'Organization';

    const name = isOrg ? organization['login'] : repository['full_name'];

    return buildEmbedBody(env, `[${name}] ${hook.type} hook ping received`, undefined, sender, 12118406, zen);
}

function buildRelease(json: any, env: BoundEnv): string | null {
    const { release, repository, sender } = json;
    const { draft, name, tag_name, body, html_url, prerelease } = release;

    if (draft) {
        return null;
    }

    let effectiveName = name == null ? tag_name : name;

    return buildEmbedBody(env, `[${repository['full_name']}] New ${prerelease ? 'pre' : ''}release published: ${effectiveName}`, html_url, sender, 14573028, body);
}

function buildPush(json: any, env: BoundEnv): string | null {
    const { commits, forced, after, repository, ref, compare, sender } = json;

    let branch = ref.substring(11);

    if (env.isIgnoredBranch(branch)) {
        return null;
    }

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    if (forced) {
        return buildEmbedBody(env, `[${repository["full_name"]}] Branch ${branch} was force-pushed to \`${shortCommit(after)}\``, compare.replace("...", ".."), sender, 16722234);
    }

    let amount = commits.length;

    if (amount === 0) {
        return null;
    }

    let description = "";
    let lastCommitUrl = "";
    for (let i = 0; i < commits.length; i++) {
        let commit = commits[i];
        let commitUrl = commit.url;
        let line = `[\`${shortCommit(commit.id)}\`](${commitUrl}) ${truncate(commit.message.split("\n")[0], 50, env.hideDetailsBody)} - ${commit.author.username}
`;
        if (description.length + line.length >= 1500) {
            break;
        }
        lastCommitUrl = commitUrl;
        description += line;
    }
    const commitWord = amount === 1 ? "commit" : "commits";

    return buildEmbedBody(env, `[${repository.name}:${branch}] ${amount} new ${commitWord}`, amount === 1 ? lastCommitUrl : compare, sender, 6120164, description);
}

function buildPullEnqueue(json: any, env: BoundEnv): string {
    const { pull_request, repository, sender } = json;

    const queueUrl = `${repository["html_url"]}/queue/${pull_request.base.ref}`;

    return buildEmbedBody(env, `[${repository["full_name"]}] Pull request enqueued: #${pull_request.number} ${pull_request.title}`, pull_request["html_url"], sender, 16752896, `[View \`${pull_request.base.ref}\` merge queue](${queueUrl})`);
}

function buildPullDequeue(json: any, env: BoundEnv): string {
    const { pull_request, repository, sender } = json;

    const queueUrl = `${repository["html_url"]}/queue/${pull_request.base.ref}`;

    return buildEmbedBody(env, `[${repository["full_name"]}] Pull request dequeued: #${pull_request.number} ${pull_request.title}`, pull_request["html_url"], sender, 13584462, `[View \`${pull_request.base.ref}\` merge queue](${queueUrl})`);
}

function buildPullReviewComment(json: any, env: BoundEnv): string {
    const { pull_request, comment, repository, sender } = json;

    return buildEmbedBody(env, `[${repository["full_name"]}] Pull request review comment: #${pull_request.number} ${pull_request.title}`, comment["html_url"], sender, 7829367, comment.body);
}

function buildPullReview(json: any, env: BoundEnv): string {
    const { pull_request, review, repository, action, sender } = json;

    let state = "reviewed";
    let color = 7829367;
    switch (review.state) {
        case "approved": {
            state = "approved";
            color = 37378;
            break;
        }
        case "changes_requested": {
            state = "changes requested"
            color = 16722234;
            break;
        }
        default: {
            if (action === "dismissed") {
                state = "review dismissed";
            }
            break;
        }
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] Pull request ${state}: #${pull_request.number} ${pull_request.title}`, review["html_url"], sender, color, review.body);
}

function buildPullReadyReview(json: any, env: BoundEnv): string {
    const { pull_request, repository, sender } = json;

    return buildEmbedBody(env, `[${repository["full_name"]}] Pull request marked for review: #${pull_request.number} ${pull_request.title}`, pull_request["html_url"], sender, 37378);
}

function buildPullDraft(json: any, env: BoundEnv): string {
    const { pull_request, repository, sender } = json;

    return buildEmbedBody(env, `[${repository["full_name"]}] Pull request marked as draft: #${pull_request.number} ${pull_request.title}`, pull_request["html_url"], sender, 10987431);
}

function buildPullReopen(json: any, env: BoundEnv): string {
    const { pull_request, repository, sender } = json;

    let draft = pull_request.draft;
    let color = draft ? 10987431 : 37378;
    let type = draft ? "Draft pull request" : "Pull request"

    return buildEmbedBody(env, `[${repository["full_name"]}] ${type} reopened: #${pull_request.number} ${pull_request.title}`, pull_request["html_url"], sender, color);
}

function buildPullClose(json: any, env: BoundEnv): string {
    const { pull_request, repository, sender } = json;

    let merged = pull_request.merged;
    let color = merged ? 8866047 : 16722234;
    let status = merged ? "merged" : "closed";

    return buildEmbedBody(env, `[${repository["full_name"]}] Pull request ${status}: #${pull_request.number} ${pull_request.title}`, pull_request["html_url"], sender, color);
}

function buildPull(json: any, env: BoundEnv): string | null {
    const { pull_request, repository, sender } = json;

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    let draft = pull_request.draft;
    let color = draft ? 10987431 : 37378;
    let type = draft ? "Draft pull request" : "Pull request"

    return buildEmbedBody(env, `[${repository["full_name"]}] ${type} opened: #${pull_request.number} ${pull_request.title}`, pull_request["html_url"], sender, color, pull_request.body);
}

function buildIssueComment(json: any, env: BoundEnv): string | null {
    const { issue, comment, repository, sender } = json;

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    let entity = "pull_request" in issue ? "pull request" : "issue";

    return buildEmbedBody(env, `[${repository["full_name"]}] New comment on ${entity}: #${issue.number} ${issue.title}`, comment["html_url"], sender, 11373312, comment.body);
}

function buildIssueClose(json: any, env: BoundEnv): string {
    const { issue, repository, sender } = json;

    const reason = issue.state_reason;

    return buildEmbedBody(env, `[${repository["full_name"]}] Issue closed ${reason ? `as ${reason.replaceAll('_', ' ')}` : ''}: #${issue.number} ${issue.title}`, issue["html_url"], sender, 16730159);
}

function buildIssueReOpen(json: any, env: BoundEnv): string {
    const { issue, repository, sender } = json;

    return buildEmbedBody(env, `[${repository["full_name"]}] Issue reopened: #${issue.number} ${issue.title}`, issue["html_url"], sender, 16743680);
}

function buildIssue(json: any, env: BoundEnv): string | null {
    const { issue, repository, sender } = json;

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] Issue opened: #${issue.number} ${issue.title}`, issue["html_url"], sender, 16743680, issue.body);
}

function buildPackagePublished(json: any, env: BoundEnv): string {
    const { sender, repository } = json;
    const pkg = "package" in json ? json.package : json["registry_package"];

    return buildEmbedBody(env, `[${repository["full_name"]}] Package Published: ${pkg.namespace}/${pkg.name}`, pkg["package_version"]["html_url"], sender, 37378);
}

function buildPackageUpdated(json: any, env: BoundEnv): string {
    const { sender, repository } = json;
    const pkg = "package" in json ? json.package : json["registry_package"];

    return buildEmbedBody(env, `[${repository["full_name"]}] Package Updated: ${pkg.namespace}/${pkg.name}`, pkg["package_version"]["html_url"], sender, 37378);
}

function buildFork(json: any, env: BoundEnv): string {
    const { sender, repository, forkee } = json;

    return buildEmbedBody(env, `[${repository["full_name"]}] Fork Created: ${forkee["full_name"]}`, forkee["html_url"], sender, 16562432);
}

function buildDiscussionComment(json: any, env: BoundEnv): string | null {
    const { discussion, comment, repository, sender } = json;
    const { category } = discussion;

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] New comment on discussion: #${discussion.number} ${discussion.title}`, comment["html_url"], sender, 35446, comment.body, `Discussion Category: ${category.name}`);
}

function buildDiscussion(json: any, env: BoundEnv): string | null {
    const { discussion, repository, sender } = json;
    const { category } = discussion;

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] New discussion: #${discussion.number} ${discussion.title}`, discussion["html_url"], sender, 9737471, discussion.body, `Discussion Category: ${category.name}`);
}

function buildDeleteBranch(json: any, env: BoundEnv): string | null {
    const { ref, ref_type, repository, sender } = json;

    if (ref_type == "branch" && env.isIgnoredBranch(ref)) {
        return null;
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] ${ref_type} deleted: ${ref}`, undefined, sender, 1);
}

function buildCreateBranch(json: any, env: BoundEnv): string | null {
    const { ref, ref_type, repository, sender } = json;

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    if (ref_type == "branch" && env.isIgnoredBranch(ref)) {
        return null;
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] New ${ref_type} created: ${ref}`, undefined, sender, 3881787);
}

function buildCommitComment(json: any, env: BoundEnv): string | null {
    const { sender, comment, repository } = json;

    if (env.isIgnoredUser(sender.login)) {
        return null;
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] New comment on commit \`${shortCommit(comment["commit_id"])}\``, comment["html_url"], sender, 3881787, comment.body);
}

function buildCheck(json: any, env: BoundEnv): string | null {
    const { check_run, repository, sender } = json;
    const { conclusion, output, html_url, check_suite } = check_run;

    if (repository == null || check_suite["head_branch"] == null) {
        return null;
    }

    let target = check_suite["head_branch"];

    if (env.isIgnoredBranch(target)) {
        return null;
    }

    if (check_suite["pull_requests"].length > 0) {
        let pull = check_suite["pull_requests"][0];
        if (pull.url.startsWith(`https://api.github.com/repos/${repository["full_name"]}`)) {
            target = `PR #${pull.number}`
        }
    }

    let color = 11184810;
    let status = "failed"
    if (conclusion === "success") {
        color = 45866;
        status = "succeeded";
    } else if (conclusion === "failure" || conclusion === "cancelled") {
        color = 16726843;
        status = conclusion === "failure" ? "failed" : "cancelled"
    } else if (conclusion === "timed_out" || conclusion === "action_required" || conclusion === "stale") {
        color = 14984995;
        status = conclusion === "timed_out" ? "timed out" : (conclusion === "action_required" ? "requires action" : "became stale");
    } else if (conclusion === "neutral") {
        status = "didn't run";
    } else if (conclusion === "skipped") {
        status = "was skipped";
    }

    let fields = [
        {
            name: "Action Name",
            value: check_run.name,
            inline: true
        }
    ];

    if (output.title != null) {
        fields.push({
            name: "Output Title",
            value: truncate(output.title, 1000, env.hideDetailsBody),
            inline: true
        });
    }

    if (output.summary != null) {
        fields.push({
            name: "Output Summary",
            value: truncate(output.summary, 1000, env.hideDetailsBody),
            inline: false
        });
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] Actions check ${status} on ${target}`, html_url, sender, color, undefined, undefined, fields);
}

function buildStar(json: any, env: BoundEnv): string {
    const { sender, repository } = json;

    return buildEmbedBody(env, `[${repository["full_name"]}] New star added`, repository["html_url"], sender, 16562432);
}

function buildDeployment(json: any, env: BoundEnv) {
    const { deployment, repository, sender } = json;
    const { description, payload } = deployment;

    return buildEmbedBody(env, `[${repository["full_name"]}] Deployment started for ${description}`, payload["web_url"] === null ? "" : payload["web_url"], sender, 11158713);
}

function buildDeploymentStatus(json: any, env: BoundEnv) {
    const { deployment, deployment_status, repository, sender } = json;
    const { description, payload } = deployment;
    const { state } = deployment_status;

    let color = 16726843;
    let term = "succeeded";
    switch (state) {
        case "success": {
            color = 45866;
            break;
        }
        case "failure": {
            term = "failed"
            break;
        }
        case "error": {
            term = "errored"
            break;
        }
        default: {
            return null;
        }
    }

    return buildEmbedBody(env, `[${repository["full_name"]}] Deployment for ${description} ${term}`, payload["web_url"] === null ? "" : payload["web_url"], sender, color);
}

function buildWiki(json: any, env: BoundEnv): string | null {
    const { pages, sender, repository } = json;

    // Pages is always an array with several "actions".
    // Count the amount of "created" and "edited" actions and store the amount in a variable.
    // Also store the titles of the pages in an array since we will need them later.
    let created = 0;
    let edited = 0;
    let titles: string[] = [];
    for (let i = 0; i < pages.length; i++) {
        const { action } = pages[i];
        if (action === "created") {
            created++;
        } else if (action === "edited") {
            edited++;
        }

        // Wrap the title in a markdown with the link to the page.
        let title = `[${pages[i].title}](${pages[i]["html_url"]})`;

        // Capitalize the first letter of the action, then prepend it to the title.
        titles.push(`${action.charAt(0).toUpperCase() + action.slice(1)}: ${title}`);
    }

    // If there are no pages, return null.
    if (created === 0 && edited === 0) {
        return null;
    }

    // Set the message based on if there are any created or edited pages.
    // If there are only 1 of one type, set the message to singular.
    // If there are multiple of one type, set the message to plural.
    let message;
    let color;
    if (created === 1 && edited === 0) {
        message = "A page was created";
        // Set the color to green.
        color = 45866;
    } else if (created === 0 && edited === 1) {
        message = "A page was edited";
        // Set the color to orange.
        color = 16562432;
    } else {
        if (created > 0 && edited > 0) {
            message = `${created} page${created > 1 ? "s" : ""} were created and ${edited} ${edited > 1 ? "were" : "was"} edited`;
        } else {
            message = `${Math.max(created, edited)} pages were ${created > 0 ? "created" : "edited"}`;
        }
        // Set the color to blue.
        color = 6120164;
    }

    // Prepend the repository title to the message.
    message = `[${repository["full_name"]}] ${message}`;

    // Build the embed, with the sender as the author, the message as the title, and the edited pages as the description.
    return buildEmbedBody(env, message, repository["html_url"], sender, color, titles.join("\n"));
}

function handleError(error: any): Response {
    console.error('Uncaught error:', error)

    const { stack } = error
    return new Response(stack || error, {
        status: 500,
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8'
        }
    })
}


export default {
    async fetch(
        request: Request,
        env: Env,
        _: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url)
        if (url.pathname === "/health") {
            return new Response("OK", { status: 200 });
        }

        const bound = new BoundEnv(env);
        return handleRequest(request, bound).catch(handleError);
    },
};
