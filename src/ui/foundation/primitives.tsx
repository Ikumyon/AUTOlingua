import { useState } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'danger';
  readonly loading?: boolean;
}

export const Button = ({
  variant = 'secondary',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) => (
  <button
    className="al-button"
    data-variant={variant}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading ? '処理中…' : children}
  </button>
);

export const IconButton = ({ 'aria-label': label, ...props }: ButtonProps) => {
  if (!label) throw new Error('IconButton requires an accessible name.');
  return <Button aria-label={label} {...props} />;
};

export interface FieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly help?: string;
  readonly error?: string;
  readonly children: ReactNode;
}

export const Field = ({ label, htmlFor, help, error, children }: FieldProps) => (
  <div className="al-field">
    <label className="al-label" htmlFor={htmlFor}>
      {label}
    </label>
    {children}
    {help && <span className="al-help">{help}</span>}
    {error && (
      <span className="al-error" role="alert">
        {error}
      </span>
    )}
  </div>
);

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input className="al-control" {...props} />
);
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className="al-control" rows={4} {...props} />
);
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className="al-control" {...props} />
);

export const Checkbox = ({
  children,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { readonly children: ReactNode }) => (
  <label className="al-cluster">
    <input type="checkbox" {...props} /> <span>{children}</span>
  </label>
);

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}

export const Dialog = ({ open, title, children, onClose }: DialogProps) =>
  open ? (
    <div
      className="al-dialog-backdrop"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="al-dialog al-stack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="al-dialog-title"
      >
        <div className="al-cluster">
          <h2 id="al-dialog-title">{title}</h2>
          <IconButton autoFocus aria-label="ダイアログを閉じる" onClick={onClose}>
            ×
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  ) : null;

export const ConfirmButton = ({
  children,
  title,
  message,
  onConfirm,
  ...props
}: ButtonProps & {
  readonly title: string;
  readonly message: string;
  readonly onConfirm: () => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...props} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} title={title} onClose={() => setOpen(false)}>
        <p>{message}</p>
        <div className="al-cluster">
          <Button onClick={() => setOpen(false)}>キャンセル</Button>
          <Button
            variant="danger"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            実行
          </Button>
        </div>
      </Dialog>
    </>
  );
};

export interface TabItem {
  readonly id: string;
  readonly label: string;
}
export const Tabs = ({
  items,
  activeId,
  onChange,
}: {
  readonly items: readonly TabItem[];
  readonly activeId: string;
  readonly onChange: (id: string) => void;
}) => (
  <div
    className="al-tabs"
    role="tablist"
    aria-label="機能"
    onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'Home' &&
        event.key !== 'End'
      )
        return;
      event.preventDefault();
      const current = items.findIndex((item) => item.id === activeId);
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (current + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      const item = items[next];
      if (item) {
        onChange(item.id);
        document.getElementById(`tab-${item.id}`)?.focus();
      }
    }}
  >
    {items.map((item) => (
      <button
        key={item.id}
        id={`tab-${item.id}`}
        className="al-tab"
        role="tab"
        aria-selected={activeId === item.id}
        aria-controls={`panel-${item.id}`}
        tabIndex={activeId === item.id ? 0 : -1}
        onClick={() => onChange(item.id)}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export const Menu = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => (
  <nav aria-label={label} className="al-cluster">
    {children}
  </nav>
);
export const Tooltip = ({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) => <span title={label}>{children}</span>;

export interface ToastMessage {
  readonly id: string;
  readonly message: string;
  readonly tone: 'info' | 'success' | 'warning' | 'danger';
}
export const ToastRegion = ({ messages }: { readonly messages: readonly ToastMessage[] }) => (
  <div className="al-toast-region" aria-live="polite" aria-atomic="false">
    {messages.map((message) => (
      <div className="al-toast" data-tone={message.tone} key={message.id}>
        {message.message}
      </div>
    ))}
  </div>
);

export const Progress = ({ value, label }: { readonly value: number; readonly label: string }) => {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className="al-stack">
      <span className="al-muted">
        {label}: {Math.round(bounded)}%
      </span>
      <div
        className="al-progress"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bounded}
      >
        <span style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
};

export interface DataGridColumn<Row> {
  readonly id: string;
  readonly label: string;
  readonly width?: number | undefined;
  readonly render: (row: Row) => ReactNode;
}
export const DataGrid = <Row,>({
  rows,
  columns,
  rowKey,
  emptyMessage,
  onColumnWidthChange,
}: {
  readonly rows: readonly Row[];
  readonly columns: readonly DataGridColumn<Row>[];
  readonly rowKey: (row: Row) => string;
  readonly emptyMessage: string;
  readonly onColumnWidthChange?: (id: string, width: number) => void;
}) => (
  <div className="al-table-wrap">
    <table className="al-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              scope="col"
              key={column.id}
              style={column.width ? { width: column.width } : undefined}
            >
              {column.label}
              {onColumnWidthChange && (
                <input
                  className="al-column-resizer"
                  aria-label={`${column.label}列の幅`}
                  type="range"
                  min={80}
                  max={800}
                  value={column.width ?? 180}
                  onChange={(event) =>
                    onColumnWidthChange(column.id, Number(event.currentTarget.value))
                  }
                />
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="al-muted">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.id}>{column.render(row)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
