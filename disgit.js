// If true, will send paste of embed json to discord for debugging
const debug = false;

// Handles event sent by cloudflare
addEventListener('fetch', function(event) {
    const { request } = event
    const response = handleRequest(request).catch(handleError)
    event.respondWith(response)
})

async function handleRequest(request) {
    const event = request.headers.get("X-GitHub-Event");
    const contentType = request.headers.get("content-type");
    if (event != null && contentType != null && contentType.includes("application/json")) {
        let json = await request.json();
        let embed = buildEmbed(json, event);
        if (embed == null) {
            return new Response('Webhook NO-OP', {status: 200})
        }

        if (debug) {
            embed = await buildDebugPaste(embed);
        }

        let hookSplit = request.url.split("workers.dev/")[1].split("/");
        if (hookSplit.length === 1) {
            return new Response('Missing Webhook Authorization', { status: 400 });
        }

        let hookId = hookSplit[0];
        let hookToken = hookSplit[1];

        await fetch(`https://discord.com/api/webhooks/${hookId}/${hookToken}`, {
            headers: {
                "content-type": "application/json;charset=UTF=8"
            },
            method: "POST",
            body: embed
        })
        return new Response(`Webhook ${hookId} executed with token ${hookToken}`, {status: 200})
    } else {
        return new Response('Bad Request', { status: 400 })
    }
}

/**
 * @param {*} json
 * @param {string} event
 * @return {String|null}
 */
function buildEmbed(json, event) {
    const { action } = json;

    switch (event) {
        case "check_run": {
            if (action !== "completed") {
                break;
            }
            return buildCheck(json);
        }
        case "commit_comment": {
            if (action !== "created") {
                break;
            }
            return buildCommitComment(json);
        }
        case "create": {
            return buildCreateBranch(json);
        }
        case "delete": {
            return buildDeleteBranch(json);
        }
        case "discussion": {
            if (action !== "created") {
                break;
            }
            return buildDiscussion(json);
        }
        case "discussion_comment": {
            if (action !== "created") {
                break;
            }
            return buildDiscussionComment(json);
        }
        case "fork": {
            return buildFork(json);
        }
        case "issue_comment": {
            if (action !== "created") {
                break;
            }
            return buildIssueComment(json);
        }
        case "issues": {
            switch (action) {
                case "opened": {
                    return buildIssue(json);
                }
                case "reopened": {
                    return buildIssueReOpen(json);
                }
                case "closed": {
                    return buildIssueClose(json);
                }
                default: {
                    return null;
                }
            }
        }
        case "ping": {
            return buildPing(json);
        }
        case "pull_request": {
            switch (action) {
                case "opened": {
                    return buildPull(json);
                }
                case "closed": {
                    return buildPullClose(json);
                }
                case "reopened": {
                    return buildPullReopen(json);
                }
                case "converted_to_draft": {
                    return buildPullDraft(json);
                }
                case "ready_for_review": {
                    return buildPullReadyReview(json);
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
                    return buildPullReview(json);
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
            return buildPullReviewComment(json);
        }
        case "push": {
            return buildPush(json);
        }
        case "release": {
            if (action === "released" || action === "prereleased") {
                return buildRelease(json);
            }
            break;
        }
        case "star": {
            if (action !== "created") {
                break;
            }
            return buildStar(json);
        }
        case "deployment": {
            if (action !== "created") {
                break;
            }
            return buildDeployment(json);
        }
        case "deployment_status": {
            return buildDeploymentStatus(json);
        }
        // Wiki
        case "gollum": {
            return buildWiki(json);
        }
    }

    return null;
}

/**
 * @param {*} json
 * @return {string}
 */
function buildPing(json) {
    const { zen, hook, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] " + hook["type"] + " hook ping received",
                "description": zen,
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 12118406
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildRelease(json) {
    const { release, repository, sender } = json;
    const { draft, name, tag_name, body, html_url, prerelease } = release;

    if (draft) {
        return null;
    }

    let effectiveName = name == null ? tag_name : name;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] New " + (prerelease ? "pre" : "") + "release published: " + effectiveName,
                "description": truncate(body, 1000),
                "url": html_url,
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 14573028
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildPush(json) {
    const { commits, forced, after, repository, ref, compare, sender } = json;

    let branch = ref.substring(11);

    if (isIgnoredBranch(branch)) {
        return null;
    }

    if (forced) {
        return JSON.stringify({
            "embeds": [
                {
                    "title": "[" + repository["full_name"] + "] Branch " + branch +  " was force-pushed to `" + shortCommit(after) + "`",
                    "url": compare.replace("...", ".."),
                    "author": {
                        "name": sender["login"],
                        "url": sender["html_url"],
                        "icon_url": sender["avatar_url"]
                    },
                    "color": 16722234
                }
            ]
        });
    }

    let amount = commits.length;

    if (amount === 0) {
        return null;
    }

    let description = "";
    let lastCommitUrl = "";
    for (let i = 0; i < commits.length; i++) {
        let commit = commits[i];
        let commitUrl = commit["url"];
        let line = "[`" + shortCommit(commit["id"]) + "`](" +commitUrl + ") " + truncate(commit["message"].split("\n")[0], 50) + " - " + commit["author"]["username"] + "\n";
        if (description.length + line.length >= 1500) {
            break;
        }
        lastCommitUrl = commitUrl;
        description += line;
    }

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["name"] + ":" + branch + "] " + amount + " new commits",
                "description": description,
                "url": amount === 1 ? lastCommitUrl : compare,
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 6120164
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildPullReviewComment(json) {
    const { pull_request, comment, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Pull request review comment: #" + pull_request["number"] + " " + pull_request["title"],
                "description": truncate(comment["body"], 1000),
                "url": comment["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 7829367
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildPullReview(json) {
    const { pull_request, review, repository, action, sender } = json;

    let state = "reviewed";
    let color = 7829367;
    switch (review["state"]) {
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

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Pull request " + state + ": #" + pull_request["number"] + " " + pull_request["title"],
                "description": truncate(review["body"], 1000),
                "url": review["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": color
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildPullReadyReview(json) {
    const { pull_request, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Pull request marked for review: #" + pull_request["number"] + " " + pull_request["title"],
                "url": pull_request["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 37378
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildPullDraft(json) {
    const { pull_request, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Pull request marked as draft: #" + pull_request["number"] + " " + pull_request["title"],
                "url": pull_request["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 10987431
            }
        ]
    });
}


/**
 * @param {*} json
 * @return {string}
 */
function buildPullReopen(json) {
    const { pull_request, repository, sender } = json;

    let draft = pull_request["draft"];
    let color = draft ? 10987431 : 37378;
    let type = draft ? "Draft pull request" : "Pull request"

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] " + type + " reopened: #" + pull_request["number"] + " " + pull_request["title"],
                "url": pull_request["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": color
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildPullClose(json) {
    const { pull_request, repository, sender } = json;

    let merged = pull_request["merged"];
    let color = merged ? 8866047 : 16722234;
    let status = merged ? "merged" : "closed";

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Pull request " + status + ": #" + pull_request["number"] + " " + pull_request["title"],
                "url": pull_request["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": color
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildPull(json) {
    const { pull_request, repository, sender } = json;

    if (isIgnoredUser(sender["login"])) {
        return null;
    }

    let draft = pull_request["draft"];
    let color = draft ? 10987431 : 37378;
    let type = draft ? "Draft pull request" : "Pull request"

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] " + type + " opened: #" + pull_request["number"] + " " + pull_request["title"],
                "description": truncate(pull_request["body"], 1000),
                "url": pull_request["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": color
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildIssueComment(json) {
    const { issue, comment, repository, sender } = json;

    if (isIgnoredUser(sender["login"])) {
        return null;
    }

    let entity = "pull_request" in issue ? "pull request" : "issue";

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] New comment on " + entity + ": #" + issue["number"] + " " + issue["title"],
                "description": truncate(comment["body"], 1000),
                "url": comment["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 11373312
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildIssueClose(json) {
    const { issue, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Issue closed: #" + issue["number"] + " " + issue["title"],
                "url": issue["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 16730159
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildIssueReOpen(json) {
    const { issue, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Issue reopened: #" + issue["number"] + " " + issue["title"],
                "url": issue["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 16743680
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildIssue(json) {
    const { issue, repository, sender } = json;

    if (isIgnoredUser(sender["login"])) {
        return null;
    }

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Issue opened: #" + issue["number"] + " " + issue["title"],
                "description": truncate(issue["body"], 1000),
                "url": issue["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 16743680
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildFork(json) {
    const { sender, repository, forkee } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Fork Created: " + forkee["full_name"],
                "url": forkee["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 16562432
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildDiscussionComment(json) {
    const { discussion, comment, repository, sender } = json;
    const { category } = discussion;

    if (isIgnoredUser(sender["login"])) {
        return null;
    }

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] New comment on discussion: #" + discussion["number"] + " " + discussion["title"],
                "description": truncate(comment["body"], 1000),
                "url": comment["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 35446,
                "footer": {
                    "text": "Discussion Category: " + category["name"]
                }
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildDiscussion(json) {
    const { discussion, repository, sender } = json;
    const { category } = discussion;

    if (isIgnoredUser(sender["login"])) {
        return null;
    }

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] New discussion: #" + discussion["number"] + " " + discussion["title"],
                "description": truncate(discussion["body"], 1000),
                "url": discussion["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 9737471,
                "footer": {
                    "text": "Discussion Category: " + category["name"]
                }
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildDeleteBranch(json) {
    const { ref, ref_type, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] " + ref_type + " deleted: " + ref,
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 1
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildCreateBranch(json) {
    const { ref, ref_type, repository, sender } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] New " + ref_type + " created: " + ref,
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 1
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildCommitComment(json) {
    const { sender, comment, repository } = json;

    if (isIgnoredUser(sender["login"])) {
        return null;
    }

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] New comment on commit `" + shortCommit(comment["commit_id"]) + "`",
                "description": truncate(comment["body"], 1000),
                "url": comment["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 1
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildCheck(json) {
    const { check_run, repository, sender } = json;
    const { conclusion, output, html_url, check_suite } = check_run;

    if (repository == null || check_suite["head_branch"] == null) {
        return null;
    }

    let target = check_suite["head_branch"];

    if (isIgnoredBranch(target)) {
        return null;
    }

    if (check_suite["pull_requests"].length > 0) {
        let pull = check_suite["pull_requests"][0];
        if (pull["url"].startsWith("https://api.github.com/repos/" + repository["full_name"])) {
            target = "PR #" + pull["number"]
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
            "name": "Action Name",
            "value": check_run["name"],
            "inline": true
        }
    ];

    if (output["title"] != null) {
        fields.push({
            "name": "Output Title",
            "value": output["title"],
            "inline": true });
    }

    if (output["summary"] != null) {
        fields.push({
            "name": "Output Summary",
            "value": output["summary"],
            "inline": false});
    }

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Actions check " + status + " on " + target,
                "url": html_url,
                "color": color,
                "fields": fields,
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildStar(json) {
    const { sender, repository } = json;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] New star added",
                "url": repository["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 16562432
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string}
 */
function buildDeployment(json) {
    const { deployment, repository, sender } = json;
    const { description, payload } = deployment;

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Deployment started for " + description,
                "url": payload["web_url"] === null ? "" : payload["web_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": 11158713
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildDeploymentStatus(json) {
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

    return JSON.stringify({
        "embeds": [
            {
                "title": "[" + repository["full_name"] + "] Deployment for " + description + " " + term,
                "url": payload["web_url"] === null ? "" : payload["web_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "color": color
            }
        ]
    });
}

/**
 * @param {*} json
 * @return {string|null}
 */
function buildWiki(json) {
    const { pages, sender, repository } = json;

    // Pages is always an array with several "actions".
    // Count the amount of "created" and "edited" actions and store the amount in a variable.
    // Also store the titles of the pages in an array since we will need them later.
    let created = 0;
    let edited = 0;
    let titles = [];
    for (let i = 0; i < pages.length; i++) {
        const { action } = pages[i];
        if (action === "created") {
            created++;
        } else if (action === "edited") {
            edited++;
        }

        // Wrap the title in a markdown with the link to the page.
        let title = "[" + pages[i]["title"] + "](" + pages[i]["html_url"] + ")";

        // Capitalize the first letter of the action, then prepend it to the title.
        titles.push(action.charAt(0).toUpperCase() + action.slice(1) + ": " + title);
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
            message = created + " page" + (created > 1 ? "s" : "") + " were created and " + edited + " " + (edited > 1 ? "were" : "was") + " edited";
        } else {
            message = Math.max(created, edited) + " pages were " + (created > 0 ? "created" : "edited");
        }
        // Set the color to blue.
        color = 6120164;
    }

    // Prepend the repository title to the message.
    message = "[" + repository["full_name"] + "] " + message;

    // Build the embed, with the sender as the author, the message as the title, and the edited pages as the description.
    return JSON.stringify({
        "embeds": [
            {
                "title": message,
                "url": repository["html_url"],
                "author": {
                    "name": sender["login"],
                    "url": sender["html_url"],
                    "icon_url": sender["avatar_url"]
                },
                "description": titles.join("\n"),
                "color": color
            }
        ]
    });
}

async function buildDebugPaste(embed) {
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
            "user-agent": "EssentialsX plugin",
            "content-type": "application/json"
        },
        method: "POST",
        body: embed
    })).text();

    embed = JSON.stringify({
        "content": embed
    });
    return embed;
}

/**
 * @param {String} branch
 * @return {boolean}
 */
function isIgnoredBranch(branch) {
    // noinspection JSUnresolvedVariable
    if (typeof IGNORED_BRANCHES === 'undefined' || IGNORED_BRANCHES == null) {
        return false;
    }

    // noinspection JSUnresolvedVariable
    return IGNORED_BRANCHES.split(",").includes(branch);
}

/**
 * @param {String} user
 * @return {boolean}
 */
function isIgnoredUser(user) {
    // noinspection JSUnresolvedVariable
    if (typeof IGNORED_USERS === 'undefined' || IGNORED_USERS == null) {
        return false;
    }

    // noinspection JSUnresolvedVariable
    return IGNORED_USERS.split(",").includes(user);
}

/**
 * @param {String} str
 * @param {Number} num
 * @return {string|null}
 */
function truncate(str, num) {
    if (str === null) {
        return null;
    }

    str = str.replace(/<!--(?:.|\n|\r)*?-->[\n|\r]*/g, "");
    if (str.length <= num) {
        return str;
    }
    return str.slice(0, num - 3) + "...";
}

/**
 * @param {String} hash
 * @return {string}
 */
function shortCommit(hash) {
    return hash.substring(0, 7);
}

/**
 * Responds with an uncaught error.
 * @param {Error} error
 * @returns {Response}
 */
function handleError(error) {
    console.error('Uncaught error:', error)

    const { stack } = error
    return new Response(stack || error, {
        status: 500,
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8'
        }
    })
}
