
import { db } from './db';

/**
 * SyncService - Gerencia a integridade e a persistência dos dados financeiros.
 * Responsável por garantir que o banco de dados local esteja consistente e 
 * preparado para futuras integrações em nuvem.
 */
export const syncService = {
  /**
   * Valida a integridade dos dados no LocalStorage.
   * Verifica se os objetos salvos seguem o formato JSON esperado.
   */
  validateIntegrity(): boolean {
    try {
      const entries = db.getEntries();
      const expenses = db.getExpenses();
      
      return Array.isArray(entries) && Array.isArray(expenses);
    } catch (error) {
      console.error("[SyncService] Falha na verificação de integridade:", error);
      return false;
    }
  },

  /**
   * Prepara os dados para sincronização ou backup externo.
   * Retorna um pacote consolidado de todas as coleções.
   */
  prepareSyncPayload() {
    return db.getFullBackup();
  },

  /**
   * Placeholder para futura implementação de persistência em API/Cloud.
   */
  async sync(): Promise<void> {
    console.debug("[SyncService] Sincronização local disparada...");
    // Lógica futura de push/pull para servidor
  }
};
