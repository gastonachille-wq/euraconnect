(()=>{try{void localStorage.length;}catch{const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>{delete data[k]}}});}const factories={"./api.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasConfiguration = hasConfiguration;
exports.restoreSession = restoreSession;
exports.signIn = signIn;
exports.signUp = signUp;
exports.recover = recover;
exports.passwordUpdate = passwordUpdate;
exports.acceptAuthRedirect = acceptAuthRedirect;
exports.signOut = signOut;
exports.rpc = rpc;
exports.releaseMedia = releaseMedia;
exports.loadMedia = loadMedia;
exports.uploadImage = uploadImage;
const domain_js_1 = require("./domain.js");
const STORAGE_KEY = "euraconnect.auth.v1";
let session = null;
let refreshing = null;
function config() {
    const c = window.EC_CONFIG;
    if (!c?.supabaseUrl || !c.supabaseKey)
        throw new Error("Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Netlify puis redeployez.");
    return c;
}
function hasConfiguration() { return Boolean(window.EC_CONFIG?.supabaseUrl && window.EC_CONFIG?.supabaseKey); }
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
function restoreSession() {
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
        throw new Error((0, domain_js_1.errorMessage)(err));
    }
    let data;
    try {
        data = await response.json();
    }
    catch {
        data = null;
    }
    if (!response.ok)
        throw Object.assign(new Error((0, domain_js_1.errorMessage)(data)), { status: response.status, ...(data && typeof data === "object" ? data : {}) });
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
async function signIn(email, password) {
    const data = await request("/auth/v1/token?grant_type=password", "POST", { email, password });
    const parsed = parseSession(data);
    if (!parsed)
        throw new Error("Connexion non aboutie.");
    persist(parsed);
}
async function signUp(email, password, name) {
    const data = await request("/auth/v1/signup", "POST", { email, password, data: { full_name: name }, gotrue_meta_security: {} });
    const parsed = parseSession(data);
    if (parsed)
        persist(parsed);
    return Boolean(parsed);
}
async function recover(email) { await request("/auth/v1/recover?redirect_to=" + encodeURIComponent(window.location.origin + "/?reset=1"), "POST", { email }); }
async function passwordUpdate(password) { await request("/auth/v1/user", "PUT", { password }, await accessToken()); }
function acceptAuthRedirect() {
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
async function signOut() {
    try {
        if (session)
            await request("/auth/v1/logout", "POST", {}, session.access_token);
    }
    finally {
        persist(null);
    }
}
async function rpc(action, args = {}, signal) { return await request("/rest/v1/rpc/ec1_api", "POST", { p_action: action, p_args: args }, await accessToken(), signal); }
const blobs = new Map();
function releaseMedia() {
    for (const b of blobs.values())
        URL.revokeObjectURL(b);
    blobs.clear();
}
async function loadMedia(bucket, path) {
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
async function uploadImage(file, userId, kind, targetId, company) {
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
        throw new Error((0, domain_js_1.errorMessage)(await res.json()));
    await rpc("register_media", { type: kind, target_id: targetId, path, company });
    releaseMedia();
}

},
"./app.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_js_1 = require("./api.js");
const domain_js_1 = require("./domain.js");
const views_js_1 = require("./views.js");
const forms_js_1 = require("./forms.js");
const ui_js_1 = require("./ui.js");
const icons_js_1 = require("./icons.js");
const demo_js_1 = require("./demo.js");
const app = document.querySelector("#app");
let boot = null;
let generation = 0;
let pendingNavigation = false;
let authMode = "login";
let authBusy = false;
let demo = true;
let demoRole = "incube";
let activeCompany = localStorage.getItem("euraconnect.company.v1");
let adminCache = null;
let listDirectory = [];
let listOffers = [];
const responses = new Map();
function routeParts() { const [base, query] = location.hash.slice(1).split("?"); const [route, id] = (base || "dashboard").split("/"); return { route: route || "dashboard", id: id || null, params: new URLSearchParams(query || "") }; }
function context() {
    if (!boot)
        throw new Error("Session indisponible.");
    const r = routeParts();
    return { boot, companyId: activeCompany, company: boot.memberships.find(c => c.id === activeCompany), route: r.route, params: r.params, page: Math.max(0, Number(r.params.get("page") || 0) || 0), demo };
}
function navigate(route, params) {
    const hash = "#" + route + (params?.size ? "?" + params.toString() : "");
    if (location.hash === hash)
        void render();
    else
        location.hash = hash;
}
function filter(key, value) {
    const r = routeParts();
    if (value === null)
        r.params.delete(key);
    else
        r.params.set(key, value);
    if (key !== "page")
        r.params.delete("page");
    navigate(r.route, r.params);
}
async function read(action, args = {}) { return demo ? (0, demo_js_1.demoRpc)(action, args, demoRole) : (0, api_js_1.rpc)(action, { company: activeCompany, ...args }); }
async function write(action, args = {}) {
    if (demo)
        throw new Error("Aper\u00E7u de d\u00E9monstration : les donn\u00E9es fictives sont en lecture seule.");
    return (0, api_js_1.rpc)(action, { company: activeCompany, ...args });
}
async function reloadBoot() {
    boot = demo ? (0, demo_js_1.demoBoot)(demoRole) : await (0, api_js_1.rpc)("bootstrap");
    if (!boot.memberships.some(c => c.id === activeCompany))
        activeCompany = boot.memberships.find(c => c.id === boot?.user.company_id)?.id || boot.memberships[0]?.id || null;
    if (activeCompany)
        localStorage.setItem("euraconnect.company.v1", activeCompany);
    else
        localStorage.removeItem("euraconnect.company.v1");
}
async function counts() {
    if (!boot || document.hidden || demo)
        return;
    try {
        const next = await (0, api_js_1.rpc)("bootstrap");
        if (next.user.role !== boot.user.role) {
            boot = next;
            await render();
            return;
        }
        boot.unread_messages = next.unread_messages;
        boot.unread_notifications = next.unread_notifications;
        for (const [id, value] of [["message-counter", next.unread_messages], ["notice-counter", next.unread_notifications]]) {
            const el = document.getElementById(id);
            if (el) {
                el.hidden = value === 0;
                el.textContent = value > 99 ? "99+" : String(value);
                el.className = "counter";
            }
        }
    }
    catch { /* No disruptive toast during background polling. */ }
}
async function render() {
    if (!boot) {
        authScreen();
        return;
    }
    const seq = ++generation;
    const ctx = context();
    const { route, id, params } = routeParts();
    if (!views_js_1.titles[route]) {
        navigate("dashboard");
        return;
    }
    app.innerHTML = (0, views_js_1.shell)(ctx);
    document.title = views_js_1.titles[route]?.[0] + " | EURACONNECT";
    const out = document.getElementById("page-content");
    const args = { ...Object.fromEntries(params), page: ctx.page };
    try {
        let html = "";
        switch (route) {
            case "dashboard":
                html = (0, views_js_1.dashboardView)(ctx, await read("dashboard"));
                break;
            case "needs": {
                const data = await read("needs", { ...args, scope: ctx.boot.user.role === "incube" ? "mine" : "all" });
                html = (0, views_js_1.needsView)(ctx, data);
                break;
            }
            case "directory": {
                const data = await read("directory", args);
                listDirectory = data.items;
                html = (0, views_js_1.directoryView)(ctx, data);
                break;
            }
            case "offers": {
                const data = await read("offers", args);
                listOffers = data.items;
                html = (0, views_js_1.offersView)(ctx, data);
                break;
            }
            case "messages": {
                const threads = await read("threads", args);
                for (const r of threads.items)
                    responses.set(r.id, r);
                const detail = id ? await read("messages", { id }) : null;
                if (detail)
                    responses.set(detail.thread.id, detail.thread);
                html = (0, views_js_1.messagesView)(ctx, threads, detail);
                if (detail && !demo)
                    void write("read_thread", { id, until: detail.read_until }).then(counts).catch(() => undefined);
                break;
            }
            case "agenda":
            case "workshops": {
                const monday = new Date((params.get("from") || (0, domain_js_1.localDate)()) + "T12:00:00Z");
                if (!params.has("from")) {
                    const n = monday.getUTCDay();
                    monday.setUTCDate(monday.getUTCDate() - (n === 0 ? 6 : n - 1));
                }
                const from = (0, domain_js_1.localDate)(monday);
                const end = new Date(monday);
                end.setUTCDate(end.getUTCDate() + 7);
                const scope = params.get("scope") || "mine";
                if (route === "agenda") {
                    ctx.params.set("from", from);
                    ctx.params.set("scope", scope);
                }
                const data = await read("sessions", { ...args, scope: route === "workshops" ? "all" : scope, from: route === "workshops" ? new Date().toISOString() : from, to: route === "workshops" ? null : (0, domain_js_1.localDate)(end), kind: route === "workshops" ? "atelier" : params.get("kind"), host_id: params.get("host_id"), target_company: params.get("target_company"), size: 100 });
                html = (0, views_js_1.sessionsView)(ctx, data, route === "workshops");
                break;
            }
            case "portfolio":
                html = (0, views_js_1.portfolioView)(ctx, await read("portfolio", { id }), id);
                break;
            case "company":
                html = (0, forms_js_1.companyPage)(ctx, activeCompany ? await read("company", { id: activeCompany }) : null);
                break;
            case "admin":
                adminCache = await read("admin", args);
                html = (0, views_js_1.adminView)(ctx, adminCache);
                break;
        }
        if (seq !== generation)
            return;
        out.innerHTML = html;
        await (0, ui_js_1.hydrateImages)(out);
        const msgs = out.querySelector(".message-flow");
        if (msgs)
            msgs.scrollTop = msgs.scrollHeight;
    }
    catch (err) {
        if (seq !== generation)
            return;
        out.innerHTML = (0, ui_js_1.empty)("Cet espace ne peut pas encore \u00EAtre affiche", (0, domain_js_1.errorMessage)(err), (0, ui_js_1.button)("R\u00E9essayer", "refresh", { class: "primary", icon: "refresh" }), "warning");
    }
}
async function openNeed(id) {
    const data = await read("need", { id });
    for (const r of data.responses)
        responses.set(r.id, r);
    (0, ui_js_1.modal)("Fiche de besoin", (0, forms_js_1.needDetail)(context(), data), { wide: true });
}
async function openSession(id) { const s = await read("session", { id }); (0, ui_js_1.modal)((0, domain_js_1.label)(s.kind), (0, forms_js_1.sessionDetail)(context(), s), { wide: true }); }
async function getAdmin() { return adminCache || await read("admin"); }
function simpleForm(command, body, id = "", submit = "Enregistrer") { return `<form id="command-form" data-command="${(0, domain_js_1.escapeHtml)(command)}" data-id="${(0, domain_js_1.escapeHtml)(id)}">${body}${(0, ui_js_1.footerSubmit)(submit)}</form>`; }
async function members(id) { const c = await read("company", { id }); (0, ui_js_1.modal)("Membres de " + c.name, `<p class="muted">Rattachez un compte d\u00E9j\u00E0 cr\u00E9\u00E9. Aucun email n est envoy\u00E9 par cette action.</p><div class="member-list">${c.members.map(m => `<div class="contact-row"><div><strong>${(0, domain_js_1.escapeHtml)(m.name)}</strong><small>${(0, domain_js_1.escapeHtml)(m.email)}</small></div>${(0, ui_js_1.badge)(m.role)}<span class="muted">${m.active ? "Actif" : "D\u00E9sactiv\u00E9"}</span></div>`).join("")}</div>` + simpleForm("set_member", `<input type="hidden" name="target_company" value="${id}">${(0, ui_js_1.field)("email", "Email du compte existant", "", { type: "email", required: true })}${(0, ui_js_1.selectField)("member_role", "Droits dans l'entreprise", ["proprietaire", "gestionnaire", "collaborateur"].map(v => ({ value: v, label: (0, domain_js_1.label)(v) })), "collaborateur")}${(0, ui_js_1.checkField)("active", "Rattachement actif", true)}`, "", "Enregistrer le rattachement")); }
function showPremium() { const c = context().company; (0, ui_js_1.modal)("Premium, uniquement pour les prestataires", `<div class="premium-hero">${(0, icons_js_1.icon)("shield", 34)}<h3>Une identit\u00E9 revelee.<br>Un contexte toujours lisible.</h3></div><div class="comparison"><div><h4>Sans Premium</h4><p>Consultez les briefs, les tags et les budgets. Proposez vos services et echangez dans EURACONNECT.</p></div><div><h4>Avec Premium</h4><p>Identifiez les startups et consultez les coordonn\u00E9es qu elles ont autoris\u00E9es a partager. Les droits s appliquent \u00E0 l'entreprise.</p></div></div><div class="inline-note"><p>Activation et desactivation par l'administrateur. Aucun paiement en ligne. Les incub\u00E9s ne souscrivent jamais de Premium.</p></div>${c?.premium ? `<p class="good">Premium actif pour ${(0, domain_js_1.escapeHtml)(c.name)}${c.expires_at ? " jusqu au " + (0, domain_js_1.dateText)(c.expires_at) : ""}.</p>` : "<p class=\"muted\">Pour une activation, rapprochez-vous de l'\u00E9quipe Eurasante.</p>"}`); }
async function action(el) {
    const act = el.dataset.action;
    const id = el.dataset.id || "";
    if (!boot)
        return;
    const ctx = context();
    switch (act) {
        case "close-modal":
            (0, ui_js_1.closeModal)();
            return;
        case "refresh":
            await render();
            return;
        case "menu":
            document.querySelector(".app-shell")?.classList.toggle("mobile-open");
            return;
        case "logout":
            if (demo) {
                location.href = location.pathname;
                return;
            }
            await (0, api_js_1.signOut)();
            (0, api_js_1.releaseMedia)();
            boot = null;
            (0, ui_js_1.closeModal)();
            authScreen();
            return;
        case "go":
            (0, ui_js_1.closeModal)();
            navigate(el.dataset.route || "dashboard");
            return;
        case "global-search":
            (0, ui_js_1.closeModal)();
            navigate("directory");
            setTimeout(() => document.querySelector("#filter-form input[name=q]")?.focus(), 250);
            return;
        case "premium":
            showPremium();
            return;
        case "page":
            filter("page", el.dataset.page || "0");
            return;
        case "clear-filters":
            navigate(ctx.route);
            return;
        case "directory-kind":
            filter("kind", el.dataset.kind || null);
            return;
        case "favorite": {
            el.setAttribute("disabled", "");
            try {
                await write("favorite", { id, type: el.dataset.type, value: el.dataset.value === "true" });
                el.classList.toggle("on", el.dataset.value === "true");
                el.setAttribute("aria-pressed", el.dataset.value || "false");
                el.dataset.value = String(el.dataset.value !== "true");
                (0, ui_js_1.toast)("Vos favoris sont \u00E0 jour.");
                if (ctx.params.get("favorites") === "true")
                    await render();
            }
            finally {
                el.removeAttribute("disabled");
            }
            return;
        }
        case "new-need":
            if (ctx.boot.user.role !== "admin" && !ctx.company) {
                (0, ui_js_1.toast)("Creez ou rejoignez votre entreprise pour publier.");
                navigate("company");
                return;
            }
            (0, ui_js_1.modal)("Nouvelle demande", (0, forms_js_1.needForm)(ctx, undefined, ctx.boot.user.role === "admin" ? (await getAdmin()).companies : []), { wide: true });
            return;
        case "open-need":
            await openNeed(id);
            return;
        case "edit-need": {
            const data = await read("need", { id });
            (0, ui_js_1.modal)("Modifier la demande", (0, forms_js_1.needForm)(ctx, data.need, ctx.boot.user.role === "admin" ? (await getAdmin()).companies : []), { wide: true });
            return;
        }
        case "need-status": {
            const data = await read("need", { id });
            (0, ui_js_1.modal)("Faire avancer le besoin", (0, forms_js_1.statusForm)(data.need));
            return;
        }
        case "respond": {
            const data = await read("need", { id });
            (0, ui_js_1.modal)("Proposer mon expertise", (0, forms_js_1.responseForm)(data.need), { wide: true });
            return;
        }
        case "view-response": {
            let r = responses.get(id);
            if (!r) {
                const d = await read("messages", { id });
                r = d.thread;
            }
            (0, ui_js_1.modal)("Proposition du prestataire", (0, forms_js_1.responseDetail)(r), { wide: true });
            return;
        }
        case "response-decision": {
            const s = el.dataset.status || "en_discussion";
            (0, ui_js_1.modal)(s === "declinee" ? "Ne pas donner suite" : s === "retenue" ? "Retenir cette proposition" : "Ouvrir la discussion", simpleForm("response_status", `<input name="status" type="hidden" value="${s}">${(0, ui_js_1.field)("reason", s === "declinee" ? "Motif communique au prestataire" : "Message de d\u00E9cision", "", { type: "textarea", required: s === "declinee", help: "La d\u00E9cision est notifiee au prestataire." })}`, id, "Confirmer ma d\u00E9cision"));
            return;
        }
        case "open-thread":
            (0, ui_js_1.closeModal)();
            navigate("messages/" + id);
            return;
        case "directory-slots": {
            const r = el.dataset.kind || "company";
            (0, ui_js_1.closeModal)();
            const p = new URLSearchParams({ scope: "all", view: "list" });
            p.set(r === "company" ? "target_company" : "host_id", id);
            navigate("agenda", p);
            return;
        }
        case "directory-detail": {
            const d = listDirectory.find(x => x.id === id && x.kind === el.dataset.kind);
            if (!d)
                return;
            let extra = "";
            if (d.kind === "company" && d.identity_visible) {
                const c = await read("company", { id });
                extra = `<p class="muted">${(0, domain_js_1.escapeHtml)(c.details?.sector || "")} ${(0, domain_js_1.escapeHtml)(c.details?.city || "")}</p>${c.details?.contact_email ? `<p>${(0, icons_js_1.icon)("mail", 16)} ${(0, domain_js_1.escapeHtml)(c.details.contact_email)}</p>` : ""}${c.details?.phone ? "<p>" + (0, domain_js_1.escapeHtml)(c.details.phone) + "</p>" : ""}`;
            }
            (0, ui_js_1.modal)(d.kind === "company" ? "Fiche entreprise" : "Fiche contact", `<div class="identity-row">${(0, ui_js_1.avatar)(d.name, d.media, d.kind === "company")}<div><h2>${(0, domain_js_1.escapeHtml)(d.name)}</h2>${(0, ui_js_1.badge)(d.type)}<p>${(0, domain_js_1.escapeHtml)(d.subtitle || d.company_name || "")}</p></div></div><div class="prose">${(0, domain_js_1.markdown)(d.description)}</div>${(0, ui_js_1.tags)(d.tags)}${extra}<footer class="form-footer">${(0, ui_js_1.button)("Voir les disponibilit\u00E9s", "directory-slots", { id: d.id, icon: "calendar", class: "primary", extra: `data-kind="${d.kind}"` })}</footer>`, { wide: true });
            return;
        }
        case "new-offer":
            if (!ctx.company) {
                (0, ui_js_1.toast)("Configurez votre entreprise prestataire.");
                navigate("company");
                return;
            }
            (0, ui_js_1.modal)("Nouvelle offre", (0, forms_js_1.offerForm)(), { wide: true });
            return;
        case "offer-detail": {
            const o = listOffers.find(x => x.id === id);
            if (!o)
                return;
            if (o.can_edit) {
                (0, ui_js_1.modal)("Modifier mon offre", (0, forms_js_1.offerForm)(o) + (0, ui_js_1.button)("Ajouter une image", "upload", { id, icon: "upload", extra: "data-type=\"offer\"" }), { wide: true });
                return;
            }
            (0, ui_js_1.modal)("Offre de service", `<p class="eyebrow">${(0, domain_js_1.escapeHtml)(o.provider)}</p><h2>${(0, domain_js_1.escapeHtml)(o.title)}</h2>${(0, ui_js_1.tags)(o.tags)}<div class="prose">${(0, domain_js_1.markdown)(o.description)}</div>${o.benefit ? "<div class=\"inline-note\">" + (0, domain_js_1.escapeHtml)(o.benefit) + "</div>" : ""}<footer class="form-footer">${(0, ui_js_1.button)("Voir les disponibilit\u00E9s", "directory-slots", { id: o.company_id, icon: "calendar", class: "primary", extra: "data-kind=\"company\"" })}</footer>`, { wide: true });
            return;
        }
        case "new-session":
            (0, ui_js_1.modal)("Organiser une rencontre", (0, forms_js_1.sessionForm)(ctx, el.dataset.kind || "creneau"), { wide: true });
            return;
        case "propose":
            (0, ui_js_1.modal)("Proposer un rendez-vous", (0, forms_js_1.sessionForm)(ctx, "proposition", id), { wide: true });
            return;
        case "open-session":
            await openSession(id);
            return;
        case "agenda-scope":
            filter("scope", el.dataset.scope || "mine");
            return;
        case "agenda-view":
            filter("view", el.dataset.view || "week");
            return;
        case "agenda-today":
            filter("from", (0, domain_js_1.localDate)());
            return;
        case "agenda-week": {
            const day = new Date((ctx.params.get("from") || (0, domain_js_1.localDate)()) + "T12:00:00Z");
            if (!ctx.params.has("from"))
                day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
            day.setUTCDate(day.getUTCDate() + Number(el.dataset.direction || "1") * 7);
            filter("from", (0, domain_js_1.localDate)(day));
            return;
        }
        case "export-ics": {
            const s = await read("session", { id });
            const href = URL.createObjectURL(new Blob([(0, domain_js_1.calendarIcs)(s)], { type: "text/calendar;charset=utf-8" }));
            const a = document.createElement("a");
            a.href = href;
            a.download = "EURACONNECT-rendez-vous.ics";
            a.click();
            setTimeout(() => URL.revokeObjectURL(href), 2000);
            return;
        }
        case "cancel-booking":
            (0, ui_js_1.modal)("Annuler votre inscription", simpleForm("cancel_booking", "<p>La place sera liberee. L'organisateur sera inform\u00E9.</p>", id, "Confirmer l'annulation"));
            return;
        case "cancel-session":
            (0, ui_js_1.modal)("Annuler cette rencontre", simpleForm("session_status", "<input type=\"hidden\" name=\"status\" value=\"annul\u00E9\"><p>Toutes les personnes inscrites seront notifiees dans EURACONNECT.</p>", id, "Annuler la rencontre"));
            return;
        case "complete-session":
            await write("session_status", { id, status: "realise" });
            await openSession(id);
            await render();
            return;
        case "attendance":
            await write("attendance", { id, status: el.dataset.status });
            (0, ui_js_1.toast)("Pr\u00E9sence enregistr\u00E9e.");
            (0, ui_js_1.closeModal)();
            await render();
            return;
        case "followup-form":
            (0, ui_js_1.modal)("Action d'accompagnement", simpleForm("followup", `<input type="hidden" name="target_company" value="${id}">${(0, ui_js_1.field)("body", "Observation et prochaine action", "", { type: "textarea", required: true })}${(0, ui_js_1.field)("due_at", "\u00C9ch\u00E9ance de suivi", "", { type: "date" })}<p class="muted">Visible uniquement des managers affect\u00E9s et de l'administrateur.</p>`));
            return;
        case "task-toggle":
            await write("followup", { id, target_company: el.dataset.company, done: el.dataset.done === "true" });
            await render();
            return;
        case "edit-profile":
            (0, ui_js_1.modal)("Ma fiche contact", (0, forms_js_1.profileForm)(ctx), { wide: true });
            return;
        case "new-company":
            (0, ui_js_1.modal)("Cr\u00E9er une entreprise", (0, forms_js_1.companyForm)(ctx, null, ctx.boot.user.role === "admin" ? await getAdmin() : undefined), { wide: true });
            return;
        case "edit-company":
            (0, ui_js_1.modal)("Fiche entreprise", (0, forms_js_1.companyForm)(ctx, await read("company", { id })), { wide: true });
            return;
        case "manage-members":
            await members(id);
            return;
        case "upload": {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/png,image/jpeg,image/webp";
            input.onchange = () => {
                const file = input.files?.[0];
                if (!file)
                    return;
                if (demo) {
                    (0, ui_js_1.toast)("Les fichiers ne sont pas envoy\u00E9s en d\u00E9monstration.");
                    return;
                }
                el.setAttribute("disabled", "");
                void (0, api_js_1.uploadImage)(file, ctx.boot.user.id, el.dataset.type, id, activeCompany).then(async () => { (0, ui_js_1.toast)("Image enregistr\u00E9e et redimensionn\u00E9e."); (0, ui_js_1.closeModal)(); await reloadBoot(); await render(); }).catch(err => (0, ui_js_1.toast)((0, domain_js_1.errorMessage)(err), true)).finally(() => el.removeAttribute("disabled"));
            };
            input.click();
            return;
        }
        case "change-password":
            (0, ui_js_1.modal)("Modifier mon mot de passe", simpleForm("password", (0, ui_js_1.field)("password", "Nouveau mot de passe", "", { type: "password", required: true, help: "12 caract\u00E8res minimum." })));
            return;
        case "admin-tab":
            filter("tab", el.dataset.tab || "companies");
            return;
        case "admin-user": {
            const u = (await getAdmin()).users.find(x => x.id === id);
            if (!u)
                return;
            (0, ui_js_1.modal)("Administrer le compte", simpleForm("admin_user", `<p><strong>${(0, domain_js_1.escapeHtml)(u.name || u.email)}</strong></p>${(0, ui_js_1.selectField)("role", "R\u00F4le", Object.entries(domain_js_1.roleLabels).map(([value, t]) => ({ value, label: t })), u.role)}${(0, ui_js_1.selectField)("status", "Acc\u00E8s", [{ value: "actif", label: "Actif" }, { value: "suspendu", label: "Suspendu" }], u.status)}<p class="muted">La suppression de vos propres droits administrateur et du dernier administrateur est bloqu\u00E9e.</p>`, id));
            return;
        }
        case "admin-company": {
            const c = (await getAdmin()).companies.find(x => x.id === id);
            if (!c)
                return;
            (0, ui_js_1.modal)("Validation de " + c.name, simpleForm("admin_company", (0, ui_js_1.selectField)("status", "Statut de publication", [{ value: "publiee", label: "Publi\u00E9e et valid\u00E9e" }, { value: "masquee", label: "Masquee / suspendue" }, { value: "brouillon", label: "En attente de validation" }], c.status) + (0, ui_js_1.field)("reason", "Motif / observation", "", { type: "textarea" }), id));
            return;
        }
        case "admin-premium": {
            const c = (await getAdmin()).companies.find(x => x.id === id);
            if (!c)
                return;
            (0, ui_js_1.modal)("Premium - " + c.name, simpleForm("admin_premium", `<p class="muted">Un droit porte par l'entreprise. Aucun paiement n est declenche.</p>${(0, ui_js_1.checkField)("active", "Activer Premium", c.premium)}${(0, ui_js_1.field)("expires_at", "Expiration (optionnelle)", c.expires_at?.slice(0, 16) || "", { type: "datetime-local", help: "Heure Europe/Paris. Vide = sans expiration." })}${(0, ui_js_1.field)("reason", "Justification administrative", "", { type: "textarea", required: true })}`, id));
            return;
        }
        case "assign-manager": {
            const data = await getAdmin();
            (0, ui_js_1.modal)("Attribuer une startup", simpleForm("assign_manager", (0, ui_js_1.selectField)("manager_id", "Startup Manager", data.users.filter(u => u.role === "startup_manager").map(u => ({ value: u.id, label: u.name || u.email }))) + (0, ui_js_1.selectField)("target_company", "Startup", data.companies.filter(c => c.type === "startup").map(c => ({ value: c.id, label: c.name }))) + "<input type=\"hidden\" name=\"active\" value=\"true\">"));
            return;
        }
        case "remove-assignment":
            await write("assign_manager", { id, target_company: el.dataset.company, active: false });
            adminCache = null;
            await render();
            return;
        case "notifications":
            (0, ui_js_1.modal)("Vos notifications", (0, views_js_1.notificationList)(await read("notifications", { size: 100 })), { wide: false });
            return;
        case "read-all":
            await write("read_notification", { all: true });
            await counts();
            (0, ui_js_1.modal)("Vos notifications", (0, views_js_1.notificationList)(await read("notifications", { size: 100 })));
            return;
        case "open-notification": {
            if (!demo)
                await write("read_notification", { id });
            (0, ui_js_1.closeModal)();
            void counts();
            const target = el.dataset.target || "";
            if (el.dataset.type === "need" && target)
                await openNeed(target);
            else if (el.dataset.type === "thread" && target)
                navigate("messages/" + target);
            else if (el.dataset.type === "session" && target)
                await openSession(target);
            else
                navigate("dashboard");
            return;
        }
    }
}
async function submitCommand(form) {
    const command = form.dataset.command || "";
    const args = (0, ui_js_1.formValues)(form);
    const id = form.dataset.id;
    if (id)
        args.id = id;
    for (const key of ["budget_min", "budget_max", "price"])
        if (key in args)
            args[key] = (0, domain_js_1.cents)(String(args[key] || ""));
    for (const key of ["lead_days", "duration", "block_minutes", "break_minutes", "weeks", "capacity"])
        if (key in args)
            args[key] = String(args[key]).trim() ? Number(args[key]) : null;
    if (command === "save_need" && args.deadline)
        args.deadline = String(args.deadline) + "T23:59:00";
    if (command === "create_session" && args.kind !== "atelier")
        delete args.tags;
    if (command === "assign_manager") {
        args.id = args.manager_id;
    }
    if (command === "password") {
        if (String(args.password).length < 12)
            throw new Error("12 caract\u00E8res minimum pour le mot de passe.");
        if (demo)
            throw new Error("Aper\u00E7u en lecture seule.");
        await (0, api_js_1.passwordUpdate)(String(args.password));
    }
    else
        await write(command, args);
    (0, ui_js_1.toast)(command === "book_session" ? "Inscription enregistr\u00E9e. Consultez le statut de votre rendez-vous." : command === "respond" ? "Votre proposition a \u00E9t\u00E9 transmise \u00E0 la startup." : "Enregistrement effectu\u00E9.");
    (0, ui_js_1.closeModal)();
    adminCache = null;
    await reloadBoot();
    await render();
}
function authScreen(error = "") {
    const recovery = new URLSearchParams(location.search).get("reset") === "1" && (0, api_js_1.restoreSession)();
    if (recovery) {
        authMode = "reset";
    }
    app.innerHTML = `<div class="auth-layout"><aside class="auth-brand"><a class="brand" href="#"><span class="brand-mark">E<span>+</span></span>EURACONNECT</a><p class="eyebrow">LE R\u00C9SEAU QUI FAIT AVANCER VOS PROJETS</p><h1>La bonne expertise.<br>La bonne rencontre.<br><em>Au bon moment.</em></h1><p>Startup, prestataire ou \u00E9quipe d'accompagnement : un espace commun pour transformer les besoins en collaborations.</p><div class="auth-steps">${[["needs", "Exprimer un besoin"], ["people", "Mobiliser une expertise"], ["calendar", "Passer \u00E0 l'action"]].map(([i, t]) => "<span>" + (0, icons_js_1.icon)(i || "needs", 21) + (0, domain_js_1.escapeHtml)(t) + "</span>").join("")}</div><footer>EURASANTE &middot; Services et accompagnement</footer></aside><main class="auth-main"><div class="auth-card"><p class="eyebrow">BIENVENUE DANS VOTRE R\u00C9SEAU</p><h2>${authMode === "signup" ? "Rejoindre en tant que prestataire" : authMode === "recover" ? "Retrouver mon acc\u00E8s" : authMode === "reset" ? "Nouveau mot de passe" : "Se connecter"}</h2><p class="muted">${authMode === "signup" ? "Votre entreprise sera valid\u00E9e par l'\u00E9quipe avant publication. Les comptes incub\u00E9s et managers sont g\u00E9r\u00E9s par l'administrateur." : "Retrouvez vos projets, vos contacts et vos prochaines rencontres."}</p>
 ${!(0, api_js_1.hasConfiguration)() ? "<div class=\"warning-note\">Configuration Netlify requise : NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY. Reconstruisez le site apr\u00E8s enregistrement.</div>" : ""}<form id="auth-form">${authMode === "signup" ? (0, ui_js_1.field)("name", "Pr\u00E9nom et nom", "", { required: true }) : ""}${authMode !== "reset" ? (0, ui_js_1.field)("email", "Email professionnel", "", { type: "email", required: true }) : ""}${authMode !== "recover" ? (0, ui_js_1.field)("password", "Mot de passe", "", { type: "password", required: true, help: authMode === "login" ? "" : "12 caract\u00E8res minimum." }) : ""}<div class="form-error" role="alert" ${error ? "" : "hidden"}>${(0, domain_js_1.escapeHtml)(error)}</div><button class="btn primary full" type="submit" ${!(0, api_js_1.hasConfiguration)() ? "disabled" : ""}>${authMode === "signup" ? "Cr\u00E9er mon compte" : authMode === "recover" ? "Envoyer le lien" : authMode === "reset" ? "Enregistrer le mot de passe" : "Entrer dans mon espace"}${(0, icons_js_1.icon)("arrow", 17)}</button></form><div class="auth-links">${authMode === "login" ? "<button data-auth=\"recover\">Mot de passe oubli\u00E9 ?</button><button data-auth=\"signup\">Devenir prestataire</button>" : "<button data-auth=\"login\">Revenir \u00E0 la connexion</button>"}</div><div class="auth-demo"><span>D\u00E9couvrir les nouveaux parcours</span><a href="?demo=1">Ouvrir l'aper\u00E7u avec des donn\u00E9es fictives ${(0, icons_js_1.icon)("arrow", 15)}</a></div></div><footer>Vos identifiants restent g\u00E9r\u00E9s par Supabase Auth.</footer></main></div>`;
}
document.addEventListener("click", event => {
    const el = event.target.closest("[data-action],[data-auth]");
    if (!el || el.hasAttribute("disabled"))
        return;
    if (el.dataset.auth) {
        authMode = el.dataset.auth;
        authScreen();
        return;
    }
    event.preventDefault();
    void action(el).catch(err => (0, ui_js_1.toast)((0, domain_js_1.errorMessage)(err), true));
});
document.addEventListener("submit", event => {
    const form = event.target;
    if (!["command-form", "auth-form", "message-form", "filter-form"].includes(form.id))
        return;
    event.preventDefault();
    if (form.id === "filter-form") {
        const values = (0, ui_js_1.formValues)(form);
        const r = routeParts();
        const p = new URLSearchParams(r.params);
        p.delete("page");
        Object.entries(values).forEach(([k, v]) => {
            if (v === false || v === "" || v == null)
                p.delete(k);
            else
                p.set(k, String(v));
        });
        navigate(r.route, p);
        return;
    }
    if (form.dataset.busy === "true")
        return;
    form.dataset.busy = "true";
    const submit = form.querySelector("[type=submit]");
    const original = submit?.innerHTML || "";
    if (submit) {
        submit.disabled = true;
        submit.innerHTML = "<span class=\"spinner\"></span> En cours...";
    }
    const err = form.querySelector(".form-error");
    if (err) {
        err.hidden = true;
        err.textContent = "";
    }
    const run = async () => {
        if (form.id === "auth-form") {
            if (authBusy)
                return;
            authBusy = true;
            try {
                const v = (0, ui_js_1.formValues)(form);
                const email = String(v.email || "").trim();
                const pass = String(v.password || "");
                if (["signup", "reset"].includes(authMode) && pass.length < 12)
                    throw new Error("Le mot de passe doit contenir au moins 12 caract\u00E8res.");
                if (authMode === "recover") {
                    await (0, api_js_1.recover)(email);
                    (0, ui_js_1.toast)("Si le compte est \u00E9ligible, un lien de r\u00E9cup\u00E9ration sera envoy\u00E9.");
                    return;
                }
                if (authMode === "signup") {
                    const connected = await (0, api_js_1.signUp)(email, pass, String(v.name || ""));
                    if (!connected) {
                        authMode = "login";
                        authScreen();
                        (0, ui_js_1.toast)("V\u00E9rifiez votre bo\u00EEte email pour confirmer votre inscription.");
                        return;
                    }
                }
                else if (authMode === "reset") {
                    await (0, api_js_1.passwordUpdate)(pass);
                    history.replaceState({}, "", location.pathname + "#dashboard");
                }
                else
                    await (0, api_js_1.signIn)(email, pass);
                await reloadBoot();
                navigate("dashboard");
                await render();
            }
            finally {
                authBusy = false;
            }
        }
        else if (form.id === "message-form") {
            const values = (0, ui_js_1.formValues)(form);
            await write("send_message", { id: form.dataset.id, body: values.body });
            await render();
            void counts();
        }
        else
            await submitCommand(form);
    };
    void run().catch(error => {
        const text = (0, domain_js_1.errorMessage)(error);
        if (err && err.isConnected) {
            err.hidden = false;
            err.textContent = text;
            err.scrollIntoView({ block: "nearest" });
        }
        else
            (0, ui_js_1.toast)(text, true);
    }).finally(() => {
        form.dataset.busy = "false";
        if (submit?.isConnected) {
            submit.disabled = false;
            submit.innerHTML = original;
        }
    });
});
document.addEventListener("change", event => {
    const el = event.target;
    if (el.id === "company-switch") {
        activeCompany = el.value || null;
        if (activeCompany)
            localStorage.setItem("euraconnect.company.v1", activeCompany);
        (0, api_js_1.releaseMedia)();
        (0, ui_js_1.closeModal)();
        void render();
    }
    if (el.id === "demo-role") {
        demoRole = el.value;
        void reloadBoot().then(() => { navigate("dashboard"); return render(); });
    }
    if (el.name === "kind") {
        document.querySelector(".permanence-fields")?.toggleAttribute("hidden", el.value !== "permanence");
        document.querySelector(".workshop-fields")?.toggleAttribute("hidden", el.value !== "atelier");
    }
});
document.addEventListener("keydown", event => {
    const t = event.target;
    if (event.key === "/" && !(0, ui_js_1.modalOpen)() && !["INPUT", "TEXTAREA"].includes(t.tagName) && !t.isContentEditable) {
        event.preventDefault();
        navigate("directory");
        setTimeout(() => document.querySelector("[name=q]")?.focus(), 250);
    }
});
window.addEventListener("hashchange", () => {
    if (pendingNavigation)
        return;
    (0, ui_js_1.closeModal)();
    if (boot)
        void render();
});
window.addEventListener("ec:session-expired", () => { boot = null; (0, api_js_1.releaseMedia)(); (0, ui_js_1.closeModal)(); authScreen("Votre session a expir\u00E9. Reconnectez-vous."); });
window.addEventListener("storage", ev => {
    if (ev.key === "euraconnect.auth.v1" && !ev.newValue) {
        boot = null;
        (0, api_js_1.releaseMedia)();
        authScreen();
    }
});
window.addEventListener("focus", () => { void counts(); });
setInterval(() => { void counts(); }, 30000);
async function start() {
    try {
        if (demo) {
            await reloadBoot();
            await render();
            return;
        }
        (0, api_js_1.acceptAuthRedirect)();
        if (new URLSearchParams(location.search).get("reset") === "1") {
            authScreen();
            return;
        }
        if ((0, api_js_1.restoreSession)()) {
            await reloadBoot();
            if (!location.hash) {
                pendingNavigation = true;
                history.replaceState({}, "", location.pathname + "#dashboard");
                pendingNavigation = false;
            }
            await render();
        }
        else
            authScreen();
    }
    catch (err) {
        authScreen((0, domain_js_1.errorMessage)(err));
    }
}
void start();

},
"./demo.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ids = void 0;
exports.demoBoot = demoBoot;
exports.demoRpc = demoRpc;
exports.ids = { startup: "00000000-0000-4000-8000-000000000001", provider: "00000000-0000-4000-8000-000000000002", other: "00000000-0000-4000-8000-000000000003", incube: "00000000-0000-4000-8000-000000000004", expert: "00000000-0000-4000-8000-000000000005", manager: "00000000-0000-4000-8000-000000000006", admin: "00000000-0000-4000-8000-000000000007" };
const uid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const now = new Date();
const past = (d) => new Date(now.valueOf() - d * 86400000).toISOString();
const future = (d, h = 10) => { const date = new Date(now.valueOf() + d * 86400000); date.setUTCHours(h, 0, 0, 0); return date.toISOString(); };
const roleNames = { incube: "Camille Laurent", prestataire: "Alex Martin", startup_manager: "Lea Bernard", admin: "Administration Eurasante" };
const userId = (role) => role === "incube" ? exports.ids.incube : role === "prestataire" ? exports.ids.expert : role === "startup_manager" ? exports.ids.manager : exports.ids.admin;
const tag = (label) => ({ label });
function demoBoot(role) { return { version: "1.0.0", active: true, user: { id: userId(role), name: roleNames[role], role, company_id: role === "incube" ? exports.ids.startup : role === "prestataire" ? exports.ids.provider : null, email: "d\u00E9monstration@example.invalid" }, memberships: role === "incube" ? [{ id: exports.ids.startup, name: "Nova Care Studio", type: "startup", status: "publiee", member_role: "proprietaire", premium: false, expires_at: null, provider_status: null }] : role === "prestataire" ? [{ id: exports.ids.provider, name: "Clarte Conseil", type: "prestataire", status: "publiee", member_role: "proprietaire", premium: false, expires_at: null, provider_status: "valide" }] : [], unread_notifications: 3, unread_messages: 2, profile: { nom_public: roleNames[role], titre: role === "incube" ? "Cofondatrice - Innovation en sant\u00E9" : role === "prestataire" ? "Conseil strategique & r\u00E9glementaire" : "Accompagnement des startups", bio_html: "Profil fictif pour la d\u00E9monstration de la plateforme.", visible: true, tags: [tag("Innovation en sant\u00E9"), tag("Strat\u00E9gie")], media: null } }; }
function needs(role) {
    return [
        { title: "Structurer notre strat\u00E9gie r\u00E9glementaire", context: "Nous d\u00E9veloppons un dispositif de suivi a domicile et souhaitons s\u00E9curiser les \u00E9tapes avant la validation du prototype. Nous recherchons un accompagnement pragmatique pour transformer les exigences applicables en une feuille de route op\u00E9rationnelle.", objectives: "Identifier les exigences et prioriser les actions avant le pilote.", deliverables: "Cartographie des exigences, analyse des \u00E9carts et feuille de route sur six mois.", constraints: "Une \u00E9quipe de quatre personnes, un prototype fonctionnel et une premi\u00E8re exp\u00E9rimentation pr\u00E9vue au prochain trimestre.", status: "en_echanges", tags: [tag("Dispositifs m\u00E9dicaux"), tag("Strat\u00E9gie r\u00E9glementaire"), tag("Qualit\u00E9")], budget_min: 300000, budget_max: 650000, responses_count: 3, match_count: 2 },
        { title: "Concevoir une exp\u00E9rience patient plus intuitive", context: "Notre interface de suivi doit devenir plus accessible. Nous recherchons une expertise UX pour identifier les points de friction puis tester un nouveau parcours avec des utilisateurs volontaires.", objectives: "Simplifier les trois \u00E9crans essentiels du parcours.", deliverables: "Audit UX, maquettes et protocole de test.", constraints: "Mission courte avec deux ateliers de co-conception.", status: "ouvert", tags: [tag("Design UX"), tag("Recherche utilisateur"), tag("Sant\u00E9 num\u00E9rique")], budget_min: 200000, budget_max: 400000, responses_count: 0, match_count: 1 },
        { title: "Pr\u00E9parer notre prochain tour de financement", context: "Nous souhaitons structurer un dossier investisseur coh\u00E9rent avec notre feuille de route et nos premiers retours utilisateurs. Le besoin porte sur le mod\u00E8le financier, le positionnement et la pr\u00E9paration des rendez-vous.", objectives: "Disposer d'un dossier clair et d'hypoth\u00E8ses financi\u00E8res document\u00E9es.", deliverables: "Pr\u00E9sentation investisseurs, mod\u00E8le financier et simulation de pitch.", constraints: "Travail en distanciel, six semaines de pr\u00E9paration.", status: "devis_recu", tags: [tag("Financement"), tag("Business plan")], budget_min: 150000, budget_max: 350000, responses_count: 2, match_count: 0 },
        { title: "Organiser un pilote terrain avec des partenaires", context: "Notre \u00E9quipe prepare une exp\u00E9rimentation et recherche un accompagnement dans le cadrage, le recrutement des participants et la mesure des retours, sans transfert de donn\u00E9es de sant\u00E9 dans EURACONNECT.", objectives: "Mettre en place une exp\u00E9rimentation r\u00E9aliste et mesurable.", deliverables: "Protocole de pilote et grille d'\u00E9valuation.", constraints: "Coordination avec trois structures partenaires.", status: "rdv_planifie", tags: [tag("Exp\u00E9rimentation"), tag("Gestion de projet")], budget_min: null, budget_max: null, responses_count: 1, match_count: 0 }
    ].map((n, i) => ({ ...n, id: uid(100 + i), company_id: role === "prestataire" ? null : exports.ids.startup, company_name: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", author_name: role === "prestataire" ? "Contact startup" : "Camille Laurent", identity_visible: role !== "prestataire", owned: role === "incube" || role === "admin", can_edit: role === "incube" || role === "admin", format: "distance", deadline: future(14 + i * 3), created_at: past(8 - i), updated_at: past(i), favorite: i === 0, my_response: role === "prestataire" && i === 0 ? uid(200) : null, responses_count: role === "prestataire" ? null : n.responses_count, contact: role === "incube" || role === "admin" ? { name: "Camille Laurent", email: "demo@example.invalid", phone: "", shared: false } : null }));
}
function threads(role) {
    return [{ id: uid(200), need_id: uid(100), company_id: exports.ids.provider, provider: "Clarte Conseil", author: "Alex Martin", need_title: "Structurer notre strat\u00E9gie r\u00E9glementaire", startup: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", startup_id: role === "prestataire" ? "" : exports.ids.startup, message: "Nous proposons un premier diagnostic pour construire une feuille de route claire et prioris\u00E9e. Notre approche combine un atelier de cadrage, une revue documentaire et une restitution op\u00E9rationnelle.", approach: "Trois temps : cadrage, diagnostic des \u00E9carts, recommandations et plan d'action.", price: 480000, lead_days: 20, status: "en_discussion", reason: "", created_at: past(2), can_decide: role === "incube" || role === "admin", can_message: role !== "startup_manager", unread: 2 },
        { id: uid(201), need_id: uid(102), company_id: uid(30), provider: "Trajectoire Finance", author: "Sophie Dumas", need_title: "Pr\u00E9parer notre prochain tour de financement", startup: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", startup_id: role === "prestataire" ? "" : exports.ids.startup, message: "Notre accompagnement d\u00E9marre par la consolidation de vos hypoth\u00E8ses et se poursuit par la construction du dossier investisseur.", approach: "Mod\u00E8le financier, pr\u00E9sentation et pr\u00E9paration orale.", price: 290000, lead_days: 30, status: "envoyee", reason: "", created_at: past(1), can_decide: role === "incube" || role === "admin", can_message: role !== "startup_manager", unread: 0 }];
}
function sessions(role) {
    return [
        { id: uid(300), title: "Cadrage de la strat\u00E9gie r\u00E9glementaire", kind: "proposition", description: "Comprendre les enjeux du prototype, valider les livrables et partager les prochaines \u00E9tapes.", starts_at: future(1, 8), ends_at: future(1, 9), host_id: exports.ids.expert, host_name: "Alex Martin", company_id: exports.ids.provider, company_name: "Clarte Conseil", mode: "visio", location: "", capacity: 1, occupied: 1, need_id: uid(100), response_id: uid(200), registration: role === "incube" ? "confirme" : null, purpose: "Valider le p\u00E9rim\u00E8tre de notre accompagnement.", participants: [{ id: uid(500), user_id: exports.ids.incube, name: role === "prestataire" ? "Contact startup" : "Camille Laurent", company: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", status: "confirme", purpose: "Valider le p\u00E9rim\u00E8tre de notre accompagnement." }] },
        { id: uid(301), title: "Permanence : questions r\u00E9glementaires", kind: "permanence", description: "Un premier \u00E9change de trente minutes pour identifier votre besoin et vous orienter.", starts_at: future(2, 12), ends_at: future(2, 12.5), host_id: exports.ids.expert, host_name: "Alex Martin", company_id: exports.ids.provider, company_name: "Clarte Conseil", mode: "visio", location: "", capacity: 1, occupied: 0, need_id: null, response_id: null, registration: null, purpose: null, participants: [] },
        { id: uid(302), title: "Un pitch clair pour ouvrir les bonnes portes", kind: "atelier", description: "Un atelier collectif pour formuler sa proposition de valeur, confronter ses arguments et repartir avec un plan de progression concret. Chaque participant travaille \u00E0 partir de son propre projet.", starts_at: future(3, 8), ends_at: future(3, 10), host_id: exports.ids.manager, host_name: "Lea Bernard", company_id: null, company_name: "\u00C9quipe Eurasante", mode: "sur_site", location: "", capacity: 12, occupied: 8, need_id: null, response_id: null, registration: null, purpose: null, participants: [] },
        { id: uid(303), title: "Financement : pr\u00E9parer son premier dossier", kind: "atelier", description: "Comprendre les attentes d'un financeur et construire les elements essentiels de son dossier.", starts_at: future(5, 12), ends_at: future(5, 14), host_id: exports.ids.expert, host_name: "Alex Martin", company_id: exports.ids.provider, company_name: "Clarte Conseil", mode: "visio", location: "", capacity: 20, occupied: 13, need_id: null, response_id: null, registration: null, purpose: null, participants: [] }
    ].map(s => ({ ...s, ends_at: s.ends_at <= s.starts_at ? new Date(new Date(s.starts_at).valueOf() + 1800000).toISOString() : s.ends_at, status: "ouvert", timezone: "Europe/Paris", registration_id: s.registration ? uid(500) : null, mine: s.host_id === userId(role) || !!s.registration, can_manage: s.host_id === userId(role) || role === "admin" }));
}
function directory(role) {
    return [
        { id: exports.ids.provider, kind: "company", type: "prestataire", name: "Clarte Conseil", subtitle: "Strat\u00E9gie, qualit\u00E9 & dispositifs m\u00E9dicaux", description: "Des experts pour transformer vos questions r\u00E9glementaires en un plan d'action accessible et prioris\u00E9.", city: "Lille", tags: [tag("Strat\u00E9gie r\u00E9glementaire"), tag("Qualit\u00E9")], premium: true, next_slot: future(2), favorite: true },
        { id: exports.ids.startup, kind: "company", type: "startup", name: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", subtitle: "Innovation & suivi a domicile", description: "Une \u00E9quipe engagee pour des parcours de suivi plus simples.", city: "Hauts-de-France", tags: [tag("Sant\u00E9 num\u00E9rique"), tag("Innovation")], premium: false, next_slot: null, favorite: false },
        { id: uid(30), kind: "company", type: "prestataire", name: "Trajectoire Finance", subtitle: "Strat\u00E9gie financi\u00E8re & lev\u00E9e de fonds", description: "Cadrage du mod\u00E8le \u00E9conomique, dossier investisseur et pr\u00E9paration des rendez-vous.", city: "Lille", tags: [tag("Financement"), tag("Business plan")], premium: false, next_slot: future(4), favorite: false },
        { id: exports.ids.expert, kind: "person", type: "prestataire", name: "Alex Martin", subtitle: "Expert r\u00E9glementaire", description: "Du diagnostic aux premi\u00E8res actions de mise en conformit\u00E9.", city: "Lille", company_id: exports.ids.provider, company_name: "Clarte Conseil", tags: [tag("Qualit\u00E9"), tag("Dispositifs m\u00E9dicaux")], premium: false, next_slot: future(2), favorite: true },
        { id: exports.ids.manager, kind: "person", type: "startup_manager", name: "Lea Bernard", subtitle: "Accompagnement des startups", description: "Structuration du projet, orientation et mobilisation du r\u00E9seau.", city: "Lille", tags: [tag("Strat\u00E9gie"), tag("Accompagnement")], premium: false, next_slot: future(3), favorite: false },
        { id: uid(31), kind: "company", type: "autre", name: "Le Studio des Usages", subtitle: "Design & recherche utilisateur", description: "Rendre les services plus lisibles et les interfaces plus utiles.", city: "Lens", tags: [tag("Design UX"), tag("Recherche utilisateur")], premium: false, next_slot: null, favorite: false }
    ].map(d => ({ ...d, kind: d.kind, identity_visible: !(role === "prestataire" && d.type === "startup"), can_edit: d.id === (role === "incube" ? exports.ids.startup : role === "prestataire" ? exports.ids.provider : ""), status: "publiee", media: null }));
}
function company(role, id) { return { id, name: id === exports.ids.startup ? "Nova Care Studio" : "Clarte Conseil", can_edit: role === "admin" || (role === "incube" && id === exports.ids.startup) || (role === "prestataire" && id === exports.ids.provider), details: { sector: "Innovation en sant\u00E9", city: "Lille", description: "Une \u00E9quipe qui transforme des besoins complexes en actions utiles.", phone: "", contact_email: "", share_contact: false }, members: [{ id: role === "incube" ? exports.ids.incube : exports.ids.expert, name: role === "incube" ? "Camille Laurent" : "Alex Martin", role: "proprietaire", active: true, email: "demo@example.invalid" }], tags: [tag("Innovation"), tag("Sant\u00E9 num\u00E9rique")] }; }
function admin() { return { users: ["incube", "prestataire", "startup_manager", "admin"].map(r => ({ id: userId(r), name: roleNames[r], role: r, status: "actif", email: r + "@example.invalid", confirmed: true, created_at: past(12) })), companies: [{ id: exports.ids.startup, name: "Nova Care Studio", type: "startup", status: "publiee", provider_status: null, premium: false, expires_at: null }, { id: exports.ids.provider, name: "Clarte Conseil", type: "prestataire", status: "publiee", provider_status: "valide", premium: true, expires_at: null }, { id: uid(30), name: "Trajectoire Finance", type: "prestataire", status: "brouillon", provider_status: "en_validation", premium: false, expires_at: null }], assignments: [{ manager_id: exports.ids.manager, entreprise_id: exports.ids.startup }], history: [{ action: "affectation_manager", date: past(1), actor: "Administration Eurasante", detail: {} }], import_report: [{ item: "Donn\u00E9es de d\u00E9monstration", total: 0, imported: 0, note: "Aucune donn\u00E9e de votre Supabase n est utilis\u00E9e dans cet aper\u00E7u." }] }; }
function demoRpc(action, args, role) {
    const ns = needs(role), ss = sessions(role), rs = threads(role);
    const filter = (arr) => {
        let out = arr;
        if (args.favorites === true || args.favorites === "true")
            out = out.filter(i => i.favorite);
        const q = String(args.q || "").toLowerCase();
        if (q)
            out = out.filter(i => JSON.stringify(i).toLowerCase().includes(q));
        return { items: out, total: out.length };
    };
    switch (action) {
        case "bootstrap": return demoBoot(role);
        case "dashboard": return { kpis: { needs: 4, responses: 6, waiting: 2, no_response: 1, sessions: 2, portfolio: 1, users: 4, pending_providers: 1 }, recent_needs: ns, next_sessions: ss.slice(0, 2) };
        case "needs": return filter(args.status ? ns.filter(n => n.status === args.status) : ns);
        case "need": {
            const need = ns.find(n => n.id === args.id) || ns[0];
            return { need, responses: role === "prestataire" ? rs.filter(r => r.need_id === need.id && r.company_id === exports.ids.provider) : rs.filter(r => r.need_id === need.id), history: [] };
        }
        case "threads": return filter(role === "prestataire" ? rs.filter(r => r.company_id === exports.ids.provider) : rs);
        case "messages": return { thread: rs.find(r => r.id === args.id) || rs[0], items: [{ id: uid(900), body: "Merci pour votre proposition. Nous souhaitons pr\u00E9ciser les livrables avant de convenir d'un premier rendez-vous.", author: role === "prestataire" ? "Contact startup" : "Camille Laurent", self: role === "incube", created_at: past(1) }, { id: uid(901), body: "Bien sur. Je vous propose un \u00E9change de cadrage pour identifier les priorit\u00E9s et vous transmettre une feuille de route adaptee.", author: "Alex Martin", self: role === "prestataire", created_at: past(0.5) }], total: 2, read_until: new Date().toISOString() };
        case "directory": {
            let out = directory(role);
            if (args.kind && args.kind !== "all")
                out = out.filter(d => d.kind === args.kind);
            if (args.type)
                out = out.filter(d => d.type === args.type);
            return filter(out);
        }
        case "company": return company(role, String(args.id || exports.ids.startup));
        case "offers": return filter([{ id: uid(400), company_id: exports.ids.provider, title: "Diagnostic r\u00E9glementaire & feuille de route", description: "Un diagnostic op\u00E9rationnel pour passer de vos questions \u00E0 un plan d'action concret. Atelier de cadrage, analyse des \u00E9carts et restitution.", format: "distance", price: 480000, provider: "Clarte Conseil", can_edit: role === "prestataire" || role === "admin", tags: [tag("Qualit\u00E9"), tag("Strat\u00E9gie r\u00E9glementaire")], benefit: role === "incube" ? "Un atelier de cadrage offert aux entreprises accompagn\u00E9es." : null, favorite: false, media: null }]);
        case "sessions": {
            let out = ss;
            if (args.kind)
                out = out.filter(s => s.kind === args.kind);
            if (args.host_id)
                out = out.filter(s => s.host_id === args.host_id);
            if (args.target_company)
                out = out.filter(s => s.company_id === args.target_company);
            if (args.from)
                out = out.filter(s => s.starts_at >= String(args.from));
            if (args.to)
                out = out.filter(s => s.starts_at < String(args.to));
            if (args.scope === "mine")
                out = out.filter(s => s.mine);
            return filter(out);
        }
        case "session": return ss.find(s => s.id === args.id) || ss[0];
        case "portfolio": return { startups: [{ id: exports.ids.startup, name: "Nova Care Studio", needs: 4, no_response: 1, contacts: 2, sessions: 1, tasks: 1 }], notes: args.id ? [{ id: uid(800), body: "Faire un point sur les premiers retours prestataires et prioriser le besoin UX.", due_at: future(2).slice(0, 10), done: false, author: "Lea Bernard", created_at: past(1) }] : [], needs: args.id ? ns : [], contacts: args.id ? rs : [], sessions: args.id ? ss.slice(0, 1) : [] };
        case "notifications": return { items: [{ id: uid(600), title: "Vous avez re\u00E7u une nouvelle proposition", target_type: "need", target_id: uid(100), read_at: null, created_at: past(0.2) }, { id: uid(601), title: "Un cr\u00E9neau vous a \u00E9t\u00E9 propose", target_type: "session", target_id: uid(300), read_at: null, created_at: past(0.3) }, { id: uid(602), title: "Un nouveau message dans votre dossier", target_type: "thread", target_id: uid(200), read_at: null, created_at: past(0.5) }], total: 3 };
        case "admin": return admin();
        case "tags": return [tag("Innovation"), tag("Qualit\u00E9"), tag("Financement")];
        default: throw new Error("Action de d\u00E9monstration inconnue.");
    }
}

},
"./domain.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.label = exports.labels = exports.needStatuses = exports.statusLabels = exports.roleLabels = void 0;
exports.escapeHtml = escapeHtml;
exports.normalizeTag = normalizeTag;
exports.uniqueTags = uniqueTags;
exports.money = money;
exports.cents = cents;
exports.dateText = dateText;
exports.timeText = timeText;
exports.dayLabel = dayLabel;
exports.localDate = localDate;
exports.initials = initials;
exports.isClosed = isClosed;
exports.canRespond = canRespond;
exports.errorMessage = errorMessage;
exports.markdown = markdown;
exports.calendarIcs = calendarIcs;
exports.roleLabels = { incube: "Incub\u00E9", prestataire: "Prestataire", startup_manager: "Startup Manager", admin: "Administrateur" };
exports.statusLabels = { brouillon: "Brouillon", ouvert: "Ouvert aux propositions", en_echanges: "En discussion", rdv_planifie: "Rendez-vous planifi\u00E9", devis_recu: "Devis re\u00E7u", en_realisation: "Mission en cours", termine: "R\u00E9solu", en_pause: "En pause", sans_suite: "Sans suite", envoyee: "Nouvelle proposition", en_discussion: "Discussion ouverte", retenue: "Proposition retenue", declinee: "Non retenue", retiree: "Retir\u00E9e", creneau: "Disponibilit\u00E9", permanence: "Permanence", atelier: "Atelier", proposition: "Cr\u00E9neau propos\u00E9", confirme: "Confirm\u00E9", attente: "Liste d'attente", annule: "Annul\u00E9", present: "Pr\u00E9sent", absent: "Absent", realise: "R\u00E9alis\u00E9", publiee: "Publi\u00E9e", masquee: "Masqu\u00E9e", valide: "Valid\u00E9", en_validation: "En validation", suspendu: "Suspendu", actif: "Actif" };
exports.needStatuses = ["ouvert", "en_echanges", "rdv_planifie", "devis_recu", "en_realisation", "termine", "en_pause", "sans_suite"];
exports.labels = { startup: "Startup incub\u00E9e", prestataire: "Prestataire", autre: "Partenaire", company: "Soci\u00E9t\u00E9", person: "Contact", incube: "Incub\u00E9", startup_manager: "Startup Manager", admin: "Administrateur", distance: "\u00C0 distance", site: "Sur site", mixte: "Hybride", visio: "Visioconf\u00E9rence", telephone: "T\u00E9l\u00E9phone", sur_site: "Pr\u00E9sentiel", proprietaire: "Propri\u00E9taire", gestionnaire: "Gestionnaire", collaborateur: "Collaborateur" };
const label = (v) => exports.statusLabels[v] || exports.labels[v] || v;
exports.label = label;
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c] || c)); }
function normalizeTag(value) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function uniqueTags(terms) {
    const seen = new Set();
    return terms.map(t => t.trim().replace(/\s+/g, " ")).filter(t => {
        const key = normalizeTag(t);
        if (key.length < 2 || t.length > 60 || seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(0, 20);
}
function money(cents) { return cents == null ? "Budget \u00E0 d\u00E9finir" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100); }
function cents(value) {
    if (!value.trim())
        return null;
    const n = Number(value.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(Math.round(n * 100)))
        throw new Error("Montant invalide.");
    return Math.round(n * 100);
}
function dateText(value, withTime = false) {
    if (!value)
        return "Non renseign\u00E9";
    const d = new Date(value);
    if (Number.isNaN(d.valueOf()))
        return "Date invalide";
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Europe/Paris" }).format(d);
}
function timeText(value) { return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(value)); }
function dayLabel(value) { return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(value)); }
function localDate(value = new Date()) { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function initials(value) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map(v => v[0] || "").join("").toUpperCase(); }
function isClosed(status) { return ["termine", "sans_suite", "declinee", "retiree", "annule"].includes(status); }
function canRespond(role, company, need) { return role === "prestataire" && company?.type === "prestataire" && company.provider_status === "valide" && company.member_role !== "collaborateur" && ["ouvert", "en_echanges", "rdv_planifie", "devis_recu"].includes(need.status) && (!need.deadline || new Date(need.deadline) > new Date()) && !need.my_response; }
function errorMessage(error) {
    const x = (error && typeof error === "object") ? error : {};
    const raw = typeof x.message === "string" ? x.message : typeof x.error_description === "string" ? x.error_description : typeof x.error === "string" ? x.error : typeof error === "string" ? error : "";
    if (raw.includes("email rate limit"))
        return "Limite d'envoi email atteinte. Patientez ou utilisez un compte de recette d\u00E9j\u00E0 confirm\u00E9.";
    if (raw.includes("Invalid login credentials"))
        return "Adresse email ou mot de passe incorrect.";
    if (raw.includes("Email not confirmed"))
        return "Confirmez votre adresse email avant de vous connecter.";
    if (raw.includes("Failed to fetch") || raw.includes("NetworkError"))
        return "Connexion interrompue. V\u00E9rifiez votre acc\u00E8s Internet puis r\u00E9essayez.";
    if (x.code === "PGRST202" || raw.includes("Could not find the function"))
        return "La migration V1 est manquante. Executez 01_INSTALL_V1.sql puis 02_ACTIVER_V1.sql.";
    if (x.code === "42702" || x.code === "42P01")
        return "La base doit \u00EAtre mise \u00E0 jour. Transmettez le code " + x.code + " \u00E0 votre administrateur.";
    return raw && raw !== "[object Object]" ? raw : "Op\u00E9ration non aboutie. Actualisez la page et r\u00E9essayez.";
}
function markdown(text) {
    return escapeHtml(text).split(/\n/).map(line => {
        let s = line.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
        if (s.startsWith("### "))
            return "<h4>" + s.slice(4) + "</h4>";
        if (/^[-*] /.test(s))
            return "<p class=\"list-line\">&#8226; " + s.slice(2) + "</p>";
        return "<p>" + (s || "<br>") + "</p>";
    }).join("");
}
function icsEscape(value) { return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r/g, ""); }
function foldLine(line) {
    const chunks = [];
    let current = "";
    let bytes = 0;
    const enc = new TextEncoder();
    for (const char of line) {
        const n = enc.encode(char).length;
        if (bytes + n > 73) {
            chunks.push(current);
            current = " ";
            bytes = 1;
        }
        current += char;
        bytes += n;
    }
    chunks.push(current);
    return chunks.join("\r\n");
}
function calendarIcs(session) {
    const stamp = (s) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EURACONNECT//Agenda//FR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:" + session.id + "@euraconnect", "DTSTAMP:" + stamp(new Date().toISOString()), "DTSTART:" + stamp(session.starts_at), "DTEND:" + stamp(session.ends_at),
        "SUMMARY:" + icsEscape(session.title), "DESCRIPTION:" + icsEscape(session.host_name + "\n" + session.description + "\n" + (session.purpose || "")),
        "LOCATION:" + icsEscape(session.location || (0, exports.label)(session.mode)), "STATUS:" + (session.status === "annule" ? "CANCELLED" : "CONFIRMED"), "END:VEVENT", "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
}

},
"./forms.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.needForm = needForm;
exports.needDetail = needDetail;
exports.responseDetail = responseDetail;
exports.responseForm = responseForm;
exports.statusForm = statusForm;
exports.sessionForm = sessionForm;
exports.sessionDetail = sessionDetail;
exports.companyPage = companyPage;
exports.profileForm = profileForm;
exports.companyForm = companyForm;
exports.offerForm = offerForm;
const domain_js_1 = require("./domain.js");
const icons_js_1 = require("./icons.js");
const ui_js_1 = require("./ui.js");
const formatOptions = ["distance", "site", "mixte"].map(v => ({ value: v, label: (0, domain_js_1.label)(v) }));
const fromCents = (v) => v == null ? "" : String(v / 100);
function needForm(ctx, need, companies = []) {
    return `<form id="command-form" data-command="save_need" data-id="${need?.id || ""}"><div class="inline-note compact"><span>${(0, icons_js_1.icon)("info", 20)}</span><p>Un seul brief partag\u00E9 avec les prestataires. Votre identit\u00E9 est affich\u00E9e uniquement selon leurs droits Premium ; les contacts restent soumis \u00E0 votre accord.</p></div><div class="form-grid">${ctx.boot.user.role === "admin" ? (0, ui_js_1.selectField)("company", "Startup concern\u00E9e", companies.filter(c => c.type === "startup").map(c => ({ value: c.id, label: c.name })), need?.company_id || ctx.companyId || "", true) : `<div class="field span-2"><label>Publi\u00E9 au nom de</label><div class="readonly-field">${(0, icons_js_1.icon)("company", 17)}${(0, domain_js_1.escapeHtml)(ctx.company?.name || "Configurez votre entreprise avant de publier.")}</div><input type="hidden" name="company" value="${(0, domain_js_1.escapeHtml)(need?.company_id || ctx.companyId || "")}"></div>`}
 ${(0, ui_js_1.field)("title", "Titre du besoin", need?.title || "", { required: true, placeholder: "Ex. Structurer notre strat\u00E9gie r\u00E9glementaire", wide: true })}${(0, ui_js_1.richField)("context", "Contexte et enjeux", need?.context || "")}
 ${(0, ui_js_1.field)("objectives", "Objectifs \u00E0 atteindre", need?.objectives || "", { type: "textarea", placeholder: "Qu attendez-vous concr\u00E8tement de cette mission ?" })}${(0, ui_js_1.field)("deliverables", "Livrables attendus", need?.deliverables || "", { type: "textarea", placeholder: "Audit, feuille de route, prototype, dossier..." })}${(0, ui_js_1.field)("constraints", "Contraintes et informations utiles", need?.constraints || "", { type: "textarea", wide: true, placeholder: "Disponibilit\u00E9 de vos \u00E9quipes, maturit\u00E9 du projet, contraintes techniques..." })}
 ${(0, ui_js_1.tagField)(need?.tags || [])}${(0, ui_js_1.field)("budget_min", "Budget minimum (EUR HT)", fromCents(need?.budget_min), { type: "number", min: 0 })}${(0, ui_js_1.field)("budget_max", "Budget maximum (EUR HT)", fromCents(need?.budget_max), { type: "number", min: 0, help: "Laissez vide si le budget reste \u00E0 d\u00E9finir." })}
 ${(0, ui_js_1.field)("deadline", "Date limite de r\u00E9ponse", need?.deadline?.slice(0, 10) || "", { type: "date" })}${(0, ui_js_1.selectField)("format", "Modalit\u00E9 de la mission", formatOptions, need?.format || "distance")}
 <details class="form-section span-2"><summary>${(0, icons_js_1.icon)("lock", 17)}Contact r\u00E9serv\u00E9 aux prestataires Premium</summary><div class="form-grid">${(0, ui_js_1.field)("contact_name", "Contact de la mission", need?.contact?.name || "")}${(0, ui_js_1.field)("contact_email", "Email professionnel", need?.contact?.email || "", { type: "email" })}${(0, ui_js_1.field)("contact_phone", "T\u00E9l\u00E9phone", need?.contact?.phone || "", { type: "tel" })}<div class="span-2">${(0, ui_js_1.checkField)("share_contact", "J'autorise les prestataires Premium a consulter ces coordonn\u00E9es.", need?.contact?.shared || false)}</div></div></details>
 ${!need || need.status === "brouillon" ? (0, ui_js_1.selectField)("status", "Publication", [{ value: "ouvert", label: "Publier dans la bourse des besoins" }, { value: "brouillon", label: "Conserver en brouillon" }], need?.status || "ouvert", true) : "<input type=\"hidden\" name=\"status\" value=\"ouvert\">"}</div>${(0, ui_js_1.footerSubmit)(need ? "Enregistrer les modifications" : "Enregistrer ma demande")}</form>`;
}
function needDetail(ctx, data) {
    const n = data.need;
    const role = ctx.boot.user.role;
    return `<div class="need-detail-head"><div class="detail-badges">${(0, ui_js_1.badge)(n.status)}${!n.identity_visible ? "<span class=\"protected-label\">" + (0, icons_js_1.icon)("lock", 14) + "Identit\u00E9 de la startup prot\u00E9g\u00E9e</span>" : "<span class=\"need-owner\">" + (0, icons_js_1.icon)("company", 15) + (0, domain_js_1.escapeHtml)(n.company_name) + "</span>"}</div><h2 class="detail-title">${(0, domain_js_1.escapeHtml)(n.title)}</h2>${(0, ui_js_1.tags)(n.tags)}<div class="detail-facts"><div><span>Budget indicatif</span><strong>${n.budget_min !== null ? (0, domain_js_1.money)(n.budget_min) + " - " : ""}${n.budget_max !== null ? (0, domain_js_1.money)(n.budget_max) : "\u00C0 d\u00E9finir"}</strong></div><div><span>R\u00E9ponses attendues avant</span><strong>${(0, domain_js_1.dateText)(n.deadline)}</strong></div><div><span>Modalit\u00E9</span><strong>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(n.format))}</strong></div><div><span>Publi\u00E9 le</span><strong>${(0, domain_js_1.dateText)(n.created_at)}</strong></div></div></div>
 <div class="detail-layout"><div><section class="brief-section"><h3>${(0, icons_js_1.icon)("needs", 18)}Comprendre le besoin</h3><div class="prose">${(0, domain_js_1.markdown)(n.context)}</div></section>${n.objectives ? `<section class="brief-section"><h3>${(0, icons_js_1.icon)("target", 18)}Objectifs</h3><div class="prose">${(0, domain_js_1.markdown)(n.objectives)}</div></section>` : ""}${n.deliverables ? `<section class="brief-section"><h3>${(0, icons_js_1.icon)("check", 18)}Livrables attendus</h3><div class="prose">${(0, domain_js_1.markdown)(n.deliverables)}</div></section>` : ""}${n.constraints ? `<section class="brief-section"><h3>${(0, icons_js_1.icon)("info", 18)}Contraintes et contexte utile</h3><div class="prose">${(0, domain_js_1.markdown)(n.constraints)}</div></section>` : ""}</div>
 <aside><div class="detail-action-box"><h3>${n.can_edit ? "Piloter ma demande" : n.my_response ? "Votre proposition est envoy\u00E9e" : "Votre expertise peut faire la diff\u00E9rence."}</h3><p>${n.can_edit ? "Vous choisissez avec qui poursuivre. Le statut de la demande est visible dans la bourse." : n.my_response ? "Retrouvez votre r\u00E9ponse et continuez l'\u00E9change dans votre dossier." : "Expliquez votre approche, ce que vous livrez et votre calendrier."}</p>${n.can_edit ? (0, ui_js_1.button)("Modifier le besoin", "edit-need", { id: n.id, class: "full", icon: "edit" }) + (0, ui_js_1.button)("Mettre \u00E0 jour le statut", "need-status", { id: n.id, class: "full primary", icon: "needs" }) : n.my_response ? (0, ui_js_1.button)("Ouvrir mon dossier", "open-thread", { id: n.my_response, class: "full primary", icon: "messages" }) : (0, domain_js_1.canRespond)(role, ctx.company, n) ? (0, ui_js_1.button)("Proposer mon expertise", "respond", { id: n.id, class: "full primary", icon: "send" }) : role === "prestataire" ? "<p class=\"muted\">" + (ctx.company?.provider_status !== "valide" ? "Votre entreprise doit \u00EAtre valid\u00E9e pour r\u00E9pondre." : ctx.company?.member_role === "collaborateur" ? "Un gestionnaire de votre entreprise doit envoyer la proposition." : "Cette demande ne recoit plus de nouvelles propositions.") + "</p>" : ""}</div>
 ${role === "prestataire" && !n.identity_visible ? `<div class="premium-detail"><span>${(0, icons_js_1.icon)("lock", 22)}</span><h4>L'identit\u00E9, pas le contexte.</h4><p>Le brief est lisible et vous pouvez r\u00E9pondre. Premium permet d'identifier la startup et de voir ses contacts autoris\u00E9s.</p>${(0, ui_js_1.button)("En savoir plus", "premium", { class: "small ghost" })}</div>` : ""}
 ${n.contact ? `<div class="contact-detail"><h4>Contact de la mission</h4><p>${(0, domain_js_1.escapeHtml)(n.contact.name || "Non renseign\u00E9")}</p>${n.contact.email ? `<a href="mailto:${(0, domain_js_1.escapeHtml)(n.contact.email)}">${(0, domain_js_1.escapeHtml)(n.contact.email)}</a>` : ""}<p>${(0, domain_js_1.escapeHtml)(n.contact.phone)}</p>${!n.contact.shared && n.owned ? "<small>Partage Premium d\u00E9sactiv\u00E9.</small>" : ""}</div>` : ""}</aside></div>
 ${(n.owned || role === "startup_manager" || role === "admin") ? `<section class="responses-section"><div class="section-heading"><div><p class="eyebrow">PROPOSITIONS RE\u00C7UES</p><h3>${data.responses.length} prestataire${data.responses.length > 1 ? "s" : ""} positionne${data.responses.length > 1 ? "s" : ""}</h3></div></div>${data.responses.length ? data.responses.map(r => `<article class="response-row"><div class="identity-row">${(0, ui_js_1.avatar)(r.provider, null, true)}<div><h4>${(0, domain_js_1.escapeHtml)(r.provider)}</h4><small>${(0, domain_js_1.escapeHtml)(r.author)}</small></div></div><div><strong>${r.price === null ? "Tarif a convenir" : (0, domain_js_1.money)(r.price)}</strong><small>${r.lead_days !== null ? r.lead_days + " jours" : "D\u00E9lai \u00E0 pr\u00E9ciser"}</small></div>${(0, ui_js_1.badge)(r.status)}${(0, ui_js_1.button)("Examiner la proposition", "view-response", { id: r.id, class: "small", icon: "arrow" })}</article>`).join("") : (0, ui_js_1.empty)("Aucune proposition pour le moment", "Un brief contextualis\u00E9 et des tags pr\u00E9cis aident les bons prestataires \u00E0 vous trouver.", "", "portfolio")}</section>` : ""}`;
}
function responseDetail(r) { return `<div class="identity-row">${(0, ui_js_1.avatar)(r.provider, null, true)}<div><h3>${(0, domain_js_1.escapeHtml)(r.provider)}</h3><p>${(0, domain_js_1.escapeHtml)(r.author)} &middot; ${(0, domain_js_1.escapeHtml)(r.need_title)}</p>${(0, ui_js_1.badge)(r.status)}</div></div><div class="detail-facts"><div><span>Tarif propose</span><strong>${r.price === null ? "A convenir" : (0, domain_js_1.money)(r.price)}</strong></div><div><span>D\u00E9lai annonce</span><strong>${r.lead_days !== null ? r.lead_days + " jours" : "\u00C0 pr\u00E9ciser"}</strong></div></div><div class="prose"><h3>Proposition</h3>${(0, domain_js_1.markdown)(r.message)}${r.approach ? "<h3>Approche et livrables</h3>" + (0, domain_js_1.markdown)(r.approach) : ""}${r.reason ? "<h3>D\u00E9cision</h3>" + (0, domain_js_1.markdown)(r.reason) : ""}</div><footer class="form-footer">${r.can_decide ? (0, ui_js_1.button)("Ne pas retenir", "response-decision", { id: r.id, class: "ghost danger", extra: "data-status=\"declinee\"" }) + (0, ui_js_1.button)("Donner suite", "response-decision", { id: r.id, class: "primary", icon: "messages", extra: "data-status=\"en_discussion\"" }) + (0, ui_js_1.button)("Retenir la proposition", "response-decision", { id: r.id, class: "", icon: "check", extra: "data-status=\"retenue\"" }) : ""}${r.can_message ? (0, ui_js_1.button)("Ouvrir la conversation", "open-thread", { id: r.id, icon: "messages" }) : ""}</footer>`; }
function responseForm(n) { return `<form id="command-form" data-command="respond" data-id="${n.id}"><div class="inline-note compact">${(0, icons_js_1.icon)("info", 20)}<p>Votre entreprise et votre nom seront visibles de la startup. Presentez une r\u00E9ponse concr\u00E8te a : <strong>${(0, domain_js_1.escapeHtml)(n.title)}</strong>.</p></div>${(0, ui_js_1.tags)(n.tags)}<div class="form-grid">${(0, ui_js_1.richField)("message", "Votre compr\u00E9hension et votre proposition")}${(0, ui_js_1.field)("approach", "Approche, livrables et r\u00E9f\u00E9rences utiles", "", { type: "textarea", wide: true, rows: 4 })}${(0, ui_js_1.field)("price", "Tarif propose (EUR HT)", "", { type: "number", min: 0, help: "Laissez vide si un cadrage est n\u00E9cessaire." })}${(0, ui_js_1.field)("lead_days", "D\u00E9lai estim\u00E9 (jours)", "", { type: "number", min: 0, max: 3650 })}</div>${(0, ui_js_1.footerSubmit)("Envoyer ma proposition")}</form>`; }
function statusForm(n) { return `<form id="command-form" data-command="need_status" data-id="${n.id}"><p class="muted">Le statut est visible par les membres autoris\u00E9s a consulter votre demande. Les d\u00E9cisions sur chaque proposition restent distinctes.</p>${(0, ui_js_1.selectField)("status", "Avancement de la demande", domain_js_1.needStatuses.filter(s => !["termine", "sans_suite"].includes(n.status) || s === "ouvert").map(v => ({ value: v, label: v === "ouvert" && (0, domain_js_1.isClosed)(n.status) ? "Reouvrir la demande" : (0, domain_js_1.label)(v) })), n.status)}${(0, ui_js_1.field)("reason", "Motif ou pr\u00E9cision", "", { type: "textarea", help: "Requis pour une mise en pause ou une cloture sans suite." })}${(0, ui_js_1.footerSubmit)("Mettre \u00E0 jour")}</form>`; }
function sessionForm(ctx, kind = "creneau", responseId = null) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = (0, domain_js_1.localDate)(tomorrow) + "T09:00";
    return `<form id="command-form" data-command="create_session"><input type="hidden" name="response_id" value="${responseId || ""}"><input type="hidden" name="company" value="${ctx.companyId || ""}"><div class="inline-note compact">${(0, icons_js_1.icon)("calendar", 20)}<p>Les horaires sont saisis en <strong>Europe/Paris</strong>. Les conflits sont contr\u00F4les c\u00F4t\u00E9 serveur. Une permanence cr\u00E9\u00E9 des cr\u00E9neaux individuels successifs.</p></div><div class="form-grid">${kind === "proposition" ? "<input type=\"hidden\" name=\"kind\" value=\"proposition\">" : (0, ui_js_1.selectField)("kind", "Format de rencontre", ["creneau", "permanence", "atelier"].map(v => ({ value: v, label: (0, domain_js_1.label)(v) })), kind, true)}${(0, ui_js_1.field)("title", "Objet de la rencontre", kind === "permanence" ? "Permanence d'expertise" : kind === "proposition" ? "\u00C9change de cadrage sur votre besoin" : "", { required: true, wide: true, placeholder: "Ex. Cadrer sa strat\u00E9gie de financement" })}${(0, ui_js_1.field)("description", "Objectifs et deroulement", "", { type: "textarea", wide: true, placeholder: "Ce que les participants pourront aborder ou apprendre." })}${(0, ui_js_1.field)("start_local", "Date et heure de debut", start, { type: "datetime-local", required: true })}${(0, ui_js_1.selectField)("duration", "Dur\u00E9e de chaque rendez-vous", [15, 30, 45, 60, 90, 120, 180, 240].map(v => ({ value: String(v), label: v + " minutes" })), "30")}
 ${(0, ui_js_1.selectField)("mode", "Modalit\u00E9", ["visio", "telephone", "sur_site"].map(v => ({ value: v, label: (0, domain_js_1.label)(v) })), "visio")}${(0, ui_js_1.field)("location", "Adresse, t\u00E9l\u00E9phone ou lien de visioconf\u00E9rence", "", { placeholder: "Lien accessible aux personnes inscrites" })}
 <div class="permanence-fields span-2 form-grid" ${kind !== "permanence" ? "hidden" : ""}>${(0, ui_js_1.selectField)("block_minutes", "Amplitude de la permanence", [60, 90, 120, 180, 240, 480].map(v => ({ value: String(v), label: v + " minutes" })), "120")}${(0, ui_js_1.selectField)("break_minutes", "Pause entre deux rendez-vous", [0, 5, 10, 15, 30].map(v => ({ value: String(v), label: v + " minutes" })), "0")}${(0, ui_js_1.selectField)("weeks", "R\u00E9p\u00E9tition chaque semaine", [1, 2, 4, 8, 12].map(v => ({ value: String(v), label: v === 1 ? "Cette date uniquement" : v + " semaines" })), "1")}</div>
 <div class="workshop-fields span-2" ${kind !== "atelier" ? "hidden" : ""}>${(0, ui_js_1.field)("capacity", "Nombre de participants maximum", "20", { type: "number", min: 1, max: 200 })}${(0, ui_js_1.tagField)()}</div></div>${(0, ui_js_1.footerSubmit)(kind === "proposition" ? "Envoyer la proposition de rendez-vous" : kind === "atelier" ? "Publier l'atelier" : "Publier les disponibilit\u00E9s")}</form>`;
}
function sessionDetail(ctx, s) {
    const registered = ["confirme", "present", "absent"].includes(s.registration || "");
    const future = new Date(s.starts_at) > new Date();
    const safeLink = /^https:\/\//i.test(s.location) ? s.location : null;
    return `<div class="detail-badges">${(0, ui_js_1.badge)(s.kind)}${(0, ui_js_1.badge)(s.registration || s.status)}</div><h2 class="detail-title">${(0, domain_js_1.escapeHtml)(s.title)}</h2><div class="identity-row">${(0, ui_js_1.avatar)(s.host_name, null)}<div><strong>${(0, domain_js_1.escapeHtml)(s.host_name)}</strong><small>${(0, domain_js_1.escapeHtml)(s.company_name || "\u00C9quipe d'accompagnement")}</small></div></div><div class="detail-facts"><div><span>Date</span><strong>${(0, domain_js_1.dateText)(s.starts_at)}</strong></div><div><span>Horaire</span><strong>${(0, domain_js_1.timeText)(s.starts_at)} - ${(0, domain_js_1.timeText)(s.ends_at)}</strong></div><div><span>Modalit\u00E9</span><strong>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(s.mode))}</strong></div><div><span>Places</span><strong>${s.occupied} / ${s.capacity}</strong></div></div><div class="prose">${(0, domain_js_1.markdown)(s.description || "Un temps d'\u00E9change pour faire avancer votre projet.")}</div>${s.location ? `<div class="location-box">${(0, icons_js_1.icon)(s.mode === "visio" ? "video" : "location", 21)}${safeLink ? `<a href="${(0, domain_js_1.escapeHtml)(safeLink)}" target="_blank" rel="noopener noreferrer">Rejoindre la visioconf\u00E9rence ${(0, icons_js_1.icon)("arrow", 15)}</a>` : `<span>${(0, domain_js_1.escapeHtml)(s.location)}</span>`}</div>` : ""}${s.purpose ? "<div class=\"prose\"><h4>Votre objectif</h4>" + (0, domain_js_1.markdown)(s.purpose) + "</div>" : ""}
 ${!registered && !s.can_manage && s.registration !== "attente" && s.status === "ouvert" && future ? `<form id="command-form" data-command="book_session" data-id="${s.id}"><input type="hidden" name="company" value="${ctx.companyId || ""}">${(0, ui_js_1.field)("purpose", s.kind === "atelier" ? "Vos attentes pour cet atelier" : "Pourquoi souhaitez-vous ce rendez-vous ?", "", { type: "textarea", required: s.kind !== "atelier", placeholder: "D\u00E9crivez les sujets a aborder. Ne renseignez pas de coordonn\u00E9es ici." })}<div class="form-error" role="alert" hidden></div><footer class="form-footer"><button type="submit" class="btn primary">${(0, icons_js_1.icon)("calendar", 18)}${s.occupied >= s.capacity ? "Rejoindre la liste d'attente" : "Confirmer mon inscription"}</button></footer></form>` : ""}
 <footer class="form-footer">${registered || s.can_manage ? (0, ui_js_1.button)("Ajouter a mon calendrier", "export-ics", { id: s.id, icon: "download" }) : ""}${s.registration && ["confirme", "attente"].includes(s.registration) && future ? (0, ui_js_1.button)("Annuler mon inscription", "cancel-booking", { id: s.id, class: "ghost danger" }) : ""}${s.can_manage && s.status === "ouvert" ? (0, ui_js_1.button)("Annuler la rencontre", "cancel-session", { id: s.id, class: "ghost danger" }) : ""}${s.can_manage && s.status === "ouvert" && new Date(s.ends_at) <= new Date() ? (0, ui_js_1.button)("Marquer comme r\u00E9alis\u00E9", "complete-session", { id: s.id, class: "primary", icon: "check" }) : ""}</footer>
 ${s.can_manage && s.participants.length ? `<section class="mt"><div class="section-heading"><h3>Participants</h3><span class="muted">Identit\u00E9s soumises aux m\u00EAmes droits Premium.</span></div>${s.participants.map(p => `<div class="contact-row"><div><strong>${(0, domain_js_1.escapeHtml)(p.name)}</strong><small>${(0, domain_js_1.escapeHtml)(p.company || "Membre du r\u00E9seau")}</small><p>${(0, domain_js_1.escapeHtml)(p.purpose)}</p></div>${(0, ui_js_1.badge)(p.status)}${!future && ["confirme", "present", "absent"].includes(p.status) ? `<div class="table-actions">${(0, ui_js_1.button)("Present", "attendance", { id: p.id, class: "small", extra: "data-status=\"present\"" })}${(0, ui_js_1.button)("Absent", "attendance", { id: p.id, class: "small ghost", extra: "data-status=\"absent\"" })}</div>` : ""}</div>`).join("")}</section>` : ""}`;
}
function companyPage(ctx, company) {
    const p = ctx.boot.profile;
    return `<div class="page-head"><div><p class="eyebrow">VOTRE PR\u00C9SENCE DANS LE R\u00C9SEAU</p><h1>Entreprise & profil</h1><p>Une entreprise partag\u00E9e. Des contacts et des expertises identifiables.</p></div></div><div class="profile-layout"><section class="panel"><div class="section-heading"><h2>Ma fiche contact</h2>${(0, ui_js_1.button)("Modifier", "edit-profile", { class: "small", icon: "edit" })}</div><div class="profile-hero">${(0, ui_js_1.avatar)(ctx.boot.user.name || ctx.boot.user.email, p.media)}<div><h3>${(0, domain_js_1.escapeHtml)(ctx.boot.user.name || "Profil a compl\u00E9ter")}</h3><p>${(0, domain_js_1.escapeHtml)(p.titre || domain_js_1.roleLabels[ctx.boot.user.role])}</p>${(0, ui_js_1.badge)(ctx.boot.user.role)}</div></div><p>${(0, domain_js_1.escapeHtml)(p.bio_html || "Presentez votre r\u00F4le et les comp\u00E9tences que vous souhaitez partager.")}</p>${(0, ui_js_1.tags)(p.tags || [])}<div class="profile-actions">${(0, ui_js_1.button)("Ajouter ma photo", "upload", { id: ctx.boot.user.id, icon: "upload", extra: "data-type=\"person\"" })}</div><p class="muted small-text">Photos recadr\u00E9es automatiquement. Fichiers priv\u00E9s, accessibles selon les droits.</p></section><section class="panel"><div class="section-heading"><h2>Mon entreprise</h2>${company?.can_edit ? (0, ui_js_1.button)("Modifier", "edit-company", { id: company.id, class: "small", icon: "edit" }) : ""}</div>${company ? `<div class="profile-hero">${(0, ui_js_1.avatar)(company.name, company.media, true)}<h3>${(0, domain_js_1.escapeHtml)(company.name)}</h3></div>${(0, ui_js_1.badge)(ctx.company?.type || "autre")}<p>${(0, domain_js_1.escapeHtml)(company.details?.description || "Pr\u00E9sentation de l'entreprise a compl\u00E9ter.")}</p>${(0, ui_js_1.tags)(company.tags)}<div class="profile-actions">${company.can_edit ? (0, ui_js_1.button)("Ajouter un logo", "upload", { id: company.id, icon: "upload", extra: "data-type=\"company\"" }) + (0, ui_js_1.button)("G\u00E9rer les membres", "manage-members", { id: company.id, icon: "people" }) : ""}</div><div class="contact-row"><span>${company.members.length} contact${company.members.length > 1 ? "s" : ""} rattach\u00E9${company.members.length > 1 ? "s" : ""}</span>${ctx.company?.premium ? "<span class=\"premium-label\">Premium actif</span>" : ""}</div>` : (0, ui_js_1.empty)("Votre entreprise n est pas encore configur\u00E9e", "Creez sa fiche ou demandez un rattachement \u00E0 son propri\u00E9taire.", ["incube", "prestataire", "admin"].includes(ctx.boot.user.role) ? (0, ui_js_1.button)("Cr\u00E9er mon entreprise", "new-company", { class: "primary", icon: "company" }) : "", "company")}</section></div><section class="panel mt"><div class="section-heading"><h2>S\u00E9curit\u00E9 du compte</h2></div><p class="muted">Le r\u00F4le et les droits Premium sont g\u00E9r\u00E9s exclusivement par l'administrateur.</p>${(0, ui_js_1.button)("Modifier mon mot de passe", "change-password", { icon: "lock" })}</section>`;
}
function profileForm(ctx) { return `<form id="command-form" data-command="save_profile"><div class="form-grid">${(0, ui_js_1.field)("name", "Pr\u00E9nom et nom", ctx.boot.user.name || "", { required: true })}${(0, ui_js_1.field)("title", "Fonction ou accroche", ctx.boot.profile.titre || "")}${(0, ui_js_1.field)("bio", "Pr\u00E9sentation", ctx.boot.profile.bio_html || "", { type: "textarea", wide: true })}${(0, ui_js_1.tagField)(ctx.boot.profile.tags || [])}<div class="span-2">${(0, ui_js_1.checkField)("visible", "Afficher mon profil dans l'annuaire, selon les r\u00E8gles de confidentialit\u00E9.", ctx.boot.profile.visible !== false)}</div></div>${(0, ui_js_1.footerSubmit)("Enregistrer mon profil")}</form>`; }
function companyForm(ctx, data, admin) { return `<form id="command-form" data-command="save_company" data-id="${data?.id || ""}"><div class="form-grid">${(0, ui_js_1.field)("name", "Nom de l'entreprise", data?.name || "", { required: true, wide: true })}${!data && ctx.boot.user.role === "admin" ? (0, ui_js_1.selectField)("type", "Typologie", ["startup", "prestataire", "autre"].map(v => ({ value: v, label: (0, domain_js_1.label)(v) })), "autre") + (0, ui_js_1.selectField)("owner_id", "Propri\u00E9taire (compte existant)", [{ value: "", label: "S\u00E9lectionnez pour une entreprise prestataire" }, ...(admin?.users || []).filter(u => u.role === "incube" || u.role === "prestataire").map(u => ({ value: u.id, label: (u.name || u.email) + " - " + domain_js_1.roleLabels[u.role] }))]) : ""}${(0, ui_js_1.richField)("description", "Pr\u00E9sentation de l'entreprise", data?.details?.description || "")}${(0, ui_js_1.field)("sector", "Secteur d'activit\u00E9", data?.details?.sector || "")}${(0, ui_js_1.field)("city", "Ville / territoire", data?.details?.city || "")}${(0, ui_js_1.tagField)(data?.tags || [])}${(0, ui_js_1.field)("email", "Contact professionnel", data?.details?.contact_email || "", { type: "email" })}${(0, ui_js_1.field)("phone", "T\u00E9l\u00E9phone", data?.details?.phone || "", { type: "tel" })}<div class="span-2">${(0, ui_js_1.checkField)("share_contact", "Partager ces coordonn\u00E9es avec les membres autoris\u00E9s a voir mon identit\u00E9.", data?.details?.share_contact || false)}</div></div>${(0, ui_js_1.footerSubmit)(data ? "Enregistrer l'entreprise" : "Cr\u00E9er l'entreprise")}</form>`; }
function offerForm(offer) { return `<form id="command-form" data-command="save_offer" data-id="${offer?.id || ""}"><div class="form-grid">${(0, ui_js_1.field)("title", "Intitul\u00E9 du service", offer?.title || "", { required: true, wide: true })}${(0, ui_js_1.richField)("description", "P\u00E9rim\u00E8tre et livrables", offer?.description || "")}${(0, ui_js_1.tagField)(offer?.tags || [])}${(0, ui_js_1.selectField)("format", "Modalit\u00E9", formatOptions, offer?.format || "distance")}${(0, ui_js_1.field)("price", "Tarif indicatif (EUR HT)", fromCents(offer?.price), { type: "number", min: 0, help: "Vide = sur devis." })}${(0, ui_js_1.field)("benefit", "Avantage r\u00E9serv\u00E9 aux incub\u00E9s", offer?.benefit || "", { type: "textarea", wide: true, help: "Visible des incub\u00E9s et de l'\u00E9quipe d'accompagnement." })}</div>${(0, ui_js_1.footerSubmit)("Enregistrer l'offre")}</form>`; }

},
"./icons.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.icon = icon;
const paths = {
    dashboard: "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"2\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"2\"/>",
    needs: "<path d=\"M8 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-2\"/><rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/><path d=\"M8 10h8M8 14h8M8 18h5\"/>",
    people: "<circle cx=\"9\" cy=\"7\" r=\"3\"/><path d=\"M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5\"/>",
    company: "<rect x=\"4\" y=\"3\" width=\"12\" height=\"18\" rx=\"2\"/><path d=\"M16 9h4v12H4M8 7h4M8 11h4M8 15h4M9 21v-3h3v3\"/>",
    user: "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21v-2a8 8 0 0 1 16 0v2\"/>",
    messages: "<path d=\"M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2A8.5 8.5 0 0 1 21 11.5Z\"/><path d=\"M7 9h9M7 13h6\"/>",
    bell: "<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4\"/>",
    calendar: "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M16 3v4M8 3v4M3 11h18M7 15h2M12 15h2M17 15h1M7 18h2M12 18h2\"/>",
    workshop: "<path d=\"M3 3h18v12H3zM8 21l4-6 4 6M12 15v6M7 10l3-3 3 3 4-4\"/>",
    portfolio: "<path d=\"M8 5V3h8v2M3 7h18v14H3zM3 12a20 20 0 0 0 18 0M10 12h4v3h-4z\"/>",
    search: "<circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/><path d=\"m16 16 5 5\"/>",
    plus: "<path d=\"M12 5v14M5 12h14\"/>", close: "<path d=\"m6 6 12 12M6 18 18 6\"/>", check: "<path d=\"m5 12 4 4L19 6\"/>",
    arrow: "<path d=\"M4 12h16m-6-6 6 6-6 6\"/>", down: "<path d=\"m6 9 6 6 6-6\"/>", back: "<path d=\"m15 5-7 7 7 7\"/>",
    heart: "<path d=\"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z\"/>",
    pin: "<path d=\"m16 3 5 5-4 2-3 5 1 2-2 2-4-4-6 6M7 12l2 1 5-3 2-7Z\"/>",
    lock: "<rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3M12 14v3\"/>",
    shield: "<path d=\"m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7Z\"/><path d=\"m8 12 3 3 5-6\"/>",
    spark: "<path d=\"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z\"/>",
    clock: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>", tag: "<path d=\"M3 3h8l10 10-8 8L3 11Z\"/><circle cx=\"7\" cy=\"7\" r=\"1\"/>",
    edit: "<path d=\"m14 5 5 5M3 21l5-1L21 7l-5-5L3 15Z\"/>", upload: "<path d=\"M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5\"/>",
    logout: "<path d=\"M9 3H3v18h6M10 12h11m-5-5 5 5-5 5\"/>", menu: "<path d=\"M4 6h16M4 12h16M4 18h16\"/>",
    refresh: "<path d=\"M20 11a8 8 0 0 0-14-5L3 9m0-6v6h6M4 13a8 8 0 0 0 14 5l3-3m0 6v-6h-6\"/>",
    warning: "<path d=\"m12 3 10 18H2Z\"/><path d=\"M12 9v5M12 17h.01\"/>", info: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7h.01\"/>",
    send: "<path d=\"m22 2-7 20-4-9-9-4Z M22 2 11 13\"/>", mail: "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 5 9 7 9-7\"/>",
    video: "<rect x=\"3\" y=\"5\" width=\"12\" height=\"14\" rx=\"2\"/><path d=\"m15 10 6-4v12l-6-4\"/>", location: "<path d=\"M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>",
    download: "<path d=\"M12 3v13m-5-5 5 5 5-5M3 18v3h18v-3\"/>", target: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>",
    grid: "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"/>",
    list: "<path d=\"M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1\"/>",
    bold: "<path d=\"M6 3h7a4 4 0 0 1 0 8H6zm0 8h8a5 5 0 0 1 0 10H6z\"/>", italic: "<path d=\"M19 3h-8M13 21H5M15 3 9 21\"/>",
    eye: "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>"
};
function icon(name, size = 20) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.info}</svg>`; }

},
"./ui.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tags = exports.badge = void 0;
exports.avatar = avatar;
exports.empty = empty;
exports.button = button;
exports.iconButton = iconButton;
exports.favorite = favorite;
exports.field = field;
exports.selectField = selectField;
exports.checkField = checkField;
exports.tagField = tagField;
exports.richField = richField;
exports.pagination = pagination;
exports.toast = toast;
exports.modal = modal;
exports.closeModal = closeModal;
exports.modalOpen = modalOpen;
exports.hydrateImages = hydrateImages;
exports.formValues = formValues;
exports.footerSubmit = footerSubmit;
const domain_js_1 = require("./domain.js");
const icons_js_1 = require("./icons.js");
const api_js_1 = require("./api.js");
const badge = (status) => `<span class="badge badge-${(0, domain_js_1.escapeHtml)(status)}"><span class="status-dot"></span>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(status))}</span>`;
exports.badge = badge;
const tags = (items, max = 20) => items.length ? `<div class="tags">${items.slice(0, max).map(t => `<span class="tag">${(0, domain_js_1.escapeHtml)(t.label)}</span>`).join("")}${items.length > max ? `<span class="tag">+${items.length - max}</span>` : ""}</div>` : "";
exports.tags = tags;
function avatar(name, media, company = false) { return `<span class="avatar ${company ? "company-logo" : ""}">${media ? `<img data-bucket="${(0, domain_js_1.escapeHtml)(media.bucket)}" data-path="${(0, domain_js_1.escapeHtml)(media.path)}" alt="${(0, domain_js_1.escapeHtml)(name)}" loading="lazy">` : `<span>${(0, domain_js_1.escapeHtml)((0, domain_js_1.initials)(name)) || (0, icons_js_1.icon)(company ? "company" : "user")}</span>`}</span>`; }
function empty(title, description, action = "", symbol = "search") { return `<div class="empty"><div class="empty-icon">${(0, icons_js_1.icon)(symbol, 28)}</div><h3>${(0, domain_js_1.escapeHtml)(title)}</h3><p>${(0, domain_js_1.escapeHtml)(description)}</p>${action}</div>`; }
function button(text, action, options = {}) { return `<button type="button" class="btn ${options.class || ""}" data-action="${(0, domain_js_1.escapeHtml)(action)}" ${options.id ? `data-id="${(0, domain_js_1.escapeHtml)(options.id)}"` : ""} ${options.extra || ""} ${options.disabled ? "disabled" : ""}>${options.icon ? (0, icons_js_1.icon)(options.icon, 17) : ""}${(0, domain_js_1.escapeHtml)(text)}</button>`; }
function iconButton(symbol, title, action, id = "", extra = "") { return `<button type="button" class="icon-button" title="${(0, domain_js_1.escapeHtml)(title)}" aria-label="${(0, domain_js_1.escapeHtml)(title)}" data-action="${(0, domain_js_1.escapeHtml)(action)}" data-id="${(0, domain_js_1.escapeHtml)(id)}" ${extra}>${(0, icons_js_1.icon)(symbol)}</button>`; }
function favorite(id, type, on, pin = false) { return `<button type="button" class="favorite ${on ? "on" : ""}" data-action="favorite" data-id="${(0, domain_js_1.escapeHtml)(id)}" data-type="${(0, domain_js_1.escapeHtml)(type)}" data-value="${!on}" aria-pressed="${on}" title="${on ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-label="${on ? "Retirer des favoris" : "Ajouter aux favoris"}">${(0, icons_js_1.icon)(pin ? "pin" : "heart", 19)}</button>`; }
function field(name, text, value = "", options = {}) {
    const type = options.type || "text";
    const id = "f-" + name;
    return `<div class="field ${options.wide ? "span-2" : ""}"><label for="${id}">${(0, domain_js_1.escapeHtml)(text)}${options.required ? "<span class=\"required\">*</span>" : ""}</label>${type === "textarea" ? `<textarea id="${id}" name="${(0, domain_js_1.escapeHtml)(name)}" rows="${options.rows || 3}" ${options.required ? "required" : ""} maxlength="${options.max || 6000}" placeholder="${(0, domain_js_1.escapeHtml)(options.placeholder || "")}">${(0, domain_js_1.escapeHtml)(value)}</textarea>` : `<input id="${id}" name="${(0, domain_js_1.escapeHtml)(name)}" type="${(0, domain_js_1.escapeHtml)(type)}" value="${(0, domain_js_1.escapeHtml)(value)}" ${options.required ? "required" : ""} ${options.min !== undefined ? `min="${options.min}"` : ""} ${options.max !== undefined ? `max="${options.max}"` : ""} ${type === "number" ? "step=\"any\"" : ""} placeholder="${(0, domain_js_1.escapeHtml)(options.placeholder || "")}">`}${options.help ? `<small>${(0, domain_js_1.escapeHtml)(options.help)}</small>` : ""}</div>`;
}
function selectField(name, text, options, selected = "", wide = false) { return `<div class="field ${wide ? "span-2" : ""}"><label for="f-${(0, domain_js_1.escapeHtml)(name)}">${(0, domain_js_1.escapeHtml)(text)}</label><select id="f-${(0, domain_js_1.escapeHtml)(name)}" name="${(0, domain_js_1.escapeHtml)(name)}">${options.map(o => `<option value="${(0, domain_js_1.escapeHtml)(o.value)}" ${o.value === selected ? "selected" : ""}>${(0, domain_js_1.escapeHtml)(o.label)}</option>`).join("")}</select></div>`; }
function checkField(name, text, on = false) { return `<label class="checkline"><input type="checkbox" name="${(0, domain_js_1.escapeHtml)(name)}" ${on ? "checked" : ""}> <span>${(0, domain_js_1.escapeHtml)(text)}</span></label>`; }
function tagField(items = []) { return `<div class="field span-2 tag-field"><label for="tag-input">Comp\u00E9tences et mots-cl\u00E9s</label><div class="tag-editor" data-tags='${(0, domain_js_1.escapeHtml)(JSON.stringify(items.map(t => t.label)))}'><div class="selected-tags"></div><input id="tag-input" autocomplete="off" placeholder="Saisissez un terme, puis choisissez ou ajoutez..." aria-label="Rechercher ou cr\u00E9er un tag" role="combobox" aria-autocomplete="list" aria-expanded="false"><div class="tag-suggestions" role="listbox" hidden></div></div><small>Suggestions du r\u00E9f\u00E9rentiel partag\u00E9. Vos termes sont autoris\u00E9s ; casse et accents ne cr\u00E9ent pas de doublons.</small></div>`; }
function richField(name, text, value = "", required = true) { return `<div class="field span-2"><label id="l-${name}">${(0, domain_js_1.escapeHtml)(text)} ${required ? "<span class=\"required\">*</span>" : ""}</label><div class="rich-editor"><div class="rich-toolbar" role="toolbar" aria-label="Mise en forme">${["bold", "italic", "list"].map(cmd => `<button type="button" data-edit="${cmd}" title="${cmd === "bold" ? "Gras" : cmd === "italic" ? "Italique" : "Liste"}" aria-label="${cmd === "bold" ? "Gras" : cmd === "italic" ? "Italique" : "Liste"}">${(0, icons_js_1.icon)(cmd, 16)}</button>`).join("")}<span>Contexte, enjeux et attentes</span></div><div class="rich-input" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="l-${name}" data-name="${name}">${(0, domain_js_1.markdown)(value)}</div></div><small>Ne saisissez ni nom de startup ni coordonn\u00E9es dans le texte partag\u00E9. Les contacts disposent de champs priv\u00E9s distincts.</small></div>`; }
function pagination(total, page, size = 24) {
    const pages = Math.ceil(total / size);
    if (pages <= 1)
        return "";
    return `<nav class="pagination" aria-label="Pagination">${button("Pr\u00E9c\u00E9dent", "page", { disabled: page <= 0, extra: `data-page="${page - 1}"` })}<span>${page + 1} / ${pages} &middot; ${total} r\u00E9sultats</span>${button("Suivant", "page", { disabled: page + 1 >= pages, extra: `data-page="${page + 1}"` })}</nav>`;
}
function toast(text, bad = false) {
    const root = document.querySelector("#toasts");
    if (!root)
        return;
    const node = document.createElement("div");
    node.className = "toast " + (bad ? "error" : "");
    node.innerHTML = (0, icons_js_1.icon)(bad ? "warning" : "check", 18) + `<span>${(0, domain_js_1.escapeHtml)(text)}</span>`;
    root.append(node);
    setTimeout(() => node.remove(), bad ? 9000 : 5000);
}
let beforeModal = null;
let closeCb = null;
function modal(title, body, options = {}) {
    beforeModal = document.activeElement;
    closeCb = options.onClose || null;
    const root = document.querySelector("#overlay");
    root.innerHTML = `<div class="modal-backdrop"><section class="modal ${options.wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><p class="eyebrow">EURACONNECT</p><h2 id="modal-title">${(0, domain_js_1.escapeHtml)(title)}</h2>${options.subtitle ? `<p>${(0, domain_js_1.escapeHtml)(options.subtitle)}</p>` : ""}</div>${iconButton("close", "Fermer", "close-modal")}</header><div class="modal-body">${body}</div></section></div>`;
    document.body.classList.add("has-modal");
    const first = root.querySelector("input,select,textarea,[contenteditable=true],button");
    first?.focus();
    setupTags(root);
    setupEditors(root);
    void hydrateImages(root);
}
function closeModal() { document.querySelector("#overlay").innerHTML = ""; document.body.classList.remove("has-modal"); closeCb?.(); closeCb = null; beforeModal?.focus(); }
function modalOpen() { return Boolean(document.querySelector("#overlay .modal")); }
document.addEventListener("keydown", ev => {
    if (!modalOpen())
        return;
    if (ev.key === "Escape") {
        closeModal();
        return;
    }
    if (ev.key === "Tab") {
        const list = Array.from(document.querySelectorAll("#overlay button:not([disabled]),#overlay input:not([disabled]),#overlay select,#overlay textarea,#overlay [contenteditable=true],#overlay a[href]")).filter(x => x.offsetParent !== null);
        const first = list[0], last = list[list.length - 1];
        if (ev.shiftKey && document.activeElement === first) {
            ev.preventDefault();
            last?.focus();
        }
        else if (!ev.shiftKey && document.activeElement === last) {
            ev.preventDefault();
            first?.focus();
        }
    }
});
async function hydrateImages(root) {
    await Promise.all(Array.from(root.querySelectorAll("img[data-path]")).map(async (img) => {
        try {
            img.src = await (0, api_js_1.loadMedia)(img.dataset.bucket || "", img.dataset.path || "");
        }
        catch {
            img.replaceWith(Object.assign(document.createElement("span"), { textContent: (0, domain_js_1.initials)(img.alt) }));
        }
    }));
}
function formValues(form) {
    const values = {};
    new FormData(form).forEach((v, k) => {
        if (typeof v === "string")
            values[k] = v;
    });
    form.querySelectorAll("input[type=checkbox]").forEach(x => values[x.name] = x.checked);
    const te = form.querySelector(".tag-editor");
    if (te) {
        const existing = JSON.parse(te.dataset.tags || "[]");
        const pending = te.querySelector("input")?.value.trim() || "";
        if (pending && (pending.length < 2 || pending.length > 60))
            throw new Error("Un tag doit contenir entre 2 et 60 caract\u00E8res.");
        if (existing.length >= 20 && pending && !existing.some(t => (0, domain_js_1.normalizeTag)(t) === (0, domain_js_1.normalizeTag)(pending)))
            throw new Error("20 tags maximum.");
        values.tags = (0, domain_js_1.uniqueTags)([...existing, ...(pending ? [pending] : [])]);
    }
    form.querySelectorAll(".rich-input").forEach(x => values[x.dataset.name || "context"] = richToText(x));
    return values;
}
function richToText(el) { const clone = el.cloneNode(true); clone.querySelectorAll("strong,b").forEach(x => x.replaceWith(document.createTextNode("**" + x.textContent + "**"))); clone.querySelectorAll("em,i").forEach(x => x.replaceWith(document.createTextNode("*" + x.textContent + "*"))); clone.querySelectorAll("li").forEach(x => x.prepend(document.createTextNode("- "))); clone.querySelectorAll("p,div,li,h4,br").forEach(x => x.append(document.createTextNode("\n"))); return (clone.textContent || "").replace(/\n{3,}/g, "\n\n").trim(); }
function setupEditors(root) {
    root.querySelectorAll(".rich-editor").forEach(box => {
        const input = box.querySelector(".rich-input");
        let saved = null;
        const save = () => {
            const sel = getSelection();
            if (sel?.rangeCount && input.contains(sel.anchorNode))
                saved = sel.getRangeAt(0).cloneRange();
        };
        input.addEventListener("keyup", save);
        input.addEventListener("mouseup", save);
        box.querySelectorAll("button[data-edit]").forEach(btn => {
            btn.addEventListener("mousedown", ev => ev.preventDefault());
            btn.addEventListener("click", () => {
                input.focus();
                const sel = getSelection();
                const range = saved || document.createRange();
                if (!saved) {
                    range.selectNodeContents(input);
                    range.collapse(false);
                }
                const cmd = btn.dataset.edit;
                const node = document.createElement(cmd === "bold" ? "strong" : cmd === "italic" ? "em" : "p");
                const fragment = range.extractContents();
                if (cmd === "list")
                    node.append(document.createTextNode("- "));
                node.append(fragment);
                if (!node.textContent)
                    node.append(document.createTextNode("Votre texte"));
                range.insertNode(node);
                range.selectNodeContents(node);
                sel?.removeAllRanges();
                sel?.addRange(range);
                saved = range;
                input.dispatchEvent(new Event("input", { bubbles: true }));
            });
        });
        input.addEventListener("paste", ev => {
            ev.preventDefault();
            const text = ev.clipboardData?.getData("text/plain") || "";
            const sel = getSelection();
            if (sel?.rangeCount) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const node = document.createTextNode(text);
                range.insertNode(node);
                range.setStartAfter(node);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    });
}
function setupTags(root) {
    root.querySelectorAll(".tag-editor").forEach(box => {
        const input = box.querySelector("input");
        const suggestions = box.querySelector(".tag-suggestions");
        const chosen = box.querySelector(".selected-tags");
        let terms = (0, domain_js_1.uniqueTags)(JSON.parse(box.dataset.tags || "[]"));
        let request = 0;
        let timer;
        let candidates = [];
        const draw = () => { box.dataset.tags = JSON.stringify(terms); chosen.innerHTML = terms.map((t, i) => `<span class="tag chosen">${(0, domain_js_1.escapeHtml)(t)}<button type="button" data-remove="${i}" aria-label="Retirer ${(0, domain_js_1.escapeHtml)(t)}">${(0, icons_js_1.icon)("close", 12)}</button></span>`).join(""); };
        const add = (text) => {
            const value = text.trim();
            if (value.length < 2 || value.length > 60) {
                toast("Un tag doit contenir entre 2 et 60 caract\u00E8res.", true);
                return;
            }
            terms = (0, domain_js_1.uniqueTags)([...terms, value]);
            draw();
            input.value = "";
            suggestions.hidden = true;
            input.setAttribute("aria-expanded", "false");
            input.focus();
        };
        chosen.addEventListener("click", ev => {
            const b = ev.target.closest("[data-remove]");
            if (b) {
                terms.splice(Number(b.dataset.remove), 1);
                draw();
            }
        });
        input.addEventListener("input", () => {
            clearTimeout(timer);
            const id = ++request;
            const q = input.value.trim();
            if (q.length < 2) {
                suggestions.hidden = true;
                input.setAttribute("aria-expanded", "false");
                return;
            }
            timer = setTimeout(() => {
                void (async () => {
                    let rows = [];
                    try {
                        rows = await (0, api_js_1.rpc)("tags", { q });
                    }
                    catch { /* Creation remains possible; errors will be shown on save. */ }
                    if (id !== request || !input.isConnected)
                        return;
                    candidates = rows.map(x => x.label).filter(t => !terms.some(x => (0, domain_js_1.normalizeTag)(x) === (0, domain_js_1.normalizeTag)(t)));
                    if (!rows.some(t => (0, domain_js_1.normalizeTag)(t.label) === (0, domain_js_1.normalizeTag)(q)))
                        candidates.push(q);
                    suggestions.innerHTML = candidates.map((t, i) => `<button type="button" role="option" data-tag-index="${i}">${(0, icons_js_1.icon)(rows.some(x => x.label === t) ? "tag" : "plus", 15)}${(0, domain_js_1.escapeHtml)(t)}<small>${rows.some(x => x.label === t) ? "Existant" : "Ajouter ce terme"}</small></button>`).join("");
                    suggestions.hidden = false;
                    input.setAttribute("aria-expanded", "true");
                })();
            }, 200);
        });
        input.addEventListener("keydown", ev => {
            if (ev.key === "Enter" || ev.key === ",") {
                ev.preventDefault();
                if (input.value.trim())
                    add(candidates.find(t => (0, domain_js_1.normalizeTag)(t) === (0, domain_js_1.normalizeTag)(input.value)) || input.value);
            }
            if (ev.key === "Escape") {
                suggestions.hidden = true;
                input.setAttribute("aria-expanded", "false");
            }
            if (ev.key === "ArrowDown") {
                ev.preventDefault();
                suggestions.querySelector("button")?.focus();
            }
        });
        suggestions.addEventListener("click", ev => {
            const b = ev.target.closest("[data-tag-index]");
            const term = b ? candidates[Number(b.dataset.tagIndex)] : undefined;
            if (term)
                add(term);
        });
        suggestions.addEventListener("keydown", ev => {
            if (ev.key === "Escape") {
                suggestions.hidden = true;
                input.focus();
            }
            if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
                ev.preventDefault();
                const btns = Array.from(suggestions.querySelectorAll("button"));
                const pos = btns.indexOf(document.activeElement);
                btns[(pos + (ev.key === "ArrowDown" ? 1 : btns.length - 1)) % btns.length]?.focus();
            }
        });
        draw();
    });
}
function footerSubmit(text) { return `<div class="form-error" role="alert" hidden></div><footer class="form-footer">${button("Annuler", "close-modal", { class: "ghost" })}<button type="submit" class="btn primary">${(0, icons_js_1.icon)("check", 17)}${(0, domain_js_1.escapeHtml)(text)}</button></footer>`; }

},
"./views.js":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.titles = void 0;
exports.shell = shell;
exports.pageHead = pageHead;
exports.premiumNotice = premiumNotice;
exports.needCard = needCard;
exports.dashboardView = dashboardView;
exports.needsView = needsView;
exports.directoryView = directoryView;
exports.offersView = offersView;
exports.messagesView = messagesView;
exports.sessionsView = sessionsView;
exports.portfolioView = portfolioView;
exports.adminView = adminView;
exports.notificationList = notificationList;
const domain_js_1 = require("./domain.js");
const icons_js_1 = require("./icons.js");
const ui_js_1 = require("./ui.js");
exports.titles = { dashboard: ["Votre tableau de bord", "Les bonnes actions, au bon moment."], needs: ["Demandes & opportunit\u00E9s", "Un besoin clair. Une expertise. Une relation utile."], directory: ["L'annuaire du r\u00E9seau", "Des entreprises et des personnes a mobiliser."], offers: ["Offres & expertises", "Trouvez les services qui feront avancer votre projet."], messages: ["Messagerie", "Vos \u00E9changes, r\u00E9unis dans un espace d\u00E9di\u00E9."], agenda: ["Votre agenda", "Disponibilit\u00E9s, rendez-vous et permanences."], workshops: ["Ateliers & rencontres", "Apprendre, partager et d\u00E9velopper votre r\u00E9seau."], portfolio: ["Mon portefeuille", "Voir les besoins, lever les blocages, accompagner."], company: ["Entreprise & profil", "Une pr\u00E9sence claire pour de meilleures rencontres."], admin: ["Administration", "Un r\u00E9seau organis\u00E9, des droits ma\u00EEtris\u00E9s."] };
function shell(ctx) {
    const { boot, company, route } = ctx;
    const role = boot.user.role;
    const nav = [{ id: "dashboard", name: "Vue d'ensemble", symbol: "dashboard" }, ...(role === "startup_manager" ? [{ id: "portfolio", name: "Mes startups", symbol: "portfolio" }] : []),
        ...(role !== "startup_manager" ? [{ id: "needs", name: role === "incube" ? "Mes demandes" : role === "prestataire" ? "Opportunit\u00E9s" : "Toutes les demandes", symbol: "needs" }] : []),
        { id: "messages", name: "Messages", symbol: "messages" }, { id: "directory", name: "Annuaire", symbol: "people" }, { id: "offers", name: "Offres & expertises", symbol: "portfolio" },
        { id: "agenda", name: "Agenda & disponibilit\u00E9s", symbol: "calendar" }, { id: "workshops", name: "Ateliers", symbol: "workshop" },
        ...(role === "admin" ? [{ id: "admin", name: "Administration", symbol: "shield" }] : []), { id: "company", name: "Entreprise & profil", symbol: "company" }];
    const title = route === "needs" && role === "incube" ? "Mes demandes" : (exports.titles[route]?.[0] || "EURACONNECT");
    return `${ctx.demo ? `<div class="demo-bar">D\u00C9MONSTRATION &middot; Donn\u00E9es fictives &middot; Aucune ecriture dans Supabase <select id="demo-role" aria-label="Profil de d\u00E9monstration">${["incube", "prestataire", "startup_manager", "admin"].map(r => `<option value="${r}" ${role === r ? "selected" : ""}>${domain_js_1.roleLabels[r]}</option>`).join("")}</select></div>` : ""}
 <div class="app-shell ${ctx.demo ? "is-demo" : ""}"><aside class="sidebar"><a href="#dashboard" class="brand"><span class="brand-mark">E<span>+</span></span><span>EURA<span class="brand-light">CONNECT</span><small>Le r\u00E9seau qui fait avancer.</small></span></a>
 <div class="company-context"><span class="eyebrow">MON ESPACE</span><strong>${(0, domain_js_1.escapeHtml)(domain_js_1.roleLabels[role])}</strong>${boot.memberships.length ? `<select id="company-switch" aria-label="Entreprise de travail">${boot.memberships.map(m => `<option value="${(0, domain_js_1.escapeHtml)(m.id)}" ${m.id === ctx.companyId ? "selected" : ""}>${(0, domain_js_1.escapeHtml)(m.name)}</option>`).join("")}</select>` : `<small>${role === "admin" ? "Pilotage du r\u00E9seau" : role === "startup_manager" ? "Accompagnement startups" : "Entreprise \u00E0 renseigner"}</small>`}</div>
 <nav class="main-nav" aria-label="Navigation principale">${nav.map(n => `<a href="#${n.id}" ${n.id === route ? "aria-current=\"page\"" : ""} class="nav-link ${n.id === route ? "active" : ""}">${(0, icons_js_1.icon)(n.symbol, 19)}<span>${(0, domain_js_1.escapeHtml)(n.name)}</span>${n.id === "messages" && boot.unread_messages ? `<b class="nav-count">${boot.unread_messages}</b>` : ""}</a>`).join("")}</nav>
 <div class="sidebar-bottom">${role === "prestataire" ? company?.premium ? `<div class="sidebar-tip active">${(0, icons_js_1.icon)("shield", 22)}<strong>Votre entreprise est Premium</strong><p>Identit\u00E9 des startups et contacts autoris\u00E9s.</p>${company.expires_at ? `<small>Jusqu au ${(0, domain_js_1.dateText)(company.expires_at)}</small>` : ""}</div>` : `<div class="sidebar-tip">${(0, icons_js_1.icon)("spark", 22)}<strong>Aller plus loin, ensemble.</strong><p>Comprenez les besoins. R\u00E9pondez librement. Identifiez vos interlocuteurs avec Premium.</p>${(0, ui_js_1.button)("D\u00E9couvrir Premium", "premium", { class: "small premium-btn", icon: "arrow" })}</div>` : `<div class="sidebar-tip">${(0, icons_js_1.icon)("shield", 21)}<strong>${role === "incube" ? "Votre accompagnement reste gratuit." : "Un espace de confiance."}</strong><p>${role === "incube" ? "La startup choisit \u00E0 qui donner suite." : "Des droits adaptes \u00E0 chaque responsabilite."}</p></div>`}
 <div class="sidebar-footer"><span class="live-dot"></span> EURACONNECT &middot; 1.0</div></div></aside>
 <div class="workspace"><header class="topbar">${(0, ui_js_1.iconButton)("menu", "Ouvrir la navigation", "menu")}<div class="breadcrumbs">Mon espace <span>/</span> <strong>${(0, domain_js_1.escapeHtml)(title)}</strong></div><div class="topbar-actions"><button class="search-shortcut" data-action="global-search">${(0, icons_js_1.icon)("search", 17)}<span>Rechercher dans le r\u00E9seau</span><kbd>/</kbd></button>
 <a href="#messages" class="icon-button counted" aria-label="Messages, ${boot.unread_messages} conversations non lues">${(0, icons_js_1.icon)("messages")}${boot.unread_messages ? `<span class="counter" id="message-counter">${Math.min(boot.unread_messages, 99)}</span>` : "<span id=\"message-counter\" hidden></span>"}</a>
 <button class="icon-button counted" data-action="notifications" aria-label="Notifications, ${boot.unread_notifications} non lues">${(0, icons_js_1.icon)("bell")}${boot.unread_notifications ? `<span class="counter" id="notice-counter">${Math.min(boot.unread_notifications, 99)}</span>` : "<span id=\"notice-counter\" hidden></span>"}</button>
 <span class="top-separator"></span><a class="profile-chip" href="#company">${(0, ui_js_1.avatar)(boot.user.name || boot.user.email, boot.profile.media)}<span><strong>${(0, domain_js_1.escapeHtml)(boot.user.name || boot.user.email.split("@")[0])}</strong><small>${(0, domain_js_1.escapeHtml)(domain_js_1.roleLabels[role])}</small></span>${(0, icons_js_1.icon)("down", 14)}</a>${(0, ui_js_1.iconButton)("logout", "Se d\u00E9connecter", "logout")}</div></header>
 <main id="main" tabindex="-1"><div id="page-content"><div class="loading-panel"><span class="spinner"></span>Chargement de votre espace...</div></div></main><footer class="workspace-footer"><span>EURACONNECT &middot; L'expertise prend vie dans la rencontre.</span><span>Heures Europe/Paris &middot; Donn\u00E9es s\u00E9curis\u00E9es</span></footer></div></div>`;
}
function pageHead(eyebrow, title, description, actions = "") { return `<div class="page-head"><div><p class="eyebrow">${(0, domain_js_1.escapeHtml)(eyebrow)}</p><h1>${(0, domain_js_1.escapeHtml)(title)}</h1><p>${(0, domain_js_1.escapeHtml)(description)}</p></div><div class="page-actions">${actions}</div></div>`; }
function premiumNotice() { return `<div class="inline-note"><span class="note-icon">${(0, icons_js_1.icon)("lock", 19)}</span><div><strong>Le besoin est complet. Seule l'identit\u00E9 de la startup est prot\u00E9g\u00E9e.</strong><p>Vous pouvez vous positionner et echanger sans Premium. Votre nom est toujours visible de la startup.</p></div>${(0, ui_js_1.button)("Comprendre Premium", "premium", { class: "ghost small" })}</div>`; }
function needCard(n, compact = false) {
    return `<article class="need-card ${compact ? "compact" : ""}"><div class="card-overline">${(0, ui_js_1.badge)(n.status)}${(0, ui_js_1.favorite)(n.id, "need", n.favorite, true)}</div><button class="text-button card-title" data-action="open-need" data-id="${(0, domain_js_1.escapeHtml)(n.id)}">${(0, domain_js_1.escapeHtml)(n.title)}</button>
 <div class="need-owner">${(0, icons_js_1.icon)(n.identity_visible ? "company" : "lock", 14)}${(0, domain_js_1.escapeHtml)(n.company_name)}</div><p class="card-excerpt">${(0, domain_js_1.escapeHtml)(n.context.replace(/[*#]/g, "").slice(0, compact ? 115 : 200))}${n.context.length > (compact ? 115 : 200) ? "..." : ""}</p>${(0, ui_js_1.tags)(n.tags, compact ? 3 : 5)}
 <div class="need-facts"><span>${(0, icons_js_1.icon)("portfolio", 15)}${n.budget_max != null ? (0, domain_js_1.money)(n.budget_max) : "Budget \u00E0 d\u00E9finir"}</span><span>${(0, icons_js_1.icon)("clock", 15)}${n.deadline ? (0, domain_js_1.dateText)(n.deadline) : "Sans \u00E9ch\u00E9ance fixe"}</span></div>
 <footer class="card-footer"><span>${n.responses_count !== null ? `${n.responses_count} proposition${n.responses_count > 1 ? "s" : ""}` : n.match_count ? `${n.match_count} comp\u00E9tence${n.match_count > 1 ? "s" : ""} en commun` : "Ouvert aux expertises"}</span>${(0, ui_js_1.button)("Voir le besoin", "open-need", { id: n.id, icon: "arrow", class: "small ghost" })}</footer></article>`;
}
function dashboardView(ctx, data) {
    const r = ctx.boot.user.role;
    const k = data.kpis;
    const name = (ctx.boot.user.name || "").split(" ")[0] || "\u00E0 vous";
    const headAction = r === "incube" ? (0, ui_js_1.button)("Publier une demande", "new-need", { class: "primary", icon: "plus" }) : r === "startup_manager" ? (0, ui_js_1.button)("Organiser un atelier", "new-session", { class: "primary", icon: "plus", extra: "data-kind=\"atelier\"" }) : r === "prestataire" ? (0, ui_js_1.button)("Trouver des opportunit\u00E9s", "go", { class: "primary", icon: "search", extra: "data-route=\"needs\"" }) : (0, ui_js_1.button)("G\u00E9rer le r\u00E9seau", "go", { class: "primary", icon: "shield", extra: "data-route=\"admin\"" });
    const stats = r === "admin" ? [["Comptes utilisateurs", k.users, "people"], ["Demandes ouvertes", k.needs, "needs"], ["Prestataires \u00E0 valider", k.pending_providers, "shield"], ["Rendez-vous \u00E0 venir", k.sessions, "calendar"]] : r === "startup_manager" ? [["Startups accompagn\u00E9es", k.portfolio, "company"], ["Besoins actifs", k.needs, "needs"], ["Sans proposition a J+7", k.no_response, "warning"], ["Rendez-vous \u00E0 venir", k.sessions, "calendar"]] : r === "incube" ? [["Demandes en cours", k.needs, "needs"], ["Propositions re\u00E7ues", k.responses, "portfolio"], ["\u00C0 examiner", k.waiting, "messages"], ["Rendez-vous \u00E0 venir", k.sessions, "calendar"]] : [["Opportunit\u00E9s ouvertes", k.needs, "needs"], ["Propositions envoy\u00E9es", k.responses, "send"], ["En attente de d\u00E9cision", k.waiting, "clock"], ["Rendez-vous \u00E0 venir", k.sessions, "calendar"]];
    return `${pageHead("VOTRE ESPACE DE TRAVAIL", "Bonjour " + name + ".", r === "startup_manager" ? "Chaque besoin est une occasion de faire avancer votre portefeuille." : "Voici ce qui m\u00E9rite votre attention aujourd'hui.", headAction)}
 ${!ctx.boot.active ? "<div class=\"warning-note\">La V1 est en lecture seule jusqu \u00E0 l'execution de 02_ACTIVER_V1.sql.</div>" : ""}
 ${!ctx.company && r !== "admin" && r !== "startup_manager" ? `<div class="inline-note"><span>${(0, icons_js_1.icon)("company", 24)}</span><div><strong>Votre entreprise est le point de depart.</strong><p>Renseignez votre fiche pour publier des demandes ou proposer vos services.</p></div>${(0, ui_js_1.button)("Configurer mon entreprise", "new-company", { class: "primary" })}</div>` : ""}
 <div class="kpi-grid">${stats.map(([text, num, symbol], idx) => `<div class="kpi"><div class="kpi-top"><span>${(0, domain_js_1.escapeHtml)(text)}</span><span class="kpi-icon i-${idx}">${(0, icons_js_1.icon)(String(symbol), 20)}</span></div><strong>${(0, domain_js_1.escapeHtml)(num)}</strong><small>${idx === 2 ? "A suivre en priorite" : "Donn\u00E9es de votre p\u00E9rim\u00E8tre"}</small></div>`).join("")}</div>
 <div class="dashboard-layout"><section><div class="section-heading"><div><h2>${r === "prestataire" ? "Explorer les besoins" : r === "startup_manager" ? "Les demandes de votre portefeuille" : "Vos demandes r\u00E9centes"}</h2><p>${r === "prestataire" ? "Des briefs visibles pour formuler des r\u00E9ponses pertinentes." : "Un point d'entree unique pour suivre chaque dossier."}</p></div><a href="#${r === "startup_manager" ? "portfolio" : "needs"}" class="inline-link">Tout voir ${(0, icons_js_1.icon)("arrow", 16)}</a></div>
 ${data.recent_needs.length ? `<div class="cards-grid two">${data.recent_needs.slice(0, 4).map(n => needCard(n, true)).join("")}</div>` : (0, ui_js_1.empty)("Tout commence par un besoin", "Les demandes appara\u00EEtront ici des leur publication.", r === "incube" ? (0, ui_js_1.button)("Publier ma premi\u00E8re demande", "new-need", { class: "primary", icon: "plus" }) : "", "needs")}
 <div class="journey-panel"><div class="journey-intro"><span class="eyebrow">UNE RELATION, PAS DES \u00C9CRANS</span><h3>Du besoin \u00E0 la collaboration.</h3></div>${["La startup publi\u00E9", "L'expert propose", "La startup d\u00E9cide", "On se rencontre"].map((text, i) => `<div class="journey-step"><span>${i + 1}</span>${(0, domain_js_1.escapeHtml)(text)}</div>`).join("")}</div></section>
 <aside class="dashboard-aside"><section class="panel"><div class="section-heading"><h2>Prochains rendez-vous</h2>${(0, icons_js_1.icon)("calendar", 19)}</div>${data.next_sessions.length ? data.next_sessions.map(s => `<button class="upcoming" data-action="open-session" data-id="${(0, domain_js_1.escapeHtml)(s.id)}"><span class="date-tile"><strong>${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "Europe/Paris" }).format(new Date(s.starts_at))}</strong><small>${new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "Europe/Paris" }).format(new Date(s.starts_at))}</small></span><span><strong>${(0, domain_js_1.escapeHtml)(s.title)}</strong><small>${(0, domain_js_1.timeText)(s.starts_at)} &middot; ${(0, domain_js_1.escapeHtml)(s.host_name)}</small>${(0, ui_js_1.badge)(s.kind)}</span>${(0, icons_js_1.icon)("arrow", 15)}</button>`).join("") : "<p class=\"muted\">Aucun rendez-vous \u00E0 venir.</p>"}<a href="#agenda" class="inline-link">Ouvrir mon agenda ${(0, icons_js_1.icon)("arrow", 16)}</a></section>
 <section class="panel tips-panel"><span class="tip-symbol">${(0, icons_js_1.icon)("spark", 26)}</span><p class="eyebrow">LE BON R\u00C9FLEXE</p><h3>${r === "incube" ? "Un brief pr\u00E9cis attire les bonnes expertises." : r === "startup_manager" ? "Passez de la supervision \u00E0 l'action." : "Les comp\u00E9tences rendent votre expertise visible."}</h3><p>${r === "incube" ? "Ajoutez le contexte, les livrables attendus et vos contraintes. Votre identit\u00E9 reste prot\u00E9g\u00E9e aupres des prestataires non Premium." : r === "startup_manager" ? "Reperez un besoin sans r\u00E9ponse, recommandez un expert et conservez une note de suivi interne." : "Compl\u00E9tez vos tags. Les besoins qui recoupent vos expertises g\u00E9n\u00E8rent une notification."}</p><a href="#${r === "startup_manager" ? "portfolio" : "company"}" class="inline-link">${r === "startup_manager" ? "Piloter mon portefeuille" : "Soigner mon profil"} ${(0, icons_js_1.icon)("arrow", 15)}</a></section></aside></div>`;
}
function searchFilters(ctx, placeholder, extras = "") { return `<form class="filter-bar" id="filter-form"><label class="search-field">${(0, icons_js_1.icon)("search", 18)}<input name="q" value="${(0, domain_js_1.escapeHtml)(ctx.params.get("q") || "")}" placeholder="${(0, domain_js_1.escapeHtml)(placeholder)}" aria-label="${(0, domain_js_1.escapeHtml)(placeholder)}"></label>${extras}<label class="filter-check"><input type="checkbox" name="favorites" ${ctx.params.get("favorites") === "true" ? "checked" : ""}>${(0, icons_js_1.icon)("heart", 16)} Mes favoris</label><button type="submit" class="btn small">Filtrer</button>${ctx.params.toString() ? (0, ui_js_1.button)("Effacer", "clear-filters", { class: "ghost small" }) : ""}</form>`; }
function needsView(ctx, data) {
    const own = ctx.boot.user.role === "incube";
    const status = ctx.params.get("status") || "";
    return pageHead(own ? "LES DEMANDES DE VOTRE ENTREPRISE" : "BOURSE DES BESOINS", own ? "Mes demandes" : "Opportunit\u00E9s & projets", own ? "Publiez, comparez les propositions et choisissez \u00E0 qui donner suite." : "Tout le contexte n\u00E9cessaire pour proposer votre expertise.", own || ctx.boot.user.role === "admin" ? (0, ui_js_1.button)("Nouvelle demande", "new-need", { class: "primary", icon: "plus" }) : "") +
        (ctx.boot.user.role === "prestataire" && !ctx.company?.premium ? premiumNotice() : "") +
        searchFilters(ctx, "Besoin, expertise, mot-cle...", `<select name="status" aria-label="Statut"><option value="">Tous les statuts</option>${["ouvert", "en_echanges", "rdv_planifie", "devis_recu", "en_realisation", "termine", "en_pause", "sans_suite"].map(s => `<option value="${s}" ${s === status ? "selected" : ""}>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(s))}</option>`).join("")}</select><select name="sort" aria-label="Tri"><option value="recent">Plus r\u00E9cents</option><option value="match" ${ctx.params.get("sort") === "match" ? "selected" : ""}>Comp\u00E9tences communes</option></select>`) +
        `<div class="results-meta"><span><strong>${data.total}</strong> demande${data.total > 1 ? "s" : ""}</span><span>Les favoris sont personnels et synchronises.</span></div>` +
        (data.items.length ? `<div class="cards-grid three">${data.items.map(n => needCard(n)).join("")}</div>` : (0, ui_js_1.empty)("Aucune demande dans cette s\u00E9lection", "Modifiez les filtres ou publiez un premier besoin.", own ? (0, ui_js_1.button)("Publier un besoin", "new-need", { class: "primary" }) : "", "needs")) + (0, ui_js_1.pagination)(data.total, ctx.page);
}
function directoryView(ctx, data) {
    const kind = ctx.params.get("kind") || "";
    const type = ctx.params.get("type") || "";
    return pageHead("ENTREPRISES & CONTACTS", "Un r\u00E9seau \u00E0 portee de main.", "Identifiez une expertise, gardez-la en favori et trouvez un cr\u00E9neau.", (0, ui_js_1.button)("Mon profil", "go", { extra: "data-route=\"company\"", icon: "user" })) +
        `<div class="segmented" aria-label="Type de fiche">${[["", "Tout le r\u00E9seau"], ["company", "Entreprises"], ["person", "Contacts"]].map(([v, t]) => (0, ui_js_1.button)(t || "", "directory-kind", { class: kind === v ? "selected" : "", extra: `data-kind="${v}"` })).join("")}</div>` +
        searchFilters(ctx, "Entreprise, personne, comp\u00E9tence...", `<input type="hidden" name="kind" value="${(0, domain_js_1.escapeHtml)(kind)}"><select name="type" aria-label="Typologie"><option value="">Toutes les typologies</option>${["startup", "incube", "prestataire", "startup_manager", "autre", "admin"].map(t => `<option value="${t}" ${type === t ? "selected" : ""}>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(t))}</option>`).join("")}</select>`) +
        `<div class="results-meta"><span><strong>${data.total}</strong> fiche${data.total > 1 ? "s" : ""}</span><span>${(0, icons_js_1.icon)("shield", 13)} Les identit\u00E9s suivent les droits de votre entreprise.</span></div>` +
        (data.items.length ? `<div class="cards-grid three">${data.items.map(d => `<article class="directory-card"><div class="directory-top">${(0, ui_js_1.avatar)(d.name, d.media, d.kind === "company")}${(0, ui_js_1.favorite)(d.id, d.kind, d.favorite)}</div><div class="entity-types"><span class="entity-kind">${(0, icons_js_1.icon)(d.kind === "company" ? "company" : "user", 13)}${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(d.kind))}</span><span class="type-tag type-${(0, domain_js_1.escapeHtml)(d.type)}">${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(d.type))}</span>${d.premium ? "<span class=\"premium-label\">Premium</span>" : ""}</div><h3>${(0, domain_js_1.escapeHtml)(d.name)}</h3><p class="entity-subtitle">${(0, domain_js_1.escapeHtml)(d.subtitle || d.company_name || "Membre du r\u00E9seau EURACONNECT")}</p><p class="card-excerpt">${(0, domain_js_1.escapeHtml)(d.description.slice(0, 125) || "Les expertises de cette fiche sont en cours de pr\u00E9cision.")}</p>${(0, ui_js_1.tags)(d.tags, 4)}${!d.identity_visible ? "<p class=\"protected-label\">" + (0, icons_js_1.icon)("lock", 13) + "Identit\u00E9 prot\u00E9g\u00E9e</p>" : ""}<div class="availability-line">${(0, icons_js_1.icon)("calendar", 15)}${d.next_slot ? "Prochain cr\u00E9neau : " + (0, domain_js_1.dateText)(d.next_slot, true) : "Pas de cr\u00E9neau publi\u00E9 actuellement"}</div><footer class="directory-actions">${(0, ui_js_1.button)("Voir la fiche", "directory-detail", { id: d.id, class: "small ghost", extra: `data-kind="${d.kind}"` })}${(0, ui_js_1.button)("Voir les cr\u00E9neaux", "directory-slots", { id: d.id, icon: "calendar", class: "small", extra: `data-kind="${d.kind}"` })}</footer></article>`).join("")}</div>` : (0, ui_js_1.empty)("Aucun r\u00E9sultat", "Essayez une autre comp\u00E9tence ou retirez un filtre.")) + (0, ui_js_1.pagination)(data.total, ctx.page);
}
function offersView(ctx, data) {
    return pageHead("CATALOGUE DE SERVICES", "L'expertise, en concret.", "Des offres lisibles, des prestations identifiees et des avantages pour les startups.", ctx.boot.user.role === "prestataire" ? (0, ui_js_1.button)("Publier une offre", "new-offer", { icon: "plus", class: "primary" }) : "") + searchFilters(ctx, "Service, prestataire, comp\u00E9tence...") +
        `<div class="results-meta"><strong>${data.total} offre${data.total > 1 ? "s" : ""}</strong></div>` + (data.items.length ? `<div class="cards-grid three">${data.items.map(o => `<article class="offer-card">${o.media ? `<div class="offer-illustration"><img data-bucket="${(0, domain_js_1.escapeHtml)(o.media.bucket)}" data-path="${(0, domain_js_1.escapeHtml)(o.media.path)}" alt="${(0, domain_js_1.escapeHtml)(o.title)}" loading="lazy"></div>` : ""}<div class="offer-top">${(0, icons_js_1.icon)("portfolio", 26)}${(0, ui_js_1.favorite)(o.id, "offer", o.favorite)}</div><small class="eyebrow">${(0, domain_js_1.escapeHtml)(o.provider)}</small><h3>${(0, domain_js_1.escapeHtml)(o.title)}</h3><p class="card-excerpt">${(0, domain_js_1.escapeHtml)(o.description.slice(0, 170))}</p>${(0, ui_js_1.tags)(o.tags, 4)}<div class="need-facts"><strong>${o.price == null ? "Sur devis" : (0, domain_js_1.money)(o.price)}</strong><span>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(o.format))}</span></div>${o.benefit ? `<div class="benefit">${(0, icons_js_1.icon)("spark", 15)}<span><strong>Avantage incub\u00E9s</strong>${(0, domain_js_1.escapeHtml)(o.benefit)}</span></div>` : ""}<footer class="card-footer">${(0, ui_js_1.button)("D\u00E9tails", "offer-detail", { id: o.id, class: "small ghost" })}${(0, ui_js_1.button)("Rencontrer cet expert", "directory-slots", { id: o.company_id, extra: "data-kind=\"company\"", class: "small", icon: "calendar" })}</footer></article>`).join("")}</div>` : (0, ui_js_1.empty)("Le catalogue se construit", "Les offres des prestataires valid\u00E9s appara\u00EEtront ici.", "", "portfolio")) + (0, ui_js_1.pagination)(data.total, ctx.page);
}
function messagesView(ctx, data, detail) {
    return pageHead("RELATIONS & CONVERSATIONS", "Un dossier, un fil.", "Toutes les propositions et les \u00E9changes utiles, sans perdre le contexte.") +
        `<div class="messages-layout"><aside class="thread-list"><form id="filter-form" class="inbox-search"><label class="search-field">${(0, icons_js_1.icon)("search", 17)}<input name="q" value="${(0, domain_js_1.escapeHtml)(ctx.params.get("q") || "")}" placeholder="Rechercher un dossier" aria-label="Rechercher un dossier"></label></form><div class="inbox-summary">${data.total} conversation${data.total > 1 ? "s" : ""}</div>${data.items.length ? data.items.map(r => `<a class="thread-item ${r.id === detail?.thread.id ? "selected" : ""}" href="#messages/${(0, domain_js_1.escapeHtml)(r.id)}"><div class="thread-top"><strong>${(0, domain_js_1.escapeHtml)(ctx.boot.user.role === "prestataire" ? r.startup : r.provider)}</strong>${r.unread ? `<span class="counter inline">${r.unread}</span>` : ""}</div><span>${(0, domain_js_1.escapeHtml)(r.need_title)}</span><small>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(r.status))} &middot; ${(0, domain_js_1.dateText)(r.created_at)}</small></a>`).join("") : "<p class=\"muted inset\">Une conversation est cr\u00E9\u00E9e avec chaque proposition. Aucun contact a froid.</p>"}${(0, ui_js_1.pagination)(data.total, ctx.page)}</aside>
 <section class="conversation">${detail ? `<header class="conversation-head"><div><p class="eyebrow">${(0, domain_js_1.escapeHtml)(ctx.boot.user.role === "prestataire" ? detail.thread.startup : detail.thread.provider)}</p><h2>${(0, domain_js_1.escapeHtml)(detail.thread.need_title)}</h2>${(0, ui_js_1.badge)(detail.thread.status)}</div><div class="conversation-actions">${(0, ui_js_1.button)("Voir le besoin", "open-need", { id: detail.thread.need_id, icon: "needs", class: "small ghost" })}${!(0, domain_js_1.isClosed)(detail.thread.status) && detail.thread.can_message ? (0, ui_js_1.button)("Proposer un cr\u00E9neau", "propose", { id: detail.thread.id, icon: "calendar", class: "small" }) : ""}</div></header><div class="proposal-summary"><strong>Proposition initiale</strong><p>${(0, domain_js_1.escapeHtml)(detail.thread.message.slice(0, 240))}</p><span>${detail.thread.price == null ? "Tarif a convenir" : (0, domain_js_1.money)(detail.thread.price)}${detail.thread.lead_days !== null ? " &middot; " + detail.thread.lead_days + " jours" : ""}</span></div>
 <div class="message-flow message-history" id="message-flow">${detail.total > 100 ? "<p class=\"muted\">Affichage des 100 derniers messages.</p>" : ""}${detail.items.length ? detail.items.map(m => `<div class="message ${m.self ? "self" : ""}"><small class="message-meta">${(0, domain_js_1.escapeHtml)(m.author)} &middot; ${(0, domain_js_1.dateText)(m.created_at, true)}</small><div class="message-bubble">${(0, domain_js_1.markdown)(m.body)}</div></div>`).join("") : "<div class=\"conversation-start\">" + (0, icons_js_1.icon)("messages", 28) + "<p>Le dialogue commence ici.<br>Clarifiez le besoin avant de vous engager.</p></div>"}</div>
 ${detail.thread.can_message && !(0, domain_js_1.isClosed)(detail.thread.status) ? `<form id="message-form" class="message-composer" data-id="${(0, domain_js_1.escapeHtml)(detail.thread.id)}"><textarea name="body" required maxlength="6000" rows="2" placeholder="\u00C9crivez votre message..." aria-label="Votre message"></textarea><button type="submit" class="btn primary" aria-label="Envoyer le message">${(0, icons_js_1.icon)("send", 19)}Envoyer</button><small>Identit\u00E9s et coordonn\u00E9es des startups prot\u00E9g\u00E9es selon les droits Premium. Les \u00E9changes restent dans votre dossier.</small><div class="form-error" role="alert" hidden></div></form>` : "<p class=\"read-only-note\">" + (0, icons_js_1.icon)("lock", 16) + "Conversation en lecture seule. La startup peut rouvrir la discussion depuis la proposition.</p>"}` : (0, ui_js_1.empty)("Choisissez une conversation", "A gauche, retrouvez chaque prestataire et chaque demande.", "", "messages")}</section></div>`;
}
function sessionsView(ctx, data, workshops = false) {
    const scope = ctx.params.get("scope") || "mine";
    const view = ctx.params.get("view") || "week";
    const base = ctx.params.get("from") || (0, domain_js_1.localDate)();
    const date = new Date(base + "T12:00:00Z");
    const mon = new Date(date);
    mon.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setUTCDate(mon.getUTCDate() + i); return d.toISOString().slice(0, 10); });
    const canCreate = ["prestataire", "startup_manager", "admin"].includes(ctx.boot.user.role);
    let html = pageHead(workshops ? "ATELIERS & RENCONTRES" : "AGENDA DU R\u00C9SEAU", workshops ? "Faites avancer vos projets, ensemble." : "Le bon rendez-vous, au bon moment.", workshops ? "Les ateliers sont ouverts aux membres. Inscription gratuite dans la limite des places." : "Vos rendez-vous, vos disponibilit\u00E9s et les permanences du r\u00E9seau.", canCreate ? (0, ui_js_1.button)(workshops ? "Organiser un atelier" : "Proposer des disponibilit\u00E9s", "new-session", { icon: "plus", class: "primary", extra: `data-kind="${workshops ? "atelier" : "creneau"}"` }) : (0, ui_js_1.button)("Trouver un cr\u00E9neau", "agenda-scope", { icon: "search", class: "primary", extra: "data-scope=\"all\"" }));
    if (!workshops)
        html += `<div class="agenda-toolbar"><div class="segmented">${[["mine", "Mon agenda"], ["all", "Disponibilit\u00E9s du r\u00E9seau"]].map(([v, t]) => (0, ui_js_1.button)(t || "", "agenda-scope", { class: scope === v ? "selected" : "", extra: `data-scope="${v}"` })).join("")}</div><div class="agenda-nav">${(0, ui_js_1.iconButton)("back", "Semaine precedente", "agenda-week", "", "data-direction=\"-1\"")}${(0, ui_js_1.button)("Aujourd'hui", "agenda-today", { class: "small ghost" })}${(0, ui_js_1.iconButton)("arrow", "Semaine suivante", "agenda-week", "", "data-direction=\"1\"")}<strong>${(0, domain_js_1.dateText)(days[0])} - ${(0, domain_js_1.dateText)(days[6])}</strong></div><div class="segmented">${(0, ui_js_1.button)("Semaine", "agenda-view", { icon: "calendar", class: view === "week" ? "selected" : "", extra: "data-view=\"week\"" })}${(0, ui_js_1.button)("Liste", "agenda-view", { icon: "list", class: view === "list" ? "selected" : "", extra: "data-view=\"list\"" })}</div></div><div class="agenda-legend"><span><i class="l-creneau"></i>Disponibilit\u00E9</span><span><i class="l-confirme"></i>Rendez-vous</span><span><i class="l-atelier"></i>Atelier</span><span><i class="l-proposition"></i>Proposition</span><small>Heures Europe/Paris</small></div>`;
    if (workshops)
        html += `<div class="cards-grid three">${data.items.filter(s => s.status !== "annule").map(s => `<article class="workshop-card"><div class="workshop-banner">${(0, icons_js_1.icon)("workshop", 36)}<span>${(0, domain_js_1.dateText)(s.starts_at)}</span></div><div class="workshop-content">${(0, ui_js_1.badge)(s.kind)}<h3>${(0, domain_js_1.escapeHtml)(s.title)}</h3><p class="entity-subtitle">Avec ${(0, domain_js_1.escapeHtml)(s.host_name)}</p><p class="card-excerpt">${(0, domain_js_1.escapeHtml)(s.description.slice(0, 150))}</p><div class="need-facts"><span>${(0, domain_js_1.timeText)(s.starts_at)} - ${(0, domain_js_1.timeText)(s.ends_at)}</span><span>${(0, domain_js_1.escapeHtml)((0, domain_js_1.label)(s.mode))}</span></div><div class="capacity-line"><span>${s.occupied} / ${s.capacity} places r\u00E9serv\u00E9es</span>${s.registration ? (0, ui_js_1.badge)(s.registration) : ""}</div>${(0, ui_js_1.button)(s.registration ? "Mon inscription" : "D\u00E9couvrir et m inscrire", "open-session", { id: s.id, icon: "arrow", class: "primary full" })}</div></article>`).join("")}</div>`;
    else if (view === "week")
        html += `<section class="week-grid" aria-label="Agenda de la semaine">${days.map(day => `<div class="day-column ${day === (0, domain_js_1.localDate)() ? "today" : ""}"><header><span>${new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "Europe/Paris" }).format(new Date(day + "T12:00Z"))}</span><strong>${Number(day.slice(-2))}</strong>${day === (0, domain_js_1.localDate)() ? "<small>Aujourd'hui</small>" : ""}</header><div class="day-slots">${data.items.filter(s => (0, domain_js_1.localDate)(new Date(s.starts_at)) === day && s.status !== "annule").map(s => `<button class="calendar-event event-${s.registration === "confirme" ? "confirme" : (0, domain_js_1.escapeHtml)(s.kind)}" data-action="open-session" data-id="${(0, domain_js_1.escapeHtml)(s.id)}"><span>${(0, domain_js_1.timeText)(s.starts_at)} - ${(0, domain_js_1.timeText)(s.ends_at)}</span><strong>${(0, domain_js_1.escapeHtml)(s.title)}</strong><small>${(0, domain_js_1.escapeHtml)(s.host_name)}</small>${s.kind === "atelier" ? `<small>${s.occupied}/${s.capacity} inscrits</small>` : ""}</button>`).join("") || "<span class=\"day-empty\">Aucun \u00E9v\u00E9nement</span>"}</div></div>`).join("")}</section>`;
    else
        html += `<div class="panel session-list">${data.items.map(s => `<button class="session-list-row" data-action="open-session" data-id="${(0, domain_js_1.escapeHtml)(s.id)}"><div class="date-tile"><strong>${new Date(s.starts_at).getUTCDate()}</strong><small>${(0, domain_js_1.timeText)(s.starts_at)}</small></div><div><h3>${(0, domain_js_1.escapeHtml)(s.title)}</h3><p>${(0, domain_js_1.escapeHtml)(s.host_name)} &middot; ${(0, domain_js_1.dateText)(s.starts_at, true)}</p></div>${(0, ui_js_1.badge)(s.registration || s.kind)}${(0, icons_js_1.icon)("arrow", 18)}</button>`).join("")}</div>`;
    if (!data.items.length)
        html += (0, ui_js_1.empty)(workshops ? "Les prochains ateliers arrivent" : "Aucun rendez-vous dans cette s\u00E9lection", workshops ? "Organisez une rencontre pour partager une expertise." : "Consultez les disponibilit\u00E9s du r\u00E9seau ou proposez les votres.", canCreate ? (0, ui_js_1.button)("Proposer un cr\u00E9neau", "new-session", { class: "primary", extra: `data-kind="${workshops ? "atelier" : "creneau"}"` }) : "", workshops ? "workshop" : "calendar");
    if (data.total > data.items.length)
        html += (0, ui_js_1.pagination)(data.total, ctx.page, 100);
    return html;
}
function portfolioView(_ctx, data, selected) {
    const current = data.startups.find(s => s.id === selected);
    return pageHead("STARTUP MANAGER", "Votre portefeuille en mouvement.", "Observez les signaux utiles, puis intervenez au bon endroit.", (0, ui_js_1.button)("Proposer un atelier", "new-session", { class: "primary", icon: "plus", extra: "data-kind=\"atelier\"" })) +
        `<div class="portfolio-layout"><section class="panel startup-list"><div class="section-heading"><h2>${data.startups.length} startup${data.startups.length > 1 ? "s" : ""} accompagn\u00E9e${data.startups.length > 1 ? "s" : ""}</h2></div>${data.startups.map(s => `<a href="#portfolio/${(0, domain_js_1.escapeHtml)(s.id)}" class="startup-item ${s.id === selected ? "selected" : ""}">${(0, ui_js_1.avatar)(s.name, null, true)}<span><strong>${(0, domain_js_1.escapeHtml)(s.name)}</strong><small>${s.needs} besoins &middot; ${s.contacts} prestataires en contact</small>${s.no_response ? `<b class="alert-tag">${s.no_response} sans proposition</b>` : ""}</span>${(0, icons_js_1.icon)("arrow", 16)}</a>`).join("") || "<p class=\"muted\">L'administrateur doit vous attribuer des startups.</p>"}</section><section>${current ? `<div class="panel startup-overview"><p class="eyebrow">FICHE D ACCOMPAGNEMENT</p><h2>${(0, domain_js_1.escapeHtml)(current.name)}</h2><div class="mini-kpis"><span><strong>${current.needs}</strong>Besoins actifs</span><span><strong>${current.contacts}</strong>Prestataires en contact</span><span><strong>${current.sessions}</strong>RDV \u00E0 venir</span><span><strong>${current.tasks}</strong>Actions a \u00E9ch\u00E9ance</span></div></div>
 <div class="section-heading"><h2>Demandes & propositions</h2></div>${data.needs.length ? `<div class="cards-grid two">${data.needs.map(n => needCard(n, true)).join("")}</div>` : (0, ui_js_1.empty)("Aucune demande publi\u00E9e", "Aidez cette startup a formuler son premier besoin.", "", "needs")}
 <section class="panel mt"><div class="section-heading"><h2>Contacts et rendez-vous</h2></div>${data.contacts.map(r => `<div class="contact-row"><div><strong>${(0, domain_js_1.escapeHtml)(r.provider)}</strong><small>${(0, domain_js_1.escapeHtml)(r.need_title)}</small></div>${(0, ui_js_1.badge)(r.status)}</div>`).join("") || "<p class=\"muted\">Aucun contact enregistre.</p>"}${data.sessions.slice(0, 6).map(s => `<button class="contact-row as-button" data-action="open-session" data-id="${(0, domain_js_1.escapeHtml)(s.id)}"><span><strong>${(0, domain_js_1.escapeHtml)(s.title)}</strong><small>${(0, domain_js_1.dateText)(s.starts_at, true)} &middot; ${(0, domain_js_1.escapeHtml)(s.host_name)}</small></span>${(0, ui_js_1.badge)(s.registration || s.status)}</button>`).join("")}</section>
 <section class="panel mt"><div class="section-heading"><div><h2>Journal d'accompagnement</h2><p>Interne aux managers affect\u00E9s et \u00E0 l'administrateur.</p></div>${(0, ui_js_1.button)("Ajouter une action", "followup-form", { id: current.id, icon: "plus", class: "small" })}</div>${data.notes.length ? data.notes.map(n => `<div class="followup ${n.done ? "done" : ""}"><button class="task-toggle ${n.done ? "checked" : ""}" data-action="task-toggle" data-id="${n.id}" data-company="${current.id}" data-done="${!n.done}" aria-label="${n.done ? "Rouvrir" : "Terminer"} cette action">${n.done ? (0, icons_js_1.icon)("check", 14) : ""}</button><div>${(0, domain_js_1.markdown)(n.body)}<small>${(0, domain_js_1.escapeHtml)(n.author)} &middot; ${n.due_at ? "\u00C9ch\u00E9ance : " + (0, domain_js_1.dateText)(n.due_at) : (0, domain_js_1.dateText)(n.created_at)}</small></div></div>`).join("") : "<p class=\"muted\">Conservez ici vos observations et les prochaines actions.</p>"}</section>` : (0, ui_js_1.empty)("S\u00E9lectionnez une startup", "Vous verrez ses besoins, contacts, rendez-vous et actions de suivi.", "", "portfolio")}</section></div>`;
}
function adminView(ctx, data) {
    const tab = ctx.params.get("tab") || "companies";
    const tabs = [["companies", "Entreprises & Premium"], ["users", "Comptes utilisateurs"], ["managers", "Portefeuilles managers"], ["audit", "Historique & migration"]];
    let body = "";
    if (tab === "companies")
        body = `<div class="table-wrap"><table><thead><tr><th>Entreprise</th><th>Typologie</th><th>Validation</th><th>Premium</th><th>Actions</th></tr></thead><tbody>${data.companies.map(c => `<tr><td><strong>${(0, domain_js_1.escapeHtml)(c.name)}</strong></td><td>${(0, ui_js_1.badge)(c.type)}</td><td>${(0, ui_js_1.badge)(c.provider_status || c.status)}</td><td>${c.type === "prestataire" ? c.premium ? `<span class="premium-label">Actif</span><small>${c.expires_at ? "Jusqu au " + (0, domain_js_1.dateText)(c.expires_at) : "Sans expiration"}</small>` : "<span class=\"muted\">Non actif</span>" : "<span class=\"muted\">Non concerne</span>"}</td><td><div class="table-actions">${(0, ui_js_1.button)("G\u00E9rer", "admin-company", { id: c.id, icon: "edit", class: "small ghost" })}${c.type === "prestataire" ? (0, ui_js_1.button)(c.premium ? "G\u00E9rer Premium" : "Activer Premium", "admin-premium", { id: c.id, class: "small", icon: "shield" }) : ""}${(0, ui_js_1.button)("Membres", "manage-members", { id: c.id, class: "small ghost", icon: "people" })}</div></td></tr>`).join("")}</tbody></table></div>`;
    else if (tab === "users")
        body = `<form id="filter-form" class="filter-bar"><input type="hidden" name="tab" value="users"><label class="search-field">${(0, icons_js_1.icon)("search", 18)}<input name="q" value="${(0, domain_js_1.escapeHtml)(ctx.params.get("q") || "")}" placeholder="Nom ou email" aria-label="Rechercher un compte"></label><button type="submit" class="btn">Rechercher</button></form><div class="table-wrap"><table><thead><tr><th>Contact</th><th>R\u00F4le</th><th>Statut</th><th>Email</th><th></th></tr></thead><tbody>${data.users.map(u => `<tr><td><strong>${(0, domain_js_1.escapeHtml)(u.name || "Profil a compl\u00E9ter")}</strong><small>${(0, domain_js_1.escapeHtml)(u.email)}</small></td><td>${(0, ui_js_1.badge)(u.role)}</td><td>${(0, ui_js_1.badge)(u.status)}</td><td>${u.confirmed ? "<span class=\"good\">Confirm\u00E9</span>" : "<span class=\"muted\">A confirmer</span>"}</td><td>${(0, ui_js_1.button)("Modifier", "admin-user", { id: u.id, icon: "edit", class: "small ghost" })}</td></tr>`).join("")}</tbody></table></div>`;
    else if (tab === "managers")
        body = `<div class="section-heading"><div><h2>Des portefeuilles explicites</h2><p>Un manager ne supervise que les startups qui lui sont attribu\u00E9es.</p></div>${(0, ui_js_1.button)("Attribuer une startup", "assign-manager", { icon: "plus", class: "primary small" })}</div><div class="cards-grid two">${data.users.filter(u => u.role === "startup_manager").map(m => `<section class="panel"><div class="identity-row">${(0, ui_js_1.avatar)(m.name || m.email, null)}<div><h3>${(0, domain_js_1.escapeHtml)(m.name || m.email)}</h3><small>${(0, domain_js_1.escapeHtml)(m.email)}</small></div></div>${data.assignments.filter(x => x.manager_id === m.id).map(x => `<div class="contact-row"><span>${(0, domain_js_1.escapeHtml)(data.companies.find(c => c.id === x.entreprise_id)?.name || "Startup")}</span>${(0, ui_js_1.iconButton)("close", "Retirer du portefeuille", "remove-assignment", m.id, `data-company="${x.entreprise_id}"`)}</div>`).join("") || "<p class=\"muted\">Aucune startup affectee.</p>"}</section>`).join("") || (0, ui_js_1.empty)("Aucun Startup Manager", "Attribuez le r\u00F4le \u00E0 un compte dans Comptes utilisateurs.", "", "portfolio")}</div>`;
    else
        body = `<section class="panel"><h2>Rapport de reprise V0.9.1 vers V1</h2><div class="table-wrap"><table><thead><tr><th>Objet</th><th>Historique</th><th>Repris</th><th>Pr\u00E9cision</th></tr></thead><tbody>${data.import_report.map(i => `<tr><td>${(0, domain_js_1.escapeHtml)(i.item)}</td><td>${i.total}</td><td>${i.imported}</td><td>${(0, domain_js_1.escapeHtml)(i.note)}</td></tr>`).join("")}</tbody></table></div></section><section class="panel mt"><h2>Historique des actions</h2>${data.history.map(h => `<div class="audit-row"><span>${(0, icons_js_1.icon)("shield", 16)}</span><div><strong>${(0, domain_js_1.escapeHtml)(h.action.replace(/_/g, " "))}</strong><small>${(0, domain_js_1.escapeHtml)(h.actor)} &middot; ${(0, domain_js_1.dateText)(h.date, true)}</small></div></div>`).join("") || "<p class=\"muted\">Les nouvelles actions sont journalisees ici.</p>"}</section>`;
    return pageHead("ADMINISTRATION DU R\u00C9SEAU", "Une plateforme sous contr\u00F4le.", "Comptes, entreprises, Premium et perimetres d'accompagnement.", (0, ui_js_1.button)("Nouvelle entreprise", "new-company", { class: "primary", icon: "plus" })) + `<div class="segmented admin-tabs">${tabs.map(([v, t]) => (0, ui_js_1.button)(t || "", "admin-tab", { class: tab === v ? "selected" : "", extra: `data-tab="${v}"` })).join("")}</div>` + body;
}
function notificationList(data) { return `<div class="section-heading"><h3>${data.total} notification${data.total > 1 ? "s" : ""}</h3>${(0, ui_js_1.button)("Tout marquer comme lu", "read-all", { class: "ghost small", icon: "check" })}</div>${data.items.length ? data.items.map(n => `<button class="notification-row ${n.read_at ? "" : "unread"}" data-action="open-notification" data-id="${(0, domain_js_1.escapeHtml)(n.id)}" data-type="${(0, domain_js_1.escapeHtml)(n.target_type)}" data-target="${(0, domain_js_1.escapeHtml)(n.target_id || "")}"><span class="notification-icon">${(0, icons_js_1.icon)(n.target_type === "thread" ? "messages" : n.target_type === "session" ? "calendar" : "needs", 19)}</span><span><strong>${(0, domain_js_1.escapeHtml)(n.title)}</strong><small>${(0, domain_js_1.dateText)(n.created_at, true)}</small></span>${!n.read_at ? "<i class=\"unread-dot\"></i>" : (0, icons_js_1.icon)("check", 14)}</button>`).join("") : (0, ui_js_1.empty)("Vous etes \u00E0 jour", "Les r\u00E9ponses, messages, inscriptions et besoins correspondants appara\u00EEtront ici.", "", "bell")}`; }

}};const cache={};function require(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;factories[id](module,module.exports,require);return module.exports;}window.EC_PREVIEW_MODULE=require;require('./app.js');})();