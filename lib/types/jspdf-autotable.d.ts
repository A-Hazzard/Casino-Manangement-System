import "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (...args: unknown[]) => jsPDF;
  }
}
