from pathlib import Path
view=Path('src/views.ts').read_text()
view=view.replace('import { badge, tags, avatar, button, iconButton, empty, favorite, pagination } from "./ui.js";', 'import { badge, tags, avatar, button, iconButton, empty, favorite, pagination } from "./ui.js";\nimport { directoryViewV12 } from "./directory-v12.js";\nimport { sessionsViewV12, conversationProposals } from "./agenda-v12.js";')
start=view.index('export function directoryView(')
end=view.index('export function offersView(',start)
view=view[:start]+'''export function directoryView(ctx: Context, data: List<DirectoryItem>): string { return directoryViewV12(ctx,data); }
'''+view[end:]
start=view.index('export function sessionsView(')
end=view.index('export function portfolioView(',start)
view=view[:start]+'''export function sessionsView(ctx:Context,data:List<SessionItem>,workshops=false,proposals:SessionItem[]=[]):string { return sessionsViewV12(ctx,data,workshops,proposals); }
'''+view[end:]
view=view.replace('export function messagesView(ctx: Context, data: List<ResponseItem>, detail: ThreadDetail | null): string {','export function messagesView(ctx: Context, data: List<ResponseItem>, detail: ThreadDetail | null, proposals: SessionItem[] = []): string {')
needle='</span></div>\n <div class="message-flow message-history"'
assert needle in view, 'Missing message insertion point'
view=view.replace(needle,'</span></div>${conversationProposals(proposals,detail.thread.id)}\n <div class="message-flow message-history"')
view=view.replace('EURACONNECT &middot; 1.1','EURACONNECT &middot; 1.2')
Path('src/views.ts').write_text(view)

# Domain models
p=Path('src/domain.ts');s=p.read_text()
s=s.replace('    bio_html?: string;\n    visible?', '    bio_html?: string;\n    linkedin_url?: string;\n    visible?')
s=s.replace('    author: string;\n    need_title:', '    author: string;\n    author_id?: string;\n    need_title:')
s=s.replace('    premium: boolean;\n    can_edit: boolean;\n    status?: string;', '    premium: boolean;\n    labels?: string[];\n    linkedin_url?: string;\n    can_edit: boolean;\n    status?: string;')
s=s.replace('export interface CompanyDetail {\n    media?: Media | null;', 'export interface CompanyDetail {\n    media?: Media | null;\n    type?: string;\n    premium?: boolean;\n    labels?: string[];')
s=s.replace('        role: string;\n        active: boolean;\n        email: string;', '        role: string;\n        contact_role?: string;\n        title?: string;\n        linkedin_url?: string;\n        media?: Media | null;\n        active: boolean;\n        email: string;')
s=s.replace('    participants: {', '    can_reply?: boolean;\n    tags?: Tag[];\n    participants: {')
s=s.replace('    pending_providers: number;', '    pending_providers: number;')
# Admin company locate
idx=s.find('export interface AdminData')
print(s[idx:idx+1200])
p.write_text(s)
