import 'jspdf-autotable';

declare module 'jspdf' {
  type jsPDF = {
    autoTable: (...args: unknown[]) => jsPDF;
  }
}

