
import { db, safeSetItem } from './db';

const CLOUD_API_URL = "https://script.google.com/macros/s/AKfycbxqpnZ_O7WYDpGRpz1EDTcdIQujKEm3Lxv8tlzM3oGbnSqjc-kNIcDpvaiSxf8rruA-/exec";

export const syncService = {
  /**
   * Salva todos os dados locais na nuvem e gera/atualiza uma planilha no Google Drive.
   */
  async saveToCloud(): Promise<boolean> {
    try {
      const payload = {
        caixa: db.getEntries(),
        contas: db.getExpenses(),
        fornecedores: db.getSuppliers(),
        configuracoes: db.getCardRates()
      };

      // Enviamos como string formatada para o GAS processar como objeto
      const response = await fetch(CLOUD_API_URL, {
        method: "POST",
        mode: "no-cors", // Usamos no-cors para evitar problemas de preflight com o Google Apps Script
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          acao: "salvar_planilha",
          dados: payload
        })
      });

      // Com no-cors, não conseguimos ler a resposta, mas o Google Script processará.
      // Para uma experiência melhor, assumimos sucesso se não houver erro de rede.
      return true;
    } catch (error) {
      console.error("[SyncService] Erro ao salvar na nuvem:", error);
      return false;
    }
  },

  /**
   * Baixa os dados da nuvem (JSON bruto armazenado no ScriptProperties ou célula oculta).
   */
  async downloadFromCloud(): Promise<boolean> {
    try {
      const response = await fetch(CLOUD_API_URL, {
        method: "GET",
        redirect: "follow"
      });

      if (!response.ok) throw new Error("Erro ao baixar dados.");
      
      const result = await response.json();
      
      if (!result.dados) {
        console.warn("[SyncService] Nenhum dado encontrado na nuvem.");
        return false;
      }

      const cloudData = typeof result.dados === 'string' ? JSON.parse(result.dados) : result.dados;
      
      // Persistência robusta com safeSetItem
      if (cloudData.caixa) safeSetItem("caixa", JSON.stringify(cloudData.caixa));
      if (cloudData.contas) safeSetItem("contas", JSON.stringify(cloudData.contas));
      if (cloudData.fornecedores) safeSetItem("fornecedores", JSON.stringify(cloudData.fornecedores));
      if (cloudData.configuracoes) safeSetItem("fm_card_rates", JSON.stringify(cloudData.configuracoes));

      return true;
    } catch (error) {
      console.error("[SyncService] Erro ao baixar da nuvem:", error);
      return false;
    }
  }
};
