/* ==========================================================================
   github-db.js
   Petite couche au-dessus de l'API GitHub "Contents" utilisée comme base de
   données JSON partagée (même principe que GESTOCK). Le token n'est jamais
   envoyé ailleurs qu'à api.github.com et reste stocké uniquement dans le
   navigateur (localStorage).
   ========================================================================== */

const GHDB = (() => {

  const LS_TOKEN  = 'da_gh_token';
  const LS_OWNER  = 'da_gh_owner';
  const LS_REPO   = 'da_gh_repo';
  const LS_BRANCH = 'da_gh_branch';

  function cfg(){
    return {
      token:  localStorage.getItem(LS_TOKEN)  || '',
      owner:  localStorage.getItem(LS_OWNER)  || '',
      repo:   localStorage.getItem(LS_REPO)   || '',
      branch: localStorage.getItem(LS_BRANCH) || 'main',
    };
  }

  function saveCfg({token, owner, repo, branch}){
    if (token  !== undefined) localStorage.setItem(LS_TOKEN, token);
    if (owner  !== undefined) localStorage.setItem(LS_OWNER, owner);
    if (repo   !== undefined) localStorage.setItem(LS_REPO, repo);
    if (branch !== undefined) localStorage.setItem(LS_BRANCH, branch || 'main');
  }

  function isConfigured(){
    const c = cfg();
    return !!(c.token && c.owner && c.repo);
  }

  function apiBase(){
    const c = cfg();
    return `https://api.github.com/repos/${c.owner}/${c.repo}/contents/`;
  }

  function utf8ToB64(str){
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64ToUtf8(b64){
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));
  }

  async function testConnection(){
    const c = cfg();
    if (!c.token || !c.owner || !c.repo) return { ok:false, error: 'Configuration incomplète.' };
    try{
      const res = await fetch(`https://api.github.com/repos/${c.owner}/${c.repo}`, {
        headers: { Authorization: `token ${c.token}`, Accept: 'application/vnd.github+json' }
      });
      if (res.status === 404) return { ok:false, error: "Dépôt introuvable (vérifiez propriétaire/nom, ou droits du token)." };
      if (res.status === 401) return { ok:false, error: 'Token invalide ou expiré.' };
      if (!res.ok) return { ok:false, error: `Erreur GitHub (${res.status}).` };
      const json = await res.json();
      return { ok:true, private: json.private, fullName: json.full_name };
    }catch(e){
      return { ok:false, error: 'Impossible de joindre GitHub (réseau).' };
    }
  }

  /**
   * Lit un fichier JSON du dépôt. Renvoie {data, sha} ou {data:null, sha:null}
   * si le fichier n'existe pas encore (première utilisation).
   */
  async function getJSON(path){
    const c = cfg();
    const res = await fetch(apiBase() + encodeURIComponent(path).replace(/%2F/g,'/') + `?ref=${c.branch}`, {
      headers: { Authorization: `token ${c.token}`, Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });
    if (res.status === 404){
      return { data: null, sha: null };
    }
    if (!res.ok){
      throw new Error(`Lecture ${path} : erreur GitHub ${res.status}`);
    }
    const json = await res.json();
    const text = b64ToUtf8(json.content);
    return { data: JSON.parse(text), sha: json.sha };
  }

  /**
   * Écrit un fichier JSON (création ou mise à jour). `sha` doit être le sha
   * connu du fichier existant (ou null s'il n'existe pas encore).
   */
  async function putJSON(path, dataObj, message, sha){
    const c = cfg();
    const body = {
      message: message || `Mise à jour ${path}`,
      content: utf8ToB64(JSON.stringify(dataObj, null, 2)),
      branch: c.branch,
    };
    if (sha) body.sha = sha;
    const res = await fetch(apiBase() + encodeURIComponent(path).replace(/%2F/g,'/'), {
      method: 'PUT',
      headers: {
        Authorization: `token ${c.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok){
      const errBody = await res.json().catch(() => ({}));
      if (res.status === 409 || (errBody.message||'').includes('does not match')){
        throw new Error('CONFLICT');
      }
      throw new Error(errBody.message || `Écriture ${path} : erreur GitHub ${res.status}`);
    }
    const json = await res.json();
    return { sha: json.content.sha };
  }

  /**
   * Écrit avec retry automatique en cas de conflit de version (deux
   * personnes ont modifié en même temps) : relit, laisse `mutate` fusionner,
   * puis réécrit.
   */
  async function putJSONWithRetry(path, mutate, message, attempts = 3){
    for (let i = 0; i < attempts; i++){
      const current = await getJSON(path);
      const next = mutate(current.data);
      try{
        await putJSON(path, next, message, current.sha);
        return next;
      }catch(e){
        if (e.message === 'CONFLICT' && i < attempts - 1) continue;
        throw e;
      }
    }
  }

  return { cfg, saveCfg, isConfigured, testConnection, getJSON, putJSON, putJSONWithRetry };
})();
