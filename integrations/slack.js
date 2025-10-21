export async function fetchSlackMessages() {
  // Platzhalterdaten – später durch Slack API ersetzen
  return [
    { channel: "#team", text: "Bitte die Präsentation bis 14 Uhr prüfen." },
    { channel: "#sales", text: "Neuer Lead eingegangen – bitte übernehmen." },
    { channel: "#support", text: "Ticket 1043 ist jetzt kritisch markiert." }
  ];
}
