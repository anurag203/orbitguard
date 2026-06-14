import { ArrowRight, ChevronDown, Info, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

export function PageShell({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={clsx("page-shell", className)}>{children}</section>;
}

export function RouteIntro({
  eyebrow,
  title,
  copy,
  children
}: PropsWithChildren<{ copy: string; eyebrow: string; title: string }>) {
  return (
    <header className="route-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
      {children ? <div className="route-intro-actions">{children}</div> : null}
    </header>
  );
}

export function StatusBadge({ tone = "neutral", value }: { tone?: "clear" | "critical" | "neutral" | "warning"; value: string }) {
  return <span className={clsx("status-badge", tone)}>{value}</span>;
}

export function Metric({
  label,
  value,
  helper,
  tone = "neutral"
}: {
  helper?: string;
  label: string;
  tone?: "clear" | "critical" | "neutral" | "warning";
  value: ReactNode;
}) {
  return (
    <div className={clsx("metric", tone)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

export function ExplainPanel({
  title,
  children,
  tone = "neutral"
}: PropsWithChildren<{ title: string; tone?: "clear" | "critical" | "neutral" | "warning" }>) {
  return (
    <aside className={clsx("explain-panel", tone)}>
      <Info size={16} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}

export function Disclosure({ children, title }: PropsWithChildren<{ title: string }>) {
  return (
    <details className="disclosure">
      <summary>
        <span>{title}</span>
        <ChevronDown size={16} />
      </summary>
      <div>{children}</div>
    </details>
  );
}

export function PrimaryAction({
  children,
  className,
  isLoading,
  loadingLabel,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; loadingLabel?: string }>) {
  return (
    <button className={clsx("primary-action", className)} disabled={props.disabled || isLoading} type="button" {...props}>
      {isLoading ? <Loader2 className="button-spinner" size={16} /> : null}
      <span>{isLoading ? (loadingLabel ?? "Working") : children}</span>
      {isLoading ? null : <ArrowRight size={16} />}
    </button>
  );
}

export function RouteButton({ children, to }: PropsWithChildren<{ to: string }>) {
  return (
    <Link className="route-button" to={to}>
      <span>{children}</span>
      <ArrowRight size={16} />
    </Link>
  );
}

export function EvidenceList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="quiet">No additional evidence yet.</p>;
  }
  return (
    <ul className="evidence-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
