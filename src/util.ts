import {mdTruncate} from "./md-truncate";

function convertDetailsToSpoilers(text: string, hideDetailsSummary: boolean): string {
    const detailsRegex = /<details[^>]*>\s*<summary[^>]*>(.*?)<\/summary>\s*(.*?)<\/details>/gis;

    return text.replace(detailsRegex, (_, summary: string, content: string) => {
        const cleanSummary = summary.trim().replace(/<[^>]*>/g, '');

        // Remove HTML tags but preserve Markdown formatting
        const cleanContent = content.trim()
            .replace(/<[^>]*>/g, '')
            // Normalize whitespace but preserve line breaks for code blocks
            .replace(/\n\s*\n/g, '\n')
            // Remove excessive whitespace but keep single spaces
            .replace(/[ \t]+/g, ' ')
            .trim();
        if (cleanContent && !hideDetailsSummary) {
            return `**${cleanSummary}**:\n ||${cleanContent}||`;
        } else {
            return `**${cleanSummary}**`;
        }
    });
}

export function truncate(str: string, num: number, hideDetailsBody: boolean): string | null {
    if (str === null) {
        return null;
    }

    // Remove HTML comments
    str = str.replace(/<!--(?:.|\n|\r)*?-->[\n|\r]*/g, "");

    // Convert details/summary to Discord spoilers
    str = convertDetailsToSpoilers(str, hideDetailsBody);

    if (str.length <= num) {
        return str;
    }

    let trimNum = num;
    let truncatedStr = mdTruncate(str, {limit: trimNum, ellipsis: true});

    // mdTruncate counts content characters only (ignoring formatting markers) and
    // appends an ellipsis, so the resulting string can exceed `num`. Shrink the
    // limit until the actual rendered length fits within `num`.
    while (truncatedStr.length > num && trimNum > 0) {
        trimNum -= 10;
        truncatedStr = mdTruncate(str, {limit: trimNum, ellipsis: true});
    }

    return truncatedStr;
}

export function shortCommit(hash: string): string {
    return hash.substring(0, 7);
}

export async function validateRequest(request: Request, secret: string): Promise<boolean> {
    const signatureHeader = request.headers.get("X-Hub-Signature-256")?.substring("sha256=".length);
    if (signatureHeader == null) {
        return false;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
        name: "HMAC",
        hash: "SHA-256"
    }, false, ["verify"]);


    return crypto.subtle.verify("HMAC", key, encoder.encode(signatureHeader), await request.arrayBuffer())
}

export type Sender = {
    login: string;
    html_url: string;
    avatar_url: string;
}
