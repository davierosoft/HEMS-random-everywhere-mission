# Audit di recupero HEMS - 15 settembre 2026

## Esito e limiti

### Esecuzione della pulizia autorizzata

Il 15 settembre la pulizia e' stata autorizzata. Rimossi 99 file missione dagli output, la baseline materializzata e i due worktree ridondanti. Rimane un solo worktree Git e un solo file missione nel progetto principale. La modifica train del worktree PR43 e' stata conservata nello stash Git `41a08a4a9138ff5cd2356fc6bdbba7b99b1d53f4` e nella patch locale `.workspace-state/pr43-train-formatting.patch`; quella dell'altro worktree era identica byte per byte al train principale.

La PR43 e' stata chiusa. Eliminati 13 branch remoti gia' raggiungibili dal branch operativo o da main. Il fetch ora aggiorna tutti i riferimenti remoti. I branch con commit esclusivi richiedono contabilizzazione prima della rimozione. Il confronto dei sette rami fallback sanitari del commit `1a44df6` conferma che tutte le loro assegnazioni sono gia' presenti nei moduli correnti; i due commit successivi contengono solo documentazione storica.

I draft ora verificano il file canonico senza copiarlo. Allineate le istruzioni annidate e la checklist: le correzioni interne non incrementano la release. Il test include il rifiuto di contenuti diversi dal file canonico e la verifica che non venga creata una directory di copie draft. Suite completa PASS; nessuna modifica semantica alla missione e nessuna nuova release.

Su successiva istruzione esplicita dell'utente e' stato eliminato anche `global.json` residuo nel worktree 6982; il contenitore vuoto e' stato rimosso. Questa autorizzazione di pulizia supera la precedente conservazione di quel file, senza introdurre un nuovo global-state artifact.

Le sezioni seguenti descrivono lo stato osservato prima della pulizia e i problemi funzionali ancora da recuperare. La pulizia non costituisce la soluzione di R1-R7.

La missione attuale non e' pronta per essere dichiarata corretta. Il merge `e065c022af6eca83cb13ce8466261ed7cd8cddfc` conserva l'integrazione multipaziente, ma perde parti delle correzioni successive. Esistono inoltre incompatibilita' fra comportamenti storici e adattatori multipaziente. I controlli generali passano pur in presenza dei difetti documentati sotto.

Questo documento registra l'audit e propone il recupero. Non applica modifiche alla missione, non autorizza una pubblicazione, non costituisce una release e non certifica il comportamento in HPG/MSFS. Nessuna causa unica e' stata dimostrata per tutti i blocchi riferiti dagli utenti.

### Applicabilita' dopo la conversione multipaziente

Le richieste di agosto non sono una specifica da ripristinare automaticamente. Ogni confronto deve rispettare le approvazioni successive e l'architettura P1-P3 corrente. Il documento `MULTI_PATIENT.md` richiede di conservare la procedura CPR con adattatori per il paziente attivo; l'handoff del 12 settembre distingue pero' mCPR a bordo in modalita' live e CPR legacy. Questa distinzione limita le conclusioni ricavabili dal solo adattatore.

| Rilievo | Certezza e interpretazione |
| --- | --- |
| R1-R2 | Perdite accertate confrontando direttamente il pre-merge 167 con il risultato attuale; non dipendono dalla chat di agosto. |
| R3 | Differenze accertate nel merge; la correzione deve seguire la semantica residenziale attuale e non ricopiare il vecchio modulo. |
| R4 | Scrittura sul paziente errato riprodotta nel codice attuale con modalita' multipaziente attiva. |
| R5 | Contrasto attuale riprodotto fra durata del lease e condizione della UI. Il lease e' parte intenzionale della nuova architettura e deve essere conservato; va verificata la durata completa della procedura. |
| R6 | Rifiuto accertato nel singolo adattatore. La classificazione come perdita funzionale dell'intero percorso resta DA VERIFICARE rispetto all'instradamento live/legacy e alle decisioni successive. Non e' autorizzato ripristinare la CPR monopaziente. |
| R7 | Reset riprodotto nel ramo corrente; la richiesta storica spiega il confronto. Prima di correggere bisogna mantenere le successive regole NR, arming e ruoli del controller corrente. |

Le proposte di recupero sotto indicano cosa verificare e ricomporre; non sono autorizzazioni a reintrodurre vecchie macchine a stati. Le discrepanze non ancora attribuite a un difetto restano esplicitamente aperte.

Riferimenti correnti: [mappa](../WORKSPACE_MAP.md), [architettura multipaziente](MULTI_PATIENT.md), [workflow](DEVELOPMENT_WORKFLOW.md), [validazione](../testing/VALIDATION_STATUS.md), [scenari HPG](../testing/RUNTIME_VALIDATION.md).

## Fonti e identita'

- Conversazioni HEMS accessibili nell'app, lette nella prima parte dell'audit, incluse le richieste su visite uniformi e la successiva fusione 159/167.
- Recuperata anche **Rimuovi LVAR errate dal debug**, non leggibile attraverso `read_thread`. Il file locale `C:/Users/Andrew/.codex/sessions/2026/08/22/rollout-2026-08-22T23-21-23-01a02b59-8aeb-7240-9cea-179d7e0eb8ca.jsonl` contiene 13.902 record JSON validi, 421 messaggi grezzi; l'estrazione testuale utile comprende 106 messaggi utente e 279 risposte. Copre il 22-27 agosto, non soltanto la rimozione LVAR suggerita dal titolo.
- Le richieste nelle conversazioni sono requisiti storici: prevalgono le correzioni successive. Le risposte degli assistenti sono dichiarazioni da verificare, non prova di funzionamento.
- Confronto semantico fra `db251a5` (filone multipaziente), `2a7abca` (correzioni 167 precedenti alla fusione) ed `e065c02` (risultato della fusione).
- GitHub interrogato direttamente: `main` e' `cc54c12c7f3df1f82ccb865fa350345752dc7510`; il riferimento locale `origin/main` e' ancora `db251a5`. Il commit aggiuntivo su main elimina `global.json`.
- Il branch remoto `CICERS/fix-local-time-query` punta a `e065c02`. Il file locale e' semanticamente uguale al suo HEAD. La formattazione del 14 settembre viene conservata come requisito e riapplicata alla prossima release, come richiesto; non viene imputata come causa dei guasti runtime.
- SHA-256 del file locale osservato: `a3a9f6ce99f819d57249ee2fa5260282cfe733c19fcee11d0f7a813d02fae176`.

## Copie, branch e pubblicazioni

Nel progetto principale sono presenti 103 file missione individuati: 99 in `outputs`, il file radice, il riferimento in `starting point` e due nella cartella `.pr1-worktree`. Sono 99 contenuti binari distinti e 82 contenuti JSON distinti: il conteggio dei nomi non equivale al conteggio delle versioni funzionali.

La ricerca estesa a `Documents/Codex` e `.codex/worktrees` individua **185 file con nome corrispondente a `*everywhere*.json`**:

| Cartella | File individuati |
| --- | ---: |
| progetto hems | 103 |
| worktree 6982/progetto hems | 7 |
| 2026-08-11/d | 45 |
| 2026-08-22/github-plugin-github-openai-curated-remote-4 | 4 |
| 2026-08-27/hems-sound-analysis | 3 |
| 2026-09-02/https-github-com-davierosoft-hems-random | 16 |
| 2026-09-05/adesso-basandoti-sulle-scene-che-hanno | 1 |
| 2026-09-07/prendi-le-informazioni-da-qui-https | 6 |

Il conteggio e' limitato alle due radici cercate e non include tutta la macchina. Non autorizza cancellazioni indiscriminate.

Il controllo successivo dei 185 file rileva 182 JSON leggibili, con 162 contenuti binari e 143 contenuti JSON distinti. Tre file nelle cartelle storiche dell'11 agosto non sono JSON validi. Due JSON leggibili non hanno titolo missione: il pattern del nome include quindi anche file che non possono essere considerati automaticamente missioni distribuibili.

Esistono tre worktree Git registrati. Due contengono modifiche preesistenti a `train.json`. Nessun worktree e' stato rimosso.

Sono stati verificati tutti i 17 branch online. La maggioranza e' antenata del risultato corrente. Il branch storico `agent/doctor-deboarding-0999` presenta tre commit non antenati: le patch riguardano il fallback delle patologie e documentazione, malgrado il titolo dei commit. Il nome del branch o del commit non basta per decidere cosa conservare. Non e' necessario fonderlo integralmente per recuperare queste modifiche.

La PR #43 riguarda principalmente la rimozione di `global.json`, gia' effettuata su main. La #44 contiene il risultato 167 da correggere. Non vanno entrambe unite automaticamente. Il tree completo di #43 non e' identico a main, anche se i blob missione e train coincidono: prima della chiusura va contabilizzata anche la differenza documentale.

Nei due percorsi Community precedentemente citati nelle chat e' presente un file con titolo `0.997`, senza revisione, di 3.502.562 byte, hash `597296f3eb9d709edaf0e49c0fc6a5463a0930fc238d08a4ed509bfb3239e49e`. I due percorsi hanno lo stesso contenuto; non e' stato stabilito se siano alias dello stesso file. Questo NON dimostra quale missione sia stata effettivamente caricata negli ultimi test. Nessun file del simulatore o `global.json` e' stato scritto.

## Difetti dimostrati e recupero richiesto

### R1 - Snapshot automatici rimossi e monitor non avviato

Rispetto a `2a7abca`, `capture automatic snapshot` non esiste piu'. `location diagnostics monitor` esiste nel modulo 19 ma non ha chiamate nel file risultante; `objective1` ha perso l'avvio. L'esistenza di `Debug_Auto_Table` non prova che vengano prodotti snapshot automatici.

Recupero: reintegrare cattura e avvio nel lifecycle attuale; mantenere separati snapshot manuali e automatici, con i reset richiesti. Verificare le coordinate attraverso il meccanismo HPG documentato. Il monitor attuale carica la storia precedente e salva ogni secondo: prima di attivarlo vanno verificati anche reset, crescita della tabella e attribuzione della macro che modifica la location. Non basta aggiungere una chiamata.

Prova necessaria: avvio effettivo, scrittura nei passaggi previsti, snapshot manuale preservato fino alla nuova cattura, automatico resettato per la nuova esecuzione; assenza di chiavi orfane e coordinate ricostruibili.

### R2 - Perdita di diagnostica crew e nodi stradali

In `crew spawn launch`, `crew spawn wait`, `crew spawn failure` sono perse assegnazioni di `CREW_SPAWN_DEBUG_NAME`, `CREW_SPAWN_DEBUG_LOCATION_KEY`, `CREW_SPAWN_DEBUG_STATE`, `CREW_SPAWN_DEBUG_HAS_OBJECT`, `CREW_SPAWN_DEBUG_CREATED_VAR`. `road nodes generator` perde `roadnode_query_status`.

Recupero: integrare questi dati nel flusso corrente, verificando chiamanti ground/skid/hoist e 3/4/5 crew. Distinguere ingresso nel ramo, richiesta di creazione, oggetto esistente, posizione e prima azione; non attribuire il mancato sbarco a visite mai iniziate.

### R3 - Fallback residenziale regredito

`random residential road nodes launcher`, nel modulo 06, e' tornato da `rescue_location` ad `accident_location` per sei punti di fallback. E' tornato inoltre da `query_skipped != yes` a `query_skipped == null`. Nel fallback esistono offset `bearing` 120/240 su location di terra, incompatibili con il contratto attuale `bearing2` cardinale.

Recupero: ricostruire i rami normal/custom e query riuscita/fallita distinguendo luogo dell'incidente, punto soccorsi e landing spot. Riprendere il requisito funzionale senza copiare anche gli offset errati della versione precedente. I watchdog di viaggio restano derivati da percorso/velocita' piu' margine; il timeout di una query non va confuso con quello di un viaggio.

### R4 - Stabilizzazione del paziente sbagliato

In `patient health`, modulo 07, il pulsante `Stabilize patient for transport` usa il paziente visualizzato nelle condizioni ma scrive direttamente `LIFESCORE`, cioe' Patient 1.

Prova locale con i comandi reali e l'interprete gia' usato dai test: Patient 2 visualizzato, LifeScore iniziali P1=75/P2=14; dopo i comandi del pulsante P1=19/P2=14. Non e' una prova grafica HPG, ma dimostra la scrittura sul bersaglio sbagliato.

Recupero: usare il percorso di scrittura del paziente selezionato, rispettando proprieta' clinica, report congelato e ticket; verificare P1/P2/P3 e assenza di effetti sugli altri pazienti.

### R5 - CPR di 180 secondi incompatibile con STOP dopo 300

`multipatient registry live physiology step` acquisisce CPR con `timeout_seconds:180` per tutti e tre i pazienti. La scadenza non viene rinnovata dal worker. La UI mostra `STOP CPR` quando `cpr_elapsed >= 300`.

Prova locale: deadline iniziale 180; dopo un passo di 181 secondi, deadline 361, due worker creati ed elapsed nuovamente 0. Anche il test esistente considera positiva questa riacquisizione, ma non verifica la raggiungibilita' del pulsante dopo cinque minuti.

Recupero: distinguere il controllo di un worker bloccato dalla durata clinica della procedura. Conservare protezione dai worker scaduti, durata cumulativa e STOP; non eliminare semplicemente la protezione ne' aumentare arbitrariamente un numero. Verificare una CPR attiva oltre cinque minuti e un worker realmente fermo come casi diversi.

### R6 - CPR a bordo senza mCPR: compatibilita' del percorso da verificare

`multipatient registry CPR acquire` rifiuta un paziente `loaded` su HEMS quando `MCPR_ONBOARD != yes`, senza verificare se l'elicottero sia a terra. La richiesta del 27 agosto conserva invece il percorso di atterraggio per CPR manuale.

Prova locale: stesso paziente HEMS caricato ed eleggibile, elicottero a terra; acquisizione=0 senza mCPR, acquisizione=1 con mCPR. E' dimostrato il rifiuto in questo adattatore, non l'esecuzione completa della procedura di atterraggio.

Recupero: distinguere volo, atterraggio richiesto, posizione/caricamento del paziente e disponibilita' della procedura manuale. Verificare anche che il dispatcher possa raggiungere il percorso a terra prima dell'acquisizione, non solo cambiare la condizione finale.

Non e' ancora dimostrato che nessun percorso alternativo attuale soddisfi il requisito. L'handoff multipaziente mantiene esplicitamente distinti live e legacy: questo punto non va presentato come diagnosi conclusiva dell'intera CPR e non giustifica un rollback.

### R7 - Marshaller: memoria dell'avviamento incoerente

La chat del 25 agosto richiede che, superato NR 20%, spegnere le prime pump non azzeri l'avviamento. Nel controller comune `marshaller animation monitor`, modulo 12, rimane un ramo con entrambe le prime pump spente e NR<80 che azzera `marshall_restart_state` e segnali collegati.

Prova sul ramo effettivo: stato iniziale 2, NR=40, prime pump=0, elicottero a terra; stato finale 0. La soglia 20 esiste in altri rami, ma non rende coerente l'intera macchina a stati.

Recupero: conservare l'avvio riconosciuto fino a una vera condizione di reset; verificare entrambi i controller e tutti i ruoli senza modificare a caso soglie o percorsi gia' concordati. Restano da provare arming avvicinamento/partenza, breve toccata, vento, guida al punto di atterraggio e guard delle sequenze motori.

## Requisiti recuperati: cosa e' presente e cosa non va riscritto

| Area | Riscontro nel sorgente e stato |
| --- | --- |
| Renderer debug | Il controllo generale verifica la collocazione dei renderer. La chat documenta che il guasto storico era `text/image/buttonbar` fuori da `set_dispatch`, non il colore gray. Conservare il gate. |
| Variabili dinamiche nel debug | Il contratto multipaziente vieta di reintrodurre nomi LVAR dinamici nel debug. Il vincolo non equivale a rimuovere i comandi audio dinamici VCP dalla missione. |
| Volumi persistenti | `objective1` inizializza `VOLUME_CREW` con null guard e copia il valore persistente nella LVAR; profili e controlli audio restano presenti. Distinguere reset operativo da preferenza utente. |
| Profili sanitari | Tutti i 609 record verificati nel modulo dati 05 contengono campi GCS, pressione, respirazione e temperatura. Questa verifica riguarda la presenza dei campi, non la correttezza clinica di tutti i range. |
| GCS/NT e pagina medica | Presenti inizializzazione, aggiornamento, condizioni NT, legenda e dati del paziente visualizzato. Conservare le successive modifiche alla pagina; verificare sincronizzazione e report P1/P2/P3. |
| CPR/mCPR | Opzione, procedura e pulsante esistono; R5/R6 mostrano che la sola presenza non prova integrazione corretta. |
| Schermature paziente | Presenti `indoor_scene` nei dati e relativo gate nel modulo 06. Coordinare con il successivo requisito di recinzione del punto soccorsi esterno negli incendi residenziali. |
| Progress bar | `on-site operations progress monitor` esiste ed e' chiamato da `ground ops`. Usa ancora indicatori quali `crewvisiting1` e flag di carico condivisi: la copertura degli altri pazienti e modalita' richiede verifica dedicata. |
| Life decrease | Il vecchio blocco sincrono prima di creare il worker non e' presente nella macro attuale. La chat distingue il primo ciclo dai successivi gate 0.8/0.2; non introdurre un nuovo gate iniziale sulla base di un ricordo inesatto. In modalita' live la macro ritorna subito e la fisiologia ha un percorso diverso. |
| P1-P3 uniformi | Registro, giri di visita, ticket, selezione, fisiologia e save/restore sono implementati e hanno test; R4-R6 mostrano integrazione ancora parziale in alcuni chiamanti. Non ripartire da P1 copiato tre volte. |
| P4/P5 | La chat recuperata li introduce come valutazione rinviata; la documentazione corrente conferma adattatori fisici e UI ancora incompleti. Il registro a cinque posti non equivale a cinque pazienti operativi. |
| DF/OSM/checklist/profili | Mantenere implementazioni e gate gia' presenti; includerli nel controllo di regressione del consolidamento. La chat recuperata non autorizza un ritorno generale a una versione storica. |
| Suoni | La richiesta di catalogo AND e' proseguita nelle task dedicate. Non autorizza nuove sostituzioni WAV durante questo recupero. |

## Stato delle verifiche

La suite `node tools/check-workspace.js`, eseguita nella prima parte dell'audit con il contenuto attuale, passa: 752 macro, 186 data entry, 20 moduli macro, 6 moduli dati. E' il fallback documentato di `npm test`, non disponibile in questa shell. I controlli HVAR, route, barelle, visite e trasporto restano utili e devono essere conservati.

Le prove aggiuntive R4-R7 sono eseguite in memoria, senza patch alla missione. R4-R6 riusano l'interprete dei test esistenti; R7 esegue il ramo condizionale estratto con valori espliciti. Non simulano HPG o la fisica dell'elicottero.

`git diff --check` segnala whitespace preesistente in `train.json`; non va mascherato come PASS generale. L'indice non conteneva modifiche staged. Nessuna build, draft, release, commit, push o modifica a `global.json` e' stata eseguita durante l'audit.

## Piano di consolidamento proposto

1. **Contratti e proprieta'.** Allineare AGENTS principale, istruzioni annidate, checklist e workflow alle ultime richieste. Una sola task operativa sul workspace; nessun nuovo worktree per continuare il medesimo recupero. Conservare ownership modulare, scope stretto, hook e CI del collega.
2. **Identita' unica.** Destinazione finale: `everywhere_all.json` nella radice locale e nella radice di GitHub main, stesso SHA-256 dopo pubblicazione. Il file dei test deve essere identificato tramite quel contenuto, non con il solo titolo. Nessun incremento per correzioni interne.
3. **Recupero focalizzato.** Usare `e065c02` come base di integrazione e recuperare i comportamenti mancanti da `2a7abca`, senza ripristinare interi moduli. Risolvere i difetti confermati con una prova negativa che fallisce prima e passa dopo, seguendo tutti i chiamanti coinvolti. Prima di una modifica, chiudere l'analisi di applicabilita' dei punti condizionati, in particolare R6.
4. **Accettazione per comportamento.** Per ogni requisito conservare origine, owner, prova e stato. Registrare separatamente presente, raggiungibile, testato automaticamente e confermato HPG. Un helper scollegato non e' completato; un ticket coerente non dimostra il caricamento fisico.
5. **Formattazione finale.** Applicare le regole del 14 settembre alla prossima release. Verificare comandi brevi, due spazi, chiusure per comando, then/else, and/or ed eccezioni renderer con esempi approvati e confronto semantico. Non riformattare la missione intera a ogni correzione funzionale.
6. **Prove HPG selezionate.** Avvio/residenziale/custom, creazione crew, assegnazioni P1/P2/P3 a ogni mezzo, carico e rapporto finale, CPR breve/lunga/a terra/in volo, marshaller al riavvio, secondo soccorso e save/reload. Riutilizzare la matrice esistente; aggiungere solo scenari mancanti motivati dai difetti.
7. **Pubblicazione richiesta.** Aggiornare una sola PR di consolidamento, verificare CI e usare il normale merge. Segnalare separatamente codice sincronizzato e validazione runtime. Non dichiarare risolti gli scenari ancora non osservati.
8. **Pulizia obbligatoria di PR, branch e copie operative.** Dopo contabilizzazione dei contenuti, chiudere le PR superate, eliminare i branch locali e remoti inutili e rimuovere worktree, baseline materializzate e output permanenti superflui; conservare la storia utile nel ramo consolidato. Aggiornare prima strumenti e documenti che dipendono da quei percorsi. Per le cartelle fuori workspace verificare proprieta', stato dirty e destinazione; nessuna cancellazione ricorsiva per semplice corrispondenza del nome. `global.json` resta escluso da ogni pulizia.

Per rispettare l'obiettivo di un solo file ufficiale, il workflow va modificato: i controlli intermedi devono usare memoria o temporanei ripuliti, non generare una nuova missione permanente per ogni tentativo. `mission-src` resta il sorgente modulare e `train.json` resta l'ingresso custom indipendente; nessuno dei due e' una seconda versione ufficiale della missione.

### Assetto Git finale richiesto

La richiesta del 15 settembre include esplicitamente la pulizia delle PR e dei branch. Non basta eliminare i JSON duplicati lasciando aperti percorsi di sviluppo concorrenti.

| Elemento | Risultato finale |
| --- | --- |
| `main` remoto | Unico riferimento ufficiale pubblicato, protetto; aggiornamento tramite normale PR e controlli richiesti. |
| `CICERS/fix-local-time-query` | Unico branch operativo mantenuto, locale e remoto. Il nome attuale viene conservato senza creare un ulteriore branch di recupero. Dopo consolidamento deve essere riallineato al risultato pubblicato senza riscrivere la storia condivisa. |
| PR #44 | Unica PR di consolidamento da aggiornare sul contenuto effettivo del recupero; chiusa mediante normale merge quando autorizzato e verificato. |
| PR #43 | Da chiudere come superata dopo aver contabilizzato anche le differenze documentali. Non effettuare un merge solo per chiuderla. |
| Altri branch locali/remoti | Da eliminare dopo controllo delle modifiche esclusive e conservazione del lavoro utile nel consolidamento. Nessun branch permanente di backup o nuova copia alternativa. |
| PR aperte | Al massimo una durante il lavoro; nessuna PR superata o duplicata. Dopo il merge, nessuna aperta per il recupero concluso. |
| Worktree della missione | Soltanto il workspace principale. Recuperare prima eventuali modifiche dirty degli altri worktree, quindi rimuoverli attraverso Git. |
| Riferimenti remoti locali | Aggiornati e ripuliti dai riferimenti ai branch eliminati; `origin/main` deve corrispondere al remoto verificato. |

Procedura: aggiornare l'inventario remoto al momento dell'esecuzione; associare ogni PR al suo branch e ai contenuti esclusivi; integrare o riconoscere come gia' presenti le modifiche utili; preservare la storia necessaria prima di eliminare un riferimento non antenato; chiudere le PR superate; rimuovere worktree superflui e relativi branch locali/remoti; ripulire i riferimenti remoti locali; verificare nuovamente l'inventario finale. Protezioni e hook restano attivi. L'ascendenza di un commit, da sola, non dimostra che il suo comportamento sia sopravvissuto a un merge.

Questa sezione registra l'assetto richiesto. La pulizia non e' stata ancora eseguita: il recupero e la contabilizzazione delle differenze devono precedere le eliminazioni che potrebbero perdere lavoro.

## Criterio di chiusura

Il recupero e' completo quando i requisiti applicabili sono contabilizzati, R1-R7 sono risolti o esplicitamente rivalutati con evidenza, i percorsi interessati hanno le verifiche richieste, il file ufficiale locale coincide con quello pubblicato e la pulizia di PR, branch e worktree soddisfa l'assetto Git finale. Nessuna cancellazione di copie, fusione Git o test statico isolato sostituisce queste condizioni.
