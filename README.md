# Dossier Amsterdam — lokale dossierwerkplek

Een statische Nederlandstalige webapp om een persoonlijk bewijsdossier chronologisch te ordenen.

## Privacyontwerp

Deze repository is **publiek**. De repository bevat uitsluitend de applicatiecode en algemene uitleg. Voeg hier nooit persoonlijke dossierinformatie, namen, adressen, bankafschriften, chatberichten, foto's, getuigenverklaringen of andere bewijsbestanden aan toe.

De applicatie bewaart ingevulde gegevens en geselecteerde bewijsbestanden uitsluitend in de lokale browseropslag (IndexedDB) van het apparaat waarop je de website gebruikt. De applicatie bevat geen backend, analytics, externe fonts, externe scripts of uploadfunctie. De app verstuurt dossiergegevens niet naar GitHub of een andere server.

Belangrijke gevolgen:
- De publieke website bevat geen persoonlijke dossierinhoud.
- Een link naar de website deelt geen ingevulde gegevens.
- Gegevens zijn alleen beschikbaar in dezelfde browser op hetzelfde apparaat.
- Browsergegevens kunnen verloren gaan bij het wissen van browsergegevens of bij een defect apparaat.
- Maak daarom regelmatig een **versleutelde back-up** via de knop in de applicatie en bewaar die veilig.
- De browseropslag zelf is niet versleuteld. Beveilig je computeraccount en browserprofiel.
- Exporteer of print alleen de onderdelen die je bewust met de gemeente wilt delen.

## Gebruik

1. Open de website op je eigen apparaat via GitHub Pages, of open `index.html` lokaal.
2. Vul je gegevens en bewijsregister in.
3. Selecteer bewijsbestanden bij een bewijsstuk. De bestanden worden in IndexedDB van deze browser bewaard.
4. Maak regelmatig een versleutelde back-up.
5. Gebruik **Print / opslaan als PDF** om een dossieroverzicht te maken. Voeg de originele bewijsbestanden desgewenst apart toe aan je indiening.

## GitHub Pages activeren

Na het publiceren van de bestanden:
1. Open **Settings → Pages** in deze repository.
2. Kies bij de publicatiebron **Deploy from a branch**.
3. Selecteer branch `main` en map `/ (root)`.
4. Sla op en open de door GitHub getoonde website-link.

Let op: GitHub Pages is publiek toegankelijk. Dat is hier alleen bedoeld om de lege applicatiecode te leveren. Vul nooit persoonlijke dossierinformatie in bronbestanden in en commit nooit exports of bewijsstukken.

## Techniek

- HTML, CSS en vanilla JavaScript.
- IndexedDB voor lokale gegevens en bewijsbestanden.
- Web Crypto API (PBKDF2 + AES-GCM) voor versleutelde JSON-back-ups.
- Geen framework of externe afhankelijkheden.
