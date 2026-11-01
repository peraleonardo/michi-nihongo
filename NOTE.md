# Michi 道 — note di progetto

App per studiare giapponese (JLPT N5 → N4 → N3, obiettivo N3 a dicembre 2027). Solo file statici: si pubblica trascinando la cartella su Netlify.

## 1. Pubblicare e aggiornare su Netlify (senza riga di comando)

**Prima pubblicazione**
1. Vai su <https://app.netlify.com/drop> (accedi o crea un account gratuito).
2. Trascina **l'intera cartella `michi-nihongo`** nel riquadro. Dopo pochi secondi ottieni un indirizzo `https://xxxx.netlify.app` (puoi rinominarlo in *Site configuration → Change site name*).
3. **iPhone:** apri l'indirizzo in Safari → Condividi → *Aggiungi alla schermata Home*. **Android:** Chrome → menu ⋮ → *Installa app*.

**Aggiornare l'app**
1. Modifica i file (o chiedi all'assistente di aggiungere contenuti).
2. **Cambia il numero di versione in due posti** (altrimenti i telefoni continuano a usare la copia vecchia in cache):
   - `sw.js` → `const VERSION = '1.1.1';`
   - `js/core.js` → `const APP_VERSION = '1.1.1';` (tienili uguali)
3. In Netlify apri il sito → *Deploys* → trascina di nuovo la cartella nel riquadro "Drag and drop your site output folder here".
4. Sul telefono: apri l'app una volta con la rete attiva. Compare il pulsante **Aggiorna** (oppure Impostazioni → *Cerca aggiornamenti*).

I file in `data/` sono letti "rete prima": i contenuti nuovi arrivano subito anche se dimentichi la versione, ma il codice (js/css) richiede il cambio di VERSION.

**I progressi sono solo sul dispositivo** (localStorage): usa *Impostazioni → Esporta backup* ogni tanto e prima di cambiare telefono o cancellare i dati di Safari.

## 2. Struttura della cartella

```
index.html · manifest.webmanifest · sw.js · _headers
css/style.css
js/  core.js (dati, SRS, XP, furigana) · audio.js · quiz.js (esercizi) · study.js · jlpt.js · jlpt-read.js · jlpt-listen.js (generatori formato JLPT) · main.js · exam.js · path.js (percorsi guidati) · app.js
data/  kana.json · strokes.json · kanji-elenco.json · percorso.json (curriculum guidato, generato)
       kanji-n5|n4|n3.json · vocabolario-… · grammatica-… · testi-… · ascolto-… · esercizi-…
audio/n5|n4|n3/   (mp3 opzionali, vedi audio/README.md)
icons/  _strumenti/
```

## 3. Formati dei file dati (per ampliare a mano)

Il testo giapponese usa la notazione `{漢字|かんじ}` per le furigana (ruby). `**grassetto**`, `__sottolineato__`, `\n` a capo.

- **kanji-nX.json**: `{"k":"日","on":["ニチ"],"kun":["ひ"],"it":"giorno; sole","w":[["日曜日","にちようび","domenica"]],"n":"nota facoltativa"}`
- **vocabolario-nX.json**: `{"w":"食べる","r":"たべる","it":"mangiare","p":"v1","c":"Verbi","ex":"{朝|あさ}ご{飯|はん}を{食|た}べます。","et":"Faccio colazione."}` (anche modi di dire, `c:"Modi di dire"`).
- **grammatica-nX.json**: scheda con `id, t, f, s, cat, tag, regola, form[], uso[], diff[{vs,t}], err[{x,o,t}], ex[{j,i}], es[], rel[]`.
- **Esercizi** (`es` nelle schede e `esercizi-nX.json`), campo `ty`:
  `mc` scelta multipla `{q,o[],a,e}` · `cloze` completamento (usa `＿＿`) · `part` particella · `trad` traduzione · `ord` riordino `{i,w[],x[]}` · `mat` abbinamento `{q,p[[a,b]…]}` · `star` costruzione ★ `{pre,ch[4],star,e}`. `a` = indice della risposta giusta, `e` = spiegazione.
- **testi-nX.json**: `{"id","t","tipo","jp":["parola/parola/…"],"it":[traduzioni],"gl":{"parola":["lettura","significato"]},"q":[{q,o,a,e}]}`. Nel testo `jp` i `/` separano le parole toccabili (le parole presenti in `gl` o nel vocabolario si possono toccare).
- **ascolto-nX.json**: `dialoghi` (`righe[{s,t,i}]`, `v` voce A/B, `q` domande) · `coppie` (minime) · `dettato` · `risposte` · `shadowing`.
- I numeri/orari/date/prezzi dell'ascolto sono **generati dal codice** (`NUM` in `js/quiz.js`), non servono dati.

## 4. Contenuti: cosa è verificato e cosa va ricontrollato

| Contenuto | Origine | Controllo |
|---|---|---|
| Elenchi dei kanji per livello (80 / 170 / 370) | Elenchi di riferimento Kanshudo (allineati alla versione 2.2.0) | solo l'elenco dei caratteri, in `data/kanji-elenco.json` |
| Letture on/kun dei kanji | scritte da me | **verificate automaticamente con KANJIDIC2**: tutte presenti |
| Parole d'esempio dei kanji e vocabolario (lettura+scrittura) | scritte da me | **verificate con JMdict** (eccezioni: nomi propri e frasi composte) |
| Significati in italiano, note | **generati da me (IA)** | **da ricontrollare** con Genki / Minna no Nihongo / Shin Kanzen Master / Try! o con un insegnante |
| Frasi d'esempio, schede di grammatica, esercizi, testi, dialoghi | **generati da me (IA)**, non da Tatoeba né da libri | **da ricontrollare** (naturalezza, livello, spiegazioni) |
| Ordine dei tratti | KanjiVG (CC BY-SA 3.0, © Ulrich Apel) | dati originali |
| Furigana nei testi | scritte a mano + controllo automatico di copertura | a campione |

Nota sul livello: i livelli JLPT non sono ufficialmente pubblicati, quindi gli elenchi sono quelli "di consenso"; usa i libri del tuo corso come riferimento finale.

**Licenze:** KANJIDIC2 e JMdict © EDRDG (CC BY-SA 4.0), usati solo per la verifica; `data/strokes.json` deriva da KanjiVG (CC BY-SA 3.0, *share-alike*: va bene per uso personale; se pubblichi l'app per altri, mantieni l'attribuzione e la stessa licenza per quel file). Nessun audio JLPT ufficiale, nessun testo NHK, nessun contenuto di libri è incluso.

## 5. Stato dei blocchi e come proseguire

| Livello | Kanji | Vocabolario | Schede di grammatica | Testi | Ascolto |
|---|---|---|---|---|---|
| **N5 (completo)** | **80/80** | **679 parole** (tutte le 644 della lista di riferimento + espressioni) | **53 schede** (tutti i 84 punti della lista, alcuni raggruppati) | 8 | 8 dialoghi, 14 coppie, 10 dettati, 9 risposte, 8 shadowing |
| **N4** | **170/170** | **578 parole** (tutte le 571 della lista di riferimento + espressioni) | **55 schede** (tutti i punti della lista) | **12** | 8 dialoghi, 10 coppie, 10 dettati, 10 risposte, 10 shadowing |
| **N3** | **370/370** | **197 parole** (tutte quelle della lista JLPTSensei N3 non già presenti in N5/N4: la lista ne ha solo 192) | **38 schede** (tutti i punti della lista N3, i minori raggruppati) | **11** | 6 dialoghi, 8 coppie, 8 dettati, 8 risposte, 8 shadowing |

**Procedura consigliata (a blocchi):** chiedi all'assistente, ad esempio:
- *"Blocco testi e ascolto N4 e N3: 4 testi, 4 dialoghi con domande, dettati e risposte rapide per livello."*
- *"Blocco vocabolario N3: 100 parole della lista JLPTSensei N3, con esempio, verificate su JMdict."*
- *"Blocco testi/ascolto N4: 3 testi + 3 dialoghi con domande."*
Ogni blocco finisce con: controllo furigana (`lint.py`), controllo letture (`verify.py`), aumento di VERSION e ripubblicazione.

Stato: kanji N5/N4/N3 completi (elenchi Kanshudo), grammatica completa, vocabolario N5/N4 completo e N3 completo rispetto alla lista JLPTSensei (che ha solo 192 parole N3). Il piano settimanale nell'app (Studia → Piano di studio) segue questa progressione.

## 6. Audio
- **Voce del dispositivo (sempre attiva):** usata per tutti gli esercizi generati e come ripiego.
- **File pre-generati (`audio/…m4a`):** tutto l'audio fisso dell'app è registrato in locale e gratis con **VOICEVOX** (voci 四国めたん e 青山龍星, accento giapponese naturale) e `afconvert`, in AAC mono **24 kbps** (qualità ridotta per tenere leggera la cartella): dialoghi, coppie minime, dettati, risposte rapide, shadowing, le ~2.600 frasi di Tatoeba (`audio/fr/`), i kana (`audio/kana/`) e **ogni parola o frase che ha un pulsante 🔊** (vocabolario, parole dei kanji, esempi di grammatica, testi: `audio/t/<hash>.m4a`, con l'elenco in `audio/index.json`). Solo gli esercizi generati a caso (numeri, formato JLPT) usano la voce del dispositivo. Script: `_strumenti/genall.py` e `_strumenti/genkana.py` (richiedono il motore VOICEVOX avviato). **Crediti obbligatori:** «VOICEVOX:四国めたん», «VOICEVOX:青山龍星» (già in Impostazioni → App). Verifica le condizioni d'uso dei personaggi sul sito VOICEVOX prima di pubblicare.
- **Kana:** i suoni di hiragana e katakana (tabelle, esercizi di ascolto kana) sono pre-registrati in `audio/kana/` con VOICEVOX 四国めたん (`_strumenti/genkana.py`).
- **Altre opzioni gratuite/offline:** voci open source (es. Piper) se hanno un modello giapponese con licenza adatta; espeak-ng suona molto meccanico in giapponese.

## 7. Funzioni principali (dove sono)
**Romaji:** sotto le letture on/kun, le letture delle parole e nei popup dei testi (Impostazioni → *Mostra il romaji*); le tabelle dei kana lo mostrano sempre. Convenzione: ortografia kana-fedele (おう = *ou*, ー = vocale ripetuta, ん + vocale = *n'*).
Home (Oggi da fare, XP, serie, obiettivo) · **Studia**: alfabeti con tratti animati, kanji, vocabolario, grammatica, lettura, dialoghi, SRS, piano, risorse · **Esercizi**: tutti i tipi + ascolto (JLPT, dettato con diff, coppie minime, numeri/orari/prezzi, risposta rapida, shadowing con registrazione) + simulazioni d'esame con timer · **Glossario**: grammatica / kanji / parole con ricerca e filtri · **Statistiche**: precisione per sezione e livello, punti deboli, badge · Impostazioni: furigana (sempre / tocca / nascondi), tema, voci, backup JSON.
Limiti noti: l'ascolto d'esame consente di riascoltare; il punteggio d'esame è una stima (il JLPT usa una scala equalizzata); lo shadowing richiede il permesso del microfono (solo su HTTPS: Netlify va bene).


## 8. Esercizi in formato JLPT, generati a ogni richiesta (dalla versione 2.0.0)
Esercizi → **Formato JLPT · generato** (`#/jlpt`). I *tipi* di domanda riproducono la struttura delle prove d'esempio ufficiali del JLPT N3 (vocabolario, grammatica, lettura, ascolto); **nessun testo o domanda ufficiale è stato copiato**: frasi, brani, tabelle e dialoghi sono creati dal codice con modelli e valori casuali, quindi ogni volta sono diversi.

| Sezione | Tipi | Come si genera | File |
|---|---|---|---|
| 文字・語彙 | 問題1 lettura del kanji · 2 scrittura · 3 parola nel contesto (+ 産/製) · 4 parola di significato simile · 5 uso della parola | dal vocabolario e dai kanji dei file `data/`; i distrattori sono letture/ortografie alterate (dakuten, vocale lunga, kanji omofoni) | `js/jlpt.js` |
| 文法 | 問題1 forma corretta (coniugazione calcolata dal codice) · 2 costruzione ★ · 3 completa il brano (5 spazi) | frasi della banca esercizi + coniugazioni; ★ con catene rigide per avere una sola soluzione; brano da modelli | `js/jlpt.js` |
| 読解 | 問題4 memo/avvisi/email/orari · 5 testo medio con «このこと» e idea principale · 7 tabella di informazioni + calcolo di una scadenza | modelli con valori casuali; la tabella viene rigenerata finché esiste **una sola** risposta valida | `js/jlpt-read.js` |
| 聴解 | 問題1 compito · 2 motivo · 3 contenuto (opzioni solo ascoltate) · 4 espressione adatta alla situazione · 5 risposta rapida | dialoghi da modelli letti dalla sintesi vocale (voci diverse M/F) | `js/jlpt-listen.js` |

- Nell'ascolto le opzioni sono solo audio (①②③ con ▶): il testo compare dopo la risposta. Funziona con le voci del dispositivo; per mp3 veri vedi la sezione Audio.
- La **Simulazione d'esame** usa questi generatori (interruttore «Domande generate»; spento = domande salvate in `data/`).
- Per aggiungere varietà: aggiungi voci agli elenchi (`TASK`, `RSN`, `TOP3`, `SIT`, `QR`, `TOPIC`, `STAR`, `GR`…) all'inizio dei tre file JS.
- **Contenuto creato da IA:** i modelli sono controllati con un test automatico (opzioni uniche, risposta nell'intervallo, furigana su ogni kanji) ma non da un madrelingua. Se noti una frase innaturale o una risposta ambigua, correggi il modello relativo o segnalalo.
- Limiti: gli esercizi non sono un'equivalente ufficiale; il livello (N5/N4/N3) cambia soprattutto il lessico usato nelle domande di vocabolario e grammatica, mentre lettura e ascolto usano gli stessi modelli a livello N4-N3.

## 9. Cosa resta (opzionale)
- **Vocabolario N3 oltre la lista:** la lista di riferimento (JLPTSensei) ha solo 192 parole N3; il vero N3 ne richiede molte di più. Per ampliarlo basta aggiungere voci a `data/vocabolario-n3.json` (stesso formato di N4) e chiedere un controllo furigana.
- **Audio mp3 (fase 2):** la struttura `audio/` è pronta ma i file non sono generati: servono un servizio di sintesi vocale e l'elenco in Impostazioni → Audio (vedi `audio/README.md`). Finché mancano, l'app usa la voce del dispositivo.
- **Verifica umana:** testi, dialoghi e frasi nuove (N4/N3, generatori JLPT) sono creati da IA; furigana generati con un analizzatore morfologico e controllati a campione, ma una rilettura di un madrelingua è consigliata.

## 10. Frasi reali da Tatoeba (dalla versione 2.2.0)
`data/frasi.json` contiene circa 2.600 frasi giapponese-italiano estratte da Tatoeba (CC BY 2.0 FR, © i rispettivi autori): 411 per N5, 776 per N4, 1.399 per N3, scelte perché usano solo kanji e parole dei tuoi elenchi. Il furigana è stato aggiunto in automatico e ogni lettura controllata con KANJIDIC2/JMdict (le frasi con letture dubbie sono state scartate). Le traduzioni italiane sono quelle di Tatoeba, in parte ricavate passando dall'inglese: qualche frase può essere approssimativa.
Esercizi → **Frasi vere**: italiano → giapponese, giapponese → italiano, riordino, completa la parola, ascolto, dettato, shadowing, mix. Le frasi alimentano anche gli esercizi esistenti (traduzione, riordino, cloze, dettato, shadowing, ascolto, mix del giorno). Per ricrearle o ampliarle vedi `_strumenti/LEGGIMI.md`.
Anche le frasi hanno l'audio pre-registrato con VOICEVOX (`audio/fr/`, voce femminile/maschile alternata in base all'id) usato in ascolto, dettato e shadowing.
Crediti obbligatori: «Tatoeba (tatoeba.org), CC BY 2.0 FR» è già riportato in Impostazioni → App.


## 11. Percorsi guidati (dalla versione 2.5.0)
Scheda **Percorso** (`#/path`): un cammino N5 → N4 → N3 in ordine, con sblocco per padronanza. Codice in `js/path.js`, curriculum in `data/percorso.json`.

**Metodo (come lo farebbe un insegnante)**
- **Unità** (N5: 5 di alfabeti + 10 di contenuti; N4: ponte + 12; N3: ponte + 14). Ogni unità ha un obiettivo («alla fine sarai in grado di…») e una lezione in passi: *kanji* (a gruppi di 8, con SRS) → *parole* (a gruppi di 10) → *grammatica* (schede da studiare) → *leggi e ascolta* (testi e dialoghi dell’unità) → *pratica guidata* (≥ 60%) → **verifica** (≥ 80% per aprire l’unità successiva).
- **Ripasso a spirale:** ogni verifica contiene ~25% di domande dalle unità precedenti; per N4 e N3 metà del ripasso viene dai livelli inferiori (N4 include N5, N3 include N5 + N4). Le domande su cui sbagli hanno la precedenza.
- **Checkpoint** cumulativi (~30 domande, ≥ 75%) ogni 4 unità e a fine alfabeti. Prima di N4 e N3 c’è un’unità «ponte» di ripasso (≥ 70%).
- **Esame finale** di ogni livello = simulazione completa (le 4 parti dell’esame, generata e cumulativa) con timer. Si supera con i punteggi minimi JLPT **e** almeno il 60% di risposte corrette (margine di sicurezza: il punteggio qui è una stima, non la scala equalizzata ufficiale). Il livello successivo si apre solo dopo (oppure con «Sblocca comunque» / test d’ingresso).
- Il passo «kanji» di N4/N3 assegna ogni kanji all’unità in cui compare nelle parole studiate (così si impara nel contesto); N5 è raggruppato a mano per tema (numeri, giorni, natura, verbi…). N3 ha poche parole (vedi §9), quindi molti kanji N3 sono distribuiti per ordine di frequenza.

**Cambiare il curriculum:** modifica `SPEC` (unità, obiettivi, schede, testi, dialoghi, categorie di vocabolario) in `_strumenti/genpercorso.py` e rilancia dalla cartella dell’app:
```
python3 -I _strumenti/genpercorso.py
```
Lo script **verifica** che ogni scheda di grammatica, kanji, testo, dialogo e parola sia assegnato una sola volta (si ferma con un errore se manca o è duplicato) e stampa la tabella di quanti elementi ha ogni unità. Dopo ogni modifica incrementa VERSION (sw.js + core.js).

**Dati salvati:** `S.path` in localStorage (`u` unità, `cp` checkpoint, `fin` esami finali, `open` livelli sbloccati a mano); è incluso nei backup. «Azzera i progressi del percorso» è in fondo alla scheda Percorso. Soglie in `PTH` (inizio di `js/path.js`).
**Limiti noti:** le verifiche sono create da IA con i contenuti dell’app (stessa avvertenza del §4); l’esame finale è una stima; se una scheda o un esercizio ha pochi esercizi, la verifica integra con altre domande dell’unità.
