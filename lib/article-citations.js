export function normalizeCitation(citation = {}) {
  return {
    id: citation.id || "",
    number: citation.number || null,
    sourceType: citation.sourceType || "book",
    author: citation.author || "",
    year: citation.year || "",
    title: citation.title || "",
    publisher: citation.publisher || "",
    publication: citation.publication || "",
    journal: citation.journal || "",
    volume: citation.volume || "",
    issue: citation.issue || "",
    page: citation.page || "",
    place: citation.place || "",
    institution: citation.institution || "",
    url: citation.url || "",
    accessedAt: citation.accessedAt || "",
    note: citation.note || "",
  };
}

export function formatInlineCitation(citation) {
  const source = normalizeCitation(citation);

  if (!source.author && !source.year) {
    return source.title || "Sumber";
  }

  if (!source.author) {
    return source.year;
  }

  if (!source.year) {
    return `${source.author}, n.d.`;
  }

  return `${source.author}, ${source.year}`;
}

export function formatHarvardCitation(citation) {
  const source = normalizeCitation(citation);
  const baseAuthor = source.author || "Anon.";
  const baseYear = source.year || "n.d.";

  switch (source.sourceType) {
    case "journal":
      return joinCitationParts([
        `${baseAuthor} (${baseYear})`,
        wrapTitle(source.title),
        source.journal,
        joinVolumeIssue(source.volume, source.issue),
        source.page ? `pp. ${source.page}` : "",
        source.url,
        source.accessedAt ? `[Accessed ${source.accessedAt}]` : "",
      ]);
    case "website":
      return joinCitationParts([
        `${baseAuthor} (${baseYear})`,
        wrapTitle(source.title),
        source.publication || source.publisher,
        source.url,
        source.accessedAt ? `[Accessed ${source.accessedAt}]` : "",
      ]);
    case "thesis":
      return joinCitationParts([
        `${baseAuthor} (${baseYear})`,
        wrapTitle(source.title),
        "Thesis",
        source.institution,
        source.place,
        source.url,
        source.accessedAt ? `[Accessed ${source.accessedAt}]` : "",
      ]);
    case "other":
      return joinCitationParts([
        `${baseAuthor} (${baseYear})`,
        wrapTitle(source.title),
        source.publication,
        source.publisher,
        source.place,
        source.page ? `p. ${source.page}` : "",
        source.url,
        source.accessedAt ? `[Accessed ${source.accessedAt}]` : "",
        source.note,
      ]);
    case "book":
    default:
      return joinCitationParts([
        `${baseAuthor} (${baseYear})`,
        wrapTitle(source.title),
        source.place,
        source.publisher,
        source.page ? `p. ${source.page}` : "",
        source.url,
        source.accessedAt ? `[Accessed ${source.accessedAt}]` : "",
      ]);
  }
}

function joinCitationParts(parts) {
  return parts
    .map((part) => `${part || ""}`.trim())
    .filter(Boolean)
    .join(". ")
    .replace(/\.\s*\[/g, " [")
    .trim();
}

function joinVolumeIssue(volume, issue) {
  if (volume && issue) {
    return `vol. ${volume}, no. ${issue}`;
  }

  if (volume) {
    return `vol. ${volume}`;
  }

  if (issue) {
    return `no. ${issue}`;
  }

  return "";
}

function wrapTitle(value) {
  return value ? value : "";
}
