// ============================================================
// CLIENT SUPABASE — PARTAGÉ PAR TOUTE L'APPLICATION
// ============================================================
// Ce fichier centralise la connexion à la base de données.
// Toutes les pages (login, production, commandes, marges...)
// l'importent plutôt que de redéfinir leur propre connexion.

const SUPABASE_URL = 'https://mccwflanbnjozljmirvb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EnTS0s-6xyT_R850lQCoIw_iyHmkvAt';
const DOMAINE_TECHNIQUE = 'painnature.local';

// Le SDK Supabase est chargé en <script> dans chaque page HTML
// (voir balise <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/..."/>)
// donc `window.supabase` existe déjà au moment où ce fichier s'exécute.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,       // garde la session entre rechargements de page
    autoRefreshToken: true,     // renouvelle le jeton automatiquement
    storage: window.localStorage,
  }
});

// ------------------------------------------------------------
// Authentification : connexion par identifiant + PIN
// ------------------------------------------------------------
async function connexionIdentifiantPin(identifiant, pin) {
  const identifiantPropre = identifiant.trim().toLowerCase();
  const email = `${identifiantPropre}@${DOMAINE_TECHNIQUE}`;
  const motDePasse = `${identifiantPropre}:${pin}`;

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: motDePasse,
  });

  if (error) {
    // On reformule l'erreur technique en message compréhensible,
    // sans révéler si c'est l'identifiant OU le PIN qui est faux
    // (bonne pratique de sécurité : ne pas aider un essai par force brute)
    throw new Error('Identifiant ou PIN incorrect.');
  }

  return data;
}

async function deconnexion() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ------------------------------------------------------------
// Récupère le profil complet (nom, rôle) de l'utilisateur connecté
// ------------------------------------------------------------
async function recupererProfilConnecte() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;

  const { data, error } = await sb
    .from('profils')
    .select('id, nom, prenom, role')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Erreur récupération profil :', error);
    return null;
  }
  return data;
}

// ------------------------------------------------------------
// Garde d'accès : à appeler en haut de chaque page protégée.
// Redirige vers le login si personne n'est connecté.
// Renvoie le profil si tout est OK.
// ------------------------------------------------------------
async function exigerConnexion() {
  const profil = await recupererProfilConnecte();
  if (!profil) {
    window.location.href = 'index.html';
    return null;
  }
  return profil;
}

// ------------------------------------------------------------
// Garde de rôle : redirige si le rôle n'est pas autorisé.
// Exemple d'usage : exigerRole(['gerant']) sur la page Marges.
// ------------------------------------------------------------
async function exigerRole(rolesAutorises) {
  const profil = await exigerConnexion();
  if (!profil) return null;
  if (!rolesAutorises.includes(profil.role)) {
    alert("Vous n'avez pas accès à cette page.");
    window.location.href = 'accueil.html';
    return null;
  }
  return profil;
}
