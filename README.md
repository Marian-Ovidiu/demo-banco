# Banco

Demo locale di un piccolo gestionale per attività di servizi. Dati fittizi, modificabili e salvati nel browser: nessun account, server applicativo o invio di email.

## Avvio

Richiede Node.js 22.12+ (oppure 20.19+) e npm.

```sh
npm install
npm run dev
```

Apri http://127.0.0.1:4322. `npm run build` genera `dist/`; `npm run preview` serve la build sulla stessa porta, dopo aver fermato il server di sviluppo.

## Funzioni

- **Menu:** su desktop si riduce a una barra di icone e ricorda la preferenza; su mobile si apre come pannello laterale, chiudibile anche con Esc o toccando lo sfondo.
- **Panoramica:** conteggi aggiornati, agenda della settimana, ultimi preventivi.
- **Clienti:** ricerca, creazione, modifica, eliminazione e scheda con note e attività collegate. Un cliente con appuntamenti o preventivi non viene eliminato accidentalmente.
- **Appuntamenti:** navigazione settimanale, creazione, modifica, completamento ed eliminazione.
- **Preventivi:** voci (massimo 20), quantità, prezzi, IVA, stati, validità, note ed esportazione PDF reale. Il documento può avere più pagine e riporta che si tratta di una demo.
- **Ripristino:** con conferma, ricrea soltanto i dati di questa demo. Le date di esempio vengono ancorate al giorno del ripristino.

I dati restano in `localStorage` sotto la chiave `banco-demo-v1`. La demo funziona anche quando il salvataggio è bloccato, mostrando un avviso. Il cambio di browser o indirizzo non trasferisce i dati. Pensata per dati inventati, non per l’uso operativo con clienti reali.

## Struttura

React + Vite, CSS senza framework, jsPDF caricato soltanto quando si scarica un preventivo. Font Manrope ospitato localmente. Nessun tracking, nessuna API esterna e nessun servizio a pagamento.

- `src/App.jsx`: navigazione, viste e moduli.
- `src/data.js`: dati iniziali, validazione del salvataggio, calcoli e numerazione.
- `src/pdf.js`: impaginazione e download PDF.
- `src/styles.css`: interfaccia responsive.

```sh
npm test
npm run build
```

I test verificano date, arrotondamenti monetari, numerazione persistente, recupero dello storage e generazione PDF anche con descrizioni lunghe. Le informazioni in questa demo sono inventate. Gli indirizzi usano il dominio riservato `example.com`.

La demo è integrata nel portfolio come build statica sotto `/demo/banco/`, con un link di ritorno. Per aggiornare la copia integrata, dal progetto portfolio esegui `npm run sync:demo`: il comando ricostruisce questa app con la base corretta e importa solo `dist/`. Il normale `npm run build` di Banco rimane utilizzabile come sito autonomo. La pubblicazione è separata da questo comando. Nessuna autenticazione, gestione ruoli, email automatica, importazione o page builder: il perimetro resta scheda cliente, appuntamento e preventivo PDF.
