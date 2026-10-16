from pathlib import Path
p=Path('src/app.ts');s=p.read_text()
s=s.replace('import { demoBoot, demoRpc } from "./demo.js";', 'import { demoBoot, demoRpc } from "./demo.js";\nimport { companyDetailV12, personDetailV12 } from "./directory-v12.js";\nimport { agendaRange, shiftAgenda } from "./agenda-v12.js";')
s=s.replace('const data = await read<List<DirectoryItem>>("directory", args);', 'const data = await read<List<DirectoryItem>>("directory", { ...args, kind: params.get("kind") === "person" ? "person" : "company" });')
s=s.replace('html = messagesView(ctx, threads, detail);', '''const appointments = id ? await read<List<SessionItem>>("sessions", { response_id:id,scope:"all",size:100,from:null,to:null }) : null;
                html = messagesView(ctx, threads, detail, appointments?.items || []);''')
start=s.index('            case "agenda":\n            case "workshops": {')
end=s.index('            case "portfolio": {',start)
s=s[:start]+'''            case "agenda":
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
                break;
            }
'''+s[end:]
# Rely on Promise.all with optional failures for enriched reply so response opens if company missing
s=s.replace('modal("Proposition du prestataire", responseDetail(r), { wide: true });', '''const [co,off,person] = await Promise.allSettled([
                read<CompanyDetail>("company",{id:r.company_id}),
                read<List<Offer>>("offers",{company_id:r.company_id,size:100}),
                r.author_id ? read<DirectoryItem>("person",{id:r.author_id}) : Promise.resolve(null)
            ]);
            const company = co.status === "fulfilled" ? co.value : null;
            const offers = off.status === "fulfilled" ? off.value.items : [];
            const contact = person.status === "fulfilled" ? person.value : null;
            modal("Proposition reçue · fiche complète", responseDetail(r,company,contact,offers), { wide: true });''')
# New helper before action for company/person detail
needle='async function getAdmin(): Promise<AdminData> { return adminCache || await read<AdminData>("admin"); }'
assert needle in s
s=s.replace(needle,needle+'''
async function showCompany(id:string):Promise<void>{
    const c=await read<CompanyDetail>("company",{id});
    let offers:Offer[]=[];
    try { offers=(await read<List<Offer>>("offers",{company_id:id,size:100})).items; } catch { /* company still accessible */ }
    modal("Fiche entreprise · "+c.name,companyDetailV12(c,offers),{wide:true});
}
async function showPerson(id:string):Promise<void>{
    const person=await read<DirectoryItem>("person",{id});
    modal("Fiche contact · "+person.name,personDetailV12(person),{wide:true});
}
''')
# directory view kind reset dependent filters
s=s.replace('case "directory-kind":\n            filter("kind", el.dataset.kind || "");', '''case "directory-kind": {
            const {params} = routeParts();
            for(const key of ["type","label","premium","page"]) params.delete(key);
            params.set("kind",el.dataset.kind==="person"?"person":"company");
            navigate("directory",params);''')
# close brace after return; to not invalidate subsequent cases
s=s.replace('params.set("kind",el.dataset.kind==="person"?"person":"company");\n            navigate("directory",params);\n            return;', 'params.set("kind",el.dataset.kind==="person"?"person":"company");\n            navigate("directory",params);\n            return;\n        }')
# new directory-view + company/person modals
needle='        case "favorite": {'
assert needle in s
s=s.replace(needle,'''        case "directory-view":
            filter("view",el.dataset.view||"compact");
            return;
        case "company-detail":
            await showCompany(id);
            return;
        case "person-detail":
            await showPerson(id);
            return;
'''+needle)
# replace original detail case fully with delegation and avoid list scope miss
start=s.index('        case "directory-detail": {')
end=s.index('        case "new-offer":',start)
s=s[:start]+'''        case "directory-detail": {
            if (el.dataset.kind==="person") await showPerson(id);
            else await showCompany(id);
            return;
        }
'''+s[end:]
# handle agenda direction
needle='        case "agenda-today":'
assert needle in s
s=s.replace(needle,'''        case "agenda-clear": {
            const params=new URLSearchParams({scope:ctx.params.get("scope")||"mine",view:ctx.params.get("view")||"week"});
            navigate("agenda",params);
            return;
        }
        case "agenda-step":
            filter("from",shiftAgenda(ctx.params,Number(el.dataset.direction||"1")));
            return;
'''+needle)
# new decline-session confirmation using simple form, action specific
needle='        case "cancel-booking":'
assert needle in s
s=s.replace(needle,'''        case "decline-session":
            modal("Refuser le créneau proposé",simpleForm("decline_session","<p>Le prestataire sera informé que ce créneau ne vous convient pas. Vous pourrez proposer un autre horaire depuis la conversation.</p>",id,"Confirmer mon refus"));
            return;
'''+needle)
# admin-company edit badges separate action
needle='        case "admin-premium": {'
assert needle in s
s=s.replace(needle,'''        case "admin-labels": {
            const c=(await getAdmin()).companies.find(x=>x.id===id);
            if(!c) return;
            const choices=[['partenaire','Partenaire du réseau'],['institutionnel','Institutionnel'],['pop','Prestataire POP'],['intervenant_atelier','Intervenant d’atelier']];
            modal("Catégories de "+c.name,`<form id="command-form" data-command="set_company_labels" data-id="${e(id)}"><p class="muted">Ces distinctions sont administrées et vérifiables. « Premium » reste attribué depuis son panneau dédié. « Intervenant d’atelier » apparaît aussi automatiquement lorsqu’un atelier est publié.</p><div class="ec12-label-form">${choices.map(([v,t])=>`<label><input type="checkbox" name="label_${v}" ${c.labels?.includes(v)?'checked':''}>${e(t)}</label>`).join('')}</div>${footerSubmit("Enregistrer les catégories")}</form>`,{wide:true});
            return;
        }
'''+needle)
# admin labels preprocess form argument map using keys
needle='    if (command === "assign_manager") {'
assert needle in s
s=s.replace(needle,'''    if (command === "set_company_labels") {
        args.labels=["partenaire","institutionnel","pop","intervenant_atelier"].filter(k=>args["label_"+k]===true);
    }
'''+needle)
# keep tags of all meeting types; remove deleting
s=s.replace('    if (command === "create_session" && args.kind !== "atelier")\n        delete args.tags;\n','')
p.write_text(s)
