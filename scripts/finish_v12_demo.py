from pathlib import Path
p=Path('src/demo.ts'); s=p.read_text()
s=s.replace('version: "1.0.0"','version: "1.2.0"')
s=s.replace('media: null } }; }','media: null, linkedin_url: role === "prestataire" ? "https://www.linkedin.com/in/exemple-profil" : "" } }; }',1)
s=s.replace('id: uid(300), title: "Cadrage', 'id: uid(300), title: "Cadrage',1)
s=s.replace('capacity: 1, occupied: 1, need_id: uid(100)', 'capacity: 1, occupied: 0, need_id: uid(100)',1)
s=s.replace('registration: role === "incube" ? "confirme" : null, purpose:', 'registration: null, purpose:',1)
s=s.replace('participants: [{ id: uid(500), user_id: ids.incube, name: role === "prestataire" ? "Contact startup" : "Camille Laurent", company: role === "prestataire" ? "Startup accompagn\\u00E9e - A104" : "Nova Care Studio", status: "confirme", purpose: "Valider le p\\u00E9rim\\u00E8tre de notre accompagnement." }]', 'participants: []',1)
s=s.replace('mine: s.host_id === userId(role) || !!s.registration, can_manage: s.host_id === userId(role) || role === "admin"', 'mine: s.host_id === userId(role) || !!s.registration || (s.kind === "proposition" && role === "incube"), can_reply: s.kind === "proposition" && role === "incube",tags: s.kind === "atelier" ? [tag("Entrepreneuriat"),tag("Financement")] : s.kind === "proposition" ? [tag("Qualit\\u00E9"),tag("Dispositifs m\\u00E9dicaux")] : [tag("Strat\\u00E9gie r\\u00E9glementaire")], can_manage: s.host_id === userId(role) || role === "admin"')
s=s.replace('premium: true, next_slot: future(2)', 'premium: true, labels: ["partenaire","pop","intervenant_atelier"], next_slot: future(2)',1)
s=s.replace('premium: false, next_slot: null, favorite: false },','premium: false, labels: [], next_slot: null, favorite: false },',1)
s=s.replace('premium: false, next_slot: future(4)', 'premium: false, labels: ["partenaire"], next_slot: future(4)',1)
s=s.replace('city: "Lille", tags: [tag("Strat\\u00E9gie"), tag("Accompagnement")], premium:', 'city: "Lille", company_id: ids.other, company_name: "Eurasante", linkedin_url:"https://www.linkedin.com/in/exemple-manager", tags: [tag("Strat\\u00E9gie"), tag("Accompagnement")], premium:',1)
s=s.replace('premium: false, next_slot: null, favorite: false }\n    ].map', 'premium: false, labels: ["partenaire"], next_slot: null, favorite: false },\n        { id: ids.other, kind:"company",type:"autre",name:"Eurasante",subtitle:"Accompagnement et innovation sante",description:"Accompagnement des startups innovantes de l ecoysysteme regional.",city:"Lille",tags:[tag("Accompagnement"),tag("Innovation")],premium:false,labels:["institutionnel"],next_slot:future(3),favorite:false},\n        { id: ids.incube, kind:"person",type:"incube",name:"Camille Laurent",subtitle:"Cofondatrice - dispositifs de sante",description:"Projet innovant de suivi a domicile.",company_id:ids.startup,company_name:"Nova Care Studio",city:"Lille",tags:[tag("Sante numerique")],premium:false,next_slot:null,favorite:false},\n        { id: uid(32), kind:"person",type:"prestataire",name:"Sophie Dumas",subtitle:"Conseil en financement",description:"Structuration financiere des startups.",company_id:uid(30),company_name:"Trajectoire Finance",city:"Lille",tags:[tag("Financement")],premium:false,next_slot:future(4),favorite:false}\n    ].map',1)
s=s.replace('].map(d => ({ ...d, kind: d.kind as "company" | "person", identity_visible: !(role === "prestataire" && d.type === "startup"), can_edit: d.id === (role === "incube" ? ids.startup : role === "prestataire" ? ids.provider : ""), status: "publiee", media: null }));', '].filter(d=> !(role === "prestataire" && d.kind === "person" && d.type === "incube")).map(d => ({ ...d, kind: d.kind as "company" | "person", identity_visible: !(role === "prestataire" && d.type === "startup"), can_edit: d.id === (role === "incube" ? ids.startup : role === "prestataire" ? ids.provider : ""), status: "publiee", media: null }));')
start=s.index('function company(role: Role, id: string): CompanyDetail {')
end=s.index('\nfunction admin()', start)
s=s[:start]+'''function company(role: Role, id: string): CompanyDetail {
 const d=directory(role).find(x=>x.kind==='company'&&x.id===id);
 const hidden=role==='prestataire'&&id===ids.startup;
 const members=hidden?[]:(id===ids.provider?[{id:ids.expert,name:'Alex Martin',role:'proprietaire',contact_role:'prestataire',title:'Expert reglementaire',linkedin_url:'https://www.linkedin.com/in/exemple-profil',active:true,email:'demo@example.invalid'}]:id===ids.startup?[{id:ids.incube,name:'Camille Laurent',role:'proprietaire',contact_role:'incube',title:'Cofondatrice',active:true,email:'demo@example.invalid'}]:id===ids.other?[{id:ids.manager,name:'Lea Bernard',role:'collaborateur',contact_role:'startup_manager',title:'Startup Manager',active:true,email:'demo@example.invalid'}]:[]);
 return {id,name:d?.name||'Entreprise du reseau',type:d?.type||'autre',labels:d?.labels||[],premium:d?.premium||false,media:null,
 can_edit:role==='admin'||(role==='incube'&&id===ids.startup)||(role==='prestataire'&&id===ids.provider),
 details:hidden?null:{sector:d?.subtitle||'Innovation',city:d?.city||'Lille',description:d?.description||'',phone:'',contact_email:'',share_contact:false},members,tags:d?.tags||[]};
}''' +s[end:]
s=s.replace('expires_at: null }, { id: ids.provider', 'expires_at: null,labels:[] }, { id: ids.provider',1)
s=s.replace('premium: true, expires_at: null }, { id: uid(30)', 'premium: true, expires_at: null,labels:["partenaire","pop"] }, { id: uid(30)',1)
s=s.replace('premium: false, expires_at: null }], assignments', 'premium: false, expires_at: null,labels:["partenaire"] }], assignments',1)
s=s.replace('        case "company": return company(role, String(args.id || ids.startup));', '''        case "company": return company(role, String(args.id || ids.startup));
        case "person": return directory(role).find(d=>d.kind==="person"&&d.id===args.id)||null;''')
s=s.replace('            if (args.type)\n                out = out.filter(d => d.type === args.type);\n            return filter(out);', '''            if (args.type) out=out.filter(d=>d.type===args.type);
            if(args.label)out=out.filter(d=>d.labels?.includes(String(args.label)));
            if(args.premium!==undefined&&args.premium!==null&&args.premium!=="")out=out.filter(d=>d.premium===(args.premium==="true"||args.premium===true));
            if(args.tag)out=out.filter(d=>d.tags.some(t=>t.label.toLowerCase().includes(String(args.tag).toLowerCase())));
            if(args.city)out=out.filter(d=>d.city.toLowerCase().includes(String(args.city).toLowerCase()));
            if(args.sort==="city")out.sort((a,b)=>a.city.localeCompare(b.city));
            else if(args.sort==="availability")out.sort((a,b)=>(a.next_slot||"9999").localeCompare(b.next_slot||"9999"));
            else if(args.sort==="premium")out.sort((a,b)=>Number(b.premium)-Number(a.premium));
            else out.sort((a,b)=>a.name.localeCompare(b.name,"fr"));
            return filter(out);''',1)
s=s.replace('        case "offers": return filter([{ id:', '        case "offers": return filter([{ id:',1)
s=s.replace('}] satisfies Offer[]);', '}] satisfies Offer[]).items.filter(x=>!args.company_id||x.company_id===args.company_id).length?filter(([{ id: uid(400), company_id: ids.provider, title: "Diagnostic reglementaire & feuille de route", description: "Audit et feuille de route reglementaire pour les dispositifs medicaux.", format: "distance", price: 480000, provider: "Clarte Conseil", can_edit: false, tags:[tag("Qualite")], benefit: "Seance de cadrage offerte", favorite:false,media:null }] satisfies Offer[]).filter(x=>!args.company_id||x.company_id===args.company_id)):filter([] as Offer[]);',1) if False else s
# patch offers using precomputed filtering no duplicated definitions
s=s.replace('        case "offers": return filter([', '        case "offers": return filter([',1)
s=s.replace('}] satisfies Offer[]);\n        case "sessions"', '}] satisfies Offer[]).items.length && args.company_id && args.company_id!==ids.provider ? filter([] as Offer[]) : filter([{id:uid(400),company_id:ids.provider,title:"Diagnostic reglementaire & feuille de route",description:"Audit et feuille de route reglementaire.",format:"distance",price:480000,provider:"Clarte Conseil",can_edit:role==="prestataire"||role==="admin",tags:[tag("Qualite")],benefit:"Seance offerte aux incubes",favorite:false,media:null}] satisfies Offer[]);\n        case "sessions"',1)
s=s.replace('            if (args.scope === "mine")\n                out = out.filter(s => s.mine);\n            return filter(out);','''            if (args.response_id)out=out.filter(s=>s.response_id===args.response_id);
            if (args.mode)out=out.filter(s=>s.mode===args.mode);
            if (args.expertise)out=out.filter(s=>s.tags?.some(t=>t.label.toLowerCase().includes(String(args.expertise).toLowerCase())));
            if (args.scope === "mine")out=out.filter(s=>s.mine);
            if(args.sort==="host")out.sort((a,b)=>a.host_name.localeCompare(b.host_name));
            else if(args.sort==="mode")out.sort((a,b)=>a.mode.localeCompare(b.mode));
            else if(args.sort==="kind")out.sort((a,b)=>a.kind.localeCompare(b.kind));
            else out.sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
            return filter(out);''',1)
p.write_text(s)

p=Path('src/views.ts');s=p.read_text()
s=s.replace('${button("Membres", "manage-members", { id: c.id, class: "small ghost", icon: "people" })}', '${button("Catégories", "admin-labels", { id: c.id, class: "small ghost", icon: "check" })}${button("Membres", "manage-members", { id: c.id, class: "small ghost", icon: "people" })}')
s=s.replace('${badge(c.type)}</td><td>${badge(c.provider_status', '${badge(c.type)}${(c.labels||[]).length?`<small>${e((c.labels||[]).map(v=>v.replace(/_/g," ")).join(" · "))}</small>`:""}</td><td>${badge(c.provider_status')
p.write_text(s)
