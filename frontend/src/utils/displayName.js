export const stripRepSuffix = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/\s+rep\s*$/i, '').trim();
};

