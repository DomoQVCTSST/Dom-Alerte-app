/* ==========================================================================
   app-data.js — vocabulaire métier DomAlerte, accès aux incidents, utilitaires
   partagés par toutes les pages (nav, session, formatage, export Excel).
   ========================================================================== */

const INCIDENTS_PATH = 'data/incidents.json';

const OPTIONS = {
  sexe: ['F', 'M'],
  poste: [
    "conseiller clientele", "gardien d'immeubles", "employe d'immeubles",
    "gestionnaire locatif", "gestionnaire de site", "responsable de site",
    "responsable de territoire", "referent de site", "agent d'accueil", "Autre",
  ],
  agence: [
    'DT1 METROPOLE CENTRE', 'DT2 METROPOLE RIVE GAUCHE', 'DT3 METROPOLE RIVE DROITE',
    'DT4 ATLANTIQUE', 'DT5 SUD AQUITAINE', 'DT6 EST AQUITAINE',
    'CRC PAU / DT1 METROPOLE CENTRE', 'CRC PAU / DT2 METROPOLE RIVE GAUCHE',
    'CRC PAU / DT3 METROPOLE RIVE DROITE', 'CRC PAU / DT4 ATLANTIQUE',
    'CRC PAU / DT5 SUD AQUITAINE', 'CRC PAU / DT6 EST AQUITAINE', 'CRC PAU', 'Autre',
  ],
  natureFaits: [
    'Comportement inapproprié (remarques méprisantes, humiliantes)',
    'Agression verbale sans menace (injures)',
    'Agression verbale avec menace (intimidation, menaces de mort, …)',
    'Agression physique',
    'Sans motif apparent',
    'Autre',
  ],
  activite: [
    'Accueil physique', 'Accueil téléphonique', "Contrôle des parties communes (intérieur)",
    "Déplacement à pied dans les parties communes (intérieur)",
    "Déplacement à pied dans les parties communes (extérieur)",
    'Nettoyage des parties communes (entretien courant)', 'Visite technique au domicile',
    'Traitement mails CRC', 'Autre',
  ],
  contexte: [
    "Différend lié à une insatisfaction du locataire", 'Différend lié au paiement du loyer',
    'Demande de mutation', "Agression pour demande de logement non résolue",
    "Remarque ou rappel des règles d'usage", "Trouble du comportement de l'agresseur",
    'Problématiques rencontrées dans son logement', "Expulsion d'un local vélo",
    "Harcèlement du locataire en vue d'une obtention de mutation",
    'Fuite dans les parties communes', 'Appel concernant problème de voisinage pas résolu',
    'Réclamation par téléphone', 'Intervention sur un délit flagrant',
    'Phénomène lié aux stupéfiants', 'Rendez-vous en agence (box)',
    'Rassemblement dans les halls/parties communes', 'Sans motif apparent', 'Autre',
  ],
  auteurFaits: [
    "Locataire de la résidence", "Locataire d'une résidence Domofrance",
    'Famille, proche ou ami du locataire', 'Squatteur',
    'Individu extérieur à la résidence', 'Personne extérieure à Domofrance', 'Autre',
  ],
  lieuFaits: ['Agence', 'Téléphone', 'Parties communes', 'Parties privatives', 'Accueil', 'Autre (préciser ci-dessous)'],
  orientations: ["Pas d'orientation", 'Cellule psychologique', 'Médecin traitant', 'Autre'],
  suiviResponsable: ['Pas de suivi', 'À chaud 5 jours ouvrés', 'À froid 30 jours'],
  suivi: ['pas de suivi judiciaire', 'suivi judiciaire en cours', 'Autre'],
  suiviSuiteFaits: ["Pas d'action", 'Courrier auteur des faits', 'Entretien n+1', 'Entretien téléphonique auteur des faits', 'Autre'],
  suiviPstr: ['Pas de déplacement', "Pas d'intervention", 'Prise de contact par mail avec la victime', 'Autre'],
};

const YESNO = ['Oui', 'Non'];

/** Colonnes dans l'ordre exact du fichier source, pour l'export Excel. */
const EXPORT_COLUMNS = [
  ['nom', 'NOM'], ['prenom', 'PRENOM'], ['sexe', 'SEXE'], ['date', 'DATE'],
  ['poste', 'POSTE OCCUPE'], ['agence', 'AGENCE'], ['natureFaits', 'NATURE DES FAITS'],
  ['activite', "Activité exercée lors de l'incident"], ['contexte', 'CONTEXTE'],
  ['auteurFaits', 'AUTEUR DES FAIT'], ['lieuFaits', 'LIEU DES FAITS'], ['commune', 'COMMUNE'],
  ['appelPolice', 'Appel Police / Gendarmerie'], ['interventionPolice', 'Intervention Police / Gendarmerie'],
  ['mailManager', 'Mail manager'], ['mutationEnvisagee', 'Mutation envisagée'],
  ['domalerte', 'DOMALERTE'], ['depotPlainte', 'Dépôt de plainte'], ['mainCourante', 'MAIN COURANTE'],
  ['orientations', 'ORIENTATIONS'], ['suiviResponsable', 'SUIVI RESPONSABLE/DT'], ['suivi', 'SUIVI'],
  ['ittJudiciaire', 'ITT judiciaire'], ['suiviSuiteFaits', 'SUIVI SUITE AUX FAITS'],
  ['convocationLocataire', 'CONVOCATION LOCATAIRE'], ['dateConvocation', 'DATE CONVOCATION'],
  ['datiUtilise', 'DATI UTILISE'], ['suiviPstr', 'SUIVI PSTR'], ['circonstances', 'Circonstances'],
  ['pj1', 'PJ1'], ['pj2', 'PJ2'], ['commentaires', 'Commentaires'], ['assermente', 'Assermenté'],
];

function uid(){
  return 'inc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function fmtDate(iso){
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function monthKey(iso){
  if (!iso) return null;
  return iso.slice(0, 7); // YYYY-MM
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/** Sévérité indicative dérivée de la nature des faits, pour l'accent visuel des listes. */
function severityOf(inc){
  const n = (inc.natureFaits || '').toLowerCase();
  if (n.includes('physique') || n.includes('menace')) return 3;
  if (n.includes('injure') || n.includes('inappropri')) return 2;
  return 1;
}

/* ---------------- CRUD incidents ---------------- */

async function loadIncidents(){
  const { data } = await GHDB.getJSON(INCIDENTS_PATH);
  return data || [];
}

async function saveIncident(incident, isNew){
  return GHDB.putJSONWithRetry(INCIDENTS_PATH, (current) => {
    const list = current || [];
    if (isNew){
      return [...list, incident];
    }
    return list.map(i => i.id === incident.id ? incident : i);
  }, isNew ? `Ajout d'un incident (${incident.nom || 'sans nom'})` : `Modification de l'incident ${incident.id}`);
}

async function deleteIncident(id){
  return GHDB.putJSONWithRetry(INCIDENTS_PATH, (current) => {
    return (current || []).filter(i => i.id !== id);
  }, `Suppression de l'incident ${id}`);
}

/* ---------------- navigation / chrome commun ---------------- */

const NAV_ITEMS = [
  { href: 'dashboard.html', label: 'Tableau de bord' },
  { href: 'saisie.html',    label: 'Nouvelle fiche' },
  { href: 'fiches.html',    label: 'Fiches / Historique' },
  { href: 'parametres.html',label: 'Paramètres' },
];

function renderChrome(activeHref){
  const s = AUTH.session();
  const topbar = document.getElementById('topbar');
  if (topbar){
    topbar.innerHTML = `
      <div class="brand">
        <div class="brand__mark">DA</div>
        <div class="brand__text">
          <span class="brand__eyebrow">Domofrance · Sûreté &amp; Prévention</span>
          <span class="brand__name">DomAlerte</span>
        </div>
      </div>
      ${s ? `
      <div class="session">
        <div class="session__who">
          <div class="session__name">${escapeHtml(s.nom || s.login)}</div>
          <div class="session__role">${escapeHtml(s.role)}</div>
        </div>
        <button class="session__logout" id="btnLogout">Se déconnecter</button>
      </div>` : ''}
    `;
    const btn = document.getElementById('btnLogout');
    if (btn) btn.addEventListener('click', AUTH.logout);
  }
  const nav = document.getElementById('mainnav');
  if (nav){
    nav.innerHTML = NAV_ITEMS.map(item =>
      `<a href="${item.href}" class="${item.href === activeHref ? 'active' : ''}">${item.label}</a>`
    ).join('');
  }
}

/* ---------------- export Excel (SheetJS) ---------------- */

function exportIncidentsToExcel(list, filename){
  const rows = list.map(inc => {
    const row = {};
    EXPORT_COLUMNS.forEach(([key, label]) => { row[label] = inc[key] ?? ''; });
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS.map(c => c[1]) });
  ws['!cols'] = EXPORT_COLUMNS.map(([key]) => ({ wch: key === 'circonstances' || key === 'commentaires' ? 50 : 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DomAlerte');
  XLSX.writeFile(wb, filename || `domalerte_export_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function buildOptionList(id, values, current, allowEmpty){
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = (allowEmpty ? ['<option value="">— Sélectionner —</option>'] : [])
    .concat(values.map(v => `<option value="${escapeHtml(v)}" ${v === current ? 'selected' : ''}>${escapeHtml(v)}</option>`))
    .join('');
}
