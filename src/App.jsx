import LegacyPageantApp from './features/legacy-pageant/LegacyPageantApp.jsx';
import SaasBuilderApp from './features/saas-builder/SaasBuilderApp.jsx';

export default function App() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('builder') === 'saas') {
    return <SaasBuilderApp />;
  }

  return <LegacyPageantApp />;
}
