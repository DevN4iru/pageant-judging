import LegacyPageantApp from './features/legacy-pageant/LegacyPageantApp.jsx';
import SaasBuilderApp from './features/saas-builder/SaasBuilderApp.jsx';
import SaasScoringApp from './features/saas-scoring/SaasScoringApp.jsx';
import SaasTvDisplayApp from './features/saas-tv/SaasTvDisplayApp.jsx';

export default function App() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('builder') === 'saas') {
    return <SaasBuilderApp />;
  }

  if (params.get('score') === 'saas' || params.get('judge') === 'saas') {
    return <SaasScoringApp />;
  }

  if (params.get('tv') === 'saas') {
    return <SaasTvDisplayApp />;
  }

  return <LegacyPageantApp />;
}
