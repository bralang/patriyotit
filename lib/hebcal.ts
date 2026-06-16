const cache = new Map<string, string>();

export async function getHebrewDate(date: string): Promise<string> {
  if (cache.has(date)) return cache.get(date)!;
  const [y, m, d] = date.split('-');
  try {
    const res = await fetch(
      `https://www.hebcal.com/converter?v=1&cfg=json&gy=${y}&gm=${m}&gd=${d}&g2h=1`
    );
    if (!res.ok) return '';
    const data = await res.json();
    const hebrew = ((data.hebrew as string) ?? '').replace(/[ְ-ׇ]/g, '');
    cache.set(date, hebrew);
    return hebrew;
  } catch {
    return '';
  }
}
