# One-shot (2026-11-21): DE/FR/IT screen texts of the 49 new keys (UI.3906-3907: FIT HEADSET, added for 170.50) (release 0.997 170.49) and the DE/FR pack lines (DSC.75-79, FC.*).
# Run: python tools/add-translations-2026-11-21.py   (idempotent)
import json, re, io
T = {
'UI.3859': ('(P)FLUGGRENZEN: Solange ein Patient auf der Trage liegt, überwacht die Mission den Flug anhand der Grenzwerte der Erkrankung: Höhe über 3000 ft, vertikale Last, Querneigung und Nase hoch. Die Crew warnt dich; jenseits der Grenze verliert der Patient SpO2 oder Lifescore. Standardmäßig AUS, bis es im Simulator getestet ist.',
 "(P)LIMITES DE VOL : tant qu'un patient est sur le brancard, la mission surveille le vol selon les limites de la pathologie : altitude au-dessus de 3000 ft, charge verticale, inclinaison et cabré. L'équipage vous avertit ; au-delà de la limite, le patient perd de la SpO2 ou du lifescore. DÉSACTIVÉ par défaut jusqu'au test en simulateur.",
 "(P)LIMITI DI VOLO: finché un paziente è sulla barella, la missione controlla il volo rispetto ai limiti della patologia: quota sopra 3000 ft, carico verticale, inclinazione laterale e muso alto. L'equipaggio ti avvisa; oltre il limite il paziente perde SpO2 o lifescore. DISATTIVATO di default fino al test nel simulatore."),
'UI.3860': ('Info: Ein Taucher ist nach einem Tauchgang erkrankt. Medizinische Hilfe ist erforderlich.', "Info : un plongeur est malade après une plongée. Une assistance médicale est nécessaire.", "Info: un subacqueo si è sentito male dopo un'immersione. Serve assistenza medica."),
'UI.3861': ('Ein Taucher fühlte sich nach dem Auftauchen an der Tauchstelle unwohl. Dringende medizinische Hilfe wurde angefordert.', "Un plongeur s'est senti mal après être remonté au site de plongée. Une assistance médicale urgente a été demandée.", "Un subacqueo si è sentito male dopo essere riemerso al sito di immersione. È stata richiesta assistenza medica urgente."),
'UI.3862': ('Das Tauchzentrum meldet einen Taucher mit Gelenkschmerzen und Hautausschlag nach einem tiefen Tauchgang.', "Le centre de plongée signale un plongeur avec des douleurs articulaires et une éruption cutanée après une plongée profonde.", "Il centro immersioni segnala un subacqueo con dolori articolari ed eruzione cutanea dopo un'immersione profonda."),
'UI.3863': ('Ein Taucher ist wenige Sekunden nach dem Auftauchen zusammengebrochen. Sein Tauchpartner fordert dringend ein medizinisches Team an.', "Un plongeur s'est effondré quelques secondes après être remonté. Son binôme demande une équipe médicale en urgence.", "Un subacqueo è crollato pochi secondi dopo essere riemerso. Il compagno di immersione chiede urgentemente un team medico."),
'UI.3864': ('Anruf von einem Tauchboot: Ein Taucher hat nach einem zu schnellen Aufstieg Atemnot und kann einen Arm nicht bewegen.', "Appel d'un bateau de plongée : un plongeur a du mal à respirer et ne peut plus bouger un bras après une remontée trop rapide.", "Chiamata da un'imbarcazione per immersioni: un subacqueo ha difficoltà respiratorie e non riesce a muovere un braccio dopo una risalita rapida."),
'UI.3865': ('Ziel: Fliege zur Tauchstelle und leiste Hilfe. Fliege tief und sanft, bringe den Taucher dann bei Bedarf in ein Krankenhaus mit Druckkammer.', "Objectif : volez jusqu'au site de plongée et portez assistance. Volez bas et en douceur, puis amenez le plongeur dans un hôpital avec caisson hyperbare si nécessaire.", "Obiettivo: vola al sito di immersione e presta assistenza. Vola basso e con dolcezza, poi porta il subacqueo in un ospedale con camera iperbarica se necessario."),
'UI.3866': ('Info: Autobahnunfall mit einem Fahrer mit schwerem Brusttrauma.', "Info : accident d'autoroute avec un conducteur souffrant d'un traumatisme thoracique grave.", "Info: incidente in autostrada con un conducente con grave trauma toracico."),
'UI.3867': ('Ein Fahrer wurde bei einem Unfall auf der Autobahn verletzt und hat starke Atemnot.', "Un conducteur a été blessé dans un accident sur l'autoroute et a de grandes difficultés respiratoires.", "Un conducente è rimasto ferito in un incidente in autostrada e ha gravi difficoltà respiratorie."),
'UI.3868': ('Autobahnunfall. Ein Verletzter mit Brustschmerzen und Atemnot. Lage unklar.', "Accident d'autoroute. Un blessé avec douleur thoracique et difficultés respiratoires. Situation peu claire.", "Incidente in autostrada. Un ferito con dolore al petto e difficoltà respiratorie. Situazione poco chiara."),
'UI.3869': ('Ein Auto ist von der Autobahn abgekommen. Der Fahrer klagt über Brustschmerzen und Kurzatmigkeit.', "Une voiture a quitté l'autoroute. Le conducteur se plaint de douleurs thoraciques et d'essoufflement.", "Un'auto è uscita dall'autostrada. Il conducente lamenta dolore al petto e mancanza di fiato."),
'UI.3870': ('Notruf von der Autobahn: verletzter Fahrer mit Brusttrauma, zunehmend kurzatmig.', "Appel d'urgence depuis l'autoroute : conducteur blessé avec traumatisme thoracique, de plus en plus essoufflé.", "Chiamata di emergenza dall'autostrada: conducente ferito con trauma toracico, sempre più affannato."),
'UI.3871': ('Ziel: Fliege zur Unfallstelle und leiste Hilfe. Versorge die Brustverletzung und bringe den Patienten dann in ein Traumazentrum.', "Objectif : volez sur place et portez assistance. Traitez la blessure thoracique, puis amenez le patient dans un centre de traumatologie.", "Obiettivo: vola sul posto e presta assistenza. Tratta la lesione toracica, poi porta il paziente in un centro traumatologico."),
'UI.3872': ('Info: Eine Person ist in ein flaches Becken gesprungen und kann sich nicht bewegen.', "Info : une personne a plongé dans une piscine peu profonde et ne peut plus bouger.", "Info: una persona si è tuffata in una piscina bassa e non riesce a muoversi."),
'UI.3873': ('Eine Person ist in einem Garten kopfüber in ein flaches Becken gesprungen und kann Arme und Beine nicht bewegen.', "Une personne a plongé dans une piscine peu profonde d'un jardin et ne peut plus bouger les bras et les jambes.", "Una persona si è tuffata in una piscina bassa di un giardino e non riesce a muovere braccia e gambe."),
'UI.3874': ('Gartenunfall. Eine Person ist nach einem Kopfsprung auf dem Beckenboden aufgeschlagen. Dringende medizinische Hilfe wurde angefordert.', "Accident dans un jardin. Une personne a heurté le fond de la piscine après un plongeon. Une assistance médicale urgente a été demandée.", "Incidente in un giardino. Una persona ha battuto sul fondo della piscina dopo un tuffo. È stata richiesta assistenza medica urgente."),
'UI.3875': ('Verletzte Person an einem privaten Pool. Sie klagt über Nackenschmerzen und Taubheitsgefühl.', "Personne blessée près d'une piscine privée. Elle se plaint de douleurs à la nuque et d'engourdissements.", "Persona ferita a una piscina privata. Lamenta dolore al collo e intorpidimento."),
'UI.3876': ('Anruf aus einem Garten: Ein Schwimmer wurde aus einem flachen Becken gezogen, der Nacken scheint verletzt.', "Appel depuis un jardin : un nageur a été sorti d'une piscine peu profonde, la nuque semble blessée.", "Chiamata da un giardino: un nuotatore è stato tirato fuori da una piscina bassa, il collo sembra ferito."),
'UI.3877': ('Ziel: Fliege zur Einsatzstelle und leiste Hilfe. Halte die Wirbelsäule immobilisiert und fliege sanft, solange der Patient an Bord ist.', "Objectif : volez sur place et portez assistance. Gardez la colonne immobilisée et volez en douceur tant que le patient est à bord.", "Obiettivo: vola sul posto e presta assistenza. Mantieni la colonna immobilizzata e vola con dolcezza finché il paziente è a bordo."),
'UI.3878': ('Info: Ein Krampfanfall am Ende der Schwangerschaft zu Hause.', "Info : une crise convulsive en fin de grossesse à domicile.", "Info: una crisi convulsiva a fine gravidanza a casa."),
'UI.3879': ('Eine schwangere Frau hatte zu Hause einen Krampfanfall. Dringende medizinische Hilfe wurde angefordert.', "Une femme enceinte a eu une crise convulsive chez elle. Une assistance médicale urgente a été demandée.", "Una donna incinta ha avuto una crisi convulsiva a casa. È stata richiesta assistenza medica urgente."),
'UI.3880': ('Die Familie meldet eine Frau am Ende der Schwangerschaft mit Kopfschmerzen, Sehstörungen und einem Krampfanfall.', "La famille signale une femme en fin de grossesse avec des maux de tête, des troubles de la vue et une crise convulsive.", "La famiglia segnala una donna a fine gravidanza con mal di testa, disturbi della vista e una crisi convulsiva."),
'UI.3881': ('Ein Familienmitglied ruft an: Eine schwangere Verwandte ist zusammengebrochen und hatte Krämpfe im Haus.', "Un proche appelle : une parente enceinte s'est effondrée et a eu des convulsions dans la maison.", "Un familiare chiama: una parente incinta è crollata e ha avuto convulsioni in casa."),
'UI.3882': ('Landhaus. Eine Frau in den letzten Schwangerschaftswochen ist nach einem Krampfanfall verwirrt.', "Maison de campagne. Une femme dans les dernières semaines de grossesse est confuse après une crise convulsive.", "Casa di campagna. Una donna nelle ultime settimane di gravidanza è confusa dopo una crisi convulsiva."),
'UI.3883': ('Ziel: Fliege zur Einsatzstelle und leiste Hilfe. Halte die Patientin ruhig und bringe sie in ein Krankenhaus mit Geburtshilfe.', "Objectif : volez sur place et portez assistance. Gardez la patiente au calme et amenez-la dans un hôpital avec service d'obstétrique.", "Obiettivo: vola sul posto e presta assistenza. Mantieni calma la paziente e portala in un ospedale con reparto di ostetricia."),
'UI.3884': ('Info: Eine Person ist auf dem Platz vor einem Bahnhof zusammengebrochen.', "Info : une personne s'est effondrée sur la place devant une gare.", "Info: una persona è crollata nella piazza davanti a una stazione ferroviaria."),
'UI.3885': ('Eine Person ist auf dem Platz vor dem Bahnhof mit starken Brust- und Rückenschmerzen zusammengebrochen.', "Une personne s'est effondrée sur la place devant la gare avec de fortes douleurs à la poitrine et dans le dos.", "Una persona è crollata nella piazza davanti alla stazione con forte dolore al petto e alla schiena."),
'UI.3886': ('Passanten melden eine Person mit reißenden Brustschmerzen auf dem Bahnhofsplatz. Das nächste Krankenhaus hat keine Herzchirurgie.', "Des passants signalent une personne avec une douleur thoracique déchirante sur la place de la gare. L'hôpital le plus proche n'a pas de chirurgie cardiaque.", "Dei passanti segnalano una persona con dolore lacerante al petto nella piazza della stazione. L'ospedale più vicino non ha cardiochirurgia."),
'UI.3887': ('Anruf vom Bahnhofsplatz: Eine Person ist gestürzt und kann nicht aufstehen, das Becken scheint instabil.', "Appel depuis la place de la gare : une personne est tombée et ne peut pas se lever, le bassin semble instable.", "Chiamata dalla piazza della stazione: una persona è caduta e non riesce ad alzarsi, il bacino sembra instabile."),
'UI.3888': ('Passanten rufen Hilfe auf dem Bahnhofsplatz. Ein Notarzt fordert einen Hubschrauber in ein Spezialzentrum an.', "Des passants appellent à l'aide sur la place de la gare. Un médecin d'urgence demande un hélicoptère vers un centre spécialisé.", "Dei passanti chiedono aiuto nella piazza della stazione. Un medico d'urgenza richiede un elicottero verso un centro specializzato."),
'UI.3889': ('Ziel: Fliege zur Einsatzstelle und leiste Hilfe. Bringe den Patienten dann in das Spezialzentrum, nicht in das nächste Krankenhaus.', "Objectif : volez sur place et portez assistance. Amenez ensuite le patient au centre spécialisé, pas à l'hôpital le plus proche.", "Obiettivo: vola sul posto e presta assistenza. Poi porta il paziente al centro specializzato, non all'ospedale più vicino."),
'UI.3890': ('Dekompressionskrankheit', 'Maladie de décompression', 'Malattia da decompressione'),
'UI.3891': ('Neurologische Prüfung (GCS und Pupillen)', 'Examen neurologique (GCS et pupilles)', 'Controllo neurologico (GCS e pupille)'),
'UI.3892': ('Bewusstlosigkeit gemeldet', 'Perte de connaissance signalée', 'Perdita di coscienza segnalata'),
'UI.3893': ('Arterielle Gasembolie', 'Embolie gazeuse artérielle', 'Embolia gassosa arteriosa'),
'UI.3894': ('Spannungspneumothorax nach stumpfem Thoraxtrauma', 'Pneumothorax suffocant après traumatisme thoracique fermé', 'Pneumotorace iperteso dopo trauma toracico chiuso'),
'UI.3895': ('Thoraxdekompression (Mini-Thorakostomie)', 'Décompression thoracique (mini-thoracostomie)', 'Decompressione toracica (minitoracostomia)'),
'UI.3896': ('Nackenschmerzen und Taubheit gemeldet', 'Douleur à la nuque et engourdissement signalés', 'Dolore al collo e intorpidimento segnalati'),
'UI.3897': ('Halswirbelsäulenverletzung mit neurogenem Schock', 'Traumatisme du rachis cervical avec choc neurogénique', 'Lesione della colonna cervicale con shock neurogeno'),
'UI.3898': ('Wirbelsäule und Becken immobilisieren', 'Immobiliser la colonne et le bassin', 'Immobilizzare colonna e bacino'),
'UI.3899': ('Atemweg sichern', 'Sécuriser les voies aériennes', 'Proteggere le vie aeree'),
'UI.3900': ('Vasopressor geben', 'Donner un vasopresseur', 'Somministrare vasopressore'),
'UI.3901': ('Krampfanfall gemeldet', 'Crise convulsive signalée', 'Crisi convulsiva segnalata'),
'UI.3902': ('Eklampsie in der Spätschwangerschaft', 'Éclampsie en fin de grossesse', 'Eclampsia a fine gravidanza'),
'UI.3903': ('Antikonvulsive Therapie geben', 'Donner un traitement anticonvulsivant', 'Somministrare terapia anticonvulsivante'),
'UI.3904': ('Akute Aortendissektion', 'Dissection aortique aiguë', 'Dissezione aortica acuta'),
'UI.3905': ('Instabile Beckenfraktur mit hämorrhagischem Schock', 'Fracture instable du bassin avec choc hémorragique', 'Frattura instabile del bacino con shock emorragico'),
}
T['UI.3906'] = ('KOPFHÖRER ANLEGEN', 'POSER LE CASQUE', 'METTI LE CUFFIE')
T['UI.3907'] = ('KOPFHÖRER ANGELEGT: Der Lärm schadet dem Patienten nicht mehr.', 'CASQUE POSÉ : le bruit ne gêne plus le patient.', 'CUFFIE MESSE: il rumore non danneggia più il paziente.')

FC = {
 'DE': {'FC.G': ['Captain, bitte sanft steuern, der Patient hält diese Belastungen nicht aus.', 'Vorsicht, Captain, zu viel Last für den Patienten.', 'Bitte weiche Steuereingaben, Captain, der Patient leidet.'],
        'FC.BANK': ['Captain, zu viel Schräglage für den Patienten. Bitte ausgleichen.', 'Bitte die Flächen waagerecht halten, der Patient verträgt diese Schräglage nicht.', 'Captain, die Schräglage verringern, dem Patienten geht es schlechter.'],
        'FC.PITCH': ['Captain, die Nase ist zu hoch für den Patienten. Nase senken.', 'Bitte die Nase senken, Captain, dem Patienten geht es schlechter.', 'Captain, den Nickwinkel verringern, der Patient verträgt das nicht.'],
        'FC.ALT': ['Captain, wir sind zu hoch für den Patienten. Bitte sinken.', 'Captain, der Patient braucht uns tiefer. Bitte sinken.', 'Bitte sinken, Captain, der Patient bekommt hier oben schlecht Luft.'],
        'FC.CLEAR': ['Wieder innerhalb der Grenzen für den Patienten, danke.', 'Gut, Captain, der Patient ist wieder stabil.', 'Danke, Captain, wir sind wieder innerhalb der Grenzen.']},
 'FR': {'FC.G': ["Commandant, doucement sur les commandes, le patient ne supporte pas ces charges.", "Attention commandant, trop de charge pour le patient.", "Des mouvements plus doux s'il vous plaît, commandant, le patient souffre."],
        'FC.BANK': ["Commandant, trop d'inclinaison pour le patient. Remettez à plat.", "Remettez les ailes à plat, le patient ne supporte pas cette inclinaison.", "Commandant, réduisez l'inclinaison, le patient se dégrade."],
        'FC.PITCH': ["Commandant, le nez est trop haut pour le patient. Baissez le nez.", "Baissez le nez s'il vous plaît, commandant, le patient se dégrade.", "Commandant, réduisez l'assiette, le patient ne la supporte pas."],
        'FC.ALT': ["Commandant, nous sommes trop hauts pour le patient. Descendez s'il vous plaît.", "Commandant, le patient a besoin que nous soyons plus bas. Descendez s'il vous plaît.", "Descendez s'il vous plaît, commandant, le patient respire mal ici."],
        'FC.CLEAR': ["De retour dans les limites pour le patient, merci.", "Bien, commandant, le patient est de nouveau stable.", "Merci commandant, nous sommes de nouveau dans les limites."]},
}
IDS = {75: (3861, 3862, 3863, 3864), 76: (3867, 3868, 3869, 3870), 77: (3873, 3874, 3875, 3876), 78: (3879, 3880, 3881, 3882), 79: (3885, 3886, 3887, 3888)}

def sload(p):
    with io.open(p, encoding='utf-8') as f: return f.read()

# screen texts: textual insertion, the layout of the files written by the app stays untouched
def jstr(t): return json.dumps(t, ensure_ascii=False).replace('&', '\u0026')
for i, lang in enumerate(['DE', 'FR', 'IT']):
    p = 'uitexts/%s.json' % lang
    s = sload(p)
    d = json.loads(s)
    missing = [k for k in T if k not in d['texts']]
    if not missing: continue
    end = s.rstrip().rfind('}')              # closing brace of the file
    end2 = s.rfind('}', 0, end)              # closing brace of "texts"
    head = s[:end2].rstrip()
    close = s[end2:]
    ind = re.search(r'\n(\s*)"UI\.0001"', s).group(1)
    body = ',\n'.join('%s"%s":  %s' % (ind, k, jstr(T[k][i])) for k in missing)
    s2 = head + ',\n' + body + '\n' + close
    json.loads(s2)
    with io.open(p, 'w', encoding='utf-8', newline='') as f: f.write(s2)


# pack lines
def esc(t): return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
for lang, idx in (('DE', 0), ('FR', 1)):
    p = 'voicepacks/%s.xml' % lang
    s = sload(p)
    add = ''
    for inc, keys in IDS.items():
        for v, ui in enumerate(keys, 1):
            key = 'DSC.%d.%d' % (inc, v)
            if 'key="%s"' % key in s: continue
            add += '    <message key="%s" text="1" actor="8" trigger="dispatch description of incident %d, variant %d">\n      <o>%s</o>\n    </message>\n' % (key, inc, v, esc(T['UI.%d' % ui][idx]))
    for key, lines in FC[lang].items():
        if 'key="%s"' % key in s: continue
        add += '    <message key="%s" actor="2" radio="ics" new="1" trigger="flight constraints">\n' % key + ''.join('      <o>%s</o>\n' % esc(l) for l in lines) + '    </message>\n'
    if add:
        s = s.replace('</voicepack>', add + '</voicepack>')
        with io.open(p, 'w', encoding='utf-8', newline='') as f: f.write(s)
print('translations written')
