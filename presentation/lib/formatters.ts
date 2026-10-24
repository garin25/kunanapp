const categoryLabels: Record<string, string> = {
  'UÑAS Y PESTAÑAS': 'Uñas y pestañas',
  PERFUME: 'Perfumes',
  'KITS Y SETS': 'Kits',
};

export function formatCategoryName(name: string): string {
  return (
    categoryLabels[name.toLocaleUpperCase('es-AR')] ??
    name
      .toLocaleLowerCase('es-AR')
      .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-AR'))
  );
}

export function formatMoney(value: number): string {
  return `$${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-AR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function editDistanceWithin(left: string, right: string, maxDistance: number): boolean {
  if (Math.abs(left.length - right.length) > maxDistance) return false;
  let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const currentRow = [leftIndex];
    let rowMinimum = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex] + 1,
        previousRow[rightIndex - 1] + cost
      );
      currentRow.push(distance);
      rowMinimum = Math.min(rowMinimum, distance);
    }
    if (rowMinimum > maxDistance) return false;
    previousRow = currentRow;
  }

  return previousRow[right.length] <= maxDistance;
}
