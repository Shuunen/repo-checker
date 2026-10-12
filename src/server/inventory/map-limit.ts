/**
 * Map items with a bounded number of promises at the same time, keeping the order
 * @param items the items
 * @param limit the maximum number of running promises
 * @param map the async mapping
 * @returns the results, in the items order
 */
export async function mapLimit<Item, Result>(items: readonly Item[], limit: number, map: (item: Item) => Promise<Result>): Promise<Result[]> {
  if (items.length === 0) return []
  const head = await Promise.all(items.slice(0, limit).map(item => map(item)))
  return [...head, ...(await mapLimit(items.slice(limit), limit, map))]
}
