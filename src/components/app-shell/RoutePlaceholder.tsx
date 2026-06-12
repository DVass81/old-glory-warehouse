type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  status: string;
  description: string;
};

export function RoutePlaceholder({ eyebrow, title, status, description }: RoutePlaceholderProps) {
  return (
    <section className="screen-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="status-chip info">{status}</span>
      </div>
      <div className="empty-state">
        <p>{description}</p>
      </div>
    </section>
  );
}
