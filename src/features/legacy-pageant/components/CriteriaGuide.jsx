export const CRITERIA_GUIDE = {
  'Production Number': {
    segmentWeight: '10% of Top 3 score',
    note: 'Opening production number. Judges evaluate stage energy, performance, projection, and overall impact.',
    items: [
      'Stage Presence and Projection — 40%',
      'Execution of Choreography — 30%',
      'Confidence and Poise — 20%',
      'Overall Impact — 10%'
    ]
  },
  'Fun Wear': {
    segmentWeight: '15% of Top 3 score',
    note: 'Showcases creativity, personality, confidence, and expressive style through fun wear attire.',
    items: [
      'Creativity and Style — 30%',
      'Confidence and Carriage — 30%',
      'Stage Presence — 20%',
      'Overall Appeal — 20%'
    ]
  },
  'Preliminary Interview': {
    segmentWeight: '20% of Top 3 score',
    note: 'Live interview during coronation night.',
    items: [
      'Communication Skills and Clarity of Thought — 30%',
      'Confidence and Stage Presence — 25%',
      'Intelligence and Substance of Answer — 25%',
      'Overall Impression — 20%'
    ]
  },
  'Advocacy Interview': {
    segmentWeight: '25% of Top 3 score',
    note: 'Closed-door advocacy interview conducted before coronation night.',
    items: [
      'Depth and Relevance of Advocacy — 30%',
      'Knowledge and Understanding — 25%',
      'Communication Skills and Clarity — 25%',
      'Sincerity and Impact — 20%'
    ]
  },
  'Long Gown': {
    segmentWeight: '30% of Top 3 score',
    note: 'Highlights elegance, grace, confidence, sophistication, and gown suitability.',
    items: [
      'Elegance and Poise — 35%',
      'Stage Presence and Confidence — 35%',
      'Gown Selection and Suitability — 20%',
      'Overall Impact — 10%'
    ]
  }
};


export function getCriteriaGuide(name) {
  return CRITERIA_GUIDE[name] || {
    segmentWeight: 'Official judging criterion',
    note: 'Use the approved scoring standard set by the pageant committee.',
    items: ['Score fairly based on candidate performance.']
  };
}


export function CriteriaNote({ name }) {
  const guide = getCriteriaGuide(name);

  return (
    <details className="criteria-note-box">
      <summary>View notes</summary>
      <div className="criteria-note-content">
        <strong>{name}</strong>
        <em>{guide.segmentWeight}</em>
        <p>{guide.note}</p>
        <ul>
          {guide.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}


export function CriteriaOverview() {
  return (
    <details className="criteria-overview">
      <summary>View Judging Criteria / Notes</summary>

      <div className="criteria-overview-grid">
        {Object.entries(CRITERIA_GUIDE).map(([name, guide]) => (
          <article key={name}>
            <div>
              <h4>{name}</h4>
              <span>{guide.segmentWeight}</span>
            </div>
            <p>{guide.note}</p>
            <ul>
              {guide.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="final-interview-note">
        <strong>Finals for Top 3:</strong>
        <span> Beauty and Poise — 60% · Wit, Intelligence, and Quality of Answer — 40%</span>
      </div>
    </details>
  );
}



