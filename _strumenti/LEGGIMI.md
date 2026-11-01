# Strumenti di controllo dei contenuti (facoltativi)

Non servono per usare l'app. Li ho usati per controllare i dati:

- `lint.py <cartella-app>`: controlla che ogni kanji nei testi abbia le furigana `{漢字|かんじ}` e che il markup sia corretto.
- `verify.py <cartella-app>`: confronta letture on/kun dei kanji con KANJIDIC2 e le parole (scrittura+lettura) con JMdict.
  Richiede di scaricare `kanjidic2.xml` e `JMdict_e` (EDRDG, http://www.edrdg.org/) in una cartella `src/` accanto allo script.
- `autofuri.py <cartella-app> <file.json…>`: aggiunge furigana ai kanji rimasti senza, usando le letture già presenti nei dati (da ricontrollare a occhio).

Sono script Python 3 (`python3 -I script.py …`). Chiedere all'assistente di eseguirli è il modo più semplice.

## Estrazione automatica di frasi (Tatoeba) — cartella frasi/
Script Python usati per creare `data/frasi.json` (frasi giapponese-italiano reali, scelte per livello):
1. scarica da https://downloads.tatoeba.org/exports/ : `per_language/jpn/jpn_sentences.tsv.bz2`, `per_language/ita/ita_sentences.tsv.bz2`, `per_language/eng/eng_sentences.tsv.bz2`, `links.tar.bz2` (licenza CC BY 2.0 FR);
2. `pivot.py` collega giapponese → inglese → italiano; `tat.py` tiene le frasi i cui kanji e parole stanno nei tuoi elenchi N5/N4/N3; `tatbuild.py` aggiunge il furigana (analizzatore Janome) e controlla ogni lettura con KANJIDIC2/JMdict;
3. `furi.py` serve anche per aggiungere il furigana a testi e dialoghi nuovi (`mktext.py`, `mkasc.py`).
Servono `pip install janome` e i file `kd.pkl`/`jm.pkl` creati da `verify.py`. I percorsi nei file vanno adattati.
