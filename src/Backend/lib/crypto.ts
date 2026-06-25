import CryptoJS from 'crypto-js';

// En production, cette clé devrait être gérée de manière extrêmement sécurisée
// Ici, nous utilisons un secret système combiné aux IDs des participants pour une isolation maximale
const SYSTEM_SECRET = 'TOPO-SAFE-GUARD-2026-SECRET-V1';

/**
 * Génère une clé déterministe basée sur les deux participants de la conversation.
 * L'ordre des IDs n'importe pas, garantissant que les deux participants génèrent la même clé.
 */
const getConversationKey = (uid1: string, uid2: string) => {
  const sortedIds = [uid1, uid2].sort().join(':');
  return CryptoJS.HmacSHA256(sortedIds, SYSTEM_SECRET).toString();
};

export const cryptoService = {
  /**
   * Chiffre un texte pour une conversation spécifique
   */
  encryptMessage(text: string, senderId: string, receiverId: string): string {
    if (!text) return '';
    try {
      const key = getConversationKey(senderId, receiverId);
      return CryptoJS.AES.encrypt(text, key).toString();
    } catch (error) {
      console.error('Encryption error:', error);
      return text; // Fallback au texte clair en cas d'erreur massive (à éviter en prod)
    }
  },

  /**
   * Déchiffre un texte pour une conversation spécifique
   */
  decryptMessage(cipherText: string, uid1: string, uid2: string): string {
    if (!cipherText) return '';
    // Si le message semble ne pas être chiffré (legacy messages), on le retourne tel quel
    if (cipherText.length < 10 && !cipherText.includes('/') && !cipherText.includes('+')) return cipherText;

    try {
      const key = getConversationKey(uid1, uid2);
      const bytes = CryptoJS.AES.decrypt(cipherText, key);
      const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
      
      // Si le déchiffrement échoue (chaîne vide), c'est probablement un message non chiffré
      return decryptedText || cipherText;
    } catch (error) {
      // En cas d'erreur, on retourne le texte tel quel (pour les anciens messages)
      return cipherText;
    }
  }
};
