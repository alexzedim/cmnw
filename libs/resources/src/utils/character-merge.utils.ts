const isEmptyExtraction = (value: unknown): boolean =>
  value == null || value === 0 || value === '' || (Array.isArray(value) && value.length === 0);

export const enrichEntity = <T extends object>(target: T, source: object): T => {
  const record = target as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;

    const currentValue = record[key];
    if (isEmptyExtraction(value) && !isEmptyExtraction(currentValue)) continue;

    record[key] = value;
  }

  return target;
};
