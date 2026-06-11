import { supabase } from "./supabase-client.js";

const statusPill = document.querySelector("#admin-status-pill");
const toggleButton = document.querySelector("#toggle-submission-button");
const messageCountElement = document.querySelector("#message-count");
const panelCurrentTimeElement = document.querySelector("#panel-current-time");
const panelTimeDiffElement = document.querySelector("#panel-time-diff");
const drawButton = document.querySelector("#draw-winner-button");
const rerollWinnerButton = document.querySelector("#reroll-winner-button");
const resetWinnersButton = document.querySelector("#reset-winners-button");
const drawPrizeTierSelect = document.querySelector("#draw-prize-tier");
const winnerTierBadgeElement = document.querySelector("#winner-tier-badge");
const winnerNameElement = document.querySelector("#winner-name");
const winnerMessageElement = document.querySelector("#winner-message");
const messageListElement = document.querySelector("#admin-message-list");
const winnerHistoryListElement = document.querySelector("#winner-history-list");
const authSectionElement = document.querySelector("#admin-auth-section");
const controlSectionElement = document.querySelector("#admin-control-section");
const authFormElement = document.querySelector("#admin-auth-form");
const authPasswordInput = document.querySelector("#admin-password");
const loginStatusElement = document.querySelector("#admin-login-status");
const controlStatusElement = document.querySelector("#admin-control-status");

const TEXT = {
  loginActive: "\uAD00\uB9AC\uC790 \uB85C\uADF8\uC778 \uC0C1\uD0DC\uC785\uB2C8\uB2E4.",
  noEntriesTitle: "\uC544\uC9C1 \uB4F1\uB85D\uB41C \uB355\uB2F4\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
  noEntriesBody: "\uD558\uAC1D\uC774 \uB355\uB2F4\uC744 \uB0A8\uAE30\uBA74 \uC774 \uBAA9\uB85D\uC5D0 \uBC14\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
  open: "\uC811\uC218 \uC911",
  closed: "\uB9C8\uAC10",
  stopSubmission: "\uB355\uB2F4 \uC811\uC218 \uC911\uC9C0\uD558\uAE30",
  openSubmission: "\uB355\uB2F4 \uC811\uC218 \uB2E4\uC2DC \uC5F4\uAE30",
  loadEntriesFailed: "\uB355\uB2F4 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
  loadSettingsFailed: "\uD589\uC0AC \uC124\uC815\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
  toggleFailed: "\uC811\uC218 \uC0C1\uD0DC \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  openedSubmission: "\uB355\uB2F4 \uC811\uC218\uB97C \uB2E4\uC2DC \uC5F4\uC5C8\uC2B5\uB2C8\uB2E4.",
  closedSubmission: "\uB355\uB2F4 \uC811\uC218\uB97C \uC911\uC9C0\uD588\uC2B5\uB2C8\uB2E4.",
  persistFailed: "\uCD94\uCCA8 \uACB0\uACFC \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  replaceFailed: "\uB2E4\uC2DC\uBF51\uAE30 \uACB0\uACFC \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  loginFailed: "\uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  invalidPasscode: "\uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  loggedIn: "\uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  loggedOut: "\uB85C\uADF8\uC544\uC6C3\uD588\uC2B5\uB2C8\uB2E4.",
  enterPasscode: "\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
  loggingIn: "\uB85C\uADF8\uC778 \uC911\uC785\uB2C8\uB2E4...",
  closeBeforeDraw: "\uB355\uB2F4 \uC811\uC218\uB97C \uB9C8\uAC10\uD55C \uB4A4 \uCD94\uCCA8\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  noEntries: "\uB4F1\uB85D\uB41C \uB355\uB2F4\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  noEligibleEntries: "\uC774\uBBF8 \uBAA8\uB4E0 \uD558\uAC1D\uC774 \uC120\uC815\uB418\uC5B4 \uCD94\uCCA8 \uAC00\uB2A5 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  noCurrentWinner: "\uBA3C\uC800 \uB2F9\uCCA8\uC790\uB97C \uBF51\uC544\uC8FC\uC138\uC694.",
  noRerollEligibleEntries: "\uB2E4\uC2DC \uBF51\uC744 \uB2E4\uB978 \uD558\uAC1D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  announcedWinner: "\uB2F9\uCCA8\uC790 \uBC1C\uD45C",
  selectedBadge: "\uC120\uC815 \uC644\uB8CC",
  noWinnerHistory: "\uC544\uC9C1 \uC120\uC815\uB41C \uD558\uAC1D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
  resetConfirm:
    "\uBAA8\uB4E0 \uC815\uBCF4\uAC00 \uC0AC\uB77C\uC9D1\uB2C8\uB2E4. \uC815\uB9D0 \uD070 \uC774\uC288\uAC00 \uC788\uB294 \uAC8C \uC544\uB2C8\uBA74 \uCD08\uAE30\uD654\uD558\uC9C0 \uB9D0\uC544\uC8FC\uC138\uC694!!!!!",
  resetFailed: "\uB2F9\uCCA8 \uC815\uBCF4 \uCD08\uAE30\uD654\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  resetDone: "\uB2F9\uCCA8 \uC815\uBCF4\uB97C \uCD08\uAE30\uD654\uD588\uC2B5\uB2C8\uB2E4.",
  winnerDefaultTitle: "\uB2F9\uCCA8\uC790 \uBC1C\uD45C",
  winnerDefaultName: "\uC544\uC9C1 \uCD94\uCCA8 \uC804\uC785\uB2C8\uB2E4",
  winnerDefaultMessage:
    "\uBC84\uD2BC\uC744 \uB204\uB974\uBA74 \uB4F1\uB85D\uB41C \uB355\uB2F4 \uC911 \uD558\uB098\uAC00 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
};

const PRIZE_TIER_LABELS = {
  "1st": "1\uB4F1",
  "2nd": "2\uB4F1",
  "3rd": "3\uB4F1",
};

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const state = {
  entries: [],
  isOpen: true,
  winnerCount: 0,
  selectedPrizeTier: drawPrizeTierSelect?.value ?? "1st",
  currentWinner: null,
  adminPasscode: sessionStorage.getItem("adminPasscode") ?? "",
  subscriptionsStarted: false,
};

function escapeFallback(message) {
  return message.replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return map[char];
  });
}

function formatPrizeTier(prizeTier) {
  return PRIZE_TIER_LABELS[prizeTier] ?? PRIZE_TIER_LABELS["1st"];
}

function updateClock() {
  const now = new Date();
  const formattedTime = timeFormatter.format(now);
  panelCurrentTimeElement.textContent = formattedTime;
  updateTimeOffset(now);
}

function updateTimeOffset(now) {
  const currentHour = now.getHours();
  if (currentHour < 13 || currentHour >= 15) {
    panelTimeDiffElement.textContent = "-";
    return;
  }

  const target = new Date(now);
  target.setHours(13, 40, 0, 0);
  const diffMinutes = Math.floor((now.getTime() - target.getTime()) / 60000);

  if (diffMinutes < 0) {
    const text = `${Math.abs(diffMinutes)}\uBD84\uC804`;
    panelTimeDiffElement.textContent = text;
    return;
  }

  if (diffMinutes > 0) {
    const text = `${diffMinutes}\uBD84\uD6C4`;
    panelTimeDiffElement.textContent = text;
    return;
  }

  panelTimeDiffElement.textContent = `0\uBD84`;
}

function getWinnerHistoryEntries() {
  return state.entries
    .filter((entry) => entry.is_winner)
    .sort((left, right) => new Date(right.winner_selected_at ?? 0) - new Date(left.winner_selected_at ?? 0));
}

function getEligibleEntries() {
  return state.entries.filter((entry) => !entry.is_winner);
}

function getMessageLength(message) {
  return Array.from(message.trim()).length;
}

function getDrawWeight(entry) {
  const messageLength = getMessageLength(entry.message);

  if (messageLength >= 5) {
    return 1.35;
  }

  if (messageLength > 2) {
    return 1;
  }

  return 0;
}

function pickWeightedEntry(entries) {
  const weightedEntries = entries
    .map((entry) => ({
      entry,
      weight: getDrawWeight(entry),
    }))
    .filter((item) => item.weight > 0);
  const totalWeight = weightedEntries.reduce((sum, item) => sum + item.weight, 0);

  if (!totalWeight) {
    return null;
  }

  let randomPoint = Math.random() * totalWeight;
  for (const item of weightedEntries) {
    randomPoint -= item.weight;
    if (randomPoint <= 0) {
      return item.entry;
    }
  }

  return weightedEntries.at(-1).entry;
}

function isSameEntry(left, right) {
  return Boolean(
    left &&
      right &&
      left.nickname.trim().toLowerCase() === right.nickname.trim().toLowerCase() &&
      left.message === right.message
  );
}

function renderEntries() {
  if (!state.entries.length) {
    messageListElement.innerHTML = `
      <article class="admin-message-item">
        <strong>${TEXT.noEntriesTitle}</strong>
        <p>${TEXT.noEntriesBody}</p>
      </article>
    `;
    messageCountElement.textContent = "0";
    return;
  }

  messageListElement.innerHTML = state.entries
    .map(
      (entry) => `
        <article class="admin-message-item">
          <div class="admin-message-head">
            <strong>${escapeFallback(entry.nickname)}</strong>
            ${entry.is_winner ? `<span class="admin-message-badge">${formatPrizeTier(entry.winner_prize_tier)} ${TEXT.selectedBadge}</span>` : ""}
          </div>
          <p>${escapeFallback(entry.message)}</p>
        </article>
      `
    )
    .join("");

  messageCountElement.textContent = String(state.entries.length);
}

function renderWinnerHistory() {
  const winnerHistoryEntries = getWinnerHistoryEntries();

  if (!winnerHistoryEntries.length) {
    winnerHistoryListElement.innerHTML = `
      <article class="winner-history-item is-empty">
        <strong>${TEXT.noWinnerHistory}</strong>
      </article>
    `;
    return;
  }

  winnerHistoryListElement.innerHTML = winnerHistoryEntries
    .map(
      (entry) => `
        <article class="winner-history-item">
          <div class="winner-history-row">
            <span class="winner-history-tier">${formatPrizeTier(entry.winner_prize_tier)}</span>
            <strong>${escapeFallback(entry.nickname)}</strong>
          </div>
          <p>${escapeFallback(entry.message)}</p>
        </article>
      `
    )
    .join("");
}

function syncStatusUi() {
  statusPill.textContent = state.isOpen ? TEXT.open : TEXT.closed;
  statusPill.classList.toggle("is-open", state.isOpen);
  statusPill.classList.toggle("is-closed", !state.isOpen);
  toggleButton.textContent = state.isOpen ? TEXT.stopSubmission : TEXT.openSubmission;
  drawButton.disabled = state.isOpen;
  rerollWinnerButton.disabled = state.isOpen || !state.currentWinner;
  drawPrizeTierSelect.disabled = state.isOpen;
}

function syncAuthUi() {
  const hasPasscode = Boolean(state.adminPasscode);
  authSectionElement.hidden = hasPasscode;
  controlSectionElement.hidden = !hasPasscode;

  if (hasPasscode) {
    controlStatusElement.textContent = TEXT.loginActive;
  } else {
    loginStatusElement.textContent = "";
  }
}

function updateWinnerUi(nickname, message, prizeTier = state.selectedPrizeTier) {
  winnerTierBadgeElement.textContent = `${formatPrizeTier(prizeTier)} ${TEXT.announcedWinner}`;
  winnerNameElement.textContent = nickname;
  winnerMessageElement.textContent = message;
  state.currentWinner = { nickname, message, prizeTier };
  rerollWinnerButton.hidden = false;
  syncStatusUi();
}

function resetWinnerUi() {
  winnerTierBadgeElement.textContent = TEXT.winnerDefaultTitle;
  winnerNameElement.textContent = TEXT.winnerDefaultName;
  winnerMessageElement.textContent = TEXT.winnerDefaultMessage;
  state.currentWinner = null;
  rerollWinnerButton.hidden = true;
  syncStatusUi();
}

async function loadEntries() {
  const { data, error } = await supabase
    .from("messages")
    .select("id, nickname, message, created_at, is_winner, winner_prize_tier, winner_selected_at")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    controlStatusElement.textContent = TEXT.loadEntriesFailed;
    return;
  }

  state.entries = data ?? [];
  renderEntries();
  renderWinnerHistory();
}

async function loadSettings() {
  const { data, error } = await supabase
    .from("event_settings")
    .select("is_open, winner_nickname, winner_message, winner_count, winner_prize_tier")
    .eq("id", "main")
    .single();

  if (error) {
    console.error(error);
    controlStatusElement.textContent = TEXT.loadSettingsFailed;
    return;
  }

  state.isOpen = Boolean(data?.is_open);
  state.winnerCount = Number(data?.winner_count ?? 0);
  syncStatusUi();

  if (data?.winner_nickname && data?.winner_message) {
    updateWinnerUi(data.winner_nickname, data.winner_message, data.winner_prize_tier ?? state.selectedPrizeTier);
  } else {
    resetWinnerUi();
  }
}

async function refreshDashboard() {
  await Promise.all([loadEntries(), loadSettings()]);
}

async function setSubmissionOpen(isOpen) {
  const { error } = await supabase.rpc("admin_set_submission_open", {
    input_passcode: state.adminPasscode,
    next_is_open: isOpen,
  });

  if (error) {
    console.error(error);
    controlStatusElement.textContent = TEXT.toggleFailed;
    return;
  }

  controlStatusElement.textContent = isOpen ? TEXT.openedSubmission : TEXT.closedSubmission;
}

async function persistWinner(entry) {
  const { data, error } = await supabase.rpc("admin_set_winner", {
    input_passcode: state.adminPasscode,
    winner_nickname_input: entry.nickname,
    winner_message_input: entry.message,
    winner_prize_tier_input: state.selectedPrizeTier,
  });

  if (error) {
    console.error(error);
    controlStatusElement.textContent = TEXT.persistFailed;
    return false;
  }

  state.winnerCount = Number(data ?? state.winnerCount + 1);
  return true;
}

async function replaceWinner(previousWinner, nextWinner, prizeTier) {
  const { data, error } = await supabase.rpc("admin_replace_winner", {
    input_passcode: state.adminPasscode,
    previous_winner_nickname_input: previousWinner.nickname,
    previous_winner_message_input: previousWinner.message,
    next_winner_nickname_input: nextWinner.nickname,
    next_winner_message_input: nextWinner.message,
    winner_prize_tier_input: prizeTier,
  });

  if (error) {
    console.error(error);
    controlStatusElement.textContent = TEXT.replaceFailed;
    return false;
  }

  state.winnerCount = Number(data ?? state.winnerCount);
  return true;
}

async function resetWinners() {
  const { error } = await supabase.rpc("admin_reset_winners", {
    input_passcode: state.adminPasscode,
  });

  if (error) {
    console.error(error);
    controlStatusElement.textContent = TEXT.resetFailed;
    return false;
  }

  state.winnerCount = 0;
  state.entries = state.entries.map((entry) => ({
    ...entry,
    is_winner: false,
    winner_prize_tier: null,
    winner_selected_at: null,
  }));
  renderEntries();
  renderWinnerHistory();
  resetWinnerUi();
  controlStatusElement.textContent = TEXT.resetDone;
  return true;
}

async function verifyPasscode(passcode) {
  const { data, error } = await supabase.rpc("admin_check_passcode", {
    input_passcode: passcode,
  });

  if (error) {
    console.error(error);
    loginStatusElement.textContent = TEXT.loginFailed;
    return;
  }

  if (!data) {
    loginStatusElement.textContent = TEXT.invalidPasscode;
    return;
  }

  state.adminPasscode = passcode;
  sessionStorage.setItem("adminPasscode", passcode);
  controlStatusElement.textContent = TEXT.loggedIn;
  syncAuthUi();
  await refreshDashboard();
  subscribeToChanges();
}

async function signOut() {
  state.adminPasscode = "";
  sessionStorage.removeItem("adminPasscode");
  syncAuthUi();
  loginStatusElement.textContent = TEXT.loggedOut;
}

function subscribeToChanges() {
  if (state.subscriptionsStarted) {
    return;
  }

  state.subscriptionsStarted = true;
  supabase
    .channel("admin-messages")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => {
        loadEntries();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "event_settings" },
      (payload) => {
        if (payload.new.id !== "main") {
          return;
        }

        state.isOpen = Boolean(payload.new.is_open);
        state.winnerCount = Number(payload.new.winner_count ?? 0);
        syncStatusUi();

        if (payload.new.winner_nickname && payload.new.winner_message) {
          updateWinnerUi(
            payload.new.winner_nickname,
            payload.new.winner_message,
            payload.new.winner_prize_tier ?? state.selectedPrizeTier
          );
        } else {
          resetWinnerUi();
        }
      }
    )
    .subscribe();
}

authFormElement.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = authPasswordInput.value.trim();

  if (!password) {
    loginStatusElement.textContent = TEXT.enterPasscode;
    return;
  }

  loginStatusElement.textContent = TEXT.loggingIn;
  await verifyPasscode(password);
});

drawPrizeTierSelect.addEventListener("change", () => {
  state.selectedPrizeTier = drawPrizeTierSelect.value;
});

toggleButton.addEventListener("click", async () => {
  await setSubmissionOpen(!state.isOpen);
});

drawButton.addEventListener("click", async () => {
  if (state.isOpen) {
    controlStatusElement.textContent = TEXT.closeBeforeDraw;
    return;
  }

  if (!state.entries.length) {
    controlStatusElement.textContent = TEXT.noEntries;
    return;
  }

  const eligibleEntries = getEligibleEntries();
  if (!eligibleEntries.length) {
    controlStatusElement.textContent = TEXT.noEligibleEntries;
    return;
  }

  const awardedPrizeTier = state.selectedPrizeTier;
  const selected = pickWeightedEntry(eligibleEntries);
  if (!selected) {
    controlStatusElement.textContent = TEXT.noEligibleEntries;
    return;
  }

  updateWinnerUi(selected.nickname, selected.message, awardedPrizeTier);

  const didPersist = await persistWinner(selected);
  if (didPersist) {
    state.entries = state.entries.map((entry) =>
      entry.id === selected.id
        ? {
            ...entry,
            is_winner: true,
            winner_prize_tier: awardedPrizeTier,
            winner_selected_at: new Date().toISOString(),
          }
        : entry
    );
    renderEntries();
    renderWinnerHistory();
    if (awardedPrizeTier === "3rd") {
      state.selectedPrizeTier = "2nd";
      drawPrizeTierSelect.value = "2nd";
    } else if (awardedPrizeTier === "2nd") {
      state.selectedPrizeTier = "1st";
      drawPrizeTierSelect.value = "1st";
    }
    controlStatusElement.textContent = `${formatPrizeTier(awardedPrizeTier)} ${TEXT.announcedWinner}\uB97C \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.`;
  }
});

rerollWinnerButton.addEventListener("click", async () => {
  if (state.isOpen) {
    controlStatusElement.textContent = TEXT.closeBeforeDraw;
    return;
  }

  if (!state.currentWinner) {
    controlStatusElement.textContent = TEXT.noCurrentWinner;
    return;
  }

  const previousWinner = state.currentWinner;
  const prizeTier = previousWinner.prizeTier ?? state.selectedPrizeTier;
  const eligibleEntries = state.entries.filter((entry) => !entry.is_winner && !isSameEntry(entry, previousWinner));
  const selected = pickWeightedEntry(eligibleEntries);

  if (!selected) {
    controlStatusElement.textContent = TEXT.noRerollEligibleEntries;
    return;
  }

  updateWinnerUi(selected.nickname, selected.message, prizeTier);

  const didPersist = await replaceWinner(previousWinner, selected, prizeTier);
  if (!didPersist) {
    updateWinnerUi(previousWinner.nickname, previousWinner.message, previousWinner.prizeTier);
    return;
  }

  const selectedAt = new Date().toISOString();
  state.entries = state.entries.map((entry) => {
    if (isSameEntry(entry, previousWinner)) {
      return {
        ...entry,
        is_winner: false,
        winner_prize_tier: null,
        winner_selected_at: null,
      };
    }

    if (entry.id === selected.id) {
      return {
        ...entry,
        is_winner: true,
        winner_prize_tier: prizeTier,
        winner_selected_at: selectedAt,
      };
    }

    return entry;
  });
  renderEntries();
  renderWinnerHistory();
  controlStatusElement.textContent = `${formatPrizeTier(prizeTier)} ${TEXT.announcedWinner}\uB97C \uB2E4\uC2DC \uBF51\uC558\uC2B5\uB2C8\uB2E4.`;
});

resetWinnersButton.addEventListener("click", async () => {
  const shouldReset = window.confirm(TEXT.resetConfirm);
  if (!shouldReset) {
    return;
  }

  await resetWinners();
});

async function init() {
  updateClock();
  window.setInterval(updateClock, 1000);
  syncAuthUi();

  if (state.adminPasscode) {
    await refreshDashboard();
    subscribeToChanges();
  } else {
    renderEntries();
    syncStatusUi();
    resetWinnerUi();
  }
}

init();
