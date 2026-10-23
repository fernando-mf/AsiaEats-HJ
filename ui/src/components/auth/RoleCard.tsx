export type PublicRole = 'customer' | 'restaurant' | 'courier';

type RoleCardProps = {
  role: PublicRole;
  title: string;
  description: string;
  selected: boolean;
  onSelect: (role: PublicRole) => void;
};

function RoleIcon({ role }: { role: PublicRole }) {
  if (role === 'customer') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 21c.5-4.3 3.2-6.5 7.5-6.5s7 2.2 7.5 6.5" />
      </svg>
    );
  }

  if (role === 'restaurant') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10v10h16V10M3 10l2-6h14l2 6" />
        <path d="M3 10c0 2 3 3 4.5.5C9 13 12 12 12 10c0 2 3 3 4.5.5C18 13 21 12 21 10M8 20v-5h4v5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M9 18h7M4 18V8h10l3 5h3v5M14 8V5h-3" />
    </svg>
  );
}

export function RoleCard({ role, title, description, selected, onSelect }: RoleCardProps) {
  return (
    <button
      className={`role-card${selected ? ' role-card--selected' : ''}`}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(role)}
    >
      <span className="role-icon">
        <RoleIcon role={role} />
      </span>
      <span className="role-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="role-check" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="m3.5 8 3 3 6-6" />
        </svg>
      </span>
    </button>
  );
}
