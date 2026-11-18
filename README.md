# Dossier Amsterdam — lokale presentatie en dossierwerkplek

Deze repository bevat uitsluitend de lege applicatiecode voor een persoonlijk dossier. De bedoeling is dat de werkplek en presentatiestand **lokaal op je eigen Windows-laptop** draaien, niet als openbare dossierwebsite.

## Privacy: lees dit eerst

Deze repository is publiek. Zet hier nooit persoonlijke gegevens of bewijsbestanden in:
- geen namen, adressen, telefoonnummers of e-mailadressen van betrokkenen;
- geen bankafschriften, pintransacties of betaalbewijzen;
- geen WhatsApp-exports, e-mails, foto's, poststukken of getuigenverklaringen;
- geen PDF's of exports uit de dossierapp.

De dossiergegevens en gekozen bewijsbestanden worden alleen in IndexedDB van de browser op de eigen laptop opgeslagen. De app bevat geen backend, analytics, externe scripts of uploadfunctie. De lokale startserver luistert uitsluitend op `127.0.0.1` (deze laptop) en verstuurt niets naar GitHub.

**Activeer GitHub Pages niet voor het persoonlijke dossier.** Een Pages-website is publiek toegankelijk. De code kan publiek blijven, maar je ingevulde dossier en bijlagen horen uitsluitend lokaal te blijven.

## Starten op Windows

1. Open deze repository op GitHub.
2. Kies **Code → Download ZIP** en sla het ZIP-bestand op je laptop op.
3. Pak het ZIP-bestand uit in een eigen map, bijvoorbeeld Documenten.
4. Dubbelklik op `Start-lokaal.bat`.
5. Er opent een browservenster op `http://127.0.0.1:8765/index.html`.
6. Vul je dossier in. Klik bovenaan op **Presentatie openen** om de schermvullende dia's te tonen.

Laat het zwarte PowerShell-venster open zolang je de dossierwerkplek gebruikt. Sluit de lokale server af met Ctrl+C in dat venster. De startscript gebruikt alleen Windows PowerShell en de ingebouwde .NET-bibliotheken; Python of Node.js is niet nodig.

Gebruik steeds hetzelfde browserprofiel en dezelfde URL (`127.0.0.1:8765)). Browseropslag op `localhost`, `127.0.0.1` en een GitHub Pages-domein is van elkaar gescheiden.

## In de dossierwerkplek

- Persoonlijke verklaring en adres volgens de bewijsstukken.
- Tijdlijn met woonperiodes, verhuizingen, aanvragen en gesprekken.
- Bewijsregister met lokale PDF's, foto's en andere bestanden.
- Getuigen / personen die uit eigen waarneming kunnen verklaren.
- Contactlog voor de gemeente en hulpverlening.
- Presentatiestand met dia's en knoppen om gekoppelde lokale bewijsbestanden te openen.
- Afdrukken naar PDF en versleutelde back-up maken/terugzetten.

## Back-ups en opslag

- Maak regelmatig een **versleutelde back-up** via de knop in de werkplek.
- Bewaar het wachtwoord apart. Zonder dit wachtwoord is de back-up niet terug te zetten.
- De gewone browseropslag is niet versleuteld. Beveilig je Windows-account en laptop.
- Bij het wissen van browsergegevens kunnen dossiergegevens verdwijnen.
- De versleutelde back-up bevat ook de bestanden die je in de app hebt gekoppeld. Bewaar die back-up veilig.

## Presenteren

Open vanuit de werkplek **Presentatie openen**. Navigeer met de pijltjestoetsen links/rechts, Page Up/Page Down of de knoppen onderaan. Gebruik F of het schermknopje voor volledig scherm. De presentatiestand leest dezelfde lokale gegevens en bijlagen uit de browseropslag.

Controleer vóór het gesprek altijd alle datums, adressen en omschrijvingen. Een banktransactie kan een plaatselijk patroon ondersteunen, maar bewijst op zichzelf niet dat iemand onafgebroken op één woonadres verbleef. Toon daarom het geheel: afschriften, woonperiodes, correspondentie, hulpverleningscontacten en verklaringen uit eigen waarneming.


## Bankafschriften en getuigen-PDF's ordenen

- Registreer ieder bankafschrift of maandoverzicht als een **apart bewijsstuk**. Gebruik een herkenbare titel, bijvoorbeeld "ABN-AMRO — mei 2024", en vul de afschriftperiode in.
- Voeg bij dat record de bijbehorende PDF toe. De presentatiestand verdeelt bankafschriften over maximaal vier vermeldingen per dia.
- Registreer iedere getuige afzonderlijk bij **Getuigenverklaringen** en voeg de ondertekende verklaring-PDF direct aan die persoon toe.
- In de presentatie kan Melissa vervolgens de gekoppelde PDF rechtstreeks vanaf de laptop openen.
- De presentatie laat alleen de registraties zien die je hebt toegevoegd. Controleer dat ieder bestand echt is gekoppeld en opent voordat je het gesprek ingaat.
