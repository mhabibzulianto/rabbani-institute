export default function PageHeader({ title, description, badge = "MADRASAH", actions }) {
  return (
    <header className={`page-header${actions ? " page-header-with-actions" : ""}`}>
      <div>
        <p className="page-badge">{badge}</p>
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
