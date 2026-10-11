export const collectionTypes = ["courses", "exams", "articles"];
export function collectionRequests(document) {
  return collectionTypes.flatMap((type) => {
    const blocks = document.blocks.filter((b) => b.enabled && b.type === type);
    if (!blocks.length) return [];
    return [{ type, latestLimit: Math.max(0, ...blocks.filter((b) => b.props.source === "latest").map((b) => b.props.limit)), ids: [...new Set(blocks.filter((b) => b.props.source === "selected").flatMap((b) => b.props.selectedIds))] }];
  });
}
export function collectionItems(block, pools) {
  const pool = pools[block.type] || { latest: [], selected: [] };
  if (block.props.source === "latest") return pool.latest.slice(0, block.props.limit);
  const byId = new Map(pool.selected.map((item) => [Number(item.id), item]));
  return [...new Set(block.props.selectedIds)].flatMap((id) => byId.has(id) ? [byId.get(id)] : []).slice(0, block.props.limit);
}
