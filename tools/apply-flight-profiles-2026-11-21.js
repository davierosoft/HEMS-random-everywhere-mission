// Applies the doctor's v2 flight constraint profiles (tools/pending-patches/flight_constraints_patch_v2-2026-11-21.json) to the health rows:
// field flight_constraint_profile on every row whose status is PENDING (v1 proposal kept, not reviewed) or PROFILE_CHANGED; NONE rows get no field.
// The two renames of the doctor (health16 6 and 7) are applied to the id. Idempotent. Run: node tools/apply-flight-profiles-2026-11-21.js --write
const fs = require('fs');
const patch = JSON.parse(fs.readFileSync('tools/pending-patches/flight_constraints_patch_v2-2026-11-21.json', 'utf8'));
const files = ['05-health-profiles.json', '05b-health-profiles-continued.json', '06-special-health-and-messages.json'].map((f) => 'mission-src/data/' + f);
const data = files.map((f) => ({ f, d: JSON.parse(fs.readFileSync(f, 'utf8')), changed: false }));
const find = (t) => data.find((x) => Array.isArray(x.d[t]));
let applied = 0, renamed = 0, cleared = 0;
for (const e of patch.entries) {
  const src = find(e.table);
  if (!src) throw new Error('table ' + e.table);
  const row = src.d[e.table][e.index];
  if (!row || (row.id !== e.id && row.id !== e.rename_to)) throw new Error('row mismatch ' + e.table + ' ' + e.index + ' ' + e.id);
  if (e.rename_to && row.id !== e.rename_to) { row.id = e.rename_to; renamed++; src.changed = true; }
  if (e.flight_constraint_profile) {
    if (row.flight_constraint_profile !== e.flight_constraint_profile) { row.flight_constraint_profile = e.flight_constraint_profile; applied++; src.changed = true; }
  } else if ('flight_constraint_profile' in row) { delete row.flight_constraint_profile; cleared++; src.changed = true; }
}
console.log({ applied, renamed, cleared });
if (process.argv.includes('--write')) for (const x of data) if (x.changed) fs.writeFileSync(x.f, JSON.stringify(x.d, null, 2) + '\n');
