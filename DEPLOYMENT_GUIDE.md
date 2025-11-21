# Guide de Déploiement GitHub Pages

Ce guide explique comment déployer l'application sur GitHub Pages pour la démo Riot API.

## 📋 Prérequis

- Repository GitHub: `arkinalaera/summoner-vault`
- Branche principale: `main`
- Node.js 18+ installé localement

## 🚀 Étapes de Déploiement

### 1. Activer GitHub Pages

1. Va sur https://github.com/arkinalaera/summoner-vault/settings/pages
2. Dans **Source**, sélectionne:
   - Source: **GitHub Actions** (pas "Deploy from a branch")
3. Clique sur **Save**

### 2. Pousser les fichiers de configuration

Les fichiers suivants ont été créés/modifiés:

```bash
# Fichiers modifiés
vite.config.ts                    # Configuration du base path
.github/workflows/deploy.yml      # Workflow de déploiement automatique
public/.nojekyll                  # Désactive Jekyll sur GitHub Pages
RIOT_API_APPLICATION.md           # Documentation pour Riot
```

### 3. Committer et pousser

```bash
# Ajouter les fichiers
git add .github/ RIOT_API_APPLICATION.md DEPLOYMENT_GUIDE.md public/.nojekyll vite.config.ts

# Créer le commit
git commit -m "Setup GitHub Pages deployment for Riot API application"

# Pousser sur main
git checkout main
git merge feature/without-auto-login
git push origin main
```

### 4. Vérifier le déploiement

1. Va sur https://github.com/arkinalaera/summoner-vault/actions
2. Tu verras le workflow "Deploy to GitHub Pages" en cours
3. Attends que le build soit vert ✅
4. L'application sera disponible sur: **https://arkinalaera.github.io/summoner-vault/**

## 🔗 URLs à fournir à Riot

### Application Démo (Web)
```
https://arkinalaera.github.io/summoner-vault/
```

### Code Source
```
https://github.com/arkinalaera/summoner-vault
```

### Documentation API
```
https://github.com/arkinalaera/summoner-vault/blob/main/RIOT_API_APPLICATION.md
```

### Releases (Binaires Desktop)
```
https://github.com/arkinalaera/summoner-vault/releases
```

## ⚙️ Configuration du Build

### Vite Config

```typescript
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/summoner-vault/" : "./",
  // ...
}));
```

- **Production**: `/summoner-vault/` pour GitHub Pages
- **Development**: `./` pour tester localement

### GitHub Actions Workflow

Le workflow se déclenche:
- ✅ À chaque push sur `main`
- ✅ Manuellement via l'interface GitHub (workflow_dispatch)

## 🧪 Tester Localement

Pour tester le build de production localement:

```bash
# Build en mode production
npm run build

# Servir les fichiers
npx serve dist -p 3000
```

Puis ouvre: http://localhost:3000/summoner-vault/

## ⚠️ Limitations de la Version Web

La version hébergée sur GitHub Pages est une **démo frontend uniquement**:

❌ **Ne fonctionne PAS:**
- Auto-accept (nécessite Electron + LCU API)
- Encryption des credentials (nécessite Node.js crypto)
- Sélection du chemin League (pas de file picker en web)
- System tray

✅ **Fonctionne:**
- Interface utilisateur complète
- Ajout/édition/suppression de comptes (stockage localStorage)
- Recherche et filtres
- Design responsive
- Appels API Riot (avec CORS si configuré)

## 📦 Version Desktop Complète

Pour la version complète avec toutes les fonctionnalités, Riot devra:

1. Télécharger le binaire depuis **Releases**
2. Ou cloner le repo et builder localement:
   ```bash
   git clone https://github.com/arkinalaera/summoner-vault.git
   cd summoner-vault
   npm install
   npm run build:desktop
   ```

## 🔧 Dépannage

### Le site affiche une page blanche

**Cause**: Base path incorrect

**Solution**: Vérifie que `vite.config.ts` a bien:
```typescript
base: mode === "production" ? "/summoner-vault/" : "./"
```

### Les assets (images) ne chargent pas

**Cause**: Chemins relatifs cassés

**Solution**: Les assets doivent être dans `public/` ou importés avec `import`

### Le workflow GitHub Actions échoue

**Causes possibles**:
1. Permissions insuffisantes
2. Node.js version incorrecte
3. Dépendances npm manquantes

**Solution**: Vérifie les logs dans l'onglet Actions sur GitHub

## 📝 Checklist avant de soumettre à Riot

- [ ] Site déployé et accessible: https://arkinalaera.github.io/summoner-vault/
- [ ] README.md à jour avec screenshots
- [ ] RIOT_API_APPLICATION.md complété
- [ ] Release créée avec le binaire .exe
- [ ] Toutes les fonctionnalités d'auto-login retirées
- [ ] Rate limiting vérifié et documenté
- [ ] Licence MIT ajoutée au repo
- [ ] Code commenté et propre

## 🎯 Formulaire Riot API

Lors de ta demande de Production API Key, fournis:

1. **Application URL**: https://arkinalaera.github.io/summoner-vault/
2. **Source Code**: https://github.com/arkinalaera/summoner-vault
3. **Description**: Voir RIOT_API_APPLICATION.md
4. **API Endpoints**: Summoner-V4, League-V4, Data Dragon
5. **Expected Usage**: 15,000-150,000 calls/day
6. **Rate Limiting**: Oui, 19 req/sec + 1h cache

---

**Questions ?** Ouvre une issue sur GitHub ou contacte arkinalaera
