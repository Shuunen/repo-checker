/**
 * Run one slot: take the next item of the shared queue, map it, store the result, until the queue is empty
 * @param queue the items with their index, shared by every slot
 * @param results where each result is stored at its item index
 * @param map the async mapping
 */
async function drain<Item, Result>(queue: Iterator<[number, Item]>, results: Result[], map: (item: Item) => Promise<Result>): Promise<void> {
  const entry = queue.next()
  if (entry.done === true) return
  const [index, item] = entry.value
  results[index] = await map(item)
  await drain(queue, results, map)
}

/**
 * Map items with at most `limit` promises running, keeping the order. Each slot takes the next item as soon as it is free, so one slow item never holds back the others
 * @param items the items
 * @param limit the maximum number of running promises
 * @param map the async mapping
 * @returns the results, in the items order
 * @example const clones = await mapLimit(folders, 8, folder => readClone(folder, options))
 */
export async function mapLimit<Item, Result>(items: readonly Item[], limit: number, map: (item: Item) => Promise<Result>) {
  const results: Result[] = []
  const queue = items.entries()
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => drain(queue, results, map)))
  return results
}
