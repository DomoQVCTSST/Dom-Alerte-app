/* ==========================================================================
   auth.js — comptes utilisateurs (data/users.json) + session locale.
   Mots de passe : hachés en SHA-256 côté navigateur avant tout envoi/stockage.
   Ceci reste un contrôle d'accès "équipe de confiance", pas une sécurité de
   niveau grand public : le dépôt GitHub doit rester privé.
   ========================================================================== */

const AUTH = (() => {

  const USERS_PATH = 'data/users.json';
  const LS_SESSION = 'da_session';

  async function sha256(text){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function session(){
    try{ return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }
    catch(e){ return null; }
  }

  function setSession(user){
    localStorage.setItem(LS_SESSION, JSON.stringify(user));
  }

  function logout(){
    localStorage.removeItem(LS_SESSION);
    window.location.href = 'index.html';
  }

  /** Redirige vers la page de connexion si pas de session active. À appeler en haut de chaque page protégée. */
  function requireSession(){
    if (!GHDB.isConfigured()){
      window.location.href = 'index.html';
      return null;
    }
    const s = session();
    if (!s){
      window.location.href = 'index.html';
      return null;
    }
    return s;
  }

  async function loadUsers(){
    const { data } = await GHDB.getJSON(USERS_PATH);
    return data || [];
  }

  /**
   * Première utilisation : le fichier users.json n'existe pas encore sur le
   * dépôt. On propose de créer le premier compte administrateur.
   */
  async function bootstrapFirstAdmin(login, nom, password){
    const hash = await sha256(password);
    const users = [{
      login: login.trim().toLowerCase(),
      nom: nom.trim(),
      role: 'admin',
      passHash: hash,
      createdAt: new Date().toISOString(),
    }];
    // Le fichier users.json peut déjà exister (vide) sur le dépôt : on
    // récupère son sha actuel pour que GitHub accepte la mise à jour.
    const current = await GHDB.getJSON(USERS_PATH);
    await GHDB.putJSON(USERS_PATH, users, `Création du compte administrateur ${login}`, current.sha);
    return users[0];
  }

  async function login(loginId, password){
    const users = await loadUsers();
    const hash = await sha256(password);
    const found = users.find(u => u.login.toLowerCase() === loginId.trim().toLowerCase());
    if (!found) return { ok:false, error: 'Identifiant inconnu.' };
    if (found.passHash !== hash) return { ok:false, error: 'Mot de passe incorrect.' };
    const user = { login: found.login, nom: found.nom, role: found.role };
    setSession(user);
    return { ok:true, user };
  }

  async function addUser({ login, nom, role, password }){
    const hash = await sha256(password);
    await GHDB.putJSONWithRetry(USERS_PATH, (current) => {
      const list = current || [];
      if (list.some(u => u.login.toLowerCase() === login.trim().toLowerCase())){
        throw new Error('Cet identifiant existe déjà.');
      }
      return [...list, {
        login: login.trim().toLowerCase(),
        nom: nom.trim(),
        role,
        passHash: hash,
        createdAt: new Date().toISOString(),
      }];
    }, `Ajout de l'utilisateur ${login}`);
  }

  async function removeUser(loginId){
    await GHDB.putJSONWithRetry(USERS_PATH, (current) => {
      return (current || []).filter(u => u.login.toLowerCase() !== loginId.toLowerCase());
    }, `Suppression de l'utilisateur ${loginId}`);
  }

  async function changePassword(loginId, newPassword){
    const hash = await sha256(newPassword);
    await GHDB.putJSONWithRetry(USERS_PATH, (current) => {
      return (current || []).map(u => u.login.toLowerCase() === loginId.toLowerCase() ? { ...u, passHash: hash } : u);
    }, `Modification du mot de passe de ${loginId}`);
  }

  return { session, setSession, logout, requireSession, loadUsers, bootstrapFirstAdmin, login, addUser, removeUser, changePassword };
})();
