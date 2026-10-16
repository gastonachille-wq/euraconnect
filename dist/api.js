import { errorMessage } from "./domain.js";
const STORAGE_KEY = "euraconnect.auth.v1";
let session = null;
let refreshing = null;
function config() {
    const c = window.EC_CONFIG;
    if (!c?.supabaseUrl || !c.supabaseKey)
        throw new Error("Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans les variables de compilation Cloudflare, puis relancez le deploy.");
    return c;
}
export function hasConfiguration() { return Boolean(window.EC_CONFIG?.supabaseUrl && window.EC_CONFIG?.supabaseKey); }
function persist(s) {
    session = s;
    if (s)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else
        localStorage.removeItem(STORAGE_KEY);
}
function parseSession(v) {
    if (!v || typeof v !== "object")
        return null;
    const x = v;
    return typeof x.access_token === "string" && typeof x.refresh_token === "string" ? { access_token: x.access_token, refresh_token: x.refresh_token, expires_at: x.expires_at || Math.floor(Date.now() / 1000) + (x.expires_in || 3600), user: x.user } : null;
}
export function restoreSession() {
    try {
        session = parseSession(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    }
    catch {
        session = null;
    }
    return Boolean(session);
}
async function request(path, method, payload, token, signal) {
    const c = config();
    let response;
    const headers = { apikey: c.supabaseKey, "Content-Type": "application/json" };
    if (token)
        headers.Authorization = "Bearer " + token;
    try {
        response = await fetch(c.supabaseUrl + path, { method, headers, ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}), signal: signal || AbortSignal.timeout(20000) });
    }
    catch (err) {
        throw new Error(errorMessage(err));
    }
    let data;
    try {
        data = await response.json();
    }
    catch {
        data = null;
    }
    if (!response.ok)
        throw Object.assign(new Error(errorMessage(data)), { status: response.status, ...(data && typeof data === "object" ? data : {}) });
    return data;
}
async function accessToken() {
    if (!session)
        throw new Error("Session expir\u00E9e. Reconnectez-vous.");
    if (session.expires_at > Date.now() / 1000 + 60)
        return session.access_token;
    if (!refreshing) {
        const token = session.refresh_token;
        refreshing = (async () => {
            try {
                const data = await request("/auth/v1/token?grant_type=refresh_token", "POST", { refresh_token: token });
                const parsed = parseSession(data);
                if (!parsed)
                    throw new Error("Session invalide.");
                persist(parsed);
                return parsed;
            }
            catch (err) {
                const status = err.status;
                if (status === 400 || status === 401) {
                    persist(null);
                    window.dispatchEvent(new Event("ec:session-expired"));
                }
                throw err;
            }
            finally {
                refreshing = null;
            }
        })();
    }
    return (await refreshing).access_token;
}
export async function signIn(email, password) {
    const data = await request("/auth/v1/token?grant_type=password", "POST", { email, password });
    const parsed = parseSession(data);
    if (!parsed)
        throw new Error("Connexion non aboutie.");
    persist(parsed);
}
export async function signUp(email, password, name) {
    const data = await request("/auth/v1/signup", "POST", { email, password, data: { full_name: name }, gotrue_meta_security: {} });
    const parsed = parseSession(data);
    if (parsed)
        persist(parsed);
    return Boolean(parsed);
}
export async function recover(email) { await request("/auth/v1/recover?redirect_to=" + encodeURIComponent(window.location.origin + "/?reset=1"), "POST", { email }); }
export async function passwordUpdate(password) { await request("/auth/v1/user", "PUT", { password }, await accessToken()); }
export function acceptAuthRedirect() {
    const q = new URLSearchParams(location.hash.slice(1));
    const access = q.get("access_token");
    const refresh = q.get("refresh_token");
    if (access && refresh) {
        persist({ access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + Number(q.get("expires_in") || 3600) });
        history.replaceState({}, "", location.pathname + (q.get("type") === "recovery" ? "?reset=1" : ""));
        return true;
    }
    return false;
}
export async function signOut() {
    try {
        if (session)
            await request("/auth/v1/logout", "POST", {}, session.access_token);
    }
    finally {
        persist(null);
    }
}
export async function rpc(action, args = {}, signal) { return await request("/rest/v1/rpc/ec1_api", "POST", { p_action: action, p_args: args }, await accessToken(), signal); }
const blobs = new Map();
export function releaseMedia() {
    for (const b of blobs.values())
        URL.revokeObjectURL(b);
    blobs.clear();
}
export async function loadMedia(bucket, path) {
    const key = bucket + "/" + path;
    if (blobs.has(key))
        return blobs.get(key);
    const c = config();
    const res = await fetch(c.supabaseUrl + "/storage/v1/object/authenticated/" + encodeURIComponent(bucket) + "/" + path.split("/").map(encodeURIComponent).join("/"), { headers: { apikey: c.supabaseKey, Authorization: "Bearer " + await accessToken() }, signal: AbortSignal.timeout(20000) });
    if (!res.ok)
        throw new Error("Image inaccessible.");
    const url = URL.createObjectURL(await res.blob());
    blobs.set(key, url);
    return url;
}
export async function uploadImage(file, userId, kind, targetId, company) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)
        throw new Error("Image JPG, PNG ou WebP de moins de 10 Mo requise.");
    const image = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = kind === "offer" ? 1200 : 640;
    canvas.height = kind === "offer" ? 675 : 640;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        throw new Error("Traitement image indisponible.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const factor = kind === "company" ? Math.min(560 / image.width, 560 / image.height) : Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * factor, height = image.height * factor;
    ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    image.close();
    const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Conversion image impossible.")), "image/webp", 0.86));
    const path = userId + "/" + crypto.randomUUID() + ".webp";
    const c = config();
    const res = await fetch(c.supabaseUrl + "/storage/v1/object/euraconnect-v1/" + path, { method: "POST", headers: { apikey: c.supabaseKey, Authorization: "Bearer " + await accessToken(), "Content-Type": "image/webp", "x-upsert": "false" }, body: blob, signal: AbortSignal.timeout(30000) });
    if (!res.ok)
        throw new Error(errorMessage(await res.json()));
    await rpc("register_media", { type: kind, target_id: targetId, path, company });
    releaseMedia();
}
/** API manager v2 : droits vérifiés par Supabase, pas par l'interface. */
export async function managerRpc(action, args = {}) {
    return await request('/rest/v1/rpc/ec20_manager_api', 'POST', { p_action: action, p_args: args }, await accessToken());
}
/** Invitations de rendez-vous manager : toutes les autorisations sont vérifiées côté Supabase. */
export async function managerMeetingRpc(action, args = {}) {
    return await request('/rest/v1/rpc/ec23_manager_meeting', 'POST', { p_action: action, p_args: args }, await accessToken());
}
