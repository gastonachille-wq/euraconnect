import { escapeHtml as e, initials, label, markdown, uniqueTags, normalizeTag } from "./domain.js";
import type { Tag, Media } from "./domain.js";
import { icon } from "./icons.js";
import { loadMedia, rpc } from "./api.js";
export const badge = (status: string): string => `<span class="badge badge-${e(status)}"><span class="status-dot"></span>${e(label(status))}</span>`;
export const tags = (items: Tag[], max = 20): string => items.length ? `<div class="tags">${items.slice(0, max).map(t => `<span class="tag">${e(t.label)}</span>`).join("")}${items.length > max ? `<span class="tag">+${items.length - max}</span>` : ""}</div>` : "";
export function avatar(name: string, media: Media | null | undefined, company = false): string { return `<span class="avatar ${company ? "company-logo" : ""}">${media ? `<img data-bucket="${e(media.bucket)}" data-path="${e(media.path)}" alt="${e(name)}" loading="lazy">` : `<span>${e(initials(name)) || icon(company ? "company" : "user")}</span>`}</span>`; }
export function empty(title: string, description: string, action = "", symbol = "search"): string { return `<div class="empty"><div class="empty-icon">${icon(symbol, 28)}</div><h3>${e(title)}</h3><p>${e(description)}</p>${action}</div>`; }
export function button(text: string, action: string, options: {
    id?: string;
    icon?: string;
    class?: string;
    extra?: string;
    disabled?: boolean;
} = {}): string { return `<button type="button" class="btn ${options.class || ""}" data-action="${e(action)}" ${options.id ? `data-id="${e(options.id)}"` : ""} ${options.extra || ""} ${options.disabled ? "disabled" : ""}>${options.icon ? icon(options.icon, 17) : ""}${e(text)}</button>`; }
export function iconButton(symbol: string, title: string, action: string, id = "", extra = ""): string { return `<button type="button" class="icon-button" title="${e(title)}" aria-label="${e(title)}" data-action="${e(action)}" data-id="${e(id)}" ${extra}>${icon(symbol)}</button>`; }
export function favorite(id: string, type: string, on: boolean, pin = false): string { return `<button type="button" class="favorite ${on ? "on" : ""}" data-action="favorite" data-id="${e(id)}" data-type="${e(type)}" data-value="${!on}" aria-pressed="${on}" title="${on ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-label="${on ? "Retirer des favoris" : "Ajouter aux favoris"}">${icon(pin ? "pin" : "heart", 19)}</button>`; }
export function field(name: string, text: string, value: unknown = "", options: {
    type?: string;
    required?: boolean;
    placeholder?: string;
    help?: string;
    min?: number;
    max?: number;
    wide?: boolean;
    rows?: number;
} = {}): string {
    const type = options.type || "text";
    const id = "f-" + name;
    return `<div class="field ${options.wide ? "span-2" : ""}"><label for="${id}">${e(text)}${options.required ? "<span class=\"required\">*</span>" : ""}</label>${type === "textarea" ? `<textarea id="${id}" name="${e(name)}" rows="${options.rows || 3}" ${options.required ? "required" : ""} maxlength="${options.max || 6000}" placeholder="${e(options.placeholder || "")}">${e(value)}</textarea>` : `<input id="${id}" name="${e(name)}" type="${e(type)}" value="${e(value)}" ${options.required ? "required" : ""} ${options.min !== undefined ? `min="${options.min}"` : ""} ${options.max !== undefined ? `max="${options.max}"` : ""} ${type === "number" ? "step=\"any\"" : ""} placeholder="${e(options.placeholder || "")}">`}${options.help ? `<small>${e(options.help)}</small>` : ""}</div>`;
}
export function selectField(name: string, text: string, options: {
    value: string;
    label: string;
}[], selected = "", wide = false): string { return `<div class="field ${wide ? "span-2" : ""}"><label for="f-${e(name)}">${e(text)}</label><select id="f-${e(name)}" name="${e(name)}">${options.map(o => `<option value="${e(o.value)}" ${o.value === selected ? "selected" : ""}>${e(o.label)}</option>`).join("")}</select></div>`; }
export function checkField(name: string, text: string, on = false): string { return `<label class="checkline"><input type="checkbox" name="${e(name)}" ${on ? "checked" : ""}> <span>${e(text)}</span></label>`; }
export function tagField(items: Tag[] = []): string { return `<div class="field span-2 tag-field"><label for="tag-input">Comp\u00E9tences et mots-cl\u00E9s</label><div class="tag-editor" data-tags='${e(JSON.stringify(items.map(t => t.label)))}'><div class="selected-tags"></div><input id="tag-input" autocomplete="off" placeholder="Saisissez un terme, puis choisissez ou ajoutez..." aria-label="Rechercher ou cr\u00E9er un tag" role="combobox" aria-autocomplete="list" aria-expanded="false"><div class="tag-suggestions" role="listbox" hidden></div></div><small>Suggestions du r\u00E9f\u00E9rentiel partag\u00E9. Vos termes sont autoris\u00E9s ; casse et accents ne cr\u00E9ent pas de doublons.</small></div>`; }
export function richField(name: string, text: string, value = "", required = true): string { return `<div class="field span-2"><label id="l-${name}">${e(text)} ${required ? "<span class=\"required\">*</span>" : ""}</label><div class="rich-editor"><div class="rich-toolbar" role="toolbar" aria-label="Mise en forme">${["bold", "italic", "list"].map(cmd => `<button type="button" data-edit="${cmd}" title="${cmd === "bold" ? "Gras" : cmd === "italic" ? "Italique" : "Liste"}" aria-label="${cmd === "bold" ? "Gras" : cmd === "italic" ? "Italique" : "Liste"}">${icon(cmd, 16)}</button>`).join("")}<span>Contexte, enjeux et attentes</span></div><div class="rich-input" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="l-${name}" data-name="${name}">${markdown(value)}</div></div><small>Ne saisissez ni nom de startup ni coordonn\u00E9es dans le texte partag\u00E9. Les contacts disposent de champs priv\u00E9s distincts.</small></div>`; }
export function pagination(total: number, page: number, size = 24): string {
    const pages = Math.ceil(total / size);
    if (pages <= 1)
        return "";
    return `<nav class="pagination" aria-label="Pagination">${button("Pr\u00E9c\u00E9dent", "page", { disabled: page <= 0, extra: `data-page="${page - 1}"` })}<span>${page + 1} / ${pages} &middot; ${total} r\u00E9sultats</span>${button("Suivant", "page", { disabled: page + 1 >= pages, extra: `data-page="${page + 1}"` })}</nav>`;
}
export function toast(text: string, bad = false): void {
    const root = document.querySelector("#toasts");
    if (!root)
        return;
    const node = document.createElement("div");
    node.className = "toast " + (bad ? "error" : "");
    node.innerHTML = icon(bad ? "warning" : "check", 18) + `<span>${e(text)}</span>`;
    root.append(node);
    setTimeout(() => node.remove(), bad ? 9000 : 5000);
}
let beforeModal: HTMLElement | null = null;
let closeCb: (() => void) | null = null;
export function modal(title: string, body: string, options: {
    wide?: boolean;
    subtitle?: string;
    onClose?: () => void;
} = {}): void {
    if (!modalOpen()) beforeModal = document.activeElement as HTMLElement;
    closeCb = options.onClose || null;
    const root = document.querySelector<HTMLElement>("#overlay")!;
    root.innerHTML = `<div class="modal-backdrop"><section class="modal ${options.wide ? "wide" : ""}" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="modal-title"><header class="modal-head"><div><p class="eyebrow">EURACONNECT</p><h2 id="modal-title">${e(title)}</h2>${options.subtitle ? `<p>${e(options.subtitle)}</p>` : ""}</div>${iconButton("close", "Fermer", "close-modal")}</header><div class="modal-body">${body}</div></section></div>`;
    document.body.classList.add("has-modal");
    const first = root.querySelector<HTMLElement>(".modal-body input:not([type=hidden]),.modal-body select,.modal-body textarea,.modal-body [contenteditable=true]") || root.querySelector<HTMLElement>(".modal");
    first?.focus();
    setupTags(root);
    setupEditors(root);
    void hydrateImages(root);
}
export function closeModal(): void { if (!modalOpen()) return; document.querySelector("#overlay")!.innerHTML = ""; document.body.classList.remove("has-modal"); closeCb?.(); closeCb = null; if(beforeModal?.isConnected) beforeModal.focus({preventScroll:true}); else document.getElementById("main")?.focus({preventScroll:true}); }
export function modalOpen(): boolean { return Boolean(document.querySelector("#overlay .modal")); }
document.addEventListener("keydown", ev => {
    if (!modalOpen())
        return;
    if (ev.key === "Escape") {
        closeModal();
        return;
    }
    if (ev.key === "Tab") {
        const list = Array.from(document.querySelectorAll<HTMLElement>("#overlay button:not([disabled]),#overlay input:not([disabled]),#overlay select,#overlay textarea,#overlay [contenteditable=true],#overlay a[href]")).filter(x => x.offsetParent !== null);
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
export async function hydrateImages(root: ParentNode): Promise<void> {
    await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>("img[data-path]")).map(async (img) => {
        try {
            img.src = await loadMedia(img.dataset.bucket || "", img.dataset.path || "");
        }
        catch {
            img.replaceWith(Object.assign(document.createElement("span"), { textContent: initials(img.alt) }));
        }
    }));
}
export function formValues(form: HTMLFormElement): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    new FormData(form).forEach((v, k) => {
        if (typeof v === "string")
            values[k] = v;
    });
    form.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach(x => values[x.name] = x.checked);
    const te = form.querySelector<HTMLElement>(".tag-editor");
    if (te) {
        const existing = JSON.parse(te.dataset.tags || "[]") as string[];
        const pending = te.querySelector<HTMLInputElement>("input")?.value.trim() || "";
        if (pending && (pending.length < 2 || pending.length > 60))
            throw new Error("Un tag doit contenir entre 2 et 60 caract\u00E8res.");
        if (existing.length >= 20 && pending && !existing.some(t => normalizeTag(t) === normalizeTag(pending)))
            throw new Error("20 tags maximum.");
        values.tags = uniqueTags([...existing, ...(pending ? [pending] : [])]);
    }
    form.querySelectorAll<HTMLElement>(".rich-input").forEach(x => values[x.dataset.name || "context"] = richToText(x));
    return values;
}
function richToText(el: HTMLElement): string { const clone = el.cloneNode(true) as HTMLElement; clone.querySelectorAll("strong,b").forEach(x => x.replaceWith(document.createTextNode("**" + x.textContent + "**"))); clone.querySelectorAll("em,i").forEach(x => x.replaceWith(document.createTextNode("*" + x.textContent + "*"))); clone.querySelectorAll("li").forEach(x => x.prepend(document.createTextNode("- "))); clone.querySelectorAll("p,div,li,h4,br").forEach(x => x.append(document.createTextNode("\n"))); return (clone.textContent || "").replace(/\n{3,}/g, "\n\n").trim(); }
function setupEditors(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>(".rich-editor").forEach(box => {
        const input = box.querySelector<HTMLElement>(".rich-input")!;
        let saved: Range | null = null;
        const save = () => {
            const sel = getSelection();
            if (sel?.rangeCount && input.contains(sel.anchorNode))
                saved = sel.getRangeAt(0).cloneRange();
        };
        input.addEventListener("keyup", save);
        input.addEventListener("mouseup", save);
        box.querySelectorAll<HTMLButtonElement>("button[data-edit]").forEach(btn => {
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
function setupTags(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>(".tag-editor").forEach(box => {
        const input = box.querySelector<HTMLInputElement>("input")!;
        const suggestions = box.querySelector<HTMLElement>(".tag-suggestions")!;
        const chosen = box.querySelector<HTMLElement>(".selected-tags")!;
        let terms = uniqueTags(JSON.parse(box.dataset.tags || "[]") as string[]);
        let request = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let candidates: string[] = [];
        const draw = () => { box.dataset.tags = JSON.stringify(terms); chosen.innerHTML = terms.map((t, i) => `<span class="tag chosen">${e(t)}<button type="button" data-remove="${i}" aria-label="Retirer ${e(t)}">${icon("close", 12)}</button></span>`).join(""); };
        const add = (text: string) => {
            const value = text.trim();
            if (value.length < 2 || value.length > 60) {
                toast("Un tag doit contenir entre 2 et 60 caract\u00E8res.", true);
                return;
            }
            terms = uniqueTags([...terms, value]);
            draw();
            input.value = "";
            suggestions.hidden = true;
            input.setAttribute("aria-expanded", "false");
            input.focus();
        };
        chosen.addEventListener("click", ev => {
            const b = (ev.target as HTMLElement).closest<HTMLButtonElement>("[data-remove]");
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
                    let rows: Tag[] = [];
                    try {
                        rows = await rpc<Tag[]>("tags", { q });
                    }
                    catch { /* Creation remains possible; errors will be shown on save. */ }
                    if (id !== request || !input.isConnected)
                        return;
                    candidates = rows.map(x => x.label).filter(t => !terms.some(x => normalizeTag(x) === normalizeTag(t)));
                    if (!rows.some(t => normalizeTag(t.label) === normalizeTag(q)))
                        candidates.push(q);
                    suggestions.innerHTML = candidates.map((t, i) => `<button type="button" role="option" data-tag-index="${i}">${icon(rows.some(x => x.label === t) ? "tag" : "plus", 15)}${e(t)}<small>${rows.some(x => x.label === t) ? "Existant" : "Ajouter ce terme"}</small></button>`).join("");
                    suggestions.hidden = false;
                    input.setAttribute("aria-expanded", "true");
                })();
            }, 200);
        });
        input.addEventListener("keydown", ev => {
            if (ev.key === "Enter" || ev.key === ",") {
                ev.preventDefault();
                if (input.value.trim())
                    add(candidates.find(t => normalizeTag(t) === normalizeTag(input.value)) || input.value);
            }
            if (ev.key === "Escape") {
                suggestions.hidden = true;
                input.setAttribute("aria-expanded", "false");
            }
            if (ev.key === "ArrowDown") {
                ev.preventDefault();
                suggestions.querySelector<HTMLButtonElement>("button")?.focus();
            }
        });
        suggestions.addEventListener("click", ev => {
            const b = (ev.target as HTMLElement).closest<HTMLButtonElement>("[data-tag-index]");
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
                const btns = Array.from(suggestions.querySelectorAll<HTMLButtonElement>("button"));
                const pos = btns.indexOf(document.activeElement as HTMLButtonElement);
                btns[(pos + (ev.key === "ArrowDown" ? 1 : btns.length - 1)) % btns.length]?.focus();
            }
        });
        draw();
    });
}
export function footerSubmit(text: string): string { return `<div class="form-error" role="alert" hidden></div><footer class="form-footer">${button("Annuler", "close-modal", { class: "ghost" })}<button type="submit" class="btn primary">${icon("check", 17)}${e(text)}</button></footer>`; }
