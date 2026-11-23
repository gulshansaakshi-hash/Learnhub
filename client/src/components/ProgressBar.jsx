export default function ProgressBar({ value = 0, label = true }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress-wrap">
      <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className={`progress-fill ${v === 100 ? 'done' : ''}`} style={{ width: `${v}%` }} />
      </div>
      {label && <span className="progress-label">{v}%</span>}
    </div>
  );
}
