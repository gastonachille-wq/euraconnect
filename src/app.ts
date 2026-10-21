import { stored, store, stringList, filteredHash, clearFilterHash } from "./client-state.js";
import { signIn, signUp, signOut, restoreSession, acceptAuthRedirect, hasConfiguration, recover, passwordUpdate, rpc, uploadImage, releaseMedia, managerRpc, managerMeetingRpc, managerAdviceRpc, needLifecycleRpc } from "./api.js";
import type { Boot, List, Need, NeedDetail, ResponseItem, ThreadDetail, DirectoryItem, SessionItem, Offer, CompanyDetail, AdminData, Notification, Dashboard, Portfolio, Role } from "./domain.js";
import { escapeHtml as e, roleLabels, errorMessage, cents, dateText, calendarIcs, localDate, markdown, label } from "./domain.js";
import { shell, dashboardView, needsView, directoryView, offersView, messagesView, sessionsView, adminView, notificationList, titles, offerSummary } from "./views.js";
import type { Context } from "./views.js";
import { needForm, needDetail, responseForm, responseDetail, statusForm, sessionForm, sessionDetail, companyPage, companyForm, profileForm, offerForm } from "./forms.js";
import { modal, closeModal, modalOpen, toast, formValues, hydrateImages, button, empty, field, selectField, checkField, footerSubmit, badge, tags } from "./ui.js";
import { icon } from "./icons.js";
import { demoBoot, demoRpc } from "./demo.js";
import { managerCenter, startupRecommendations, startupAdvice } from "./manager-v20.js";
import { managerErrorNotice } from "./manager-diagnostics.js";
import type { ManagerRecommendation, ManagerAdvice } from "./manager-v20.js";
import { companyDetailV12, personDetailV12 } from "./directory-v12.js";
import { agendaRange, shiftAgenda } from "./agenda-v12.js";
const app = document.querySelector<HTMLElement>("#app")!;
let boot: Boot | null = null;
let generation = 0;
let pendingNavigation = false;
let authMode = "login";
let authBusy = false;
let demo = new URLSearchParams(location.search).get("demo") === "1";
let demoRole: Role = "incube";
let activeCompany: string | null = stored("euraconnect.company.v1");
let adminCache: AdminData | null = null;
let managerProviders: DirectoryItem[] = [];
let managerPortfolio: Portfolio | null = null;
let listOffers: Offer[] = [];
const offerCache = new Map<string, Offer>();
function cacheOffers(items: Offer[]): void { for (const item of items) offerCache.set(item.id,item); }
const responses = new Map<string, ResponseItem>();
const needDraftKey = "euraconnect.v13.needDraft";
function draftKey():string{return needDraftKey+":"+(boot?.user.id||"guest")+":"+(activeCompany||"none");}
let wizardPage = 0;
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
    if (modalOpen()) closeModal();
    if (location.hash === hash)
        void render();
    else
        location.hash = hash;
}
function filter(key: string, value: string | null): void {
    const target = filteredHash(location.hash,{[key]: value});
    if (target === location.hash) void render(); else location.hash = target;
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
        store("euraconnect.company.v1", activeCompany);
    else
        store("euraconnect.company.v1", null);
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
        const navCounter=document.getElementById("nav-message-counter");
        if(navCounter){navCounter.hidden=next.unread_messages===0;navCounter.textContent=next.unread_messages>99?"99+":String(next.unread_messages);}
    }
    catch { /* No disruptive toast during background polling. */ }
}
let lastShellKey = "";
let renderedHash = "";
const scrollPositions = new Map<string,number>();
const messageDrafts = new Map<string,string>();
let displayedThreadKey = "";
function rememberMessage(): void {
    const input = document.querySelector<HTMLTextAreaElement>('#message-form textarea[name="body"]');
    if (input && displayedThreadKey) {
        if (input.value) messageDrafts.set(displayedThreadKey,input.value); else messageDrafts.delete(displayedThreadKey);
    }
}
interface FocusSnapshot {id:string;name:string;start:number|null;end:number|null;}
function filterFocus(): FocusSnapshot | null {
    const node=document.activeElement;
    if (!(node instanceof HTMLInputElement || node instanceof HTMLSelectElement)) return null;
    if (!node.closest('#filter-form') && node.id!=="ec28-quick-search" && node.id!=="ec22-sort") return null;
    return {id:node.id,name:node.name,start:node instanceof HTMLInputElement?node.selectionStart:null,end:node instanceof HTMLInputElement?node.selectionEnd:null};
}
function restoreFocus(saved: FocusSnapshot | null): void {
    if (!saved || modalOpen()) return;
    const node=saved.id ? document.getElementById(saved.id) : Array.from(document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('#filter-form input,#filter-form select')).find(el=>el.name===saved.name);
    if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement) {
        node.focus({preventScroll:true});
        if (node instanceof HTMLInputElement && saved.start!==null && ["text","search","email","url","tel"].includes(node.type))
            node.setSelectionRange(saved.start,saved.end);
    }
}
let menuOpener: HTMLElement | null = null;
function syncSidebar():void {
    const mobile=matchMedia('(max-width:800px)').matches;
    const open=Boolean(document.querySelector('.app-shell.mobile-open'));
    const compact=document.body.classList.contains('ec24-sidebar-collapsed');
    const toggle=document.getElementById('sidebar-toggle');
    const caption=mobile?'Fermer le menu':compact?'Agrandir le menu':'R\u00e9duire le menu';
    if(toggle){toggle.setAttribute('aria-label',caption);toggle.setAttribute('title',caption);toggle.dataset.tooltip=caption;toggle.setAttribute('aria-expanded',String(mobile?open:!compact));}
    const sidebar=document.querySelector<HTMLElement>('.ec29-sidebar');
    const workspace=document.querySelector<HTMLElement>('.ec29-workspace');
    if(sidebar)sidebar.inert=mobile&&!open;
    if(workspace)workspace.inert=mobile&&open;
    document.body.classList.toggle('has-mobile-menu',mobile&&open);
    document.querySelectorAll('[data-action="menu"]').forEach(el=>{if(!el.classList.contains('mobile-shade'))el.setAttribute('aria-expanded',String(open));});
}
function setMobileMenu(open:boolean):void {
    const shell=document.querySelector('.app-shell');if(!shell)return;
    if(open)menuOpener=document.activeElement as HTMLElement;
    shell.classList.toggle('mobile-open',open);syncSidebar();
    if(open)document.querySelector<HTMLElement>('.ec29-nav-link.active')?.focus();
    else if(menuOpener?.isConnected)menuOpener.focus({preventScroll:true});
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
    rememberMessage();
    if (renderedHash) scrollPositions.set(renderedHash,window.scrollY);
    const previousHash=renderedHash;
    const samePage=previousHash.split('?')[0]===location.hash.split('?')[0];
    const shellKey=[boot.user.id,boot.user.name,boot.user.role,activeCompany,route,boot.profile.media?.path,ctx.demo].join(':');
    if (lastShellKey!==shellKey || !document.getElementById('page-content')) {
        app.innerHTML = shell(ctx);lastShellKey=shellKey;syncSidebar();
        void hydrateImages(document.querySelector('.ec29-topbar') || document);
    }
    document.title = titles[route]?.[0] + " | EURACONNECT";
    const out = document.getElementById("page-content")!;
    out.setAttribute("aria-busy","true");
    const args: Record<string, unknown> = { ...Object.fromEntries(params), page: ctx.page };
    try {
        let html = "";
        switch (route) {
            case "dashboard":
                html = dashboardView(ctx, await read<Dashboard>("dashboard"));
                if(ctx.boot.user.role==="incube" && !demo){
                    try { const recs=await managerRpc<ManagerRecommendation[]>("mine"); html+=startupRecommendations(recs); }
                    catch (err) { html+=managerErrorNotice(err,"recommendations"); }
                    // Les conseils V3.5 sont indépendants des recommandations V2.
                    try { html+=startupAdvice(await managerAdviceRpc<ManagerAdvice[]>("list")); }
                    catch (err) { html+=managerErrorNotice(err,"advice"); }
                }
                if(!demo && ["incube","startup_manager"].includes(ctx.boot.user.role)) {
                    try {html += managerMeetings(await managerMeetingRpc<ManagerMeeting[]>("list"),ctx.boot.user.role);}
                    catch {html += '<p class="ec23-hint">Les invitations de votre manager seront disponibles après installation de la migration 09.</p>';}
                }
                break;
            case "needs": {
                const data = id ? {items:[],total:0} as List<Need> : await read<List<Need>>("needs", { ...args, scope: ctx.boot.user.role === "incube" ? "mine" : "all" });
                if (id) {
                    const detail = await read<NeedDetail>("need", { id });
                    detail.responses.forEach(r => responses.set(r.id,r));
                    html = `<a class="ec13-back" href="#needs">← Retour aux demandes</a>` + `<section id="ec22-views" class="ec22-stats" aria-live="polite">Consultations et propositions : chargement…</section>` + needDetail(ctx,detail);
                    if(ctx.boot.user.role==="incube" && detail.need.owned) {
                        html+=`<section class="ec20-help"><div><span class="ec20-eyebrow">ACCOMPAGNEMENT</span><h3>Besoin d’un coup de pouce ?</h3><p>Votre Startup Manager peut vous orienter vers une expertise, débloquer une situation ou vous aider à préciser la demande.</p></div><button class="btn primary" data-action="ask-manager" data-id="${e(detail.need.id)}">${icon('send',16)} Solliciter mon Startup Manager</button></section>`;
                    }
                } else {
                    const dismissed = new Set(stringList("euraconnect.v13.dismissed"));
                    const shown = ctx.boot.user.role === "prestataire" ? {...data,items:data.items.filter(n=>!dismissed.has(n.id))} : data;
                    html = needsView(ctx, shown);
                }
                break;
            }
            case "directory": {
                const data = await read<List<DirectoryItem>>("directory", { ...args, kind: params.get("kind") === "person" ? "person" : "company" });
                html = directoryView(ctx, data);
                break;
            }
            case "offers": {
                const data = await read<List<Offer>>("offers", { ...args, size: 100 });
                listOffers = data.items;
                cacheOffers(data.items);
                html = offersView(ctx, data);
                break;
            }
            case "proposal": {
                if (!id) { navigate("needs"); return; }
                let r = responses.get(id);
                if (!r) r = (await read<ThreadDetail>("messages",{id})).thread;
                const [co,off,person] = await Promise.allSettled([
                    read<CompanyDetail>("company",{id:r.company_id}),
                    read<List<Offer>>("offers",{company_id:r.company_id,size:100}),
                    r.author_id ? read<DirectoryItem>("person",{id:r.author_id}) : Promise.resolve(null)
                ]);
                html = `<a class="ec13-back" href="#needs/${e(r.need_id)}">← Retour à la demande</a>` + responseDetail(r,co.status === "fulfilled"?co.value:null,person.status === "fulfilled"?person.value:null,off.status === "fulfilled"?off.value.items:[]);
                break;
            }
            case "messages": {
                const threads = await read<List<ResponseItem>>("threads", args);
                for (const r of threads.items)
                    responses.set(r.id, r);
                if (!id && threads.items.length && !params.get("q")) {
                    navigate("messages/" + threads.items[0]!.id, params);
                    return;
                }
                const detail = id ? await read<ThreadDetail>("messages", { id }) : null;
                if (detail)
                    responses.set(detail.thread.id, detail.thread);
                const appointments = id ? await read<List<SessionItem>>("sessions", { response_id:id,scope:"all",size:100,from:null,to:null }) : null;
                html = messagesView(ctx, threads, detail, appointments?.items || []);
                if (detail && !demo)
                    void write("read_thread", { id, until: detail.read_until }).then(counts).catch(() => undefined);
                break;
            }
            case "agenda":
            case "workshops": {
                const workshop = route === "workshops";
                const range = agendaRange(params);
                const scope = params.get("scope") || "mine";
                if (!workshop) ctx.params.set("scope", scope);
                const results = await read<List<SessionItem>>("sessions", { ...args,
                    scope:workshop?"all":scope,
                    from:workshop?new Date().toISOString():range.from,
                    to:workshop?null:range.to,
                    kind:workshop?"atelier":params.get("kind"),
                    mode:workshop?null:params.get("mode"),
                    expertise:workshop?null:params.get("expertise"),
                    host_id:params.get("host_id"),target_company:params.get("target_company"),size:100 });
                const inbox = workshop ? [] : (await read<List<SessionItem>>("sessions", {
                    scope:"mine",kind:"proposition",from:new Date().toISOString(),
                    to:null,size:100
                })).items;
                html = sessionsView(ctx,results,workshop,inbox);
                if(!workshop && !demo && ["incube","startup_manager"].includes(ctx.boot.user.role)) {
                    try {html = managerMeetings(await managerMeetingRpc<ManagerMeeting[]>("list"),ctx.boot.user.role)+html;}
                    catch {html = '<p class="ec23-hint">Invitations manager : migration 09 requise.</p>'+html;}
                }
                break;
            }
            case "portfolio": {
                const data = await read<Portfolio>("portfolio", { id });
                if (!id && data.startups.length) {
                    navigate("portfolio/" + data.startups[0]!.id, params);
                    return;
                }
                managerPortfolio=data;
                const suppliers=await read<List<DirectoryItem>>("directory",{kind:"company",type:"prestataire",size:100,sort:"name"});
                managerProviders=suppliers.items;
                let recs:ManagerRecommendation[]=[];
                let recommendationWarning="";
                if(!demo){try {recs=await managerRpc<ManagerRecommendation[]>("list");}
                    catch (err) {recommendationWarning=managerErrorNotice(err,"recommendations");}}
                html=recommendationWarning+managerCenter(data,id,managerProviders,recs);
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
        const focused=samePage?filterFocus():null;
        const keepFacets=samePage && (new URLSearchParams(previousHash.split("?")[1]||"").get("kind")||"company")===(params.get("kind")||"company");
        const openFacets=keepFacets?Array.from(out.querySelectorAll<HTMLDetailsElement>('details[open]')).map(d=>d.className).filter(Boolean):[];
        out.innerHTML = html;
        out.setAttribute('aria-busy','false');
        for (const className of openFacets) out.querySelectorAll<HTMLDetailsElement>('details').forEach(el=>{if(el.className===className)el.open=true;});
        renderedHash=location.hash;
        displayedThreadKey=route==='messages'&&id?[boot.user.id,activeCompany,id].join(':'):'';
        const draftInput=out.querySelector<HTMLTextAreaElement>('#message-form textarea[name="body"]');
        if(draftInput && displayedThreadKey)draftInput.value=messageDrafts.get(displayedThreadKey)||'';
        restoreFocus(focused);
        if(!samePage) window.scrollTo({top:scrollPositions.get(location.hash)||0,behavior:'instant'});
        else if(previousHash!==location.hash) window.scrollTo({top:scrollPositions.get(previousHash)||0,behavior:'instant'});
        document.body.classList.toggle("ec13-mobile-thread",route==="messages" && Boolean(id));
        void hydrateImages(out);
        if (route === "needs" && id && !demo) {
            void needLifecycleRpc<{views:number;responses:number;providers:null|Array<{company_id:string;name:string;viewed_at:string;responded:boolean}>}>("view",id,activeCompany).then(stats=>{
                const node=document.getElementById("ec22-views");if(!node || seq!==generation)return;
                const role=ctx.boot.user.role;
                node.innerHTML=`<strong>${stats.views} prestataire${stats.views>1?"s":""} ayant consulté</strong><span>${stats.responses} proposition${stats.responses>1?"s":""} transmise${stats.responses>1?"s":""}</span>` + (role==="startup_manager" && stats.providers ? `<details><summary>Voir les prestataires intéressés (${stats.providers.length})</summary><ul>${stats.providers.map(p=>`<li>${p.name.replace(/&/g,"&amp;").replace(/</g,"&lt;")} · ${p.responded?"A répondu":"A consulté"}</li>`).join("")}</ul></details>` : "");
            }).catch(()=>{const node=document.getElementById("ec22-views");if(node)node.textContent="Statistiques disponibles après installation de la migration V2.2.";});
        }
        const hourScroll=out.querySelector<HTMLElement>('.v3-hour-scroll');
        if(hourScroll && !samePage){
            const first=Number(hourScroll.dataset.firstHour||8);
            const firstEvent=Number(hourScroll.dataset.firstEvent||480);
            const now=new Date();
            const paris=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
            const current=Number(paris.find(p=>p.type==='hour')?.value||8)*60+Number(paris.find(p=>p.type==='minute')?.value||0);
            const target=Math.min(firstEvent,Math.max(0,current-60));
            hourScroll.scrollTop=Math.max(0,(target-first*60)*.8);
        }
        const msgs = out.querySelector(".message-flow");
        if (msgs)
            msgs.scrollTop = msgs.scrollHeight;
    }
    catch (err) {
        if (seq !== generation)
            return;
        out.setAttribute("aria-busy","false");
        out.innerHTML = empty("Cet espace ne peut pas encore \u00EAtre affiche", errorMessage(err), button("R\u00E9essayer", "refresh", { class: "primary", icon: "refresh" }), "warning");
    }
}
let searchGeneration=0;
async function updatePalette(query:string):Promise<void>{
    const stamp=++searchGeneration;
    const host=document.querySelector<HTMLElement>('#ec13-palette-results');if(!host)return;
    if(!query.trim()){host.innerHTML='<p class="muted">Cherchez une demande, une offre, une entreprise ou une personne.</p>';return;}
    host.textContent='Recherche en cours…';
    const [needs,offers,companies,people]=await Promise.allSettled([
        read<List<Need>>('needs',{q:query,size:5}),
        read<List<Offer>>('offers',{q:query,size:5}),
        read<List<DirectoryItem>>('directory',{q:query,kind:'company',size:5}),
        read<List<DirectoryItem>>('directory',{q:query,kind:'person',size:5})
    ]);
    if(stamp!==searchGeneration || !host.isConnected)return;
    const blocks:[string,Array<{id:string;name:string;kind:string}>][]=[
        ['Demandes',needs.status==='fulfilled'?needs.value.items.map(x=>({id:x.id,name:x.title,kind:'need'})):[]],
        ['Offres',offers.status==='fulfilled'?offers.value.items.map(x=>({id:x.id,name:x.title,kind:'offer'})):[]],
        ['Entreprises',companies.status==='fulfilled'?companies.value.items.map(x=>({id:x.id,name:x.name,kind:'company'})):[]],
        ['Contacts',people.status==='fulfilled'?people.value.items.map(x=>({id:x.id,name:x.name,kind:'person'})):[]]
    ];
    if(offers.status==='fulfilled')cacheOffers(offers.value.items);
    host.innerHTML=blocks.map(([group,items])=>`<section><h3>${e(group)} · ${items.length}</h3>${items.map(x=>`<button class="ec13-result" data-action="palette-open" data-kind="${x.kind}" data-id="${e(x.id)}">${e(x.name)} ${icon('arrow',16)}</button>`).join('')||'<p class="muted">Aucun résultat</p>'}</section>`).join('');
}
function searchPalette():void{
    modal('Recherche dans EURACONNECT',`<label class="field">Rechercher dans le réseau<input id="ec13-palette-query" autocomplete="off" placeholder="Nom, compétence, demande, offre…" aria-label="Recherche globale"></label><div id="ec13-palette-results"></div>`,{wide:true});
    const input=document.querySelector<HTMLInputElement>('#ec13-palette-query');
    let timer:number|undefined;
    input?.addEventListener('input',()=>{window.clearTimeout(timer);timer=window.setTimeout(()=>{void updatePalette(input.value).catch(err=>{const x=document.querySelector('#ec13-palette-results');if(x)x.textContent=errorMessage(err);});},350);});
    input?.addEventListener('keydown',ev=>{if(ev.key==='ArrowDown'){ev.preventDefault();document.querySelector<HTMLElement>('#ec13-palette-results button')?.focus();}});
    document.querySelector('#ec13-palette-results')?.addEventListener('keydown',ev=>{
        const key=(ev as KeyboardEvent).key;if(!['ArrowDown','ArrowUp','Home','End'].includes(key))return;
        const items=Array.from(document.querySelectorAll<HTMLButtonElement>('#ec13-palette-results button'));
        if(!items.length)return;ev.preventDefault();const current=items.indexOf(document.activeElement as HTMLButtonElement);
        const index=key==='Home'?0:key==='End'?items.length-1:key==='ArrowDown'?(current+1)%items.length:(current-1+items.length)%items.length;items[index]?.focus();
    });
    input?.focus();
}
async function openNeed(id: string): Promise<void> {
    const data = await read<NeedDetail>("need", { id });
    for (const r of data.responses)
        responses.set(r.id, r);
    navigate("needs/" + id);
}
async function openSession(id: string): Promise<void> { const s = await read<SessionItem>("session", { id }); modal(label(s.kind), sessionDetail(context(), s), { wide: true }); }
async function getAdmin(): Promise<AdminData> { return adminCache || await read<AdminData>("admin"); }
async function showCompany(id:string):Promise<void>{
    const c=await read<CompanyDetail>("company",{id});
    let offers:Offer[]=[];
    try { offers=(await read<List<Offer>>("offers",{company_id:id,size:100})).items;cacheOffers(offers); } catch { /* company still accessible */ }
    modal("Fiche entreprise · "+c.name,companyDetailV12(c,offers),{wide:true});
}
async function openOffer(id:string):Promise<void> {
    let o=offerCache.get(id)||listOffers.find(item=>item.id===id);
    if(!o){const fresh=await read<List<Offer>>('offers',{size:100});cacheOffers(fresh.items);o=offerCache.get(id);}
    if(!o)throw new Error("Cette offre n'est plus accessible. Actualisez le catalogue puis r\u00e9essayez.");
            if (o.can_edit) {
                modal("Modifier mon offre", offerForm(o) + button("Ajouter une image", "upload", { id, icon: "upload", extra: "data-type=\"offer\"" }), { wide: true });
                return;
            }
            modal("Offre de service", `<div class="ec27-detail"><p class="eyebrow">${e(o.provider)}</p><h2>${e(o.title)}</h2>${tags(o.tags)}<div class="prose">${e(offerSummary(o.description).text)}</div>${o.benefit ? `<div class="inline-note">${e(o.benefit)}</div>` : ""}<div class="ec27-detail-actions">${button("Consulter le prestataire", "company-detail", {id:o.company_id,class:"ghost",icon:"company"})}${button("Voir les créneaux", "directory-slots", { id: o.company_id, icon: "calendar", class: "primary", extra: 'data-kind="company"' })}</div></div>`, { wide: true });

}
async function showPerson(id:string):Promise<void>{
    try {
        const person=await read<DirectoryItem>("person",{id});
        modal("Fiche contact · "+person.name,personDetailV12(person),{wide:true});
    } catch (error) {
        modal("Contact non disponible", `<div class="ec22-contact-fallback"><p class="warning-note">${e(errorMessage(error))}</p><h3>Ce contact n’est pas encore accessible dans l’annuaire</h3><p>La fiche est peut-être privée ou le compte n’a pas encore publié son profil. Vous pouvez retrouver les contacts autorisés depuis l’onglet Contacts de l’annuaire.</p><a class="btn primary" href="#directory?kind=person">Consulter l’annuaire des contacts</a></div>`);
    }
}

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
            await render();toast("Conversations actualis\u00e9es. Votre brouillon est conserv\u00e9.");return;
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
        case "collapse-sidebar": {
            if(matchMedia('(max-width:800px)').matches){setMobileMenu(false);return;}
            const collapsed=document.body.classList.toggle('ec24-sidebar-collapsed');
            store('euraconnect.nav.collapsed',collapsed?'1':'0');syncSidebar();hideNavigationTooltip();
            return;
        }
        case "menu":
            setMobileMenu(!document.querySelector('.app-shell.mobile-open'));return;
        case "logout-confirm":
            modal("Se d\u00e9connecter", `<p>Voulez-vous fermer votre session EURACONNECT ?</p><p class="muted">Les saisies qui ne sont pas enregistr\u00e9es peuvent \u00eatre perdues.</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">Annuler</button><button class="btn primary" data-action="logout">Se d\u00e9connecter</button></div>`);
            return;
        case "logout":
            if (demo) {
                location.href = location.pathname;
                return;
            }
            await signOut();
            releaseMedia();responses.clear();offerCache.clear();messageDrafts.clear();displayedThreadKey="";lastShellKey="";
            boot = null;
            closeModal();
            authScreen();
            return;
        case "go":
            closeModal();
            navigate(el.dataset.route || "dashboard");
            return;
        case "global-search":
            searchPalette();return;
        case "palette-open":
            closeModal();
            if(el.dataset.kind==='need')navigate('needs/'+id);
            else if(el.dataset.kind==='offer')await openOffer(id);
            else if(el.dataset.kind==='company')await showCompany(id);
            else if(el.dataset.kind==='person')await showPerson(id);
            return;
        case "premium":
            showPremium();
            return;
        case "page":
            filter("page", el.dataset.page || "0");
            return;
        case "offer-view": {
            filter("view", el.dataset.view || "grid");
            return;
        }
        case "clear-filters": {
            const hash=clearFilterHash(location.hash);
            if(hash===location.hash)void render();else location.hash=hash;
            return;
        }
        case "remove-filter":
            filter(el.dataset.key||"q",null);return;
        case "close-filters":
            el.closest('details')?.removeAttribute('open');return;

        case "directory-kind": {
            const hash=filteredHash(location.hash,{kind:el.dataset.kind||'company',type:null,label:null,premium:null});
            location.hash=hash;return;
        }
        case "directory-view":
            filter("view",el.dataset.view||"compact");
            return;
        case "company-detail":
            await showCompany(id);
            return;
        case "person-detail":
            await showPerson(id);
            return;
        case "favorite": {
            el.setAttribute("disabled", "");
            try {
                await write("favorite", { id, type: el.dataset.type, value: el.dataset.value === "true" });
                const on=el.dataset.value==='true';
                document.querySelectorAll<HTMLElement>('[data-action="favorite"]').forEach(target=>{
                    if(target.dataset.id!==id || target.dataset.type!==el.dataset.type)return;
                    target.classList.toggle('on',on);target.setAttribute('aria-pressed',String(on));target.dataset.value=String(!on);
                    target.setAttribute('aria-label',on?'Retirer des favoris':'Ajouter aux favoris');target.title=on?'Retirer des favoris':'Ajouter aux favoris';
                });
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
            modal("Publier une demande · 3 étapes", needForm(ctx, undefined, ctx.boot.user.role === "admin" ? (await getAdmin()).companies : []), { wide: true });
            setupWizard();
            return;
        case "open-need":
            await openNeed(id);
            return;
        case "edit-need": {
            const data = await read<NeedDetail>("need", { id });
            modal("Modifier la demande · 3 étapes", needForm(ctx, data.need, ctx.boot.user.role === "admin" ? (await getAdmin()).companies : []), { wide: true });
            setupWizard(true);
            return;
        }
        case "need-archive": {
            if (!confirm("Archiver cette demande ? Elle ne sera plus proposée aux prestataires. L’historique restera accessible.")) return;
            if(demo)throw new Error("Aper\u00e7u en lecture seule.");
            await needLifecycleRpc("archive", id);
            toast("Demande archivée."); await render(); return;
        }
        case "need-delete": {
            if (!confirm("Supprimer définitivement cette demande sans réponse ? Cette opération est irréversible.")) return;
            if(demo)throw new Error("Aper\u00e7u en lecture seule.");
            await needLifecycleRpc("delete", id);
            toast("Demande supprimée."); navigate("needs"); return;
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
        case "view-response":
            navigate("proposal/" + id);
            return;
        case "dismiss-need": {
            const key="euraconnect.v13.dismissed";
            const values=stringList(key);
            store(key,JSON.stringify([...new Set([...values,id])]));
            document.querySelectorAll<HTMLElement>("[data-need-id]").forEach(card=>{if(card.dataset.needId===id)card.remove();});
            toast("Cette opportunité est masquée sur cet appareil.");
            return;
        }
        case "quick-reply": {
            const target=document.querySelector<HTMLTextAreaElement>('#message-form textarea[name="body"]');
            if(target){target.value=(target.value.trim()?target.value.trim()+" ":"")+({available:"Disponible mardi ?",scope:"Pouvez-vous préciser le périmètre ?",thanks:"Merci pour votre proposition, je reviens vers vous rapidement."} as Record<string,string>)[el.dataset.text||""]||"";target.focus();}
            return;
        }
        case "wizard-step":
            showWizard(Number(el.dataset.step || 0));
            return;
        case "wizard-next":
            showWizard(Math.min(2,wizardPage+1));
            return;
        case "wizard-prev":
            showWizard(Math.max(0,wizardPage-1));
            return;
        case "compare-selected": {
            const selected = Array.from(document.querySelectorAll<HTMLInputElement>(".ec13-compare-pick:checked")).map(x=>responses.get(x.value)).filter((r):r is ResponseItem=>Boolean(r));
            if(selected.length<2 || selected.length>3) { toast("Sélectionnez 2 ou 3 propositions.",true); return; }
            modal("Comparaison de propositions", `<div class="ec13-compare-grid">${selected.map(r=>`<article class="panel"><h3>${e(r.provider)}</h3><p><strong>${r.price===null?'À convenir':(r.price/100).toLocaleString('fr-FR')+' € HT'}</strong></p><p>${r.lead_days===null?'Délai à préciser':r.lead_days+' jours'}</p><h4>Approche</h4><div class="prose">${markdown(r.approach || r.message)}</div>${button('Voir la proposition','view-response',{id:r.id,class:'primary'})}</article>`).join('')}</div>`,{wide:true});
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
            const p = new URLSearchParams({ scope: "all", kind: "creneau", view: "list" });
            p.set(r === "company" ? "target_company" : "host_id", id);
            navigate("agenda", p);
            return;
        }
        case "directory-detail": {
            if (el.dataset.kind==="person") await showPerson(id);
            else await showCompany(id);
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
        case "offer-detail":
            await openOffer(id);return;
        case "manager-invite": {
            if(ctx.boot.user.role!=="startup_manager") {toast("Accès réservé aux Startup Managers.",true);return;}
            if(demo)throw new Error("L\u2019aper\u00e7u est en lecture seule. Testez l\u2019invitation avec un compte manager connect\u00e9.");
            const contacts=await managerMeetingRpc<{id:string,name:string}[]>("contacts",{startup_id:id});
            if(!contacts.length){toast("Aucun contact incubé actif dans cette startup.",true);return;}
            const options=contacts.map(x=>`<option value="${e(x.id)}">${e(x.name)}</option>`).join("");
            modal("Proposer un créneau à la startup",`<form id="ec23-invite-form"><input type="hidden" name="startup_id" value="${e(id)}"><label>Contact incubé<select name="invitee_id" required>${options}</select></label><label>Objet de la rencontre<input name="title" required minlength="5" maxlength="160" placeholder="Point d'accompagnement"></label><div class="form-grid"><label>Début<input name="starts_at" type="datetime-local" required></label><label>Fin<input name="ends_at" type="datetime-local" required></label></div><label>Modalité<select name="mode"><option value="visio">Visioconférence</option><option value="telephone">Téléphone</option><option value="sur_site">Sur place</option></select></label><label>Lien visio ou lieu<input name="location" maxlength="500" placeholder="Lien ou adresse (facultatif)"></label><label>Message d'accompagnement<textarea name="message" rows="3" maxlength="1500" placeholder="Objectif du rendez-vous"></textarea></label><p class="muted">La startup pourra accepter ou refuser. Aucun rendez-vous n'est confirmé avant son accord.</p><p class="form-error" role="alert" hidden></p><button type="submit" class="btn primary full">Envoyer la proposition</button></form>`,{wide:true});
            return;
        }
        case "manager-meeting-response": {
            if(!confirm(el.dataset.status==="accepted"?"Accepter ce rendez-vous ?":"Refuser cette proposition de rendez-vous ?"))return;
            await managerMeetingRpc("respond",{id,status:el.dataset.status});
            toast(el.dataset.status==="accepted"?"Rendez-vous accepté.":"Proposition refusée.");
            await render();return;
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
        case "agenda-clear": {
            const params=new URLSearchParams({scope:ctx.params.get("scope")||"mine",view:ctx.params.get("view")||"week"});
            navigate("agenda",params);
            return;
        }
        case "agenda-step":
            filter("from",shiftAgenda(ctx.params,Number(el.dataset.direction||"1")));
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
        case "decline-session":
            modal("Refuser le créneau proposé",simpleForm("decline_session","<p>Le prestataire sera informé que ce créneau ne vous convient pas. Vous pourrez proposer un autre horaire depuis la conversation.</p>",id,"Confirmer mon refus"));
            return;
        case "cancel-booking":
            modal("Annuler votre inscription", simpleForm("cancel_booking", "<p>La place sera liberee. L'organisateur sera inform\u00E9.</p>", id, "Confirmer l'annulation"));
            return;
        case "cancel-session":
            modal("Annuler cette rencontre", simpleForm("session_status", "<input type=\"hidden\" name=\"status\" value=\"annule\"><p>Toutes les personnes inscrites seront notifiees dans EURACONNECT.</p>", id, "Annuler la rencontre"));
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
        case "ask-manager": {
            modal("Demander l’appui de votre Startup Manager",`<p>Votre demande sera envoyée au manager affecté à votre startup. Il pourra suivre votre situation et recommander un expert.</p><form id="ec20-help-form"><input type="hidden" name="need_id" value="${e(id)}"><label class="ec20-form-label">Que souhaitez-vous débloquer ?<textarea name="message" required minlength="15" maxlength="1000" rows="4" placeholder="Exemple : nous cherchons un prestataire capable de..."></textarea></label><p class="form-error" role="alert" hidden></p><button type="submit" class="btn primary full">Envoyer au manager</button></form>`,{wide:true});
            return;
        }
        case "manager-open-advice": {
            if(ctx.boot.user.role!=="startup_manager" && ctx.boot.user.role!=="admin") {toast("Accès réservé au Startup Manager.",true);return;}
            const need=managerPortfolio?.needs.find(n=>n.id===id);
            if(!need){toast("Demande introuvable dans votre portefeuille.",true);return;}
            modal("Conseiller la startup",`<p>Votre avis concerne <strong>${e(need.title)}</strong>. Il est transmis à la startup à titre de conseil, sans bloquer sa décision.</p><form id="ec35-advice-form"><input type="hidden" name="need_id" value="${e(id)}"><label>Votre conseil argumenté<textarea name="advice" minlength="30" maxlength="3000" rows="6" required placeholder="Points d'attention, pistes d'action, prestataires ou ressources à explorer…"></textarea></label><p class="form-error" role="alert" hidden></p><button type="submit" class="btn primary full">Partager mon conseil</button></form>`,{wide:true});
            return;
        }
        case "manager-open-recommend": {
            if(!managerPortfolio) {toast("Ouvrez votre portefeuille.",true);return;}
            const target=managerPortfolio.needs.find(n=>n.id===id);
            if(!target){toast("Demande introuvable.",true);return;}
            const supplierOptions=managerProviders.filter(x=>x.kind==="company"&&x.type==="prestataire"&&x.identity_visible);
            modal("Recommander un expert",`<p>Pour la demande <strong>${e(target.title)}</strong>. Vous transmettez une recommandation à la startup, sans l’engager commercialement.</p><form id="ec20-recommend-form"><input type="hidden" name="need_id" value="${e(target.id)}"><label>Prestataire validé<select name="provider_id" required><option value="">Choisir un prestataire</option>${supplierOptions.map(x=>`<option value="${e(x.id)}">${e(x.name)}</option>`).join("")}</select></label><label>Votre recommandation<textarea name="rationale" rows="4" minlength="15" maxlength="1800" required placeholder="Pourquoi cet expert répond au besoin..."></textarea></label><div class="form-error" role="alert" hidden></div><button class="btn primary full" type="submit">Transmettre à la startup</button></form>`,{wide:true});
            return;
        }
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
        case "admin-labels": {
            const c=(await getAdmin()).companies.find(x=>x.id===id);
            if(!c) return;
            const choices=[['partenaire','Partenaire du réseau'],['institutionnel','Institutionnel'],['pop','Prestataire POP'],['intervenant_atelier','Intervenant d’atelier']];
            modal("Catégories de "+c.name,`<form id="command-form" data-command="set_company_labels" data-id="${e(id)}"><p class="muted">Ces distinctions sont administrées et vérifiables. « Premium » reste attribué depuis son panneau dédié. « Intervenant d’atelier » apparaît aussi automatiquement lorsqu’un atelier est publié.</p><div class="ec12-label-form">${choices.map(([v,t])=>`<label><input type="checkbox" name="label_${v}" ${c.labels?.includes(v||"")?'checked':''}>${e(t||"")}</label>`).join('')}</div>${footerSubmit("Enregistrer les catégories")}</form>`,{wide:true});
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
function showWizard(step:number):void {
    const form=document.querySelector<HTMLFormElement>(".ec13-wizard"); if(!form) return;
    wizardPage=Math.min(2,Math.max(0,step));
    form.querySelectorAll<HTMLElement>(".ec13-steps [data-step]").forEach(b=>b.classList.toggle("active",Number(b.dataset.step)===wizardPage));
    const grid=form.querySelector(".form-grid"); if(!grid)return;
    // The existing form fields are grouped by their semantic section headings.
    let stage=0;
    Array.from(grid.children).forEach(child=>{
       const x=child as HTMLElement;
       const title=x.classList.contains("form-section-title") ? x.querySelector("strong")?.textContent || "" : "";
       if(title.includes("Conditions")) stage=1;
       else if(title.includes("La startup") || title.includes("projet")) stage=0;
       if(x.matches("details.form-section") || x.querySelector('[name="status"]')) stage=2;
       if(x.matches(".ec13-wizard-panel")) stage=0;
       x.hidden=stage!==wizardPage;
    });
    const preview=form.querySelector<HTMLElement>("#ec13-preview"); if(preview){preview.hidden=wizardPage!==2;}
    const title=(form.querySelector<HTMLInputElement>('[name="title"]')?.value||"Demande sans titre");
    const context=(form.querySelector<HTMLTextAreaElement>('[name="context"]')?.value||"");
    const out=form.querySelector<HTMLElement>("#ec13-preview-text");if(out)out.textContent=title+(context?" — "+context.slice(0,300):"");
    form.querySelector<HTMLElement>('.ec13-wizard-submit')?.toggleAttribute('hidden',wizardPage!==2);
    form.querySelector<HTMLElement>('[data-action="wizard-next"]')?.toggleAttribute('hidden',wizardPage===2);
    form.querySelector<HTMLElement>('[data-action="wizard-prev"]')?.toggleAttribute('hidden',wizardPage===0);
}
function setupWizard(editing=false):void {
    const form=document.querySelector<HTMLFormElement>('.ec13-wizard');if(!form)return;
    wizardPage=0;
    if(!editing){try{const draft=JSON.parse(stored(draftKey(),"session")||'{}') as Record<string,string>;for(const [k,v] of Object.entries(draft)){const f=form.elements.namedItem(k);if(f instanceof HTMLInputElement || f instanceof HTMLTextAreaElement)f.value=v;}}catch{ /* no saved draft */ }}
    form.addEventListener('input',()=>{if(editing)return;const values:Record<string,string>={};form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input[name],textarea[name]').forEach(x=>{if(x.type!=='hidden'&&x.type!=='password'&&x.type!=='checkbox')values[x.name]=x.value;});store(draftKey(),JSON.stringify(values),"session");const state=form.querySelector('#ec13-draft-state');if(state)state.textContent='Brouillon sauvegardé sur cet appareil.';});
    form.querySelector<HTMLSelectElement>('#ec13-template')?.addEventListener('change',ev=>{
       const k=(ev.target as HTMLSelectElement).value;
       const templates:Record<string,[string,string,string]>={audit:['Audit de notre organisation','Nous souhaitons analyser notre situation actuelle et identifier les priorités.','Diagnostic, recommandations et feuille de route.'],juridique:['Sécuriser notre cadre juridique','Nous recherchons un accompagnement juridique adapté à notre activité.','Analyse des risques et documents contractuels.'],recrutement:['Recruter un profil clé','Nous devons définir un poste et identifier des candidats qualifiés.','Définition du besoin, sourcing et présélection.'],financement:['Structurer notre financement','Nous souhaitons préparer notre stratégie de financement.','Plan de financement et dossier investisseurs.']};
       if(!templates[k])return;const [title,context,deliverables]=templates[k];for(const [name,value] of Object.entries({title,context,deliverables})){const x=form.elements.namedItem(name);if(x instanceof HTMLInputElement||x instanceof HTMLTextAreaElement)x.value=value;}form.dispatchEvent(new Event('input',{bubbles:true}));
    });
    showWizard(0);
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
    if (command === "set_company_labels") {
        args.labels=["partenaire","institutionnel","pop","intervenant_atelier"].filter(k=>args["label_"+k]===true);
    }
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
    if(command==="save_need") store(draftKey(),null,"session");
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
    app.innerHTML = `<div class="auth-layout"><aside class="auth-brand"><a class="brand" href="#"><img class="ec12-brand-logo" src="/euraconnect-64.png" width="48" height="48" alt="" loading="eager">EURACONNECT</a><p class="eyebrow">LE R\u00C9SEAU QUI FAIT AVANCER VOS PROJETS</p><h1>La bonne expertise.<br>La bonne rencontre.<br><em>Au bon moment.</em></h1><p>Startup, prestataire ou \u00E9quipe d'accompagnement : un espace commun pour transformer les besoins en collaborations.</p><div class="auth-steps">${[["needs", "Exprimer un besoin"], ["people", "Mobiliser une expertise"], ["calendar", "Passer \u00E0 l'action"]].map(([i, t]) => "<span>" + icon(i || "needs", 21) + e(t) + "</span>").join("")}</div><footer>EURASANTE &middot; Services et accompagnement</footer></aside><main class="auth-main"><div class="auth-card"><p class="eyebrow">BIENVENUE DANS VOTRE R\u00C9SEAU</p><h2>${authMode === "signup" ? "Rejoindre en tant que prestataire" : authMode === "recover" ? "Retrouver mon acc\u00E8s" : authMode === "reset" ? "Nouveau mot de passe" : "Se connecter"}</h2><p class="muted">${authMode === "signup" ? "Votre entreprise sera valid\u00E9e par l'\u00E9quipe avant publication. Les comptes incub\u00E9s et managers sont g\u00E9r\u00E9s par l'administrateur." : "Retrouvez vos projets, vos contacts et vos prochaines rencontres."}</p>
 ${!hasConfiguration() ? "<div class=\"warning-note\">Configuration Supabase requise : ajoutez les deux variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans les variables de compilation de Cloudflare, puis relancez le d\u00E9ploiement.</div>" : ""}<form id="auth-form">${authMode === "signup" ? field("name", "Pr\u00E9nom et nom", "", { required: true }) : ""}${authMode !== "reset" ? field("email", "Email professionnel", "", { type: "email", required: true }) : ""}${authMode !== "recover" ? field("password", "Mot de passe", "", { type: "password", required: true, help: authMode === "login" ? "" : "12 caract\u00E8res minimum." }) : ""}<div class="form-error" role="alert" ${error ? "" : "hidden"}>${e(error)}</div><button class="btn primary full" type="submit" ${!hasConfiguration() ? "disabled" : ""}>${authMode === "signup" ? "Cr\u00E9er mon compte" : authMode === "recover" ? "Envoyer le lien" : authMode === "reset" ? "Enregistrer le mot de passe" : "Entrer dans mon espace"}${icon("arrow", 17)}</button></form><div class="auth-links">${authMode === "login" ? "<button data-auth=\"recover\">Mot de passe oubli\u00E9 ?</button><button data-auth=\"signup\">Devenir prestataire</button>" : "<button data-auth=\"login\">Revenir \u00E0 la connexion</button>"}</div><div class="auth-demo"><span>D\u00E9couvrir les nouveaux parcours</span><a href="?demo=1">Ouvrir l'aper\u00E7u avec des donn\u00E9es fictives ${icon("arrow", 15)}</a></div></div><footer>Vos identifiants restent g\u00E9r\u00E9s par Supabase Auth.</footer></main></div>`;
}
document.addEventListener("click", event => {
    const el = (event.target as HTMLElement).closest<HTMLElement>("[data-action],[data-auth]");
    if (!el || el.hasAttribute("disabled") || el.dataset.running === "true")
        return;
    if (el.dataset.auth) {
        authMode = el.dataset.auth;
        authScreen();
        return;
    }
    event.preventDefault();
    el.dataset.running="true";el.setAttribute('aria-busy','true');el.classList.add('ec29-inline-loading');
    void action(el).catch(err => toast(errorMessage(err), true)).finally(()=>{
        el.dataset.running="false";el.removeAttribute('aria-busy');el.classList.remove('ec29-inline-loading');
    });
});
document.addEventListener("submit", event => {
    const form = event.target as HTMLFormElement;
    if (!["command-form", "auth-form", "message-form", "filter-form", "ec20-recommend-form", "ec20-help-form", "ec35-advice-form", "ec23-invite-form"].includes(form.id))
        return;
    event.preventDefault();
    if (form.classList.contains("ec13-wizard") && wizardPage < 2) { showWizard(wizardPage+1); return; }
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
        navigate(r.route+(r.id?"/"+r.id:""), p);
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
        if (form.id === "ec23-invite-form") {
            if(demo)throw new Error("Aperçu en lecture seule.");
            const v=formValues(form);
            const starts=new Date(String(v.starts_at)),ends=new Date(String(v.ends_at));
            if(!Number.isFinite(starts.getTime())||!Number.isFinite(ends.getTime())||ends<=starts)throw new Error('Choisissez une fin post\u00e9rieure au d\u00e9but.');
            if(starts.getTime()<=Date.now())throw new Error('Choisissez un cr\u00e9neau \u00e0 venir.');
            await managerMeetingRpc("invite",{...v,starts_at:starts.toISOString(),ends_at:ends.toISOString()});
            toast("Créneau proposé à l'incubé. Vous serez informé de sa réponse.");
            closeModal();await render();return;
        }
        if (form.id === "ec35-advice-form") {
            if(demo)throw new Error("Aperçu en lecture seule.");
            const v=formValues(form);
            await managerAdviceRpc("create",{need_id:v.need_id,advice:v.advice});
            toast("Conseil partagé. La startup conserve l'entière liberté de décision.");
            closeModal();await render();return;
        }
        if (form.id === "ec20-help-form") {
            if(demo)throw new Error("L'aperçu est en lecture seule.");
            const v=formValues(form);
            await managerRpc("ask",{need_id:v.need_id,message:v.message});
            toast("Votre demande d’aide a été transmise au Startup Manager.");
            closeModal();
            await render();
            return;
        }
        if (form.id === "ec20-recommend-form") {
            if(demo)throw new Error("L'aperçu est en lecture seule.");
            const v=formValues(form);
            await managerRpc("recommend",{need_id:v.need_id,provider_id:v.provider_id,rationale:v.rationale});
            toast("Recommandation transmise à la startup et enregistrée dans votre suivi.");
            closeModal();
            await render();
            return;
        }
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
            const input=form.querySelector<HTMLTextAreaElement>('textarea[name="body"]');if(input)input.value="";
            if(displayedThreadKey)messageDrafts.delete(displayedThreadKey);
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
let filterTimer:number|undefined;
document.addEventListener('input',ev=>{
    const input=ev.target;
    if(!(input instanceof HTMLInputElement))return;
    if(input.id!=='ec28-quick-search' && (!input.closest('#filter-form') || !['q','tag','city','expertise','maxprice'].includes(input.name)))return;
    window.clearTimeout(filterTimer);
    generation++;
    const value=input.value,key=input.id==='ec28-quick-search'?'q':input.name;
    const origin=location.hash.split('?')[0];
    filterTimer=window.setTimeout(()=>{if(location.hash.split('?')[0]===origin)filter(key,value||null);},400);
});
document.addEventListener("change", event => {
    const el = event.target as HTMLInputElement;
    if(el.closest('#filter-form') && (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type==='checkbox'))) {
        const values=formValues(el.closest('form') as HTMLFormElement);
        const current=routeParts();const p=new URLSearchParams(current.params);
        for(const [key,value] of Object.entries(values)){if(value===false || value==='' || value==null)p.delete(key);else p.set(key,String(value));}
        p.delete('page');navigate(current.route+(current.id?'/'+current.id:''),p);return;
    }

    if (el.id === "ec22-sort") { filter("sort", el.value); return; }
    if (el.id === "company-switch") {
        activeCompany = el.value || null;
        if (activeCompany)
            store("euraconnect.company.v1", activeCompany);
        releaseMedia();responses.clear();offerCache.clear();listOffers=[];adminCache=null;
        closeModal();
        void render();
    }
    if (el.id === "demo-role") {
        responses.clear();offerCache.clear();messageDrafts.clear();displayedThreadKey="";
        demoRole = el.value as Role;
        void reloadBoot().then(() => { navigate("dashboard"); return render(); });
    }
    if (el.name === "kind") {
        document.querySelector<HTMLElement>(".permanence-fields")?.toggleAttribute("hidden", el.value !== "permanence");
        document.querySelector<HTMLElement>(".workshop-fields")?.toggleAttribute("hidden", el.value !== "atelier");
    }
});
document.addEventListener("keydown", event => {
    const t=event.target as HTMLElement;
    const open=Boolean(document.querySelector('.ec29-shell.mobile-open'));
    if(event.key==='Escape') { hideNavigationTooltip(); if(open){event.preventDefault();setMobileMenu(false);return;} document.querySelectorAll<HTMLDetailsElement>('.ec22-facet-drawer[open],.ec27-facets[open]').forEach(el=>{el.open=false;el.querySelector<HTMLElement>('summary')?.focus();}); }
    if(event.key==='Tab'&&open&&matchMedia('(max-width:800px)').matches){
        const focusables=Array.from(document.querySelectorAll<HTMLElement>('.ec29-sidebar a[href],.ec29-sidebar button')).filter(x=>x.offsetParent!==null);
        const first=focusables[0],last=focusables[focusables.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    const editing=['INPUT','TEXTAREA','SELECT'].includes(t.tagName)||t.isContentEditable;
    if(!modalOpen() && ((event.key==='/'&&!editing)||((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'))){event.preventDefault();searchPalette();}
});
matchMedia('(max-width:800px)').addEventListener('change',()=>{document.querySelector('.app-shell')?.classList.remove('mobile-open');syncSidebar();});
function hideNavigationTooltip():void {document.getElementById('nav-tooltip')?.remove();}
function showNavigationTooltip(el:HTMLElement):void {
    hideNavigationTooltip();if(!document.body.classList.contains('ec24-sidebar-collapsed')||matchMedia('(max-width:800px)').matches)return;
    const text=el.dataset.tooltip;if(!text)return;
    const rect=el.getBoundingClientRect();const tip=document.createElement('div');tip.id='nav-tooltip';tip.textContent=text;tip.setAttribute('role','tooltip');
    tip.style.left=(rect.right+12)+'px';tip.style.top=Math.min(innerHeight-42,Math.max(6,rect.top+3))+'px';document.body.append(tip);
}
document.addEventListener('pointerover',ev=>{const el=(ev.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');if(el)showNavigationTooltip(el);});
document.addEventListener('pointerout',ev=>{if((ev.target as HTMLElement).closest('[data-tooltip]'))hideNavigationTooltip();});
document.addEventListener('focusin',ev=>{const el=(ev.target as HTMLElement).closest<HTMLElement>('[data-tooltip]');if(el)showNavigationTooltip(el);else hideNavigationTooltip();});
window.addEventListener("hashchange", () => {
    if (pendingNavigation)
        return;
    closeModal();hideNavigationTooltip();
    document.querySelector(".app-shell")?.classList.remove("mobile-open");syncSidebar();
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

interface ManagerMeeting {id:string;title:string;startup_name:string;manager_name:string;invitee_name:string;starts_at:string;ends_at:string;mode:string;location:string;message:string;status:string;can_respond:boolean}
function managerMeetings(items:ManagerMeeting[],role:string):string {
    if(!items.length)return '';
    return `<section class="ec23-meetings"><div class="ec23-meetings-head"><div><span class="eyebrow">ACCOMPAGNEMENT</span><h2>${role==='incube'?'Mes invitations du Startup Manager':'Rendez-vous proposés aux startups'}</h2></div><span>${items.filter(x=>x.status==='pending').length} en attente</span></div><div class="ec23-meetings-grid">${items.slice(0,12).map(x=>`<article class="ec23-meeting"><span class="ec23-state ${e(x.status)}">${x.status==='pending'?'À confirmer':x.status==='accepted'?'Accepté':'Refusé'}</span><h3>${e(x.title)}</h3><p>${e(x.startup_name)} · ${role==='incube'?'Avec '+e(x.manager_name):'Pour '+e(x.invitee_name)}</p><strong>${dateText(x.starts_at)} · ${new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}).format(new Date(x.starts_at))}</strong><p>${e(x.mode==='visio'?'Visio':x.mode==='telephone'?'Téléphone':'Sur place')}${x.location?' · '+e(x.location):''}</p>${x.message?`<p class="ec23-message">${e(x.message)}</p>`:''}${x.can_respond&&x.status==='pending'?`<div class="ec23-meeting-actions"><button class="btn primary small" data-action="manager-meeting-response" data-id="${e(x.id)}" data-status="accepted">Accepter</button><button class="btn ghost small" data-action="manager-meeting-response" data-id="${e(x.id)}" data-status="declined">Refuser</button></div>`:''}</article>`).join('')}</div></section>`;
}

// Navigation preferences are local to the browser and never alter user permissions.
if (stored("euraconnect.nav.collapsed") === "1") document.body.classList.add("ec24-sidebar-collapsed");

// Filter popovers close on an outside pointer interaction, not on field updates.
document.addEventListener('pointerdown',event=>{
 const target=event.target;
 if(!(target instanceof Node))return;
 document.querySelectorAll<HTMLDetailsElement>('.ec22-facet-drawer[open],.ec27-facets[open]').forEach(panel=>{if(!panel.contains(target))panel.open=false;});
});

document.addEventListener('click', event => {
 const target=event.target;
 if(!(target instanceof Element))return;
 document.querySelectorAll<HTMLDetailsElement>('.v3-account-menu[open]').forEach(menu=>{if(!menu.contains(target)||target.closest('a,button'))menu.open=false;});
});
document.addEventListener('keydown', event=>{
 if(event.key==='Escape')document.querySelectorAll<HTMLDetailsElement>('.v3-account-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector<HTMLElement>('summary')?.focus();});
 const target=event.target;
 if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&target instanceof HTMLTextAreaElement&&target.closest('#message-form')){
  event.preventDefault();const form=target.closest<HTMLFormElement>('#message-form');
  if(form && target.value.trim() && !form.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled)form.requestSubmit();
 }
});
