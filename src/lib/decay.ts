/**
 * Le decay se declenche a 2h du matin (heure locale du serveur).
 * On compte le nombre de "2h du matin" passees depuis la derniere mise a jour.
 */
const DECAY_HOUR = 2; // 2h du matin

/**
 * Retourne la prochaine occurrence de 2h du matin apres une date donnee.
 */
function getNext2AM(date: Date): Date {
  const next = new Date(date);
  next.setHours(DECAY_HOUR, 0, 0, 0);

  // Si on est deja passe 2h, aller au lendemain
  if (date.getHours() >= DECAY_HOUR) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Compte le nombre de fois que 2h du matin est passe entre deux dates.
 */
function count2AMPassages(from: Date, to: Date): number {
  if (to <= from) return 0;

  // Trouver la premiere occurrence de 2h apres "from"
  const first2AM = getNext2AM(from);

  // Si la premiere 2h est apres "to", aucun passage
  if (first2AM > to) return 0;

  // Compter les jours entre la premiere 2h et maintenant
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysBetween = Math.floor((to.getTime() - first2AM.getTime()) / msPerDay);

  // +1 car on compte aussi la premiere occurrence
  return daysBetween + 1;
}

/**
 * Calcule le nombre de jours de decay restants en tenant compte du temps ecoule
 * depuis la derniere mise a jour.
 *
 * Le decay se declenche a 2h du matin, donc on compte le nombre de "2h du matin"
 * passees depuis la derniere mise a jour.
 *
 * @param originalDays - Le nombre de jours de decay stocke (au moment de la derniere mise a jour)
 * @param lastUpdated - La date ISO de la derniere mise a jour du decay
 * @returns Le nombre de jours restants ajuste, ou undefined si pas de decay
 */
export function getAdjustedDecayDays(
  originalDays: number | undefined,
  lastUpdated: string | undefined
): number | undefined {
  // Si pas de decay info, retourner undefined
  if (originalDays === undefined || originalDays < 0) {
    return originalDays;
  }

  // Si pas de date de mise a jour, retourner la valeur originale
  if (!lastUpdated) {
    return originalDays;
  }

  try {
    const lastUpdateDate = new Date(lastUpdated);
    const now = new Date();

    // Compter le nombre de fois que 2h du matin est passe
    const decayTicks = count2AMPassages(lastUpdateDate, now);

    // Soustraire les jours ecoules du decay original
    const adjustedDays = originalDays - decayTicks;

    // Ne pas retourner de valeur negative, minimum 0
    return Math.max(0, adjustedDays);
  } catch {
    // En cas d'erreur de parsing de date, retourner la valeur originale
    return originalDays;
  }
}

/**
 * Formate l'affichage du decay avec indication si la valeur est estimee
 *
 * @param originalDays - Le nombre de jours de decay stocke
 * @param lastUpdated - La date ISO de la derniere mise a jour
 * @returns Un objet avec les jours ajustes et un flag indiquant si c'est une estimation
 */
export function getDecayInfo(
  originalDays: number | undefined,
  lastUpdated: string | undefined
): { days: number | undefined; isEstimate: boolean } {
  const adjustedDays = getAdjustedDecayDays(originalDays, lastUpdated);

  // C'est une estimation si on a une date de mise a jour et que les jours ont change
  const isEstimate = !!(
    lastUpdated &&
    originalDays !== undefined &&
    originalDays >= 0 &&
    adjustedDays !== originalDays
  );

  return { days: adjustedDays, isEstimate };
}
