# Veilig omgaan met dossiergegevens

Deze repository en een normale GitHub Pages-publicatie zijn publiek. De code is bedoeld als lege applicatie; persoonlijke dossiergegevens horen hier niet thuis.

## Niet uploaden naar GitHub

- Namen, woonadressen, telefoonnummers of e-mailadressen van betrokkenen.
- Bankafschriften, pintransacties of betaalbewijzen.
- WhatsApp-exports, e-mails of andere privécommunicatie.
- Foto's, poststukken, getuigenverklaringen of gemeentelijke dossiers.
- Exports, back-ups of PDF's die uit de applicatie zijn gemaakt.

De `.gitignore` bevat extra uitsluitingen voor veelvoorkomende bestandsformaten. Dit is alleen een vangnet: controleer altijd wat je commit of upload.

## Wat doet de applicatie?

- Dossiergegevens worden opgeslagen in IndexedDB van de browser.
- Geselecteerde bewijsbestanden worden als Blob in dezelfde lokale IndexedDB opgeslagen.
- De applicatie gebruikt geen backend, analytics, externe scripts of uploadfunctie.
- De versleutelde back-up wordt in de browser gemaakt met PBKDF2 en AES-GCM.
- Printen of opslaan als PDF gebeurt via de afdrukfunctie van de browser.

## Grenzen en aandachtspunten

- Browseropslag is niet automatisch versleuteld. Beveilig het apparaat en je browserprofiel.
- De lokale gegevens synchroniseren niet tussen apparaten of browsers.
- Bij wissen van sitegegevens kunnen de lokale gegevens verdwijnen. Maak daarom regelmatig een versleutelde back-up.
- Een versleutelde back-up is alleen bruikbaar met het wachtwoord. Bewaar het wachtwoord apart.
- Een PDF of afdruk kan gevoelige informatie bevatten. Controleer ontvanger en bijlagen voordat je die deelt.
- Gebruik voor indiening originele bewijsstukken waar nodig; het overzicht vervangt de onderliggende documenten niet.
