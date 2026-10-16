import { signIn, signUp, signOut, restoreSession, acceptAuthRedirect, hasConfiguration, recover, passwordUpdate, rpc, uploadImage, releaseMedia } from "./api.js";
import type { Boot, List, Need, NeedDetail, ResponseItem, ThreadDetail, DirectoryItem, SessionItem, Offer, CompanyDetail, AdminData, Notification, Dashboard, Portfolio, Role } from "./domain.js";
import { escapeHtml as e, roleLabels, errorMessage, cents, dateText, calendarIcs, localDate, markdown, label } from "./domain.js";
import { shell, dashboardView, needsView, directoryView, offersView, messagesView, sessionsView, portfolioView, adminView, notificationList, titles } from "./views.js";
import type { Context } from "./views.js";
import { needForm, needDetail, responseForm, responseDetail, statusForm, sessionForm, sessionDetail, companyPage, companyForm, profileForm, offerForm } from "./forms.js";
import { modal, closeModal, modalOpen, toast, formValues, hydrateImages, button, empty, field, selectField, checkField, footerSubmit, avatar, badge, tags } from "./ui.js";
import { icon } from "./icons.js";
import { demoBoot, demoRpc } from "./demo.js";
const app = document.querySelector<HTMLElement>("#app")!;
let boot: Boot | null = null;
let generation = 0;
let pendingNavigation = false;
let authMode = "login";
let authBusy = false;
let demo = new URLSearchParams(location.search).get("demo") === "1";
let demoRole: Role = "incube";
let activeCompany: string | null = localStorage.getItem("euraconnect.company.v1");
let adminCache: AdminData | null = null;
let listDirectory: DirectoryItem[] = [];
let listOffers: Offer[] = [];
const responses = new Map<string, ResponseItem>();
function routeParts(): {
    route: string;
    id: string | null;
    params: URLSearchParams;
} { const [base, query] = location.hash.slice(1).split("?"); const [route, id] = (base || "dashboard").split("/"); return { route: route || "dashboard", id: id || null, params: new URLSearchParams(query || "") }; }
function context(): Context {
    if (!boot)
        throw new Error("Session indisponible.");
    const r = routeParts();
    return { boot, companyId: activeCompany, company: boot.memberships.find(c => c.id === activeCompany), route: r.route, params: r.params, page: Math.max(0, Number(r.params.get("page") || 0) || 0), demo };
}
function navigate(route: string, params?: URLSearchParams): void {
    const hash = "#" + route + (params?.size ? "?" + params.toString() : "");
    if (location.hash === hash)
        void render();
    else
        location.hash = hash;
}
function filter(key: string, value: string | null): void {
    const r = routeParts();
    if (value === null)
        r.params.delete(key);
    else
        r.params.set(key, value);
    if (key !== "page")
        r.params.delete("page");
    navigate(r.route, r.params);
}
async function read<T>(action: string, args: Record<string, unknown> = {}): Promise<T> { return demo ? demoRpc(action, args, demoRole) as T : rpc<T>(action, { company: activeCompany, ...args }); }
async function write<T = Record<string, unknown>>(action: string, args: Record<string, unknown> = {}): Promise<T> {
    if (demo)
        throw new Error("Aper\u00E7u de d\u00E9monstration : les donn\u00E9es fictives sont en lecture seule.");
    return rpc<T>(action, { company: activeCompany, ...args });
}
async function reloadBoot(): Promise<void> {
    boot = demo ? demoBoot(demoRole) : await rpc<Boot>("bootstrap");
    if (!boot.memberships.some(c => c.id === activeCompany))
        activeCompany = boot.memberships.find(c => c.id === boot?.user.company_id)?.id || boot.memberships[0]?.id || null;
    if (activeCompany)
        localStorage.setItem("euraconnect.company.v1", activeCompany);
    else
        localStorage.removeItem("euraconnect.company.v1");
}
async function counts(): Promise<void> {
    if (!boot || document.hidden || demo)
        return;
    try {
        const next = await rpc<Boot>("bootstrap");
        if (next.user.role !== boot.user.role) {
            boot = next;
            await render();
            return;
        }
        boot.unread_messages = next.unread_messages;
        boot.unread_notifications = next.unread_notifications;
        for (const [id, value] of [["message-counter", next.unread_messages], ["notice-counter", next.unread_notifications]] as const) {
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
async function render(): Promise<void> {
    if (!boot) {
        authScreen();
        return;
    }
    const seq = ++generation;
    const ctx = context();
    const { route, id, params } = routeParts();
    if (!titles[route]) {
        navigate("dashboard");
        return;
    }
    app.innerHTML = shell(ctx);
    document.title = titles[route]?.[0] + " | EURACONNECT";
    const out = document.getElementById("page-content")!;
    const args: Record<string, unknown> = { ...Object.fromEntries(params), page: ctx.page };
    try {
        let html = "";
        switch (route) {
            case "dashboard":
                html = dashboardView(ctx, await read<Dashboard>("dashboard"));
                break;
            case "needs": {
                const data = await read<List<Need>>("needs", { ...args, scope: ctx.boot.user.role === "incube" ? "mine" : "all" });
                html = needsView(ctx, data);
                break;
            }
            case "directory": {
                const data = await read<List<DirectoryItem>>("directory", args);
                listDirectory = data.items;
                html = directoryView(ctx, data);
                break;
            }
            case "offers": {
                const data = await read<List<Offer>>("offers", args);
                listOffers = data.items;
                html = offersView(ctx, data);
                break;
            }
            case "messages": {
                const threads = await read<List<ResponseItem>>("threads", args);
                for (const r of threads.items)
                    responses.set(r.id, r);
                if (!id && threads.items.length) {
                    navigate("messages/" + threads.items[0]!.id, params);
                    return;
                }
                const detail = id ? await read<ThreadDetail>("messages", { id }) : null;
                if (detail)
                    responses.set(detail.thread.id, detail.thread);
                html = messagesView(ctx, threads, detail);
                if (detail && !demo)
                    void write("read_thread", { id, until: detail.read_until }).then(counts).catch(() => undefined);
                break;
            }
            case "agenda":
            case "workshops": {
                const monday = new Date((params.get("from") || localDate()) + "T12:00:00Z");
                if (!params.has("from")) {
                    const n = monday.getUTCDay();
                    monday.setUTCDate(monday.getUTCDate() - (n === 0 ? 6 : n - 1));
                }
                const from = localDate(monday);
                const end = new Date(monday);
                end.setUTCDate(end.getUTCDate() + 7);
                const scope = params.get("scope") || "mine";
                if (route === "agenda") {
                    ctx.params.set("from", from);
                    ctx.params.set("scope", scope);
                }
                const data = await read<List<SessionItem>>("sessions", { ...args, scope: route === "workshops" ? "all" : scope, from: route === "workshops" ? new Date().toISOString() : from, to: route === "workshops" ? null : localDate(end), kind: route === "workshops" ? "atelier" : params.get("kind"), host_id: params.get("host_id"), target_company: params.get("target_company"), size: 100 });
                html = sessionsView(ctx, data, route === "workshops");
                break;
            }
            case "portfolio": {
                const data = await read<Portfolio>("portfolio", { id });
                if (!id && data.startups.length) {
                    navigate("portfolio/" + data.startups[0]!.id, params);
                    return;
                }
                html = portfolioView(ctx, data, id);
                break;
            }
            case "company":
                html = companyPage(ctx, activeCompany ? await read<CompanyDetail>("company", { id: activeCompany }) : null);
                break;
            case "admin":
                adminCache = await read<AdminData>("admin", args);
                html = adminView(ctx, adminCache);
                break;
        }
        if (seq !== generation)
            return;
        out.innerHTML = html;
        await hydrateImages(out);
        const msgs = out.querySelector(".message-flow");
        if (msgs)
            msgs.scrollTop = msgs.scrollHeight;
    }
    catch (err) {
        if (seq !== generation)
            return;
        out.innerHTML = empty("Cet espace ne peut pas encore \u00EAtre affiche", errorMessage(err), button("R\u00E9essayer", "refresh", { class: "primary", icon: "refresh" }), "warning");
    }
}
async function openNeed(id: string): Promise<void> {
    const data = await read<NeedDetail>("need", { id });
    for (const r of data.responses)
        responses.set(r.id, r);
    modal("Fiche de besoin", needDetail(context(), data), { wide: true });
}
async function openSession(id: string): Promise<void> { const s = await read<SessionItem>("session", { id }); modal(label(s.kind), sessionDetail(context(), s), { wide: true }); }
async function getAdmin(): Promise<AdminData> { return adminCache || await read<AdminData>("admin"); }
function simpleForm(command: string, body: string, id = "", submit = "Enregistrer"): string { return `<form id="command-form" data-command="${e(command)}" data-id="${e(id)}">${body}${footerSubmit(submit)}</form>`; }
async function members(id: string): Promise<void> { const c = await read<CompanyDetail>("company", { id }); modal("Membres de " + c.name, `<p class="muted">Rattachez un compte d\u00E9j\u00E0 cr\u00E9\u00E9. Aucun email n est envoy\u00E9 par cette action.</p><div class="member-list">${c.members.map(m => `<div class="contact-row"><div><strong>${e(m.name)}</strong><small>${e(m.email)}</small></div>${badge(m.role)}<span class="muted">${m.active ? "Actif" : "D\u00E9sactiv\u00E9"}</span></div>`).join("")}</div>` + simpleForm("set_member", `<input type="hidden" name="target_company" value="${id}">${field("email", "Email du compte existant", "", { type: "email", required: true })}${selectField("member_role", "Droits dans l'entreprise", ["proprietaire", "gestionnaire", "collaborateur"].map(v => ({ value: v, label: label(v) })), "collaborateur")}${checkField("active", "Rattachement actif", true)}`, "", "Enregistrer le rattachement")); }
function showPremium(): void { const c = context().company; modal("Premium, uniquement pour les prestataires", `<div class="premium-hero">${icon("shield", 34)}<h3>Une identit\u00E9 revelee.<br>Un contexte toujours lisible.</h3></div><div class="comparison"><div><h4>Sans Premium</h4><p>Consultez les briefs, les tags et les budgets. Proposez vos services et echangez dans EURACONNECT.</p></div><div><h4>Avec Premium</h4><p>Identifiez les startups et consultez les coordonn\u00E9es qu elles ont autoris\u00E9es a partager. Les droits s appliquent \u00E0 l'entreprise.</p></div></div><div class="inline-note"><p>Activation et desactivation par l'administrateur. Aucun paiement en ligne. Les incub\u00E9s ne souscrivent jamais de Premium.</p></div>${c?.premium ? `<p class="good">Premium actif pour ${e(c.name)}${c.expires_at ? " jusqu au " + dateText(c.expires_at) : ""}.</p>` : "<p class=\"muted\">Pour une activation, rapprochez-vous de l'\u00E9quipe Eurasante.</p>"}`); }
async function action(el: HTMLElement): Promise<void> {
    const act = el.dataset.action;
    const id = el.dataset.id || "";
    if (!boot)
        return;
    const ctx = context();
    switch (act) {
        case "close-modal":
            closeModal();
            return;
        case "refresh":
            await render();
            return;
        case "refresh-thread": {
            const draft = document.querySelector<HTMLTextAreaElement>("#message-form textarea[name=body]");
            if (draft?.value.trim()) {
                toast("Votre message n'est pas envoy\u00E9. Envoyez-le avant d'actualiser pour ne pas perdre votre saisie.", true);
                draft.focus();
                return;
            }
            await render();
            toast("Conversations actualis\u00E9es.");
            return;
        }
        case "need-quick-status":
            filter("status", el.dataset.status || null);
            return;
        case "go-responses": {
            const section = document.getElementById("need-responses");
            section?.scrollIntoView({ behavior: "smooth", block: "start" });
            section?.querySelector<HTMLButtonElement>("button[data-action=view-response]")?.focus({ preventScroll: true });
            return;
        }
        case "menu":
            document.querySelector(".app-shell")?.classList.toggle("mobile-open");
            return;
        case "logout":
            if (demo) {
                location.href = location.pathname;
                return;
            }
            await signOut();
            releaseMedia();
            boot = null;
            closeModal();
            authScreen();
            return;
        case "go":
            closeModal();
            navigate(el.dataset.route || "dashboard");
            return;
        case "global-search":
            closeModal();
            navigate("directory");
            setTimeout(() => document.querySelector<HTMLInputElement>("#filter-form input[name=q]")?.focus(), 250);
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
                toast("Vos favoris sont \u00E0 jour.");
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
                toast("Creez ou rejoignez votre entreprise pour publier.");
                navigate("company");
                return;
            }
            modal("Nouvelle demande", needForm(ctx, undefined, ctx.boot.user.role === "admin" ? (await getAdmin()).companies : []), { wide: true });
            return;
        case "open-need":
            await openNeed(id);
            return;
        case "edit-need": {
            const data = await read<NeedDetail>("need", { id });
            modal("Modifier la demande", needForm(ctx, data.need, ctx.boot.user.role === "admin" ? (await getAdmin()).companies : []), { wide: true });
            return;
        }
        case "need-status": {
            const data = await read<NeedDetail>("need", { id });
            modal("Faire avancer le besoin", statusForm(data.need));
            return;
        }
        case "respond": {
            const data = await read<NeedDetail>("need", { id });
            modal("Proposer mon expertise", responseForm(data.need), { wide: true });
            return;
        }
        case "view-response": {
            let r = responses.get(id);
            if (!r) {
                const d = await read<ThreadDetail>("messages", { id });
                r = d.thread;
            }
            modal("Proposition du prestataire", responseDetail(r), { wide: true });
            return;
        }
        case "response-decision": {
            const s = el.dataset.status || "en_discussion";
            modal(s === "declinee" ? "Ne pas donner suite" : s === "retenue" ? "Retenir cette proposition" : "Engager la discussion", simpleForm("response_status", `<input name="status" type="hidden" value="${s}">${field("reason", s === "declinee" ? "Motif communique au prestataire" : "Message de d\u00E9cision", "", { type: "textarea", required: s === "declinee", help: "La d\u00E9cision est notifiee au prestataire." })}`, id, "Enregistrer ma d\u00E9cision"));
            return;
        }
        case "open-thread":
            closeModal();
            navigate("messages/" + id);
            return;
        case "directory-slots": {
            const r = el.dataset.kind || "company";
            closeModal();
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
                const c = await read<CompanyDetail>("company", { id });
                extra = `<p class="muted">${e(c.details?.sector || "")} ${e(c.details?.city || "")}</p>${c.details?.contact_email ? `<p>${icon("mail", 16)} ${e(c.details.contact_email)}</p>` : ""}${c.details?.phone ? "<p>" + e(c.details.phone) + "</p>" : ""}`;
            }
            modal(d.kind === "company" ? "Fiche entreprise" : "Fiche contact", `<div class="identity-row">${avatar(d.name, d.media, d.kind === "company")}<div><h2>${e(d.name)}</h2>${badge(d.type)}<p>${e(d.subtitle || d.company_name || "")}</p></div></div><div class="prose">${markdown(d.description)}</div>${tags(d.tags)}${extra}<footer class="form-footer">${button("Voir les disponibilit\u00E9s", "directory-slots", { id: d.id, icon: "calendar", class: "primary", extra: `data-kind="${d.kind}"` })}</footer>`, { wide: true });
            return;
        }
        case "new-offer":
            if (!ctx.company) {
                toast("Configurez votre entreprise prestataire.");
                navigate("company");
                return;
            }
            modal("Nouvelle offre", offerForm(), { wide: true });
            return;
        case "offer-detail": {
            const o = listOffers.find(x => x.id === id);
            if (!o)
                return;
            if (o.can_edit) {
                modal("Modifier mon offre", offerForm(o) + button("Ajouter une image", "upload", { id, icon: "upload", extra: "data-type=\"offer\"" }), { wide: true });
                return;
            }
            modal("Offre de service", `<p class="eyebrow">${e(o.provider)}</p><h2>${e(o.title)}</h2>${tags(o.tags)}<div class="prose">${markdown(o.description)}</div>${o.benefit ? "<div class=\"inline-note\">" + e(o.benefit) + "</div>" : ""}<footer class="form-footer">${button("Voir les disponibilit\u00E9s", "directory-slots", { id: o.company_id, icon: "calendar", class: "primary", extra: "data-kind=\"company\"" })}</footer>`, { wide: true });
            return;
        }
        case "new-session":
            modal("Organiser une rencontre", sessionForm(ctx, el.dataset.kind || "creneau"), { wide: true });
            return;
        case "propose":
            modal("Proposer un rendez-vous", sessionForm(ctx, "proposition", id), { wide: true });
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
            filter("from", localDate());
            return;
        case "agenda-week": {
            const day = new Date((ctx.params.get("from") || localDate()) + "T12:00:00Z");
            if (!ctx.params.has("from"))
                day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
            day.setUTCDate(day.getUTCDate() + Number(el.dataset.direction || "1") * 7);
            filter("from", localDate(day));
            return;
        }
        case "export-ics": {
            const s = await read<SessionItem>("session", { id });
            const href = URL.createObjectURL(new Blob([calendarIcs(s)], { type: "text/calendar;charset=utf-8" }));
            const a = document.createElement("a");
            a.href = href;
            a.download = "EURACONNECT-rendez-vous.ics";
            a.click();
            setTimeout(() => URL.revokeObjectURL(href), 2000);
            return;
        }
        case "cancel-booking":
            modal("Annuler votre inscription", simpleForm("cancel_booking", "<p>La place sera liberee. L'organisateur sera inform\u00E9.</p>", id, "Confirmer l'annulation"));
            return;
        case "cancel-session":
            modal("Annuler cette rencontre", simpleForm("session_status", "<input type=\"hidden\" name=\"status\" value=\"annul\u00E9\"><p>Toutes les personnes inscrites seront notifiees dans EURACONNECT.</p>", id, "Annuler la rencontre"));
            return;
        case "complete-session":
            await write("session_status", { id, status: "realise" });
            await openSession(id);
            await render();
            return;
        case "attendance":
            await write("attendance", { id, status: el.dataset.status });
            toast("Pr\u00E9sence enregistr\u00E9e.");
            closeModal();
            await render();
            return;
        case "followup-form":
            modal("Action d'accompagnement", simpleForm("followup", `<input type="hidden" name="target_company" value="${id}">${field("body", "Observation et prochaine action", "", { type: "textarea", required: true })}${field("due_at", "\u00C9ch\u00E9ance de suivi", "", { type: "date" })}<p class="muted">Visible uniquement des managers affect\u00E9s et de l'administrateur.</p>`));
            return;
        case "task-toggle":
            await write("followup", { id, target_company: el.dataset.company, done: el.dataset.done === "true" });
            await render();
            return;
        case "edit-profile":
            modal("Ma fiche contact", profileForm(ctx), { wide: true });
            return;
        case "new-company":
            modal("Cr\u00E9er une entreprise", companyForm(ctx, null, ctx.boot.user.role === "admin" ? await getAdmin() : undefined), { wide: true });
            return;
        case "edit-company":
            modal("Fiche entreprise", companyForm(ctx, await read<CompanyDetail>("company", { id })), { wide: true });
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
                    toast("Les fichiers ne sont pas envoy\u00E9s en d\u00E9monstration.");
                    return;
                }
                el.setAttribute("disabled", "");
                void uploadImage(file, ctx.boot.user.id, el.dataset.type as "company" | "person" | "offer", id, activeCompany).then(async () => { toast("Image enregistr\u00E9e et redimensionn\u00E9e."); closeModal(); await reloadBoot(); await render(); }).catch(err => toast(errorMessage(err), true)).finally(() => el.removeAttribute("disabled"));
            };
            input.click();
            return;
        }
        case "change-password":
            modal("Modifier mon mot de passe", simpleForm("password", field("password", "Nouveau mot de passe", "", { type: "password", required: true, help: "12 caract\u00E8res minimum." })));
            return;
        case "admin-tab":
            filter("tab", el.dataset.tab || "companies");
            return;
        case "admin-user": {
            const u = (await getAdmin()).users.find(x => x.id === id);
            if (!u)
                return;
            modal("Administrer le compte", simpleForm("admin_user", `<p><strong>${e(u.name || u.email)}</strong></p>${selectField("role", "R\u00F4le", Object.entries(roleLabels).map(([value, t]) => ({ value, label: t })), u.role)}${selectField("status", "Acc\u00E8s", [{ value: "actif", label: "Actif" }, { value: "suspendu", label: "Suspendu" }], u.status)}<p class="muted">La suppression de vos propres droits administrateur et du dernier administrateur est bloqu\u00E9e.</p>`, id));
            return;
        }
        case "admin-company": {
            const c = (await getAdmin()).companies.find(x => x.id === id);
            if (!c)
                return;
            modal("Validation de " + c.name, simpleForm("admin_company", selectField("status", "Statut de publication", [{ value: "publiee", label: "Publi\u00E9e et valid\u00E9e" }, { value: "masquee", label: "Masquee / suspendue" }, { value: "brouillon", label: "En attente de validation" }], c.status) + field("reason", "Motif / observation", "", { type: "textarea" }), id));
            return;
        }
        case "admin-premium": {
            const c = (await getAdmin()).companies.find(x => x.id === id);
            if (!c)
                return;
            modal("Premium - " + c.name, simpleForm("admin_premium", `<p class="muted">Un droit porte par l'entreprise. Aucun paiement n est declenche.</p>${checkField("active", "Activer Premium", c.premium)}${field("expires_at", "Expiration (optionnelle)", c.expires_at?.slice(0, 16) || "", { type: "datetime-local", help: "Heure Europe/Paris. Vide = sans expiration." })}${field("reason", "Justification administrative", "", { type: "textarea", required: true })}`, id));
            return;
        }
        case "assign-manager": {
            const data = await getAdmin();
            modal("Attribuer une startup", simpleForm("assign_manager", selectField("manager_id", "Startup Manager", data.users.filter(u => u.role === "startup_manager").map(u => ({ value: u.id, label: u.name || u.email }))) + selectField("target_company", "Startup", data.companies.filter(c => c.type === "startup").map(c => ({ value: c.id, label: c.name }))) + "<input type=\"hidden\" name=\"active\" value=\"true\">"));
            return;
        }
        case "remove-assignment":
            await write("assign_manager", { id, target_company: el.dataset.company, active: false });
            adminCache = null;
            await render();
            return;
        case "notifications":
            modal("Vos notifications", notificationList(await read<List<Notification>>("notifications", { size: 100 })), { wide: false });
            return;
        case "read-all":
            await write("read_notification", { all: true });
            await counts();
            modal("Vos notifications", notificationList(await read<List<Notification>>("notifications", { size: 100 })));
            return;
        case "open-notification": {
            if (!demo)
                await write("read_notification", { id });
            closeModal();
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
async function submitCommand(form: HTMLFormElement): Promise<void> {
    const command = form.dataset.command || "";
    const args = formValues(form);
    const id = form.dataset.id;
    if (id)
        args.id = id;
    for (const key of ["budget_min", "budget_max", "price"])
        if (key in args)
            args[key] = cents(String(args[key] || ""));
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
        await passwordUpdate(String(args.password));
    }
    else
        await write(command, args);
    toast(command === "book_session" ? "Inscription enregistr\u00E9e. Consultez le statut de votre rendez-vous." : command === "respond" ? "Votre proposition a \u00E9t\u00E9 transmise \u00E0 la startup." : "Enregistrement effectu\u00E9.");
    closeModal();
    adminCache = null;
    await reloadBoot();
    if (command === "response_status" && ["en_discussion", "retenue"].includes(String(args.status)) && typeof args.id === "string") {
        navigate("messages/" + args.id);
    }
    await render();
}
function authScreen(error = ""): void {
    const recovery = new URLSearchParams(location.search).get("reset") === "1" && restoreSession();
    if (recovery) {
        authMode = "reset";
    }
    app.innerHTML = `<div class="auth-layout"><aside class="auth-brand"><a class="brand" href="#"><span class="brand-mark">E<span>+</span></span>EURACONNECT</a><p class="eyebrow">LE R\u00C9SEAU QUI FAIT AVANCER VOS PROJETS</p><h1>La bonne expertise.<br>La bonne rencontre.<br><em>Au bon moment.</em></h1><p>Startup, prestataire ou \u00E9quipe d'accompagnement : un espace commun pour transformer les besoins en collaborations.</p><div class="auth-steps">${[["needs", "Exprimer un besoin"], ["people", "Mobiliser une expertise"], ["calendar", "Passer \u00E0 l'action"]].map(([i, t]) => "<span>" + icon(i || "needs", 21) + e(t) + "</span>").join("")}</div><footer>EURASANTE &middot; Services et accompagnement</footer></aside><main class="auth-main"><div class="auth-card"><p class="eyebrow">BIENVENUE DANS VOTRE R\u00C9SEAU</p><h2>${authMode === "signup" ? "Rejoindre en tant que prestataire" : authMode === "recover" ? "Retrouver mon acc\u00E8s" : authMode === "reset" ? "Nouveau mot de passe" : "Se connecter"}</h2><p class="muted">${authMode === "signup" ? "Votre entreprise sera valid\u00E9e par l'\u00E9quipe avant publication. Les comptes incub\u00E9s et managers sont g\u00E9r\u00E9s par l'administrateur." : "Retrouvez vos projets, vos contacts et vos prochaines rencontres."}</p>
 ${!hasConfiguration() ? "<div class=\"warning-note\">Configuration Supabase requise : ajoutez les deux variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans les variables de compilation de Cloudflare, puis relancez le d\u00E9ploiement.</div>" : ""}<form id="auth-form">${authMode === "signup" ? field("name", "Pr\u00E9nom et nom", "", { required: true }) : ""}${authMode !== "reset" ? field("email", "Email professionnel", "", { type: "email", required: true }) : ""}${authMode !== "recover" ? field("password", "Mot de passe", "", { type: "password", required: true, help: authMode === "login" ? "" : "12 caract\u00E8res minimum." }) : ""}<div class="form-error" role="alert" ${error ? "" : "hidden"}>${e(error)}</div><button class="btn primary full" type="submit" ${!hasConfiguration() ? "disabled" : ""}>${authMode === "signup" ? "Cr\u00E9er mon compte" : authMode === "recover" ? "Envoyer le lien" : authMode === "reset" ? "Enregistrer le mot de passe" : "Entrer dans mon espace"}${icon("arrow", 17)}</button></form><div class="auth-links">${authMode === "login" ? "<button data-auth=\"recover\">Mot de passe oubli\u00E9 ?</button><button data-auth=\"signup\">Devenir prestataire</button>" : "<button data-auth=\"login\">Revenir \u00E0 la connexion</button>"}</div><div class="auth-demo"><span>D\u00E9couvrir les nouveaux parcours</span><a href="?demo=1">Ouvrir l'aper\u00E7u avec des donn\u00E9es fictives ${icon("arrow", 15)}</a></div></div><footer>Vos identifiants restent g\u00E9r\u00E9s par Supabase Auth.</footer></main></div>`;
}
document.addEventListener("click", event => {
    const el = (event.target as HTMLElement).closest<HTMLElement>("[data-action],[data-auth]");
    if (!el || el.hasAttribute("disabled"))
        return;
    if (el.dataset.auth) {
        authMode = el.dataset.auth;
        authScreen();
        return;
    }
    event.preventDefault();
    void action(el).catch(err => toast(errorMessage(err), true));
});
document.addEventListener("submit", event => {
    const form = event.target as HTMLFormElement;
    if (!["command-form", "auth-form", "message-form", "filter-form"].includes(form.id))
        return;
    event.preventDefault();
    if (form.id === "filter-form") {
        const values = formValues(form);
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
    const submit = form.querySelector<HTMLButtonElement>("[type=submit]");
    const original = submit?.innerHTML || "";
    if (submit) {
        submit.disabled = true;
        submit.innerHTML = "<span class=\"spinner\"></span> En cours...";
    }
    const err = form.querySelector<HTMLElement>(".form-error");
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
                const v = formValues(form);
                const email = String(v.email || "").trim();
                const pass = String(v.password || "");
                if (["signup", "reset"].includes(authMode) && pass.length < 12)
                    throw new Error("Le mot de passe doit contenir au moins 12 caract\u00E8res.");
                if (authMode === "recover") {
                    await recover(email);
                    toast("Si le compte est \u00E9ligible, un lien de r\u00E9cup\u00E9ration sera envoy\u00E9.");
                    return;
                }
                if (authMode === "signup") {
                    const connected = await signUp(email, pass, String(v.name || ""));
                    if (!connected) {
                        authMode = "login";
                        authScreen();
                        toast("V\u00E9rifiez votre bo\u00EEte email pour confirmer votre inscription.");
                        return;
                    }
                }
                else if (authMode === "reset") {
                    await passwordUpdate(pass);
                    history.replaceState({}, "", location.pathname + "#dashboard");
                }
                else
                    await signIn(email, pass);
                await reloadBoot();
                navigate("dashboard");
                await render();
            }
            finally {
                authBusy = false;
            }
        }
        else if (form.id === "message-form") {
            const values = formValues(form);
            await write("send_message", { id: form.dataset.id, body: values.body });
            await render();
            void counts();
        }
        else
            await submitCommand(form);
    };
    void run().catch(error => {
        const text = errorMessage(error);
        if (err && err.isConnected) {
            err.hidden = false;
            err.textContent = text;
            err.scrollIntoView({ block: "nearest" });
        }
        else
            toast(text, true);
    }).finally(() => {
        form.dataset.busy = "false";
        if (submit?.isConnected) {
            submit.disabled = false;
            submit.innerHTML = original;
        }
    });
});
document.addEventListener("change", event => {
    const el = event.target as HTMLInputElement;
    if (el.id === "company-switch") {
        activeCompany = el.value || null;
        if (activeCompany)
            localStorage.setItem("euraconnect.company.v1", activeCompany);
        releaseMedia();
        closeModal();
        void render();
    }
    if (el.id === "demo-role") {
        demoRole = el.value as Role;
        void reloadBoot().then(() => { navigate("dashboard"); return render(); });
    }
    if (el.name === "kind") {
        document.querySelector<HTMLElement>(".permanence-fields")?.toggleAttribute("hidden", el.value !== "permanence");
        document.querySelector<HTMLElement>(".workshop-fields")?.toggleAttribute("hidden", el.value !== "atelier");
    }
});
document.addEventListener("keydown", event => {
    const t = event.target as HTMLElement;
    if (event.key === "Escape" && document.querySelector(".mobile-open")) {
        document.querySelector(".app-shell")?.classList.remove("mobile-open");
    }
    if (event.key === "/" && !modalOpen() && !["INPUT", "TEXTAREA"].includes(t.tagName) && !t.isContentEditable) {
        event.preventDefault();
        navigate("directory");
        setTimeout(() => document.querySelector<HTMLInputElement>("[name=q]")?.focus(), 250);
    }
});
window.addEventListener("hashchange", () => {
    if (pendingNavigation)
        return;
    closeModal();
    document.querySelector(".app-shell")?.classList.remove("mobile-open");
    if (boot)
        void render();
});
window.addEventListener("ec:session-expired", () => { boot = null; releaseMedia(); closeModal(); authScreen("Votre session a expir\u00E9. Reconnectez-vous."); });
window.addEventListener("storage", ev => {
    if (ev.key === "euraconnect.auth.v1" && !ev.newValue) {
        boot = null;
        releaseMedia();
        authScreen();
    }
});
window.addEventListener("focus", () => { void counts(); });
setInterval(() => { void counts(); }, 30000);
async function start(): Promise<void> {
    try {
        if (demo) {
            await reloadBoot();
            await render();
            return;
        }
        acceptAuthRedirect();
        if (new URLSearchParams(location.search).get("reset") === "1") {
            authScreen();
            return;
        }
        if (restoreSession()) {
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
        authScreen(errorMessage(err));
    }
}
void start();
