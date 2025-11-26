/**
 * jsPDF AutoTable Type Declarations
 * TypeScript declaration file for jspdf-autotable plugin.
 *
 * Extends jsPDF interface to include autoTable method for
 * generating PDF tables from data.
 */
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: unknown[]) => jsPDF;
  }
}
