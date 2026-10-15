import type { Boot, Role, Need, ResponseItem, SessionItem, DirectoryItem, Offer, AdminData, CompanyDetail, Portfolio, Dashboard, Notification } from "./domain.js";
export const ids = { startup: "00000000-0000-4000-8000-000000000001", provider: "00000000-0000-4000-8000-000000000002", other: "00000000-0000-4000-8000-000000000003", incube: "00000000-0000-4000-8000-000000000004", expert: "00000000-0000-4000-8000-000000000005", manager: "00000000-0000-4000-8000-000000000006", admin: "00000000-0000-4000-8000-000000000007" };
const uid = (n: number): string => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const now = new Date();
const past = (d: number) => new Date(now.valueOf() - d * 86400000).toISOString();
const future = (d: number, h = 10) => { const date = new Date(now.valueOf() + d * 86400000); date.setUTCHours(h, 0, 0, 0); return date.toISOString(); };
const roleNames: Record<Role, string> = { incube: "Camille Laurent", prestataire: "Alex Martin", startup_manager: "Lea Bernard", admin: "Administration Eurasante" };
const userId = (role: Role) => role === "incube" ? ids.incube : role === "prestataire" ? ids.expert : role === "startup_manager" ? ids.manager : ids.admin;
const tag = (label: string) => ({ label });
export function demoBoot(role: Role): Boot { return { version: "1.0.0", active: true, user: { id: userId(role), name: roleNames[role], role, company_id: role === "incube" ? ids.startup : role === "prestataire" ? ids.provider : null, email: "d\u00E9monstration@example.invalid" }, memberships: role === "incube" ? [{ id: ids.startup, name: "Nova Care Studio", type: "startup", status: "publiee", member_role: "proprietaire", premium: false, expires_at: null, provider_status: null }] : role === "prestataire" ? [{ id: ids.provider, name: "Clarte Conseil", type: "prestataire", status: "publiee", member_role: "proprietaire", premium: false, expires_at: null, provider_status: "valide" }] : [], unread_notifications: 3, unread_messages: 2, profile: { nom_public: roleNames[role], titre: role === "incube" ? "Cofondatrice - Innovation en sant\u00E9" : role === "prestataire" ? "Conseil strategique & r\u00E9glementaire" : "Accompagnement des startups", bio_html: "Profil fictif pour la d\u00E9monstration de la plateforme.", visible: true, tags: [tag("Innovation en sant\u00E9"), tag("Strat\u00E9gie")], media: null } }; }
function needs(role: Role): Need[] {
    return [
        { title: "Structurer notre strat\u00E9gie r\u00E9glementaire", context: "Nous d\u00E9veloppons un dispositif de suivi a domicile et souhaitons s\u00E9curiser les \u00E9tapes avant la validation du prototype. Nous recherchons un accompagnement pragmatique pour transformer les exigences applicables en une feuille de route op\u00E9rationnelle.", objectives: "Identifier les exigences et prioriser les actions avant le pilote.", deliverables: "Cartographie des exigences, analyse des \u00E9carts et feuille de route sur six mois.", constraints: "Une \u00E9quipe de quatre personnes, un prototype fonctionnel et une premi\u00E8re exp\u00E9rimentation pr\u00E9vue au prochain trimestre.", status: "en_echanges", tags: [tag("Dispositifs m\u00E9dicaux"), tag("Strat\u00E9gie r\u00E9glementaire"), tag("Qualit\u00E9")], budget_min: 300000, budget_max: 650000, responses_count: 3, match_count: 2 },
        { title: "Concevoir une exp\u00E9rience patient plus intuitive", context: "Notre interface de suivi doit devenir plus accessible. Nous recherchons une expertise UX pour identifier les points de friction puis tester un nouveau parcours avec des utilisateurs volontaires.", objectives: "Simplifier les trois \u00E9crans essentiels du parcours.", deliverables: "Audit UX, maquettes et protocole de test.", constraints: "Mission courte avec deux ateliers de co-conception.", status: "ouvert", tags: [tag("Design UX"), tag("Recherche utilisateur"), tag("Sant\u00E9 num\u00E9rique")], budget_min: 200000, budget_max: 400000, responses_count: 0, match_count: 1 },
        { title: "Pr\u00E9parer notre prochain tour de financement", context: "Nous souhaitons structurer un dossier investisseur coh\u00E9rent avec notre feuille de route et nos premiers retours utilisateurs. Le besoin porte sur le mod\u00E8le financier, le positionnement et la pr\u00E9paration des rendez-vous.", objectives: "Disposer d'un dossier clair et d'hypoth\u00E8ses financi\u00E8res document\u00E9es.", deliverables: "Pr\u00E9sentation investisseurs, mod\u00E8le financier et simulation de pitch.", constraints: "Travail en distanciel, six semaines de pr\u00E9paration.", status: "devis_recu", tags: [tag("Financement"), tag("Business plan")], budget_min: 150000, budget_max: 350000, responses_count: 2, match_count: 0 },
        { title: "Organiser un pilote terrain avec des partenaires", context: "Notre \u00E9quipe prepare une exp\u00E9rimentation et recherche un accompagnement dans le cadrage, le recrutement des participants et la mesure des retours, sans transfert de donn\u00E9es de sant\u00E9 dans EURACONNECT.", objectives: "Mettre en place une exp\u00E9rimentation r\u00E9aliste et mesurable.", deliverables: "Protocole de pilote et grille d'\u00E9valuation.", constraints: "Coordination avec trois structures partenaires.", status: "rdv_planifie", tags: [tag("Exp\u00E9rimentation"), tag("Gestion de projet")], budget_min: null, budget_max: null, responses_count: 1, match_count: 0 }
    ].map((n, i) => ({ ...n, id: uid(100 + i), company_id: role === "prestataire" ? null : ids.startup, company_name: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", author_name: role === "prestataire" ? "Contact startup" : "Camille Laurent", identity_visible: role !== "prestataire", owned: role === "incube" || role === "admin", can_edit: role === "incube" || role === "admin", format: "distance", deadline: future(14 + i * 3), created_at: past(8 - i), updated_at: past(i), favorite: i === 0, my_response: role === "prestataire" && i === 0 ? uid(200) : null, responses_count: role === "prestataire" ? null : n.responses_count, contact: role === "incube" || role === "admin" ? { name: "Camille Laurent", email: "demo@example.invalid", phone: "", shared: false } : null }));
}
function threads(role: Role): ResponseItem[] {
    return [{ id: uid(200), need_id: uid(100), company_id: ids.provider, provider: "Clarte Conseil", author: "Alex Martin", need_title: "Structurer notre strat\u00E9gie r\u00E9glementaire", startup: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", startup_id: role === "prestataire" ? "" : ids.startup, message: "Nous proposons un premier diagnostic pour construire une feuille de route claire et prioris\u00E9e. Notre approche combine un atelier de cadrage, une revue documentaire et une restitution op\u00E9rationnelle.", approach: "Trois temps : cadrage, diagnostic des \u00E9carts, recommandations et plan d'action.", price: 480000, lead_days: 20, status: "en_discussion", reason: "", created_at: past(2), can_decide: role === "incube" || role === "admin", can_message: role !== "startup_manager", unread: 2 },
        { id: uid(201), need_id: uid(102), company_id: uid(30), provider: "Trajectoire Finance", author: "Sophie Dumas", need_title: "Pr\u00E9parer notre prochain tour de financement", startup: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", startup_id: role === "prestataire" ? "" : ids.startup, message: "Notre accompagnement d\u00E9marre par la consolidation de vos hypoth\u00E8ses et se poursuit par la construction du dossier investisseur.", approach: "Mod\u00E8le financier, pr\u00E9sentation et pr\u00E9paration orale.", price: 290000, lead_days: 30, status: "envoyee", reason: "", created_at: past(1), can_decide: role === "incube" || role === "admin", can_message: role !== "startup_manager", unread: 0 }];
}
function sessions(role: Role): SessionItem[] {
    return [
        { id: uid(300), title: "Cadrage de la strat\u00E9gie r\u00E9glementaire", kind: "proposition", description: "Comprendre les enjeux du prototype, valider les livrables et partager les prochaines \u00E9tapes.", starts_at: future(1, 8), ends_at: future(1, 9), host_id: ids.expert, host_name: "Alex Martin", company_id: ids.provider, company_name: "Clarte Conseil", mode: "visio", location: "", capacity: 1, occupied: 1, need_id: uid(100), response_id: uid(200), registration: role === "incube" ? "confirme" : null, purpose: "Valider le p\u00E9rim\u00E8tre de notre accompagnement.", participants: [{ id: uid(500), user_id: ids.incube, name: role === "prestataire" ? "Contact startup" : "Camille Laurent", company: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", status: "confirme", purpose: "Valider le p\u00E9rim\u00E8tre de notre accompagnement." }] },
        { id: uid(301), title: "Permanence : questions r\u00E9glementaires", kind: "permanence", description: "Un premier \u00E9change de trente minutes pour identifier votre besoin et vous orienter.", starts_at: future(2, 12), ends_at: future(2, 12.5), host_id: ids.expert, host_name: "Alex Martin", company_id: ids.provider, company_name: "Clarte Conseil", mode: "visio", location: "", capacity: 1, occupied: 0, need_id: null, response_id: null, registration: null, purpose: null, participants: [] },
        { id: uid(302), title: "Un pitch clair pour ouvrir les bonnes portes", kind: "atelier", description: "Un atelier collectif pour formuler sa proposition de valeur, confronter ses arguments et repartir avec un plan de progression concret. Chaque participant travaille \u00E0 partir de son propre projet.", starts_at: future(3, 8), ends_at: future(3, 10), host_id: ids.manager, host_name: "Lea Bernard", company_id: null, company_name: "\u00C9quipe Eurasante", mode: "sur_site", location: "", capacity: 12, occupied: 8, need_id: null, response_id: null, registration: null, purpose: null, participants: [] },
        { id: uid(303), title: "Financement : pr\u00E9parer son premier dossier", kind: "atelier", description: "Comprendre les attentes d'un financeur et construire les elements essentiels de son dossier.", starts_at: future(5, 12), ends_at: future(5, 14), host_id: ids.expert, host_name: "Alex Martin", company_id: ids.provider, company_name: "Clarte Conseil", mode: "visio", location: "", capacity: 20, occupied: 13, need_id: null, response_id: null, registration: null, purpose: null, participants: [] }
    ].map(s => ({ ...s, ends_at: s.ends_at <= s.starts_at ? new Date(new Date(s.starts_at).valueOf() + 1800000).toISOString() : s.ends_at, status: "ouvert", timezone: "Europe/Paris", registration_id: s.registration ? uid(500) : null, mine: s.host_id === userId(role) || !!s.registration, can_manage: s.host_id === userId(role) || role === "admin" }));
}
function directory(role: Role): DirectoryItem[] {
    return [
        { id: ids.provider, kind: "company", type: "prestataire", name: "Clarte Conseil", subtitle: "Strat\u00E9gie, qualit\u00E9 & dispositifs m\u00E9dicaux", description: "Des experts pour transformer vos questions r\u00E9glementaires en un plan d'action accessible et prioris\u00E9.", city: "Lille", tags: [tag("Strat\u00E9gie r\u00E9glementaire"), tag("Qualit\u00E9")], premium: true, next_slot: future(2), favorite: true },
        { id: ids.startup, kind: "company", type: "startup", name: role === "prestataire" ? "Startup accompagn\u00E9e - A104" : "Nova Care Studio", subtitle: "Innovation & suivi a domicile", description: "Une \u00E9quipe engagee pour des parcours de suivi plus simples.", city: "Hauts-de-France", tags: [tag("Sant\u00E9 num\u00E9rique"), tag("Innovation")], premium: false, next_slot: null, favorite: false },
        { id: uid(30), kind: "company", type: "prestataire", name: "Trajectoire Finance", subtitle: "Strat\u00E9gie financi\u00E8re & lev\u00E9e de fonds", description: "Cadrage du mod\u00E8le \u00E9conomique, dossier investisseur et pr\u00E9paration des rendez-vous.", city: "Lille", tags: [tag("Financement"), tag("Business plan")], premium: false, next_slot: future(4), favorite: false },
        { id: ids.expert, kind: "person", type: "prestataire", name: "Alex Martin", subtitle: "Expert r\u00E9glementaire", description: "Du diagnostic aux premi\u00E8res actions de mise en conformit\u00E9.", city: "Lille", company_id: ids.provider, company_name: "Clarte Conseil", tags: [tag("Qualit\u00E9"), tag("Dispositifs m\u00E9dicaux")], premium: false, next_slot: future(2), favorite: true },
        { id: ids.manager, kind: "person", type: "startup_manager", name: "Lea Bernard", subtitle: "Accompagnement des startups", description: "Structuration du projet, orientation et mobilisation du r\u00E9seau.", city: "Lille", tags: [tag("Strat\u00E9gie"), tag("Accompagnement")], premium: false, next_slot: future(3), favorite: false },
        { id: uid(31), kind: "company", type: "autre", name: "Le Studio des Usages", subtitle: "Design & recherche utilisateur", description: "Rendre les services plus lisibles et les interfaces plus utiles.", city: "Lens", tags: [tag("Design UX"), tag("Recherche utilisateur")], premium: false, next_slot: null, favorite: false }
    ].map(d => ({ ...d, kind: d.kind as "company" | "person", identity_visible: !(role === "prestataire" && d.type === "startup"), can_edit: d.id === (role === "incube" ? ids.startup : role === "prestataire" ? ids.provider : ""), status: "publiee", media: null }));
}
function company(role: Role, id: string): CompanyDetail { return { id, name: id === ids.startup ? "Nova Care Studio" : "Clarte Conseil", can_edit: role === "admin" || (role === "incube" && id === ids.startup) || (role === "prestataire" && id === ids.provider), details: { sector: "Innovation en sant\u00E9", city: "Lille", description: "Une \u00E9quipe qui transforme des besoins complexes en actions utiles.", phone: "", contact_email: "", share_contact: false }, members: [{ id: role === "incube" ? ids.incube : ids.expert, name: role === "incube" ? "Camille Laurent" : "Alex Martin", role: "proprietaire", active: true, email: "demo@example.invalid" }], tags: [tag("Innovation"), tag("Sant\u00E9 num\u00E9rique")] }; }
function admin(): AdminData { return { users: (["incube", "prestataire", "startup_manager", "admin"] as Role[]).map(r => ({ id: userId(r), name: roleNames[r], role: r, status: "actif", email: r + "@example.invalid", confirmed: true, created_at: past(12) })), companies: [{ id: ids.startup, name: "Nova Care Studio", type: "startup", status: "publiee", provider_status: null, premium: false, expires_at: null }, { id: ids.provider, name: "Clarte Conseil", type: "prestataire", status: "publiee", provider_status: "valide", premium: true, expires_at: null }, { id: uid(30), name: "Trajectoire Finance", type: "prestataire", status: "brouillon", provider_status: "en_validation", premium: false, expires_at: null }], assignments: [{ manager_id: ids.manager, entreprise_id: ids.startup }], history: [{ action: "affectation_manager", date: past(1), actor: "Administration Eurasante", detail: {} }], import_report: [{ item: "Donn\u00E9es de d\u00E9monstration", total: 0, imported: 0, note: "Aucune donn\u00E9e de votre Supabase n est utilis\u00E9e dans cet aper\u00E7u." }] }; }
export function demoRpc(action: string, args: Record<string, unknown>, role: Role): unknown {
    const ns = needs(role), ss = sessions(role), rs = threads(role);
    const filter = <T extends {
        id: string;
    }>(arr: T[]): {
        items: T[];
        total: number;
    } => {
        let out = arr;
        if (args.favorites === true || args.favorites === "true")
            out = out.filter(i => (i as T & {
                favorite?: boolean;
            }).favorite);
        const q = String(args.q || "").toLowerCase();
        if (q)
            out = out.filter(i => JSON.stringify(i).toLowerCase().includes(q));
        return { items: out, total: out.length };
    };
    switch (action) {
        case "bootstrap": return demoBoot(role);
        case "dashboard": return { kpis: { needs: 4, responses: 6, waiting: 2, no_response: 1, sessions: 2, portfolio: 1, users: 4, pending_providers: 1 }, recent_needs: ns, next_sessions: ss.slice(0, 2) } satisfies Dashboard;
        case "needs": return filter(args.status ? ns.filter(n => n.status === args.status) : ns);
        case "need": {
            const need = ns.find(n => n.id === args.id) || ns[0]!;
            return { need, responses: role === "prestataire" ? rs.filter(r => r.need_id === need.id && r.company_id === ids.provider) : rs.filter(r => r.need_id === need.id), history: [] };
        }
        case "threads": return filter(role === "prestataire" ? rs.filter(r => r.company_id === ids.provider) : rs);
        case "messages": return { thread: rs.find(r => r.id === args.id) || rs[0], items: [{ id: uid(900), body: "Merci pour votre proposition. Nous souhaitons pr\u00E9ciser les livrables avant de convenir d'un premier rendez-vous.", author: role === "prestataire" ? "Contact startup" : "Camille Laurent", self: role === "incube", created_at: past(1) }, { id: uid(901), body: "Bien sur. Je vous propose un \u00E9change de cadrage pour identifier les priorit\u00E9s et vous transmettre une feuille de route adaptee.", author: "Alex Martin", self: role === "prestataire", created_at: past(0.5) }], total: 2, read_until: new Date().toISOString() };
        case "directory": {
            let out = directory(role);
            if (args.kind && args.kind !== "all")
                out = out.filter(d => d.kind === args.kind);
            if (args.type)
                out = out.filter(d => d.type === args.type);
            return filter(out);
        }
        case "company": return company(role, String(args.id || ids.startup));
        case "offers": return filter([{ id: uid(400), company_id: ids.provider, title: "Diagnostic r\u00E9glementaire & feuille de route", description: "Un diagnostic op\u00E9rationnel pour passer de vos questions \u00E0 un plan d'action concret. Atelier de cadrage, analyse des \u00E9carts et restitution.", format: "distance", price: 480000, provider: "Clarte Conseil", can_edit: role === "prestataire" || role === "admin", tags: [tag("Qualit\u00E9"), tag("Strat\u00E9gie r\u00E9glementaire")], benefit: role === "incube" ? "Un atelier de cadrage offert aux entreprises accompagn\u00E9es." : null, favorite: false, media: null }] satisfies Offer[]);
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
        case "portfolio": return { startups: [{ id: ids.startup, name: "Nova Care Studio", needs: 4, no_response: 1, contacts: 2, sessions: 1, tasks: 1 }], notes: args.id ? [{ id: uid(800), body: "Faire un point sur les premiers retours prestataires et prioriser le besoin UX.", due_at: future(2).slice(0, 10), done: false, author: "Lea Bernard", created_at: past(1) }] : [], needs: args.id ? ns : [], contacts: args.id ? rs : [], sessions: args.id ? ss.slice(0, 1) : [] } satisfies Portfolio;
        case "notifications": return { items: [{ id: uid(600), title: "Vous avez re\u00E7u une nouvelle proposition", target_type: "need", target_id: uid(100), read_at: null, created_at: past(0.2) }, { id: uid(601), title: "Un cr\u00E9neau vous a \u00E9t\u00E9 propose", target_type: "session", target_id: uid(300), read_at: null, created_at: past(0.3) }, { id: uid(602), title: "Un nouveau message dans votre dossier", target_type: "thread", target_id: uid(200), read_at: null, created_at: past(0.5) }] satisfies Notification[], total: 3 };
        case "admin": return admin();
        case "tags": return [tag("Innovation"), tag("Qualit\u00E9"), tag("Financement")];
        default: throw new Error("Action de d\u00E9monstration inconnue.");
    }
}
