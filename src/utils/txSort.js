export function brDateToTime(data) {
  if (typeof data !== 'string') return 0;
  const p = data.split('/');
  if (p.length !== 3) return 0;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  const y = parseInt(p[2], 10);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return 0;
  // usa UTC para evitar variações por fuso/horário de verão
  return Date.UTC(y, m - 1, d);
}

export function sortTransactionsByDate(list, order = 'desc') {
  const dir = order === 'asc' ? 1 : -1;
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const ta = brDateToTime(a?.data);
    const tb = brDateToTime(b?.data);
    if (ta !== tb) return (ta - tb) * dir;
    // desempate: mantém algo estável
    const ia = String(a?.id ?? '');
    const ib = String(b?.id ?? '');
    if (ia === ib) return 0;
    return ia > ib ? 1 : -1;
  });
}
