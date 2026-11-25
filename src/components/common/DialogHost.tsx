import { useId, useRef, useState } from 'react';
import { useModal } from '../../hooks/useModal';
import { useDialogStore, type DialogRequest } from '../../utils/dialogs';

/** Draws the dialog at the front of the queue from showAlert / showConfirm / showPrompt. */
export function DialogHost() {
  const current = useDialogStore(s => s.queue[0]);
  if (!current) return null;
  return <AppDialog key={current.id} request={current} />;
}

// Every button has a border (transparent where colour fills it) so its edge
// still shows in Windows high-contrast / forced-colours mode
const BTN = 'px-3 py-1.5 rounded-md text-xs cursor-pointer border border-transparent';
const SECONDARY = `${BTN} text-text-secondary bg-bg-cell border-border-control hover:bg-bg-cell-hover`;
const PRIMARY = `${BTN} font-semibold bg-accent-green text-on-accent hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed`;
const DANGER = `${BTN} font-semibold bg-accent-red text-on-accent hover:brightness-110`;

function AppDialog({ request }: { request: DialogRequest }) {
  const shift = useDialogStore(s => s.shift);
  const titleId = useId();
  const descId = useId();
  const inputId = useId();
  const [value, setValue] = useState(request.kind === 'prompt' ? request.defaultValue : '');

  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Settle the promise and take this request off the queue
  const finish = (answer: boolean) => {
    shift();
    if (request.kind === 'alert') request.resolve();
    else if (request.kind === 'confirm') request.resolve(answer);
    else request.resolve(answer && value.trim() ? value.trim() : null);
  };

  // Where focus starts: the safe choice for anything that can't be undone,
  // otherwise the main action; the text box for a prompt
  const initialFocus =
    request.kind === 'prompt' ? inputRef
      : request.kind === 'confirm' && request.danger ? cancelRef
        : confirmRef;
  const ref = useModal<HTMLDivElement>(() => finish(false), initialFocus);

  const paragraphs = request.message ? request.message.split(/\n\s*\n/) : [];
  const confirmClass = request.kind === 'confirm' && request.danger ? DANGER : PRIMARY;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        ref={ref}
        role={request.kind === 'prompt' ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={paragraphs.length ? descId : undefined}
        className="bg-bg-secondary border border-border-control rounded-xl shadow-2xl w-[92vw] max-w-md max-h-[90vh] overflow-y-auto flex flex-col"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); finish(true); }}
          className="flex flex-col gap-3 px-5 pt-4 pb-3"
        >
          <h2 id={titleId} className="text-sm font-bold text-text-primary">{request.title}</h2>
          {paragraphs.length > 0 && (
            <div id={descId} className="flex flex-col gap-2 text-xs text-text-secondary leading-relaxed">
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          {request.kind === 'prompt' && (
            <div className="flex flex-col gap-1">
              <label htmlFor={inputId} className="text-[11px] uppercase tracking-wider text-text-muted">{request.label}</label>
              <input
                id={inputId}
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                maxLength={60}
                className="px-2 py-1.5 rounded-md text-sm bg-bg-primary text-text-primary border border-border-control"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            {request.kind !== 'alert' && (
              <button ref={cancelRef} type="button" onClick={() => finish(false)} className={SECONDARY}>
                {request.kind === 'confirm' ? request.cancelLabel : 'Cancel'}
              </button>
            )}
            <button
              ref={confirmRef}
              type="submit"
              disabled={request.kind === 'prompt' && !value.trim()}
              className={confirmClass}
            >
              {request.kind === 'alert' ? request.okLabel : request.confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
