import { useState } from 'react';
import { clearConsole, useConsoleEntries, visibleConsoleRows } from '../../shared/console/outputConsole';

const timeFormat = new Intl.DateTimeFormat('en-CA', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function OutputConsole() {
  const entries = useConsoleEntries();
  const [open, setOpen] = useState(true);
  const [showReads, setShowReads] = useState(false);
  const errorCount = entries.filter(entry => entry.status === 'error').length;
  const rows = visibleConsoleRows(entries, showReads);
  const summary = `Output console · ${countLabel(entries.length, 'entry', 'entries')} · ${countLabel(errorCount, 'error', 'errors')}`;

  return (
    <section
      className={`console-panel console-panel--docked${open ? '' : ' console-panel--collapsed'}`}
      aria-label="Output console"
    >
      <div className="console-bar">
        <strong className="console-summary">{summary}</strong>
        <div className="console-actions">
          {open ? (
            <>
              <label className="console-toggle">
                <input type="checkbox" checked={showReads} onChange={event => setShowReads(event.target.checked)} />
                Show reads
              </label>
              <button className="secondary-button console-button" type="button" onClick={clearConsole} disabled={!entries.length}>
                Clear
              </button>
            </>
          ) : null}
          <button
            className="secondary-button console-button"
            type="button"
            aria-expanded={open}
            aria-controls="output-console-log"
            onClick={() => setOpen(current => !current)}
          >
            {open ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {open ? (
        <div className="console" id="output-console-log">
          {rows.length ? (
            <ol className="console-list" aria-label="Command log, newest first">
              {rows.map(({ entry, count }) => {
                const ok = entry.status === 'success';
                const outcome = ok ? `✓ ok${count > 1 ? ` ×${count}` : ''}` : `✕ ${entry.message}`;
                const detail = ok ? entry.message : `${entry.code ?? 'error'}: ${entry.message}`;
                const actor = entry.actor ? `${entry.actor.username} · ${entry.actor.role}` : '';

                return (
                  <li className={`console-line console-${entry.status}`} key={entry.id} title={detail}>
                    <span className="console-time">{timeFormat.format(entry.time)}</span>
                    <code className="console-command-name">{entry.command}</code>
                    <code className="console-outcome">{outcome}</code>
                    <span className="console-actor">{actor}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="console-empty">
              {entries.length
                ? 'Only reads so far. Turn on Show reads to see them.'
                : 'No commands yet. Every command and error will be listed here.'}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
