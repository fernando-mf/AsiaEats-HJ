import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

type FoodIconProps = {
  name: 'dumplings' | 'noodles' | 'tea';
};

function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M9 19h22c0 8-4.9 13-11 13S9 27 9 19Z" />
      <path d="M7 15h26M15 8l3 7M25 7l-3 8" />
    </svg>
  );
}

function FoodIcon({ name }: FoodIconProps) {
  if (name === 'dumplings') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M13 39c2-13 10-21 19-21s17 8 19 21c-5 6-12 9-19 9s-14-3-19-9Z" />
        <path d="M21 34c3 3 7 5 11 5s8-2 11-5M25 24l2 8M39 24l-2 8" />
      </svg>
    );
  }

  if (name === 'noodles') {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M12 29h40c0 13-8 21-20 21S12 42 12 29Z" />
        <path d="M9 25h46M23 12v12M31 10v14M39 12v12" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M17 22h29v18c0 7-5 11-14 11S18 47 18 40V22Z" />
      <path d="M46 27h4c5 0 6 4 6 7s-2 7-8 7h-2M24 15c0-3 2-4 2-7M34 15c0-3 2-4 2-7" />
    </svg>
  );
}

const dishes: Array<{ icon: FoodIconProps['name']; title: string; detail: string }> = [
  { icon: 'dumplings', title: 'Handmade dumplings', detail: 'Verdun' },
  { icon: 'noodles', title: 'Lanzhou noodles', detail: 'Chinatown' },
  { icon: 'tea', title: 'Hong Kong milk tea', detail: 'Saint-Laurent' },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-labelledby="auth-story-title">
        <div className="brand-lockup">
          <span className="brand-mark">
            <BrandMark />
          </span>
          <span className="brand-name">EatChinese</span>
          <span className="city-badge">MTL</span>
        </div>

        <div className="story-copy">
          <p className="location-line">Made for Montréal neighbourhoods</p>
          <h1 id="auth-story-title">Chinese food, found locally.</h1>
          <p>Search by dish, not just by restaurant — and discover local Chinese kitchens in Montréal.</p>
        </div>

        <div className="food-showcase" aria-label="Popular dishes around Montréal">
          {dishes.map(dish => (
            <article className="food-tile" key={dish.title}>
              <span className="food-icon">
                <FoodIcon name={dish.icon} />
              </span>
              <div>
                <h2>{dish.title}</h2>
                <p>{dish.detail}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="story-note">Local kitchens. Montréal favourites. One place to find them.</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">{children}</div>
      </section>
    </main>
  );
}
