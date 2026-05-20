import { QuickActionCard } from "./QuickActionCard";

export function QuickActions({ actions, title = "Acciones rapidas" }) {
  return (
    <section className="quick-actions-section" aria-label={title}>
      <div className="quick-actions-header">
        <h2>{title}</h2>
      </div>
      <div className="quick-actions-grid">
        {actions.map((action) => (
          <QuickActionCard
            actionLabel={action.actionLabel}
            accent={action.accent}
            description={action.description}
            icon={action.icon}
            key={action.title}
            onClick={action.onClick}
            title={action.title}
          />
        ))}
      </div>
    </section>
  );
}
