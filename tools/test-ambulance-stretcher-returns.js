const fs = require('fs');
const path = require('path');

const macroDir = 'mission-src/macros';
const files = fs.readdirSync(macroDir).filter((name) => name.endsWith('.json'));
const fixMode = process.argv.includes('--fix');
let fixes = 0;

function normalize(source) {
  return source.replace(/("drive_object"\s*:\s*\{\s*"name"\s*:\s*"ambustretcher[^"]*"[\s\S]*?"to"\s*:\s*)(\[[\s\S]*?\])([\s\n\r]*,\s*"VAR1")/g, (match, prefix, arrayText, suffix) => {
    const to = JSON.parse(arrayText);
    const final = to[to.length - 1];
    if (typeof final !== 'string' || !/^ambulance\d+$/.test(final)) return match;
    const rear = to[to.length - 2];
    if (rear && rear.bearing2 === 180 && rear.dist === 6 && rear.object === final) return match;
    fixes += 1;
    const cleaned = to.slice(0, -1).filter((item) => !(item && item.object === final && item.bearing2 === 180));
    cleaned.push({ bearing2: 180, dist: 6, object: final }, final);
    return `${prefix}${JSON.stringify(cleaned)}${suffix}`;
  }).replace(/("drive_object"\s*:\s*\{\s*"name"\s*:\s*"ambustretcher[^"]*"[\s\S]*?"to"\s*:\s*)"(ambulance\d+)"/g, (match, prefix, final) => {
    fixes += 1;
    return `${prefix}[{"bearing2":180,"dist":6,"object":"${final}"},"${final}"]`;
  });
}

if (fixMode) {
  for (const file of files) {
    const filePath = path.join(macroDir, file);
    const source = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, normalize(source));
  }
}

let checked = 0;
for (const file of files) {
  const source = fs.readFileSync(path.join(macroDir, file), 'utf8');
  const data = JSON.parse(source);
  function visit(value) {
    if (Array.isArray(value)) {
      const transportMoves = value.filter((item) => item?.drive_object && (/^ambustretcher/.test(item.drive_object.name) || /^ambumedic/.test(item.drive_object.name))).map((item) => item.drive_object);
      for (let i = 0; i < transportMoves.length; i += 1) for (let j = i + 1; j < transportMoves.length; j += 1) {
        const first = transportMoves[i];
        const second = transportMoves[j];
        const firstFinal = Array.isArray(first.to) ? first.to[first.to.length - 1] : first.to;
        const secondFinal = Array.isArray(second.to) ? second.to[second.to.length - 1] : second.to;
        if (!/^ambulance\d+$/.test(String(firstFinal)) && JSON.stringify(first.to) === JSON.stringify(second.to)) throw new Error(`${file}: ${first.name} and ${second.name} share a non-ambulance stopping point`);
      }
      return value.forEach(visit);
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.closest) && Array.isArray(value.to)) {
      throw new Error(`${file}: closest waypoint has an array-valued nested to; use a direct location/object target`);
    }
    const drive = value.drive_object;
    if (drive && /^ambustretcher/.test(drive.name) && Array.isArray(drive.to)) {
      const final = drive.to[drive.to.length - 1];
      if (typeof final === 'string' && /^ambulance\d+$/.test(final)) {
        checked += 1;
        const rear = drive.to[drive.to.length - 2];
        if (!rear || rear.bearing2 !== 180 || rear.dist !== 6 || rear.object !== final) throw new Error(`${file}: ${drive.name} has no required rear ingress before ${final}`);
      }
    }
    Object.values(value).forEach(visit);
  }
  visit(data);
}
console.log(JSON.stringify({ result: 'PASS', ambulanceStretcherReturns: checked, fixesApplied: fixes, rearBearing2: 180, rearDistance: 6 }, null, 2));
