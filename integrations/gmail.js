export async function fetchGmailMessages() {
  // Simulierte Gmail-Testdaten – 23 Nachrichten aus verschiedenen Lebensbereichen
  return [
    { from: "FernUniversität Hagen <info@fernuni-hagen.de>", subject: "Ihre Sendung wird zugestellt", snippet: "Ihre FernUniversität Hagen Sendung wird heute zwischen 13:10 und 14:40 Uhr zugestellt." },
    { from: "Amazon <bestellung@amazon.de>", subject: "Ihre Bestellung wurde versendet", snippet: "Das Paket mit Ihrer Bestellung #123-456 wird morgen eintreffen." },
    { from: "PayPal <service@paypal.de>", subject: "Zahlung an Netflix wurde gesendet", snippet: "Sie haben 12,99 EUR an Netflix International B.V. gesendet." },
    { from: "LinkedIn <updates@linkedin.com>", subject: "Neue Profilansichten", snippet: "3 Personen haben in dieser Woche Ihr Profil angesehen." },
    { from: "Dropbox <no-reply@dropbox.com>", subject: "Ihr Speicher ist fast voll", snippet: "Ihr Dropbox-Speicher ist zu 95 % belegt. Jetzt upgraden, um Platz zu schaffen." },
    { from: "Zalando <service@zalando.de>", subject: "Rücksendung eingegangen", snippet: "Ihre Rücksendung wurde erfolgreich verarbeitet. Der Betrag wird in Kürze erstattet." },
    { from: "Arztpraxis Dr. Müller <info@praxis-mueller.de>", subject: "Erinnerung: Termin morgen um 09:00 Uhr", snippet: "Bitte bringen Sie Ihre Versicherungskarte mit." },
    { from: "Google Kalender <calendar-noreply@google.com>", subject: "Termin: Team-Meeting 10:00 Uhr", snippet: "Erinnerung: Ihr Termin mit dem Team beginnt in 30 Minuten." },
    { from: "Netflix <info@mailer.netflix.com>", subject: "Neu auf Netflix: Ihr Wochenüberblick", snippet: "Neue Serienempfehlungen basierend auf Ihrem Verlauf." },
    { from: "Fitnessstudio UrbanFit <service@urbanfit.de>", subject: "Trainingsplan aktualisiert", snippet: "Ihr neuer Trainingsplan steht ab sofort im Mitgliederbereich bereit." },
    { from: "Rewe Lieferservice <lieferung@rewe.de>", subject: "Ihre Bestellung wurde vorbereitet", snippet: "Ihr Lieferfenster: Heute 17:00 - 18:00 Uhr." },
    { from: "Telekom <kontakt@telekom.de>", subject: "Rechnung für Oktober 2025", snippet: "Ihre aktuelle Rechnung über 49,90 EUR ist jetzt verfügbar." },
    { from: "Postbank <online@postbank.de>", subject: "Wichtige Mitteilung zu Ihrem Konto", snippet: "Bitte bestätigen Sie Ihre hinterlegte Handynummer bis zum 30.10." },
    { from: "Spotify <no-reply@spotify.com>", subject: "Ihr Jahresrückblick 2025 ist da", snippet: "Sie haben dieses Jahr 8.237 Minuten Musik gehört. Ihre Top-Künstler: Petrucciani, Jarre, Hancock." },
    { from: "OpenAI <noreply@openai.com>", subject: "Neue Funktionen in ChatGPT", snippet: "Jetzt mit GPT-5 Turbo und Memory-Unterstützung." },
    { from: "Twitter/X <info@x.com>", subject: "Neue Login-Aktivität erkannt", snippet: "Jemand hat sich aus Berlin in Ihr Konto eingeloggt. War das Sie?" },
    { from: "Airbnb <updates@airbnb.com>", subject: "Buchungsbestätigung: Wochenende in Wien", snippet: "Ihre Unterkunft ist vom 24.–26. Oktober bestätigt." },
    { from: "Notion <support@notion.so>", subject: "Neue Kommentare in Ihrem Dokument", snippet: "Anna hat einen Kommentar in 'Projektplanung Q4' hinterlassen." },
    { from: "Microsoft <security@microsoft.com>", subject: "Sicherheitsüberprüfung erforderlich", snippet: "Bitte bestätigen Sie Ihre Identität, um fortzufahren." },
    { from: "Gmail Team <team@gmail.com>", subject: "Willkommen bei Ihrem neuen Posteingang", snippet: "Erste Schritte mit Ihrem Gmail-Konto." },
    { from: "Apple <no-reply@apple.com>", subject: "Ihr iCloud-Speicher ist fast voll", snippet: "Sie nutzen derzeit 49,3 GB von 50 GB." },
    { from: "GitHub <noreply@github.com>", subject: "Neue Sterne für Ihr Repository", snippet: "Ihr Projekt 'ai-assistant-mvp' hat 3 neue Stars erhalten." },
    { from: "Krankenkasse TK <service@tk.de>", subject: "Versichertenbescheinigung abgelaufen", snippet: "Bitte erneuern Sie Ihre Bescheinigung bis zum 31. Oktober." }
  ];
}
