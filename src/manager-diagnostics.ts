/** Diagnostic ciblé : une erreur RPC ne prouve pas qu'une migration est absente. */
import { escapeHtml } from './domain.js';

type ManagerFeature = 'recommendations' | 'advice';
type ApiError = { code?: unknown; status?: unknown; message?: unknown; details?: unknown; hint?: unknown };

export function managerErrorNotice(error: unknown, feature: ManagerFeature): string {
    const x: ApiError = error && typeof error === 'object' ? error as ApiError : {};
    const code = typeof x.code === 'string' ? x.code : '';
    const status = typeof x.status === 'number' ? x.status : null;
    const raw = typeof x.message === 'string' ? x.message : String(error ?? 'Erreur inconnue');
    const absent = code === 'PGRST202' || code === '42883' || /Could not find the function/i.test(raw);
    const missingTable = code === '42P01';
    const unauthorized = code === '42501' || status === 403;
    const expired = status === 401 || code === 'PGRST301' || code === 'PGRST303';
    const network = /Failed to fetch|NetworkError|Connexion interrompue|AbortError|timeout/i.test(raw);
    const name = feature === 'recommendations' ? 'recommandations d’experts' : 'conseils du Startup Manager';
    const rpc = feature === 'recommendations' ? 'ec20_manager_api' : 'ec35_advice';
    const migration = feature === 'recommendations'
        ? '07_V20_MANAGER_RECOMMANDATIONS.sql'
        : '20261019173000_v35_manager_advice.sql';
    let issue = `Impossible de charger les ${name}.`;
    let next = 'Vérifiez le diagnostic technique et la réponse de Supabase ; ne relancez pas une migration au hasard.';
    if (absent) {
        issue = `La fonction Supabase ${rpc} est introuvable par l’API.`;
        next = `Vérifiez la migration ${migration} sur le projet Supabase utilisé par ce site, puis actualisez le cache PostgREST (NOTIFY pgrst, 'reload schema').`;
    } else if (missingTable) {
        issue = `La fonction ${rpc} répond, mais une table nécessaire est introuvable.`;
        next = `Vérifiez que la migration ${migration} a été exécutée intégralement sur le bon projet Supabase.`;
    } else if (expired) {
        issue = 'L’authentification Supabase a échoué.';
        next = 'Reconnectez-vous, puis réessayez. Si le problème persiste, vérifiez la configuration Auth.';
    } else if (unauthorized) {
        issue = `Accès refusé par Supabase pour les ${name}.`;
        next = 'Vérifiez le rôle du compte, son statut actif, ses affectations au portefeuille et les droits EXECUTE de la RPC.';
    } else if (network) {
        issue = `Connexion à Supabase impossible pour les ${name}.`;
        next = 'Vérifiez la connexion, le projet ciblé par le site et la disponibilité de Supabase.';
    }
    const technical = [
        `RPC : ${rpc}`,
        code ? `Code : ${code}` : '',
        status !== null ? `HTTP : ${status}` : '',
        `Message : ${raw.slice(0, 650)}`,
        typeof x.details === 'string' && x.details ? `Détail : ${x.details.slice(0, 650)}` : '',
        typeof x.hint === 'string' && x.hint ? `Indication : ${x.hint.slice(0, 400)}` : '',
    ].filter(Boolean).join('\n');
    return `<div class="warning-note ec-manager-diagnostic" role="alert"><strong>${escapeHtml(issue)}</strong><p>${escapeHtml(next)}</p><p>Les autres actions restent disponibles.</p><details><summary>Afficher le diagnostic technique</summary><pre>${escapeHtml(technical)}</pre></details></div>`;
}
