# Cartella audio

Audio pre-generati per dialoghi, coppie minime, dettati, risposte rapide e shadowing. L'app li usa se esistono; altrimenti usa la voce del dispositivo.

Struttura: `audio/<livello>/<id>.m4a`  (livello = n5, n4, n3; AAC mono 24 kbps, ≈ 3 KB al secondo)

- Dialoghi: un file per battuta → `audio/n5/dlg-n5-01_1.m4a`, `_2`, …
- Coppie minime: `mp-n5-01a.m4a` e `mp-n5-01b.m4a`
- Dettati: `dic-…` · Risposte rapide: `res-…` · Shadowing: `shd-…`

Le frasi di Tatoeba hanno l'audio in `audio/fr/<id>.m4a` (voce F se l'id numerico è pari, M se dispari). Gli esercizi del formato JLPT cambiano a ogni ingresso e usano la voce del dispositivo.

## Come sono stati creati
Con **VOICEVOX** (motore open source, https://voicevox.hiroshiba.jp/), in locale e gratis: voce femminile 四国めたん, voce maschile 青山龍星; poi `afconvert` per convertire in m4a. Script: `_strumenti/genaudio.py` (avvia prima il motore VOICEVOX sul tuo Mac).

**Crediti obbligatori** (già in Impostazioni → App): «VOICEVOX:四国めたん» e «VOICEVOX:青山龍星». Controlla le condizioni d'uso aggiornate dei personaggi su https://voicevox.hiroshiba.jp/ prima di pubblicare (di norma l'uso, anche commerciale, è permesso con credito).

L'elenco completo (nome file, voce, testo in kana) è in Impostazioni → Audio → CSV.
Dopo aver cambiato i file, aumenta VERSION in sw.js e APP_VERSION in js/core.js e ripubblica.

Kana: `audio/kana/<codepoint>.m4a` (es. あ = 3042.m4a, きゃ = 304d-3083.m4a), creati con `_strumenti/genkana.py`.

Parole e frasi dei pulsanti 🔊: `audio/t/<hash>.m4a` + `audio/index.json` (l'hash è calcolato da `auHash()` in js/audio.js: voce + testo in kana). Rigenera tutto con `_strumenti/genall.py --force`.
