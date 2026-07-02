export function calcGstFromExGst(priceExGst: number, gstRate: number) {
  const gstAmount = Math.round(priceExGst * (gstRate / 100) * 100) / 100;
  const priceInclGst = Math.round((priceExGst + gstAmount) * 100) / 100;
  return { priceExGst, gstRate, gstAmount, priceInclGst };
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
