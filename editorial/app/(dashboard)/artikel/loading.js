export default function LoadingArticles() {
  return <main className="page-shell article-workspace" aria-busy="true" aria-label="Memuat artikel"><div className="article-skeleton article-skeleton-heading" /><div className="article-list-panel article-loading-panel">{Array.from({ length: 6 }, (_, index) => <div className="article-skeleton article-skeleton-row" key={index} />)}</div><p className="visually-hidden" role="status">Memuat artikel…</p></main>;
}
