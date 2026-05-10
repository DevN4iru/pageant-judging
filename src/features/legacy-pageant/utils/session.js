export function getSavedJudge() {
  try {
    return JSON.parse(localStorage.getItem('judge') || 'null');
  } catch {
    return null;
  }
}

