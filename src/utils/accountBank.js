export function getAccountBank(accounts, accountId) {
  if (!accountId || !accounts) return null;
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return null;

  const bankName = acc.bankName || acc.name || null;
  const bankColor = acc.bankColor || null;
  const bankInitial = bankName ? bankName.charAt(0).toUpperCase() : '?';

  return { bankName, bankColor, bankInitial };
}
