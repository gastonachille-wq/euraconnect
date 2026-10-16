from pathlib import Path
p=Path(__file__).parents[1]
a=p/'src/app.ts';s=a.read_text()
s=s.replace('releaseMedia } from "./api.js"','releaseMedia, managerRpc } from "./api.js"')
s=s.replace('import { demoBoot, demoRpc } from "./demo.js";', 'import { demoBoot, demoRpc } from "./demo.js";\nimport { managerCenter, startupRecommendations } from "./manager-v20.js";\nimport type { ManagerRecommendation } from "./manager-v20.js";')
s=s.replace('let adminCache: AdminData | null = null;', 'let adminCache: AdminData | null = null;\nlet managerProviders: DirectoryItem[] = [];\nlet managerPortfolio: Portfolio | null = null;')
s=s.replace('html = dashboardView(ctx, await read<Dashboard>("dashboard"));', '''html = dashboardView(ctx, await read<Dashboard>("dashboard"));
                if(ctx.boot.user.role==="incube" && !demo){
                    try { const recs=await managerRpc<ManagerRecommendation[]>("mine"); html+=startupRecommendations(recs); }
                    catch { html+=`<p class="ec20-api-notice">Les recommandations du manager seront accessibles après installation de la migration V2.</p>`; }
                }''')
old='''                html = portfolioView(ctx, data, id);
                break;'''
new='''                managerPortfolio=data;
                const suppliers=await read<List<DirectoryItem>>("directory",{kind:"company",type:"prestataire",size:100,sort:"name"});
                managerProviders=suppliers.items;
                let recs:ManagerRecommendation[]=[];
                let recommendationWarning="";
                if(!demo){try {recs=await managerRpc<ManagerRecommendation[]>("list");}
                    catch {recommendationWarning='<div class="warning-note">Les recommandations d’experts nécessitent la migration Supabase 07_V20_MANAGER_RECOMMANDATIONS.sql. Les autres actions restent disponibles.</div>';}}
                html=recommendationWarning+managerCenter(data,id,managerProviders,recs);
                break;'''
assert old in s;s=s.replace(old,new)
old='''        case "followup-form":'''
new='''        case "manager-open-recommend": {
            if(!managerPortfolio) {toast("Ouvrez votre portefeuille.",true);return;}
            const target=managerPortfolio.needs.find(n=>n.id===id);
            if(!target){toast("Demande introuvable.",true);return;}
            const supplierOptions=managerProviders.filter(x=>x.kind==="company"&&x.type==="prestataire"&&x.identity_visible);
            modal("Recommander un expert",`<p>Pour la demande <strong>${e(target.title)}</strong>. Vous transmettez une recommandation à la startup, sans l’engager commercialement.</p><form id="ec20-recommend-form"><input type="hidden" name="need_id" value="${e(target.id)}"><label>Prestataire validé<select name="provider_id" required><option value="">Choisir un prestataire</option>${supplierOptions.map(x=>`<option value="${e(x.id)}">${e(x.name)}</option>`).join("")}</select></label><label>Votre recommandation<textarea name="rationale" rows="4" minlength="15" maxlength="1800" required placeholder="Pourquoi cet expert répond au besoin..."></textarea></label><div class="form-error" role="alert" hidden></div><button class="btn primary full" type="submit">Transmettre à la startup</button></form>`,{wide:true});
            return;
        }
        case "followup-form":'''
assert old in s;s=s.replace(old,new)
s=s.replace('if (!["command-form", "auth-form", "message-form", "filter-form"].includes(form.id))','if (!["command-form", "auth-form", "message-form", "filter-form", "ec20-recommend-form"].includes(form.id))')
s=s.replace('''    const run = async () => {
        if (form.id === "auth-form")''','''    const run = async () => {
        if (form.id === "ec20-recommend-form") {
            if(demo)throw new Error("L'aperçu est en lecture seule.");
            const v=formValues(form);
            await managerRpc("recommend",{need_id:v.need_id,provider_id:v.provider_id,rationale:v.rationale});
            toast("Recommandation transmise à la startup et enregistrée dans votre suivi.");
            closeModal();
            await render();
            return;
        }
        if (form.id === "auth-form")''')
a.write_text(s)
q=p/'src/views.ts';v=q.read_text();v=v.replace('EURACONNECT &middot; 1.3','EURACONNECT &middot; 2.0');v=v.replace('name: "Mes startups"','name: "Pilotage startups"');q.write_text(v)
f=p/'public/index.html';h=f.read_text();h=h.replace('<script src="/config.js"', '<link rel="stylesheet" href="/ux-v20.css"><script src="/config.js"');f.write_text(h)
for file in ['package.json','scripts/build.mjs']:
 f=p/file;t=f.read_text().replace('1.3.0','2.0.0');f.write_text(t)
