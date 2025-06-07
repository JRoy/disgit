import { mdTruncate } from "./md-truncate";

/**
 * @param {String} str
 * @param {Number} num
 * @return {string|null}
 */
export function truncate(str: string, num: number): string | null {
    if (str === null) {
        return null;
    }

    str = str.replace(/<!--(?:.|\n|\r)*?-->[\n|\r]*/g, "");
    if (str.length <= num) {
        return str;
    }

    let truncatedStr = mdTruncate(str, { limit: num, ellipsis: true });

    // mdTruncate doesn't count formatting markers, so we need to ensure the length is correct
    let trimNum = num;
    while (truncatedStr.length < num) {
        trimNum -= 10;
        truncatedStr = mdTruncate(str, { limit: num, ellipsis: true });
    }

    return truncatedStr;
}

/**
 * @param {String} hash
 * @return {string}
 */
export function shortCommit(hash: string): string {
    return hash.substring(0, 7);
}

export async function validateRequest(request: Request, secret: string): Promise<boolean> {
    const signatureHeader = request.headers.get("X-Hub-Signature-256")?.substring("sha256=".length);
    if (signatureHeader == null) {
        return false;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {name: "HMAC", hash: "SHA-256" }, false, ["verify"]);


    return crypto.subtle.verify("HMAC", key, encoder.encode(signatureHeader), await request.arrayBuffer())
}

export type Sender = {
    login: string;
    html_url: string;
    avatar_url: string;
}
