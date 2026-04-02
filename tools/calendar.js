export function getCalendarContext() {
  const now = new Date();

  const iso = now.toISOString();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  const weekdays = [
    "niedziela",
    "poniedziałek",
    "wtorek",
    "środa",
    "czwartek",
    "piątek",
    "sobota"
  ];

  const weekday = weekdays[now.getDay()];

  const hourNum = now.getHours();
  let partOfDay = "noc";

  if (hourNum >= 5 && hourNum < 12) {
    partOfDay = "rano";
  } else if (hourNum >= 12 && hourNum < 17) {
    partOfDay = "popołudnie";
  } else if (hourNum >= 17 && hourNum < 22) {
    partOfDay = "wieczór";
  }

  return {
    iso,
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
    weekday,
    partOfDay
  };
}
