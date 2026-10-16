import type { Role } from "./domain.js";

export type Universe = "home" | "opportunities" | "conversations" | "agenda" | "network" | "expertise" | "workshops" | "coaching" | "account";
export interface NavEntry { id: string; name: string; symbol: string; universe: Universe; category: string; }

/** Navigation is role-aware, never folded into groups. Permissions remain server-side. */
export function navigationFor(role: Role): NavEntry[] {
    const items: NavEntry[] = [{ id: "dashboard", name: "Accueil", symbol: "dashboard", universe: "home", category: "Pilotage" }];
    if (role === "startup_manager")
        items.push({ id: "portfolio", name: "Mes startups", symbol: "portfolio", universe: "coaching", category: "Accompagnement" });
    else
        items.push({ id: "needs", name: role === "incube" ? "Mes demandes" : role === "prestataire" ? "Opportunit\u00e9s" : "Demandes", symbol: "needs", universe: "opportunities", category: "Projets" });
    items.push(
        { id: "messages", name: "Messages", symbol: "messages", universe: "conversations", category: "Relations" },
        { id: "agenda", name: "Agenda", symbol: "calendar", universe: "agenda", category: "Rencontres" },
        { id: "directory", name: "Annuaire", symbol: "people", universe: "network", category: "R\u00e9seau" },
        { id: "offers", name: "Services", symbol: "spark", universe: "expertise", category: "Expertises" },
        { id: "workshops", name: "Ateliers", symbol: "workshop", universe: "workshops", category: "Collectif" }
    );
    if (role === "admin") items.push({ id: "admin", name: "Administration", symbol: "shield", universe: "coaching", category: "Gestion" });
    items.push({ id: "company", name: "Entreprise & profil", symbol: "company", universe: "account", category: "Compte" });
    return items;
}
export function activeNavigation(route: string, role: Role): string {
    if (route === "proposal" || route === "needs") return role === "startup_manager" ? "portfolio" : "needs";
    return route;
}
export function universeFor(route: string, role: Role): Universe {
    return navigationFor(role).find(item => item.id === activeNavigation(route,role))?.universe || "home";
}
export function navigationTitle(route: string, role: Role): string {
    return navigationFor(role).find(item => item.id === activeNavigation(route,role))?.name || "EURACONNECT";
}
export function mobileNavigation(role: Role): NavEntry[] {
    const all = navigationFor(role);
    const ids = ["dashboard", role === "startup_manager" ? "portfolio" : "needs", "messages", "agenda"];
    return ids.map(id=>all.find(item=>item.id===id)).filter((item): item is NavEntry=>Boolean(item));
}
