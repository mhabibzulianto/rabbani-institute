// Keep authored headings but prevent skipped levels beneath a section heading.
export function landingHeadings(node, parentLevel = 1) {
  let previous = parentLevel;
  function visit(value) {
    if (!value) return value;
    const result = { ...value };
    if (value.type === "heading") {
      previous = Math.max(parentLevel + 1, Math.min(value.attrs?.level || 2, previous + 1));
      result.attrs = { ...value.attrs, level: previous };
    }
    if (value.content) result.content = value.content.map(visit);
    return result;
  }
  return visit(node);
}
