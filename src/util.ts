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
    return str.slice(0, num - 3) + "...";
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
