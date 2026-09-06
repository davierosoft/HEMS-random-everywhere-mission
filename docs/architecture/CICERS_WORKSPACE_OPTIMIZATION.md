# Relazione tecnica: ottimizzazione workspace CICERS

## Scopo

Questa relazione descrive l'architettura introdotta nella branch `CICERS/workspace-optimization` per rendere il repository più sicuro e gestibile durante le attività di coding assistito. L'obiettivo è ridurre il contesto necessario per ogni modifica, assegnare ownership esplicita alle porzioni della missione e rilevare automaticamente cambiamenti involontari.

L'intervento è contenuto nei commit di implementazione:

- `b79bb630eada7a4bce7c2825102356d87f1969ae`: modularizzazione della missione, documentazione e tooling iniziale;
- `0d3b77d53364e285a5249bd20c82bcfd84cec5e8`: hardening dei controlli di coerenza, delle scritture e degli hook Git.

Il file distribuito al simulatore, `everywhere_all.json`, non è stato modificato dall'intervento.

## Architettura risultante

Il simulatore continua a consumare `everywhere_all.json`. Le sezioni `macros` e `data` hanno però una rappresentazione sorgente modulare sotto `mission-src/`, mentre le sezioni root non modularizzate restano nell'artefatto di deployment.

| Area | Organizzazione | Dimensione verificata |
| --- | --- | ---: |
| Macro | 14 moduli funzionali | 627 macro |
| Dati | 6 moduli funzionali | 183 entry |
| Sezioni root | Conservate in `everywhere_all.json` | 14 sezioni artifact-only |

La suddivisione delle macro copre bootstrap, preset, aeromobile ed equipaggio, UI, navigazione, generazione scene, gestione sanitaria, mezzi di terra, verricello, trasferimenti, lifecycle, marshalling, emergenze equipaggio e runtime condiviso. I dati sono separati tra persistenza, waypoint, persone, asset, profili sanitari e messaggi speciali.

`mission-src/manifest.json` costituisce il contratto tra sorgenti modulari e artefatto. Registra:

- versione dello schema;
- ordine originale di macro e dati;
- file proprietario e descrizione di ogni modulo;
- sezioni che devono restare esclusivamente nell'artefatto;
- intestazioni, separatori e formattazione necessari alla ricostruzione byte-exact.

## Assemblaggio byte-exact

`tools/mission-workspace.js` non usa una serializzazione globale tramite `JSON.stringify`, perché questa riformatterebbe il monolite e produrrebbe diff estesi anche senza cambiamenti semantici.

L'assembler:

1. individua le proprietà JSON mediante offset, gestendo stringhe, escape e delimitatori annidati;
2. carica le entry modulari e impedisce ownership duplicate;
3. verifica chiavi mancanti o assenti dall'ordine dichiarato nel manifest;
4. ricostruisce esclusivamente gli intervalli `macros` e `data`;
5. conserva inalterato ogni altro byte dell'artefatto;
6. valida il JSON risultante prima della scrittura.

Il comando `check` richiede uguaglianza binaria tra ricostruzione e artefatto. Se i due JSON sono semanticamente equivalenti ma differiscono nella formattazione, il controllo fallisce comunque e segnala il formatting drift.

I comandi disponibili sono:

| Comando | Funzione |
| --- | --- |
| `locate <testo>` | Trova il modulo proprietario di una macro o data entry. |
| `check` | Verifica la ricostruzione byte-exact. |
| `build` | Aggiorna l'artefatto dai sorgenti modulari. |
| `reindex` | Aggiorna ordine e metadata dopo aggiunte, rinomine o rimozioni intenzionali. |
| `extract --force` | Rigenera tutti i moduli dall'artefatto; riservato a migrazione o recovery. |

## Protezione delle scritture

Le operazioni `extract`, `reindex` e `build` invocano `assertCicersBranch` prima di scrivere. Sono accettate soltanto branch con prefisso `CICERS/`; `main`, altre branch e detached HEAD sono respinti.

Le scritture usano un file temporaneo nella stessa directory seguito da rename atomico. Il file temporaneo viene eliminato nel cleanup anche in caso di errore. Questo riduce il rischio di lasciare manifest, baseline o artefatti parzialmente scritti dopo un'interruzione.

I validator read-only restano branch-neutral, così possono essere eseguiti in CI anche su una futura revisione integrata in `main`. La protezione è applicata alle operazioni mutanti e agli hook Git.

## Controllo dello scope semantico

`tools/check-mission-scope.js` salva una baseline compressa in `.workspace-state/`. La baseline contiene:

- schema versionato;
- branch proprietaria;
- timestamp di creazione;
- SHA-256 del payload;
- contenuto della missione.

Uno snapshot viene creato soltanto quando moduli e artefatto coincidono. Il controllo rifiuta baseline con schema obsoleto, appartenenti a un'altra branch o con payload/hash incoerenti.

Durante il check vengono calcolate separatamente le modifiche a:

- proprietà root;
- macro;
- data entry.

In modalità `--strict`, ogni chiave cambiata deve essere autorizzata mediante `--allow-root`, `--allow-macro` o `--allow-data`. Qualsiasi modifica non dichiarata interrompe il gate.

## Hook Git

Gli hook versionati risiedono in `.githooks/` e vengono attivati per clone con:

```text
git config core.hooksPath .githooks
```

In alternativa è disponibile `npm run hooks:install`.

### Pre-commit

Il pre-commit:

1. verifica la branch CICERS;
2. esegue il workspace gate completo;
3. esegue `git diff --cached --check`.

### Pre-push

Il pre-push legge il protocollo standard fornito da Git e controlla il remote ref di ogni refspec. Le destinazioni branch sono ammesse soltanto sotto `refs/heads/CICERS/`; un push esplicito verso `main`, `release` o un'altra branch viene respinto anche se la branch locale è CICERS.

Gli hook costituiscono un safeguard locale e possono essere aggirati intenzionalmente con `--no-verify`. La protezione non bypassabile di `main` richiede anche una GitHub Branch Ruleset server-side.

## Consistency gate

`tools/check-workspace-consistency.js` verifica automaticamente:

- esistenza e unicità dei moduli dichiarati;
- corrispondenza tra chiavi presenti e ordine del manifest;
- conteggi coerenti tra sorgenti, artefatto e documentazione;
- metadata di formattazione completi;
- descrizione di ogni modulo;
- validità dei path richiamati dagli script npm;
- presenza e contenuto minimo degli hook;
- policy di line ending e file binari in `.gitattributes`;
- presenza dei contratti documentali e degli strumenti obbligatori;
- assenza degli handoff ritirati e dei relativi riferimenti;
- limite di 1 MiB per ogni modulo focalizzato;
- dimensioni dei file `AGENTS.md` e delle relative catene di discovery.

Il gate impedisce che una modifica strutturale renda silenziosamente obsoleti manifest, documentazione, script o istruzioni agentiche.

## Istruzioni agentiche e riduzione del contesto

Le istruzioni sono distribuite gerarchicamente:

| File | Responsabilità |
| --- | --- |
| `AGENTS.md` | Contratto globale, branch policy, ownership e gate obbligatori. |
| `mission-src/AGENTS.md` | Regole per modifiche ai moduli della missione. |
| `tools/AGENTS.md` | Determinismo, test negativi e separazione tra validator e writer. |
| `docs/AGENTS.md` | Collocazione e qualità della documentazione permanente. |
| `docs/testing/AGENTS.md` | Regole per scenari HPG/MSFS e dichiarazioni di runtime validation. |

Questo modello permette a un agente di caricare le regole generali e soltanto le istruzioni locali necessarie. `locate` consente inoltre di aprire il singolo modulo proprietario invece dell'artefatto da circa 8,7 MB, evitando icone incorporate e sottosistemi non coinvolti.

## Handoff e documentazione

Il precedente handoff conversazionale destinato a ChatGPT Sol è stato eliminato perché rappresentava stato non durevole. L'handoff relativo al multi-patient è stato trasformato nel documento architetturale permanente `docs/architecture/MULTI_PATIENT.md`.

Sono stati aggiunti:

- `docs/WORKSPACE_MAP.md`, indice di ownership e navigazione;
- `docs/testing/RUNTIME_VALIDATION.md`, matrice degli scenari manuali HPG/MSFS;
- README operativi per `mission-src/` e `tools/`;
- istruzioni `AGENTS.md` locali.

## Workflow operativo

Il flusso previsto per una modifica alla missione è:

```text
branch guard
  -> locate
  -> scope snapshot
  -> modifica del solo modulo proprietario
  -> build
  -> scope check --strict
  -> test mirati
  -> npm test
  -> pre-commit
  -> pre-push
```

Ogni fase riduce una classe specifica di rischio: branch errata, file proprietario errato, scope non dichiarato, artefatto incoerente, regressione statica, diff staged difettoso o destinazione push non autorizzata.

## Verifiche completate

Al termine dell'implementazione sono risultati positivi:

- ricostruzione byte-exact di 627 macro e 183 data entry;
- validazione di 7.030 condizioni eseguibili;
- validazione di 2.188 condizioni renderer;
- validazione di 2.400 chiamate macro statiche;
- gate DF/CARLS su 9 stati completi;
- 5 scenari statici relativi alle emergenze equipaggio;
- 11 scenari negativi per branch, scope, baseline e destinazioni push;
- controllo whitespace del diff staged;
- verifica di assenza di file temporanei dopo una build sintetica.

Il blob Git verificato di `everywhere_all.json` è `8bf645847634f99ad66dd2b471899e238a7a9f1e`, invariato dall'ottimizzazione.

Non sono stati dichiarati test runtime HPG/MSFS: l'intervento non modifica il contenuto distribuito della missione e i validator statici non sostituiscono comunque la validazione nel simulatore quando cambia il comportamento runtime.

## Limiti e miglioramenti futuri

- Attivare una GitHub Branch Ruleset per rendere la protezione di `main` indipendente dagli hook locali.
- Valutare un'ulteriore suddivisione dei moduli medicale e hoist se la loro dimensione o frequenza di modifica aumenta.
- Integrare il workspace gate in CI per validare automaticamente ogni pull request.
- Mantenere la matrice HPG/MSFS come gate manuale per animazioni, timing, asset e coreografie non osservabili staticamente.
