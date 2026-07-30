const CSV_URL = new URL("./data/messages.csv", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ""]))
  );
}

function toBoolean(value) {
  return String(value).trim().toLowerCase() === "true";
}

export async function loadMessageEntries() {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Unable to load message CSV: ${response.status}`);
  }

  return parseCsv(await response.text())
    .filter((entry) => toBoolean(entry.is_visible))
    .map((entry) => ({
      ...entry,
      is_visible: toBoolean(entry.is_visible),
      is_winner: toBoolean(entry.is_winner),
      winner_prize_tier: entry.winner_prize_tier || null,
      winner_selected_at: entry.winner_selected_at || null,
    }))
    .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
}
