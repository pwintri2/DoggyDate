<div align="center">

# 🐾 Doggy Date 🐾

### 🐕 De datingapp waar honden de norm bepalen 🐕‍🦺

*Find Love. Paws First.* — want geen enkele relatie zou mogen beginnen
zonder fatsoenlijke goedkeuring van de hond. 🐶❤️

🦴 **Tweetalig (NL / EN)** · 🐩 **Volledig responsive** · 🦮 **Geen build, geen framework** · 🐕 **Klaar voor Strato**

### 🔗 [**Live demo → pwintri2.github.io/DoggyDate**](https://pwintri2.github.io/DoggyDate/) 🐾

</div>

---

> 🐾 **Pootnoot:** dit is een humoristisch parodie-/pretproject. Er zijn geen
> echte honden (of mensen) te huur. Alle belofdes over kwispelende staarten
> zijn puur voor de lol. 🐕💛

---

## 🐶 Wat is dit?

Een vrolijke één-merk website voor een verzonnen hondengerichte
"dating/escort"-boekingsservice. Mensen worden gematcht op basis van de *vibe
van hun hond*. Bezoekers kunnen een datestijl kiezen en een (nep)boeking maken
die netjes per e-mail binnenkomt. 🐕🤝🐕

## ✨ Hoogtepunten

- 🌍 **Tweetalig** — vloeiend wisselen tussen **🇳🇱 Nederlands** en **🇺🇸 Engels**, keuze wordt onthouden
- 🦴 **Drie datingstijlen** — elk met een eigen kleur, emoji en omschrijving
- 📝 **Boekingsmodal** — met validatie, sterrenscore ⭐ en een bevestigingsbon
- 📧 **Echt versturen** — boekingen komen per e-mail binnen (PHP), met `mailto`-terugval
- ♿ **Toegankelijk** — toetsenbordvriendelijk, focus-trap, schermlezer-labels
- 🐕‍🦺 **Geen afhankelijkheden** — pure HTML/CSS/JS, werkt zelfs offline
- 📱 **Mobile-first** — van telefoon tot desktop één blije staart

## 🐕 De drie datingstijlen

| Stijl | Emoji | Voor wie? | Prijs |
|------|:-----:|-----------|------:|
| **Dubbele Hondenwandeling** | 🐕🤝🐕 | Beide daters nemen hun hond mee | €25 |
| **Neem Je Hond Mee** | 🧑‍🤝‍🧑🐶 | Eén hond als ultieme ijsbreker | €15 |
| **Huur-een-Hond** | 🏠🐕 | Geen hond? Wij lenen er een! | €35/u |

## 📁 Projectstructuur

```
doggydate/
├── index.html          🏠 Home (hero + overzicht)
├── services.html       🦴 Diensten (3 kaarten + boekingsmodal)
├── how-it-works.html   🐾 Hoe het werkt (4 stappen)
├── guarantee.html      🛡️ Brave Hond Garantie
├── send.php            📧 Verstuurt boekingen per e-mail
├── css/
│   └── styles.css      🎨 Volledig design system (kleuren, animaties, responsive)
└── js/
    ├── i18n.js         🗣️ Alle teksten in Nederlands + Engels
    └── app.js          🧠 Taaltoggle, boekingsmodal, validatie, verzenden, toasts
```

## 🚀 Lokaal draaien

Dubbelklikken op `index.html` werkt, maar voor het correct laden van de
JS-bestanden draai je beter even een mini-server: 🐕‍🦺

```bash
cd doggydate
python3 -m http.server 8080
# open http://localhost:8080
```

> 🐾 Let op: het **echt versturen** van e-mail werkt alleen waar PHP draait
> (zoals op Strato). Lokaal valt de boeking terug op een vooringevulde
> `mailto:`-link.

## 📤 Uploaden naar Strato

1. Log in op je Strato-pakket → **Hosting / Webspace** → bestandsbeheer (of FTP, bv. FileZilla). 🗂️
2. Ga naar je webroot (meestal `/`, `htdocs` of `html`).
3. Upload de **hele inhoud** van deze map (`index.html`, `services.html`, `how-it-works.html`, `guarantee.html`, `send.php`, en de mappen `css/` en `js/`). Behoud de mappenstructuur. 📦
4. Klaar! Bezoek je domein → `index.html` laadt automatisch. 🎉

> 🐩 **Tip:** de links zijn relatief, dus de site werkt zowel in de webroot
> als in een submap (`jouwdomein.nl/doggydate/`).

## 📧 Boekingen & e-mail

Bij een bevestigde boeking stuurt `send.php` de gegevens automatisch naar de
business-inbox. Vult de bezoeker een e-mailadres in, dan krijgt **de klant ook
een bevestigingsmail** in zijn/haar eigen taal. 🐾✉️

**Instellen** (bovenaan `send.php`):

```php
$TO   = 'info@wintrip.nl';     // 📬 waar de boekingen heen gaan
$FROM = 'info@wintrip.nl';     // 🐕 moet op je eigen domein staan
```

> ⚠️ Het `$FROM`-adres **moet op je eigen domein** liggen, anders weigert de
> mailserver de mail of belandt die in spam. Check de eerste keer ook even je
> spam-map. 🦴

## 🎨 Aanpassen

- 🗣️ **Teksten/vertalingen:** `js/i18n.js` (elke regel staat in `nl` én `en`)
- 🎨 **Kleuren & stijl:** de CSS-variabelen bovenaan `css/styles.css` (`:root`)
- 🦴 **Prijzen/diensten:** prijzen in `js/i18n.js` (`svc.*.price`); de dienstdefinities in `js/app.js` (`SERVICES`)
- 📬 **Ontvanger:** `info@wintrip.nl` in `send.php` (`$TO`) en `js/app.js` (`BOOKING_EMAIL`)

## 🐾 Live preview vs. echt versturen

De **[live demo op GitHub Pages](https://pwintri2.github.io/DoggyDate/)** laat
het volledige ontwerp en de boekingsflow zien. Let op: GitHub Pages draait
**geen PHP**, dus op de demo valt het versturen terug op een `mailto:`-link.
Het écht per e-mail binnenkrijgen van boekingen werkt pas op je
**Strato-hosting** (waar `send.php` draait). 🐕📧

## 📄 Licentie

MIT — zie [LICENSE](LICENSE). Doe ermee wat je wilt! 🐾
*(Parodieproject, dus geen garanties op echte dates of kwispelende staarten.)* 🐶

---

<div align="center">

🐾 *Elke kwispel is een geslaagde date* 🐾

**Alle dates begeleid · Geen snoepjes achtergehouden · Buikjes aaien gegarandeerd** 🦴🐕❤️

</div>
