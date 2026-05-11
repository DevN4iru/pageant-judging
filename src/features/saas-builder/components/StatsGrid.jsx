import Stat from './Stat.jsx';

export default function StatsGrid({ builder, templates }) {
  return (
    <div className="saas-builder-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
      <Stat label="Contestants" value={builder.contestants.length} />
      <Stat label="Judges" value={builder.judges.length} />
      <Stat label="Rounds" value={builder.rounds.length} />
      <Stat label="Templates" value={templates.length} />
    </div>
  );
}
