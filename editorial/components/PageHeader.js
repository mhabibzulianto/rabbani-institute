export default function PageHeader({ title, description, badge = "MADRASAH" }) {
  return (
    <header className="page-header">
      <div>
        <p className="page-badge">{badge}</p>
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
    </header>
  );
}
