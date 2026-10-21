export type Role = "admin" | "incube" | "prestataire" | "startup_manager";
export type CompanyType = "startup" | "prestataire" | "autre";
export interface Tag {
    id?: string;
    label: string;
}
export interface Media {
    bucket: string;
    path: string;
}
export interface Membership {
    id: string;
    name: string;
    type: CompanyType;
    status: string;
    member_role: string;
    premium: boolean;
    expires_at: string | null;
    provider_status: string | null;
}
export interface Boot {
    version: string;
    active: boolean;
    user: {
        id: string;
        name: string | null;
        role: Role;
        company_id: string | null;
        email: string;
    };
    memberships: Membership[];
    unread_notifications: number;
    unread_messages: number;
    profile: PersonProfile;
}
export interface PersonProfile {
    profile_id?: string;
    nom_public?: string;
    titre?: string;
    bio_html?: string;
    linkedin_url?: string;
    visible?: boolean;
    tags?: Tag[];
    media?: Media | null;
}
export interface Contact {
    name: string;
    email: string;
    phone: string;
    shared: boolean;
}
export interface Need {
    id: string;
    company_id: string | null;
    company_name: string;
    author_name: string;
    identity_visible: boolean;
    owned: boolean;
    can_edit: boolean;
    title: string;
    context: string;
    objectives: string;
    deliverables: string;
    constraints: string;
    budget_min: number | null;
    budget_max: number | null;
    deadline: string | null;
    format: string;
    status: string;
    created_at: string;
    updated_at: string;
    tags: Tag[];
    favorite: boolean;
    responses_count: number | null;
    my_response: string | null;
    match_count: number;
    contact: Contact | null;
}
export interface ResponseItem {
    id: string;
    need_id: string;
    company_id: string;
    provider: string;
    author: string;
    author_id?: string;
    need_title: string;
    startup: string;
    startup_id: string;
    message: string;
    approach: string;
    price: number | null;
    lead_days: number | null;
    status: string;
    reason: string;
    created_at: string;
    can_decide: boolean;
    can_message: boolean;
    unread: number;
}
export interface Message {
    id: string;
    body: string;
    author: string;
    self: boolean;
    created_at: string;
}
export interface ThreadDetail {
    thread: ResponseItem;
    items: Message[];
    total: number;
    read_until: string;
}
export interface NeedDetail {
    need: Need;
    responses: ResponseItem[];
    history: {
        action: string;
        date: string;
        detail: Record<string, unknown>;
    }[];
}
export interface DirectoryItem {
    id: string;
    kind: "company" | "person";
    type: string;
    name: string;
    subtitle: string;
    description: string;
    city: string;
    company_id?: string;
    company_name?: string;
    identity_visible: boolean;
    tags: Tag[];
    premium: boolean;
    labels?: string[];
    linkedin_url?: string;
    can_edit: boolean;
    status?: string;
    next_slot: string | null;
    favorite: boolean;
    media: Media | null;
}
export interface CompanyDetail {
    media?: Media | null;
    type?: string;
    premium?: boolean;
    labels?: string[];
    id: string;
    name: string;
    can_edit: boolean;
    details: {
        sector?: string;
        city?: string;
        description?: string;
        phone?: string;
        contact_email?: string;
        share_contact?: boolean;
    } | null;
    members: {
        id: string;
        name: string;
        role: string;
        contact_role?: string;
        title?: string;
        linkedin_url?: string;
        media?: Media | null;
        active: boolean;
        email: string;
    }[];
    tags: Tag[];
}
export interface SessionItem {
    id: string;
    kind: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string;
    timezone: string;
    mode: string;
    status: string;
    capacity: number;
    host_id: string;
    host_name: string;
    company_id: string | null;
    company_name: string | null;
    location: string;
    occupied: number;
    registration: string | null;
    registration_id: string | null;
    purpose: string | null;
    mine: boolean;
    can_manage: boolean;
    need_id: string | null;
    response_id: string | null;
    can_reply?: boolean;
    tags?: Tag[];
    participants: {
        id: string;
        user_id: string;
        name: string;
        company: string | null;
        status: string;
        purpose: string;
    }[];
}
export interface Offer {
    id: string;
    company_id: string;
    title: string;
    description: string;
    format: string;
    price: number | null;
    provider: string;
    can_edit: boolean;
    tags: Tag[];
    benefit: string | null;
    favorite: boolean;
    media?: Media | null;
}
export interface Notification {
    id: string;
    title: string;
    target_type: string;
    target_id: string | null;
    read_at: string | null;
    created_at: string;
}
export interface List<T> {
    items: T[];
    total: number;
}
export interface Dashboard {
    kpis: {
        needs: number;
        responses: number;
        waiting: number;
        no_response: number;
        sessions: number;
        portfolio: number;
        users: number;
        pending_providers: number;
    };
    recent_needs: Need[];
    next_sessions: SessionItem[];
}
export interface Startup {
    id: string;
    name: string;
    needs: number;
    no_response: number;
    contacts: number;
    sessions: number;
    tasks: number;
}
export interface Portfolio {
    startups: Startup[];
    notes: {
        id: string;
        body: string;
        due_at: string | null;
        done: boolean;
        author: string;
        created_at: string;
    }[];
    needs: Need[];
    contacts: ResponseItem[];
    sessions: SessionItem[];
}
export interface AdminData {
    users: {
        id: string;
        name: string | null;
        role: Role;
        status: string;
        email: string;
        confirmed: boolean;
        created_at: string;
    }[];
    companies: {
        id: string;
        name: string;
        type: CompanyType;
        status: string;
        provider_status: string | null;
        premium: boolean;
        expires_at: string | null;
        labels?: string[];
    }[];
    assignments: {
        manager_id: string;
        entreprise_id: string;
    }[];
    history: {
        action: string;
        date: string;
        actor: string;
        detail: Record<string, unknown>;
    }[];
    import_report: {
        item: string;
        total: number;
        imported: number;
        note: string;
    }[];
}
export const roleLabels: Record<Role, string> = { incube: "Incub\u00E9", prestataire: "Prestataire", startup_manager: "Startup Manager", admin: "Administrateur" };
export const statusLabels: Record<string, string> = { brouillon: "Brouillon", ouvert: "Ouvert aux propositions", en_echanges: "En discussion", rdv_planifie: "Rendez-vous planifi\u00E9", devis_recu: "Devis re\u00E7u", en_realisation: "Mission en cours", termine: "R\u00E9solu", en_pause: "En pause", sans_suite: "Sans suite", envoyee: "Nouvelle proposition", en_discussion: "Discussion ouverte", retenue: "Proposition retenue", declinee: "Non retenue", retiree: "Retir\u00E9e", creneau: "Disponibilit\u00E9", permanence: "Permanence", atelier: "Atelier", proposition: "Cr\u00E9neau propos\u00E9", confirme: "Confirm\u00E9", attente: "Liste d'attente", annule: "Annul\u00E9", present: "Pr\u00E9sent", absent: "Absent", realise: "R\u00E9alis\u00E9", publiee: "Publi\u00E9e", masquee: "Masqu\u00E9e", valide: "Valid\u00E9", en_validation: "En validation", suspendu: "Suspendu", actif: "Actif" };
export const needStatuses = ["ouvert", "en_echanges", "rdv_planifie", "devis_recu", "en_realisation", "termine", "en_pause", "sans_suite"] as const;
export const labels: Record<string, string> = { startup: "Startup incub\u00E9e", prestataire: "Prestataire", autre: "Partenaire", company: "Soci\u00E9t\u00E9", person: "Contact", incube: "Incub\u00E9", startup_manager: "Startup Manager", admin: "Administrateur", distance: "\u00C0 distance", site: "Sur site", mixte: "Hybride", visio: "Visioconf\u00E9rence", telephone: "T\u00E9l\u00E9phone", sur_site: "Pr\u00E9sentiel", proprietaire: "Propri\u00E9taire", gestionnaire: "Gestionnaire", collaborateur: "Collaborateur" };
export const label = (v: string): string => statusLabels[v] || labels[v] || v;
export function escapeHtml(value: unknown): string { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c] || c)); }
export function normalizeTag(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
export function uniqueTags(terms: string[]): string[] {
    const seen = new Set<string>();
    return terms.map(t => t.trim().replace(/\s+/g, " ")).filter(t => {
        const key = normalizeTag(t);
        if (key.length < 2 || t.length > 60 || seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(0, 20);
}
export function money(cents: number | null | undefined): string { return cents == null ? "Budget \u00E0 d\u00E9finir" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100); }
export function cents(value: string): number | null {
    if (!value.trim())
        return null;
    const n = Number(value.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || !Number.isSafeInteger(Math.round(n * 100)))
        throw new Error("Montant invalide.");
    return Math.round(n * 100);
}
export function dateText(value: string | null | undefined, withTime = false): string {
    if (!value)
        return "Non renseign\u00E9";
    const d = new Date(value);
    if (Number.isNaN(d.valueOf()))
        return "Date invalide";
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Europe/Paris" }).format(d);
}
export function timeText(value: string): string { return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(value)); }
export function dayLabel(value: string): string { return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(value)); }
export function localDate(value = new Date()): string { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
export function initials(value: string): string { return value.split(/\s+/).filter(Boolean).slice(0, 2).map(v => v[0] || "").join("").toUpperCase(); }
export function isClosed(status: string): boolean { return ["termine", "sans_suite", "declinee", "retiree", "annule"].includes(status); }
export function canRespond(role: Role, company: Membership | undefined, need: Need): boolean { return role === "prestataire" && company?.type === "prestataire" && company.provider_status === "valide" && company.member_role !== "collaborateur" && ["ouvert", "en_echanges", "rdv_planifie", "devis_recu"].includes(need.status) && (!need.deadline || new Date(need.deadline) > new Date()) && !need.my_response; }
export function errorMessage(error: unknown): string {
    const x = (error && typeof error === "object") ? error as {
        message?: unknown;
        error_description?: unknown;
        error?: unknown;
        code?: unknown;
    } : {};
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
        return "Fonction Supabase indisponible. Vérifiez que les migrations requises sont installées sur le bon projet et actualisez le cache de schéma.";
    if (x.code === "42702" || x.code === "42P01")
        return "La base doit \u00EAtre mise \u00E0 jour. Transmettez le code " + x.code + " \u00E0 votre administrateur.";
    return raw && raw !== "[object Object]" ? raw : "Op\u00E9ration non aboutie. Actualisez la page et r\u00E9essayez.";
}
export function markdown(text: string): string {
    return escapeHtml(text).split(/\n/).map(line => {
        let s = line.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
        if (s.startsWith("### "))
            return "<h4>" + s.slice(4) + "</h4>";
        if (/^[-*] /.test(s))
            return "<p class=\"list-line\">&#8226; " + s.slice(2) + "</p>";
        return "<p>" + (s || "<br>") + "</p>";
    }).join("");
}
function icsEscape(value: string): string { return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r/g, ""); }
function foldLine(line: string): string {
    const chunks: string[] = [];
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
export function calendarIcs(session: SessionItem): string {
    const stamp = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EURACONNECT//Agenda//FR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:" + session.id + "@euraconnect", "DTSTAMP:" + stamp(new Date().toISOString()), "DTSTART:" + stamp(session.starts_at), "DTEND:" + stamp(session.ends_at),
        "SUMMARY:" + icsEscape(session.title), "DESCRIPTION:" + icsEscape(session.host_name + "\n" + session.description + "\n" + (session.purpose || "")),
        "LOCATION:" + icsEscape(session.location || label(session.mode)), "STATUS:" + (session.status === "annule" ? "CANCELLED" : "CONFIRMED"), "END:VEVENT", "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
}
