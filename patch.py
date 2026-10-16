from pathlib import Path
p=Path('src/views.ts'); s=p.read_text()
a=s.index(' <div class="nav-section-label">TRAVAILLER</div>'); b=s.index(' <div class="sidebar-bottom">',a)
s=s[:a]+''' <div class="ec24-sidebar-tools"><button type="button" class="ec24-collapse" data-action="collapse-sidebar" aria-label="Réduire ou agrandir le menu" title="Réduire ou agrandir le menu">${icon("menu",18)}<span>Réduire le menu</span></button></div>
 <nav class="ec24-nav-groups" aria-label="Navigation principale">${([
 {key:"work",label:"Travailler",items:nav.filter(n=>["dashboard","portfolio","needs","messages","agenda"].includes(n.id))},
 {key:"network",label:"Réseau",items:nav.filter(n=>["directory","offers","workshops"].includes(n.id))},
 {key:"account",label:"Compte",items:nav.filter(n=>["company","admin"].includes(n.id))}
 ]).map(g=>`<details class="ec24-nav-group" data-group="${g.key}" ${g.items.some(n=>n.id===route)?"open":""}><summary><span>${g.label}</span>${icon("down",14)}</summary><div class="ec24-nav-items">${g.items.map(n=>`<a href="#${n.id}" title="${e(n.name)}" ${n.id===route?'aria-current="page"':''} class="nav-link ${n.id===route?'active':''}">${icon(n.symbol,19)}<span>${e(n.name)}</span>${n.id==='messages'&&boot.unread_messages?`<b class="nav-count">${boot.unread_messages}</b>`:''}</a>`).join('')}</div></details>`).join('')}</nav>
''' +s[b:]
s=s.replace('EURACONNECT &middot; 2.2','EURACONNECT &middot; 2.4')
s=s.replace('<main id="main" tabindex="-1">','<div class="ec24-context-nav" aria-label="Accès rapides">${(route==="needs"?[{id:"directory",name:"Trouver un expert",symbol:"people"},{id:"offers",name:"Explorer les services",symbol:"spark"},{id:"messages",name:"Mes échanges",symbol:"messages"}]:route==="directory"?[{id:"offers",name:"Voir les services",symbol:"spark"},{id:"agenda",name:"Prendre rendez-vous",symbol:"calendar"}]:route==="offers"?[{id:"directory",name:"Voir les entreprises",symbol:"company"},{id:"agenda",name:"Disponibilités",symbol:"calendar"}]:route==="agenda"?[{id:"messages",name:"Mes conversations",symbol:"messages"},{id:"directory",name:"Trouver un expert",symbol:"people"}]:route==="portfolio"?[{id:"needs",name:"Demandes",symbol:"needs"},{id:"agenda",name:"Proposer un créneau",symbol:"calendar"}]:[{id:"needs",name:role==="prestataire"?"Opportunités":"Demandes",symbol:"needs"},{id:"directory",name:"Annuaire",symbol:"people"},{id:"agenda",name:"Rendez-vous",symbol:"calendar"}]).filter(n=>n.id!==route).map(n=>`<a href="#${n.id}">${icon(n.symbol,15)}<span>${e(n.name)}</span>${icon("arrow",12)}</a>`).join("")}</div><main id="main" tabindex="-1">')
p.write_text(s)
p=Path('src/app.ts');s=p.read_text();s=s.replace('        case "menu":\n', '''        case "collapse-sidebar": {
            const collapsed = document.body.classList.toggle("ec24-sidebar-collapsed");
            try { localStorage.setItem("euraconnect.nav.collapsed", collapsed ? "1" : "0"); } catch {}
            return;
        }
        case "menu":
''',1)
s+='''\n// Navigation preferences are local to the browser and never alter user permissions.\ntry { if (localStorage.getItem("euraconnect.nav.collapsed") === "1") document.body.classList.add("ec24-sidebar-collapsed"); } catch {}\n'''
p.write_text(s)
p=Path('public/index.html');s=p.read_text().replace('</head>','<link rel="stylesheet" href="/ux-v24.css"></head>');p.write_text(s)
p=Path('package.json');s=p.read_text().replace('"2.3.0"','"2.4.0"');p.write_text(s)
