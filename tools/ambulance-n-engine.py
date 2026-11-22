# Engine of the additional-ambulance work (2026-11-22): token substitution and the sibling-clone rules.
# Used by tools/add-ambulance-n-2026-11-22.py. Pure functions, no file access.
import json, re

STEMS_V = r'(ambulance|Ambulance|ambu|ambuname|amb|AMB|AMBU|AMBULANCE |Ambulance )'
STEMS_C = r'(ambustretcher|ambumedic)'
# vehicle k -> number used in the crew object names: ambulance1 uses ambumedic7/ambustretcher7 (the existing names 1, 3 and 12 mean other
# things), ambulance2 uses 2, the new ones use 8 and 9 (free in mission-src, checked 2026-11-22).
CREW = {1: 7, 2: 2, 3: 8, 4: 9}
LISTK = ('then', 'else', 'do', 'try', 'catch')

def vre(k):
    """regex of every name of vehicle k."""
    return re.compile('(?:' + STEMS_V + str(k) + '|' + STEMS_C + str(CREW[k]) + ')(?![0-9])')

def repl(n):
    def f(m):
        return m.group(1) + str(n) if m.group(1) is not None else m.group(2) + str(CREW[n])
    return f

def head_of(c):
    return {k: v for k, v in c.items() if k not in LISTK and k != 'create_thread'}

def child_lists(c):
    for k in LISTK:
        if isinstance(c.get(k), list):
            yield c, k
    ct = c.get('create_thread')
    if isinstance(ct, dict) and isinstance(ct.get('commands'), list):
        yield ct, 'commands'

def js(o):
    return json.dumps(o, ensure_ascii=False)

class Eng:
    """base: the vehicle whose logic is cloned (regex of its names); other: the vehicle it is told apart from; ns: the vehicles to add."""
    def __init__(self, base, other, ns):
        self.base, self.other, self.ns = base, other, tuple(ns)
        self.base_re, self.other_re = vre(base), vre(other)
        self.report = {}

    def rep(self, key, item):
        self.report.setdefault(key, []).append(item)

    def sub(self, text, n):
        return self.base_re.sub(repl(n), text)

    def sub_other(self, text, n):
        return self.other_re.sub(repl(n), text)

    def has_base(self, o):
        return bool(self.base_re.search(js(o)))

    def has_other(self, o):
        return bool(self.other_re.search(js(o)))

    def clone(self, o, n):
        return json.loads(self.sub(js(o), n))

    def is_avoid(self, e):
        """clauses of the parking rules that keep another vehicle clear."""
        if not isinstance(e, dict) or 'require' not in e:
            return False
        r = e['require']
        if isinstance(r, dict) and re.fullmatch(r'ambu[0-9]+_parked', str(r.get('local', ''))) and e.get('ne') == 'yes':
            return True
        if isinstance(r, dict) and isinstance(r.get('or'), list) and r['or'] and isinstance(r['or'][0], dict):
            f = r['or'][0].get('require', {})
            if isinstance(f, dict) and re.fullmatch(r'ambulance[0-9]', str(f.get('has_object', ''))) and r['or'][0].get('ne') == 1:
                return True
        return False

    def fix_cond(self, node):
        if isinstance(node, list):
            return [self.fix_cond(x) for x in node]
        if not isinstance(node, dict):
            return node
        out = {}
        for k, v in node.items():
            if k == 'or' and isinstance(v, list):
                new = []
                for e in v:
                    e = self.fix_cond(e)
                    new.append(e)
                    if self.has_base(e) and not self.has_other(e):
                        new.extend(self.clone(e, n) for n in self.ns)
                out[k] = new
            elif k == 'and' and isinstance(v, list):
                new = []
                for e in v:
                    new.append(self.fix_cond(e))
                    if self.is_avoid(e) and self.has_base(e) and not self.has_other(e):
                        new.extend(self.clone(e, n) for n in self.ns)
                out[k] = new
            elif k == 'create_struct' and isinstance(v, dict):
                d = {}
                for kk, vv in v.items():
                    d[kk] = self.fix_cond(vv)
                    if self.base_re.search(kk) and not self.other_re.search(kk):
                        for n in self.ns:
                            d[self.sub(kk, n)] = self.clone(vv, n)
                out[k] = d
            else:
                out[k] = self.fix_cond(v)
        return out

    def residual(self, c):
        t = js(c)
        return bool(self.base_re.search(t)) and not any(vre(n).search(t) for n in self.ns)

    def disc_head(self, h):
        """{"if": {"param": P}, "eq": X} where X names the other vehicle (a string with its name, or the number of the vehicle for param vehicle)."""
        if not isinstance(h, dict) or set(h) != {'if', 'eq'} or not isinstance(h['if'], dict):
            return False
        x = h['eq']
        if isinstance(x, str) and self.other_re.search(x):
            return True
        if x == self.other and h['if'] == {'param': 'vehicle'}:
            return True
        return False

    def base_head(self, h):
        return (isinstance(h, dict) and set(h) == {'if', 'eq'} and isinstance(h['if'], dict) and isinstance(h['eq'], str)
                and bool(self.base_re.search(h['eq'])) and not self.other_re.search(h['eq']))

    def chain_then(self, c, mname, p):
        """if D eq base then A else B  ->  if D eq base then A else (if D eq n then An else (... else B))."""
        h = head_of(c)
        node = c['else']
        for n in reversed(self.ns):
            node = [{'if': c['if'], 'eq': self.sub(h['eq'], n), 'then': self.clone(c.get('then', []), n), 'else': node}]
        new = dict(c)
        new['else'] = node
        self.rep('CHAIN-THEN', (mname, p, js(h)[:100]))
        return new

    def head_for(self, h, n):
        x = h['eq']
        return self.sub_other(x, n) if isinstance(x, str) else n

    def chain_else(self, c, mname, p):
        """if D eq other then A else B(base)  ->  else: if D eq base then B else (if D eq n then Bn else ...)."""
        h = head_of(c)
        e2 = c['else']
        node = None
        for n in reversed(self.ns):
            cur = {'if': c['if'], 'eq': self.head_for(h, n), 'then': self.clone(e2, n)}
            if node is not None:
                cur['else'] = [node]
            node = cur
        first = {'if': c['if'], 'eq': self.head_for(h, self.base), 'then': e2, 'else': [node]}
        new = dict(c)
        new['else'] = [first]
        self.rep('CHAIN', (mname, p, js(h)[:100]))
        return new

    def process_list(self, lst, mname, path):
        out = []
        for i, c in enumerate(lst):
            if not isinstance(c, dict) or c.get('#comment') is not None or not self.has_base(c):
                out.append(c)
                continue
            p = path + '/%d' % i
            h = head_of(c)
            if self.has_base(h):
                if self.has_other(h):
                    c2 = self.fix_cond(c)
                    if self.residual(c2) and c2 == c:
                        if c.get('else'):
                            self.rep('FLAG-pair-else', (mname, p, js(h)[:200]))
                            out.append(c)
                        elif isinstance(c.get('if'), dict) and set(h) == {'if', 'eq'} or 'and' in js(h)[:12]:
                            # a pair condition (this vehicle against the other one): the same rule for every added vehicle
                            out.append(c)
                            for n in self.ns:
                                out.append(self.clone(c, n))
                            self.rep('PAIR', (mname, p, js(h)[:100]))
                        else:
                            self.rep('FLAG-both', (mname, p, js(h)[:200]))
                            out.append(c)
                    else:
                        out.append(c2)
                elif c.get('else') and self.base_head(h):
                    out.append(self.chain_then(c, mname, p))
                elif c.get('else'):
                    self.rep('FLAG-else', (mname, p, js(h)[:200]))
                    out.append(c)
                else:
                    out.append(c)
                    for n in self.ns:
                        out.append(self.clone(c, n))
                    self.rep('CLONE', (mname, p, ''))
            elif (self.disc_head(h) and isinstance(c.get('else'), list) and self.has_base(c['else'])
                  and not (len(c['else']) == 1 and isinstance(c['else'][0], dict) and c['else'][0].get('else')
                           and self.base_head(head_of(c['else'][0])))):
                out.append(self.chain_else(c, mname, p))
            else:
                c = dict(c)
                for holder, key in child_lists(c):
                    if holder is c:
                        c[key] = self.process_list(c[key], mname, p + '/' + key)
                    else:
                        c['create_thread'] = dict(c['create_thread'])
                        c['create_thread'][key] = self.process_list(c['create_thread'][key], mname, p + '/ct')
                out.append(c)
        return out
