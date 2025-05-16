export default function formatCurrency(value: number | null | undefined) {
  return (value ?? 0).toLocaleString();
}
