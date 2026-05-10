import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';
import { input } from '../saasBuilderStyles.js';

export default function JudgesPanel({
  judgeForm,
  setJudgeForm,
  saving,
  addJudge,
  judges,
  toggleJudge,
  resetJudgePin,
  removeJudge
}) {
  return (
    <Section title="Judges">
      <div className="saas-builder-judge-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px auto', gap: 12, marginBottom: 16 }}>
        <input
          style={input}
          placeholder="Judge name"
          value={judgeForm.name}
          onChange={(e) => setJudgeForm({ ...judgeForm, name: e.target.value })}
        />

        <input
          style={input}
          type="number"
          placeholder="Order"
          value={judgeForm.displayOrder}
          onChange={(e) => setJudgeForm({ ...judgeForm, displayOrder: e.target.value })}
        />

        <input
          style={input}
          placeholder="PIN"
          value={judgeForm.pin}
          onChange={(e) => setJudgeForm({ ...judgeForm, pin: eJSX;</Section>judges}ton>ckground: '#ef4444', color: 'white' }

 kirch is on /home/kirch/pageant-judging |  saas-schema-foundation? 
❯ cd ~/pageant-judging
python3 - <<'PY'
from pathlib import Path

p = Path("src/features/saas-builder/SaasBuilderApp.jsx")
text = p.read_text()

if "import JudgesPanel from './panels/JudgesPanel.jsx';" not in text:
    text = text.replace(
        "import ContestantsPanel from './panels/ContestantsPanel.jsx';",
        "import ContestantsPanel from './panels/ContestantsPanel.jsx';\nimport JudgesPanel from './panels/JudgesPanel.jsx';" 
    )

start = text.index('        <Section title="Judges">')
end = text.index('\n\n        <Section title="Rounds & Criteria">')

replacement = '''        <JudgesPanel
          judgeForm={judgeForm}
          setJudgeForm={setJudgeForm}
          saving={saving}
          addJudge={addJudge}
          judges={builder.judges}
          toggleJudge={toggleJudge}
          resetJudgePin={resetJudgePin}
          removeJudge={removeJudge}
        />'''

text = text[:start] + replacement + text[end:]

p.write_text(text)
PY

 kirch is on /home/kirch/pageant-judging |  saas-schema-foundation*? 
❯ cd ~/pageant-judging
npm run build
wc -l src/features/saas-builder/SaasBuilderApp.jsx src/features/saas-builder/panels/*.jsx src/features/saas-builder/components/*.jsx src/features/saas-builder/*.js src/features/saas-builder/*.css
git diff -- src/features/saas-builder
git status -sb

> pageant-judging@1.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 55 modules transformed.
dist/index.html                   0.42 kB │ gzip:  0.28 kB
dist/assets/index-_drK69xH.css   73.23 kB │ gzip: 12.92 kB
dist/assets/index-CB528J0d.js   265.07 kB │ gzip: 76.79 kB
✓ built in 1.47s
  637 src/features/saas-builder/SaasBuilderApp.jsx
   75 src/features/saas-builder/panels/ContestantsPanel.jsx
   64 src/features/saas-builder/panels/EventSettingsPanel.jsx
   79 src/features/saas-builder/panels/JudgesPanel.jsx
   28 src/features/saas-builder/components/MiniTable.jsx
   10 src/features/saas-builder/components/Section.jsx
   10 src/features/saas-builder/components/Stat.jsx
  127 src/features/saas-builder/saasBuilderApi.js
   25 src/features/saas-builder/saasBuilderStyles.js
  158 src/features/saas-builder/saasBuilder.css
 1213 total
diff --git a/src/features/saas-builder/SaasBuilderApp.jsx b/src/features/saas-builder/SaasBuilderApp.jsx
index 57a611c..c024ae7 100644
--- a/src/features/saas-builder/SaasBuilderApp.jsx
+++ b/src/features/saas-builder/SaasBuilderApp.jsx
@@ -26,6 +26,7 @@ import Section from './components/Section.jsx';
 import MiniTable from './components/MiniTable.jsx';
 import EventSettingsPanel from './panels/EventSettingsPanel.jsx';
 import ContestantsPanel from './panels/ContestantsPanel.jsx';
+import JudgesPanel from './panels/JudgesPanel.jsx';
 
 
 export default function SaasBuilderApp() {
@@ -528,34 +529,16 @@ export default function SaasBuilderApp() {
           removeContestant={removeContestant}
         />
 
-        <Section title="Judges">
-          <div className="saas-builder-judge-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px auto', gap: 12, marginBottom: 16 }}>
-            <input style={input} placeholder="Judge name" value={judgeForm.name} onChange={(e) => setJudgeForm({ ...judgeForm, name: e.target.value })} />
-            <input style={input} type="number" placeholder="Order" value={judgeForm.displayOrder} onChange={(e) => setJudgeForm({ ...judgeForm, displayOrder: e.target.value })} />
-            <input style={input} placeholder="PIN" value={judgeForm.pin} onChange={(e) => setJudgeForm({ ...judgeForm, pin: e.target.value })} />
-            <button type="button" disabled={saving} onClick={addJudge} style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}>Add</button>
-          </div>
-
-          <MiniTable
-            columns={[
-              { key: 'display_order', label: 'Order' },
-              { key: 'name', label: 'Name' },
-              { key: 'is_enabled', label: 'Enabled', render: (row) => row.is_enabled ? 'Yes' : 'No' },
-              {
-                key: 'actions',
-                label: 'Actions',
-                render: (row) => (
-                  <div className="saas-builder-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
-                    <button type="button" onClick={() => toggleJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>{row.is_enabled ? 'Disable' : 'Enable'}</button>
-                    <button type="button" onClick={() => resetJudgePin(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>Reset PIN</button>
-                    <button type="button" onClick={() => removeJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>Delete</button>
-                  </div>
-                )
-              }
-            ]}
-            rows={builder.judges}
-          />
-        </Section>
+        <JudgesPanel
+          judgeForm={judgeForm}
+          setJudgeForm={setJudgeForm}
+          saving={saving}
+          addJudge={addJudge}
+          judges={builder.judges}
+          toggleJudge={toggleJudge}
+          resetJudgePin={resetJudgePin}
+          removeJudge={removeJudge}
+        />
 
         <Section title="Rounds & Criteria">
           <div className="saas-builder-round-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 180px 140px 180px auto', gap: 12, marginBottom: 16 }}>
## saas-schema-foundation...origin/saas-schema-foundation
 M src/features/saas-builder/SaasBuilderApp.jsx
?? src/features/saas-builder/panels/JudgesPanel.jsx

 kirch is on /home/kirch/pageant-judging |  saas-schema-foundation*? 
❯ cd ~/pageant-judging
npm run build
wc -l src/features/saas-builder/SaasBuilderApp.jsx src/features/saas-builder/panels/*.jsx src/features/saas-builder/components/*.jsx src/features/saas-builder/*.js src/features/saas-builder/*.css
git diff -- src/features/saas-builder
git status -sb

> pageant-judging@1.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 55 modules transformed.
dist/index.html                   0.42 kB │ gzip:  0.28 kB
dist/assets/index-_drK69xH.css   73.23 kB │ gzip: 12.92 kB
dist/assets/index-CB528J0d.js   265.07 kB │ gzip: 76.79 kB
✓ built in 1.26s
  637 src/features/saas-builder/SaasBuilderApp.jsx
   75 src/features/saas-builder/panels/ContestantsPanel.jsx
   64 src/features/saas-builder/panels/EventSettingsPanel.jsx
   79 src/features/saas-builder/panels/JudgesPanel.jsx
   28 src/features/saas-builder/components/MiniTable.jsx
   10 src/features/saas-builder/components/Section.jsx
   10 src/features/saas-builder/components/Stat.jsx
  127 src/features/saas-builder/saasBuilderApi.js
   25 src/features/saas-builder/saasBuilderStyles.js
  158 src/features/saas-builder/saasBuilder.css
 1213 total
diff --git a/src/features/saas-builder/SaasBuilderApp.jsx b/src/features/saas-builder/SaasBuilderApp.jsx
index 57a611c..c024ae7 100644
--- a/src/features/saas-builder/SaasBuilderApp.jsx
+++ b/src/features/saas-builder/SaasBuilderApp.jsx
@@ -26,6 +26,7 @@ import Section from './components/Section.jsx';
 import MiniTable from './components/MiniTable.jsx';
 import EventSettingsPanel from './panels/EventSettingsPanel.jsx';
 import ContestantsPanel from './panels/ContestantsPanel.jsx';
+import JudgesPanel from './panels/JudgesPanel.jsx';
 
 
 export default function SaasBuilderApp() {
@@ -528,34 +529,16 @@ export default function SaasBuilderApp() {
           removeContestant={removeContestant}
         />
 
-        <Section title="Judges">
-          <div className="saas-builder-judge-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px auto', gap: 12, marginBottom: 16 }}>
-            <input style={input} placeholder="Judge name" value={judgeForm.name} onChange={(e) => setJudgeForm({ ...judgeForm, name: e.target.value })} />
-            <input style={input} type="number" placeholder="Order" value={judgeForm.displayOrder} onChange={(e) => setJudgeForm({ ...judgeForm, displayOrder: e.target.value })} />
-            <input style={input} placeholder="PIN" value={judgeForm.pin} onChange={(e) => setJudgeForm({ ...judgeForm, pin: e.target.value })} />
-            <button type="button" disabled={saving} onClick={addJudge} style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}>Add</button>
-          </div>
-
-          <MiniTable
-            columns={[
-              { key: 'display_order', label: 'Order' },
-              { key: 'name', label: 'Name' },
-              { key: 'is_enabled', label: 'Enabled', render: (row) => row.is_enabled ? 'Yes' : 'No' },
-              {
-                key: 'actions',
-                label: 'Actions',
-                render: (row) => (
-                  <div className="saas-builder-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
-                    <button type="button" onClick={() => toggleJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>{row.is_enabled ? 'Disable' : 'Enable'}</button>
-                    <button type="button" onClick={() => resetJudgePin(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>Reset PIN</button>
-                    <button type="button" onClick={() => removeJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>Delete</button>
-                  </div>
-                )
-              }
-            ]}
-            rows={builder.judges}
-          />
-        </Section>
+        <JudgesPanel
+          judgeForm={judgeForm}
+          setJudgeForm={setJudgeForm}
+          saving={saving}
+          addJudge={addJudge}
+          judges={builder.judges}
+          toggleJudge={toggleJudge}
+          resetJudgePin={resetJudgePin}
+          removeJudge={removeJudge}
+        />
 
         <Section title="Rounds & Criteria">
           <div className="saas-builder-round-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 180px 140px 180px auto', gap: 12, marginBottom: 16 }}>
## saas-schema-foundation...origin/saas-schema-foundation
 M src/features/saas-builder/SaasBuilderApp.jsx
?? src/features/saas-builder/panels/JudgesPanel.jsx

 kirch is on /home/kirch/pageant-judging |  saas-schema-foundation*? 
❯ cd ~/pageant-judging
git add src/features/saas-builder
git commit -m "Split SaaS builder judges panel"
git push
git status -sb
[saas-schema-foundation 87cbfa8] Split SaaS builder judges panel
 2 files changed, 90 insertions(+), 28 deletions(-)
 create mode 100644 src/features/saas-builder/panels/JudgesPanel.jsx
/usr/bin/gh auth git-credential get: 1: /usr/bin/gh: not found
/usr/bin/gh auth git-credential store: 1: /usr/bin/gh: not found
Enumerating objects: 14, done.
Counting objects: 100% (14/14), done.
Delta compression using up to 4 threads
Compressing objects: 100% (8/8), done.
Writing objects: 100% (8/8), 1.24 KiB | 1.24 MiB/s, done.
Total 8 (delta 7), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (7/7), completed with 6 local objects.
To https://github.com/Syris-EkzD/pageant-judging-1.git
   84e9ff0..87cbfa8  saas-schema-foundation -> saas-schema-foundation
## saas-schema-foundation...origin/saas-schema-foundation

 kirch is on /home/kirch/pageant-judging |  saas-schema-foundation
❯ cd ~/pageant-judging
git status -sb
npm run build
## saas-schema-foundation...origin/saas-schema-foundation

> pageant-judging@1.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 55 modules transformed.
dist/index.html                   0.42 kB │ gzip:  0.28 kB
dist/assets/index-_drK69xH.css   73.23 kB │ gzip: 12.92 kB
dist/assets/index-CB528J0d.js   265.07 kB │ gzip: 76.79 kB
✓ built in 1.50s

 kirch is on /home/kirch/pageant-judging |  saas-schema-foundation
❯ cd ~/pageant-judging
cat > src/features/saas-builder/panels/AuditLogsPanel.jsx <<'JSX'
import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';

export default function AuditLogsPanel({ auditLogs }) {
  return (
    <Section title="Audit Logs">
      <MiniTable
        columns={[
          {
            key: 'created_at',
            label: 'Time',
            render: (row) => new Date(row.created_at).toLocaleString()
          },
          { key: 'action_type', label: 'Action' },
          { key: 'target_type', label: 'Target' },
          { key: 'reason', label: 'Reason' }
        ]}
        rows={auditLogs}
      />
    </Section>
  );
}
