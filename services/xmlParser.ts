import { Expense, ExpenseNature } from '../types';

export interface ParsedXMLData {
  supplierName: string;
  supplierCNPJ: string;
  invoiceNumber: string;
  totalValue: number;
  issueDate: string;
  installments: {
    number: string;
    dueDate: string;
    value: number;
  }[];
}

export const parseNFeXML = (xmlString: string): ParsedXMLData | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parsing errors
    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
      console.error("XML parsing error:", errorNode.textContent);
      return null;
    }

    // Extract Supplier Info
    const emit = xmlDoc.querySelector("emit");
    const supplierName = emit?.querySelector("xNome")?.textContent || "Fornecedor Desconhecido";
    const supplierCNPJ = emit?.querySelector("CNPJ")?.textContent || "";

    // Extract Invoice Info
    const ide = xmlDoc.querySelector("ide");
    const invoiceNumber = ide?.querySelector("nNF")?.textContent || "";
    const dhEmi = ide?.querySelector("dhEmi")?.textContent || "";
    const issueDate = dhEmi ? dhEmi.substring(0, 10) : new Date().toISOString().split('T')[0];

    // Extract Total Value
    const total = xmlDoc.querySelector("total ICMSTot vNF");
    const totalValue = parseFloat(total?.textContent || "0");

    // Extract Installments (Duplicatas)
    const installments: ParsedXMLData['installments'] = [];
    const duplicatas = xmlDoc.querySelectorAll("cobr dup");
    
    if (duplicatas.length > 0) {
      duplicatas.forEach(dup => {
        const nDup = dup.querySelector("nDup")?.textContent || "";
        const dVenc = dup.querySelector("dVenc")?.textContent || issueDate;
        const vDup = parseFloat(dup.querySelector("vDup")?.textContent || "0");
        installments.push({ number: nDup, dueDate: dVenc, value: vDup });
      });
    }

    return {
      supplierName,
      supplierCNPJ,
      invoiceNumber,
      totalValue,
      issueDate,
      installments
    };
  } catch (error) {
    console.error("Error parsing NF-e XML:", error);
    return null;
  }
};

export const convertParsedDataToExpenses = (data: ParsedXMLData): Omit<Expense, 'id'>[] => {
  const expenses: Omit<Expense, 'id'>[] = [];
  const nature: ExpenseNature = 'Custo da Mercadoria Vendida'; // Default for purchase XML

  if (data.installments.length > 0) {
    data.installments.forEach(inst => {
      expenses.push({
        description: `NF ${data.invoiceNumber} - Parcela ${inst.number}`,
        supplier: data.supplierName,
        dueDate: inst.dueDate,
        value: inst.value,
        nature: nature,
        costType: 'Variável',
        status: 'Pendente'
      });
    });
  } else {
    expenses.push({
      description: `NF ${data.invoiceNumber} - Total`,
      supplier: data.supplierName,
      dueDate: data.issueDate,
      value: data.totalValue,
      nature: nature,
      costType: 'Variável',
      status: 'Pendente'
    });
  }

  return expenses;
};
