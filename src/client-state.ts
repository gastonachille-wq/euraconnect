/** Browser preferences are optional: privacy mode or malformed values must not break navigation. */
export function stored(key: string, area: "local" | "session" = "local"): string | null {
    try { return (area === "local" ? localStorage : sessionStorage).getItem(key); } catch { return null; }
}
export function store(key: string, value: string | null, area: "local" | "session" = "local"): boolean {
    try {
        const target = area === "local" ? localStorage : sessionStorage;
        if (value === null) target.removeItem(key); else target.setItem(key,value);
        return true;
    } catch { return false; }
}
export function stringList(key: string): string[] {
    try {
        const values: unknown = JSON.parse(stored(key) || "[]");
        return Array.isArray(values) ? values.filter((x): x is string => typeof x === "string") : [];
    } catch { return []; }
}
/** Preserve the conversation id and display settings when filters change. */
export function filteredHash(hash: string, changes: Record<string,string|null>): string {
    const [path, query] = hash.replace(/^#/,"").split("?");
    const params = new URLSearchParams(query || "");
    for (const [key,value] of Object.entries(changes)) {
        if (value === null || value === "" || value === "false") params.delete(key); else params.set(key,value);
    }
    if (!Object.hasOwn(changes,"page")) params.delete("page");
    return "#"+(path || "dashboard")+(params.size?"?"+params.toString():"");
}
export function clearFilterHash(hash: string): string {
    const [path,query]=hash.replace(/^#/,"").split("?");
    const params=new URLSearchParams(query||"");
    const retained=new URLSearchParams();
    for(const key of ["kind","view","sort","scope","tab","target_company","host_id"]){const value=params.get(key);if(value)retained.set(key,value);}
    return "#"+(path||"dashboard")+(retained.size?"?"+retained.toString():"");
}
