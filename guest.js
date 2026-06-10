import { supabase } from "./supabase-client.js";

const wallElement = document.querySelector("#message-wall");
const guestStageElement = document.querySelector("#guest-stage");
const guestLoadingScreenElement = document.querySelector("#guest-loading-screen");
const formElement = document.querySelector("#message-form");
const statusTextElement = document.querySelector("#form-status-text");
const nicknameInput = document.querySelector("#nickname");
const messageInput = document.querySelector("#message");
const submitButton = document.querySelector("#submit-button");
const winnerBannerElement = document.querySelector("#winner-banner");
const winnerBannerTitleElement = document.querySelector("#winner-banner-title");
const winnerBannerBubbleElement = document.querySelector("#winner-banner-bubble");
const spotlightElement = document.querySelector("#message-spotlight");
const spotlightNameElement = document.querySelector("#spotlight-name");
const spotlightMessageElement = document.querySelector("#spotlight-message");

const CLIENT_ID_STORAGE_KEY = "guestClientId";
const BASE_LANE_COUNT = 6;
const SLOTS_PER_LANE = 8;
const knownMessageIds = new Set();
const FEATURED_MESSAGES = [
  {
    laneIndex: 2,
    desktopSlotIndex: 3,
    mobileSlotIndex: 1,
    themeClass: "avatar-green",
    nickname: "\uC2E0\uBD80 \uD55C\uC740\uC9C0",
    message: "\uCC38\uC11D\uD574\uC8FC\uC154\uC11C \uC815\uB9D0 \uAC10\uC0AC\uD569\uB2C8\uB2E4! \uC88B\uC740 \uD558\uB8E8 \uB418\uC138\uC694~",
  },
  {
    laneIndex: 3,
    desktopSlotIndex: 3,
    mobileSlotIndex: 1,
    themeClass: "avatar-blue",
    nickname: "\uC2E0\uB791 \uAC15\uC601\uB85D",
    message: "\uB355\uB2F4\uC740 \uD3C9\uC0DD \uAC04\uC9C1\uD558\uACA0\uC2B5\uB2C8\uB2E4. \uAC10\uC0AC\uD569\uB2C8\uB2E4!",
  },
];

const TEXT = {
  submissionsClosed: "\uBA54\uC2DC\uC9C0 \uC811\uC218\uAC00 \uB9C8\uAC10\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  updateExistingSubmission:
    "\uC774\uBBF8 \uB4F1\uB85D\uD55C \uBA54\uC2DC\uC9C0\uAC00 \uC788\uC5B4\uC11C \uB2E4\uC2DC \uBCF4\uB0B4\uBA74 \uAE30\uC874 \uB0B4\uC6A9\uC73C\uB85C \uC218\uC815\uB429\uB2C8\uB2E4.",
  editMessage: "\uC218\uC815\uD558\uAE30",
  submitMessage: "\uBCF4\uB0B4\uAE30",
  loadMessagesFailed: "\uBA54\uC2DC\uC9C0 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
  loadSettingsFailed: "\uD589\uC0AC \uC124\uC815\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
  duplicateNicknameStatus:
    "\uC774\uBBF8 \uB4F1\uB85D\uB41C \uC774\uB984\uC785\uB2C8\uB2E4. \uAC19\uC740 \uC774\uB984\uC73C\uB85C\uB294 \uC0C8\uB85C \uB4F1\uB85D\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
  duplicateNicknameAlert:
    "\uC774\uBBF8 \uB4F1\uB85D\uB41C \uC774\uB984\uC785\uB2C8\uB2E4. \uB2E4\uB978 \uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
  submitFailedStatus: "\uBA54\uC2DC\uC9C0 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  submitFailedAlert:
    "\uBA54\uC2DC\uC9C0 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
  fillAllFields: "\uC774\uB984\uACFC \uBA54\uC2DC\uC9C0\uB97C \uBAA8\uB450 \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
  checkLength: "\uC785\uB825 \uAE38\uC774\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
  savingEdit: "\uBA54\uC2DC\uC9C0\uB97C \uC218\uC815\uD558\uB294 \uC911\uC785\uB2C8\uB2E4...",
  savingNew: "\uBA54\uC2DC\uC9C0\uB97C \uC800\uC7A5\uD558\uB294 \uC911\uC785\uB2C8\uB2E4...",
  saved: "\uBA54\uC2DC\uC9C0\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  updatedAlert: "\uBA54\uC2DC\uC9C0\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  createdAlert: "\uBA54\uC2DC\uC9C0\uAC00 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  spotlightBadge: "\uC0C8\uB85C \uB3C4\uCC29\uD55C \uBA54\uC2DC\uC9C0",
  winnerTitle: "\uB2F9\uCCA8\uC790",
};

const PRIZE_TIER_LABELS = {
  "1st": "1\uB4F1",
  "2nd": "2\uB4F1",
  "3rd": "3\uB4F1",
};

let isOpen = true;
let messages = [];
let hasLoadedMessages = false;
let spotlightTimerId = null;
let shouldScrollToSpotlight = false;
let hasExistingSubmission = false;
const guestClientId = getOrCreateGuestClientId();

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

function createGuestClientId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateGuestClientId() {
  const existingClientId = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existingClientId) {
    return existingClientId;
  }

  const nextClientId = createGuestClientId();
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, nextClientId);
  return nextClientId;
}

function formatPrizeTier(prizeTier) {
  const label = PRIZE_TIER_LABELS[prizeTier];
  if (!label) {
    return TEXT.winnerTitle;
  }

  return `${TEXT.winnerTitle} (${label})`;
}

function getFeaturedSlotIndex(featuredEntry) {
  if (window.matchMedia("(max-width: 640px)").matches) {
    return featuredEntry.mobileSlotIndex ?? featuredEntry.desktopSlotIndex ?? 0;
  }

  return featuredEntry.desktopSlotIndex ?? 0;
}

function syncSubmissionStatusMessage() {
  if (!isOpen) {
    statusTextElement.textContent = TEXT.submissionsClosed;
    return;
  }

  if (hasExistingSubmission) {
    statusTextElement.textContent = TEXT.updateExistingSubmission;
    return;
  }

  statusTextElement.textContent = "";
}

function syncSubmissionState() {
  nicknameInput.disabled = !isOpen;
  messageInput.disabled = !isOpen;
  submitButton.disabled = !isOpen;
  submitButton.textContent = isOpen ? (hasExistingSubmission ? TEXT.editMessage : TEXT.submitMessage) : TEXT.submissionsClosed;
  syncSubmissionStatusMessage();
}

function buildShuffledIndices(count, seed) {
  const items = Array.from({ length: count }, (_unused, index) => index);
  let randomSeed = seed;

  for (let index = items.length - 1; index > 0; index -= 1) {
    randomSeed = (randomSeed * 1664525 + 1013904223) % 4294967296;
    const swapIndex = randomSeed % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items;
}

function renderMessages(items) {
  const laneCount = Math.max(BASE_LANE_COUNT, Math.ceil(items.length / SLOTS_PER_LANE) || BASE_LANE_COUNT);
  const slotCount = laneCount * SLOTS_PER_LANE;
  const slotOrder = buildShuffledIndices(slotCount, 20260522);
  const board = Array.from({ length: slotCount }, (_unused, slotIndex) => ({
    kind: "empty",
    slotIndex,
  }));

  items.slice(0, slotCount).forEach((entry, index) => {
    board[slotOrder[index]] = {
      kind: "message",
      slotIndex: slotOrder[index],
      entry,
      messageIndex: index,
    };
  });

  const lanes = Array.from({ length: laneCount }, (_unused, laneIndex) => {
    const start = laneIndex * SLOTS_PER_LANE;
    return board.slice(start, start + SLOTS_PER_LANE);
  });

  FEATURED_MESSAGES.forEach((featuredEntry, featuredIndex) => {
    if (!lanes[featuredEntry.laneIndex]) {
      return;
    }

    const featuredSlotIndex = getFeaturedSlotIndex(featuredEntry);

    lanes[featuredEntry.laneIndex][featuredSlotIndex] = {
      kind: "message",
      slotIndex: featuredEntry.laneIndex * SLOTS_PER_LANE + featuredSlotIndex,
      entry: {
        nickname: featuredEntry.nickname,
        message: featuredEntry.message,
        themeClass: featuredEntry.themeClass,
      },
      messageIndex: slotCount + featuredIndex,
    };
  });

  wallElement.innerHTML = lanes.map((lane, laneIndex) => renderLane(lane, laneIndex)).join("");
}

function renderLane(lane, laneIndex) {
  const repeatedLane = [...lane, ...lane];
  const reverseClass = laneIndex % 2 === 1 ? "is-reverse" : "";
  const duration = 48 + laneIndex * 4;

  return `
    <div class="message-lane ${reverseClass}" style="--lane-duration:${duration}s">
      <div class="message-track">
        ${repeatedLane.map((slot, slotIndex) => renderSlot(slot, slotIndex)).join("")}
      </div>
    </div>
  `;
}

function renderSlot(slot, slotIndex) {
  if (slot.kind === "empty") {
    const emptyShapeClass = slot.slotIndex % 3 === 0 ? "is-circle" : "is-capsule";
    return `
      <div class="message-slot is-empty ${emptyShapeClass} ${getDecorationTheme(slot.slotIndex)}" data-slot-index="${slotIndex}"></div>
    `;
  }

  const { entry, messageIndex } = slot;
  const themeClass = entry.themeClass ?? getMessageTheme(messageIndex);
  const initials = escapeFallback(entry.nickname.trim().charAt(0).toUpperCase() || "?");
  const lengthClass = entry.message.trim().length > 10 ? "is-expanded" : "";

  return `
    <article class="message-slot is-message ${themeClass} ${lengthClass}" data-slot-index="${slotIndex}">
      <span class="message-avatar">${initials}</span>
      <div class="message-pill-copy">
        <p class="message-pill-author">${escapeFallback(entry.nickname)}</p>
        <p class="message-pill-text">${escapeFallback(entry.message)}</p>
      </div>
    </article>
  `;
}

function getMessageTheme(index) {
  const paletteIndex = index % 3;
  if (paletteIndex === 0) {
    return "avatar-blue";
  }

  if (paletteIndex === 1) {
    return "avatar-yellow";
  }

  return "avatar-green";
}

function getDecorationTheme(index) {
  const paletteIndex = index % 3;
  if (paletteIndex === 0) {
    return "theme-blue";
  }

  if (paletteIndex === 1) {
    return "theme-yellow";
  }

  return "theme-green";
}

function showSpotlight(entry) {
  if (!entry) {
    return;
  }

  spotlightNameElement.textContent = entry.nickname;
  spotlightMessageElement.textContent = entry.message;
  spotlightElement.hidden = false;
  spotlightElement.classList.remove("is-visible");
  void spotlightElement.offsetWidth;
  spotlightElement.classList.add("is-visible");

  if (shouldScrollToSpotlight) {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    shouldScrollToSpotlight = false;
  }

  window.clearTimeout(spotlightTimerId);
  spotlightTimerId = window.setTimeout(() => {
    spotlightElement.classList.remove("is-visible");
    window.setTimeout(() => {
      spotlightElement.hidden = true;
    }, 320);
  }, 3800);
}

function renderWinnerBanner(settings) {
  const hasWinner = settings?.winner_nickname && settings?.winner_message;
  winnerBannerElement.hidden = !hasWinner || isOpen;

  if (!hasWinner || isOpen) {
    winnerBannerTitleElement.textContent = TEXT.winnerTitle;
    winnerBannerBubbleElement.innerHTML = "";
    return;
  }

  const winnerEntry = {
    nickname: settings.winner_nickname,
    message: settings.winner_message,
    prizeTier: settings.winner_prize_tier ?? null,
  };

  winnerBannerTitleElement.textContent = formatPrizeTier(winnerEntry.prizeTier);
  winnerBannerBubbleElement.innerHTML = renderWinnerBubble(winnerEntry);
}

function renderWinnerBubble(entry) {
  const avatarThemeClass = getMessageTheme(1);
  const initials = escapeFallback(entry.nickname.trim().charAt(0).toUpperCase() || "?");

  return `
    <article class="message-slot is-message winner-bubble winner-box ${avatarThemeClass}">
      <div class="winner-box-body">
        <span class="message-avatar">${initials}</span>
        <div class="message-pill-copy winner-pill-copy">
          <p class="message-pill-author winner-pill-author">${escapeFallback(entry.nickname)}</p>
          <p class="message-pill-text winner-pill-text">${escapeFallback(entry.message)}</p>
        </div>
      </div>
    </article>
  `;
}

function finishInitialLoad() {
  guestLoadingScreenElement.hidden = true;
  guestStageElement.hidden = false;
}

async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("id, nickname, message, created_at")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    statusTextElement.textContent = TEXT.loadMessagesFailed;
    return;
  }

  const nextMessages = data ?? [];
  const incomingMessages = hasLoadedMessages ? nextMessages.filter((entry) => !knownMessageIds.has(entry.id)) : [];

  knownMessageIds.clear();
  nextMessages.forEach((entry) => {
    knownMessageIds.add(entry.id);
  });

  messages = nextMessages;
  renderMessages(messages);
  hasLoadedMessages = true;

  if (incomingMessages.length) {
    showSpotlight(incomingMessages[0]);
  }
}

async function loadSettings() {
  const { data, error } = await supabase
    .from("event_settings")
    .select("is_open, winner_nickname, winner_message, winner_prize_tier")
    .eq("id", "main")
    .single();

  if (error) {
    console.error(error);
    statusTextElement.textContent = TEXT.loadSettingsFailed;
    return;
  }

  isOpen = Boolean(data?.is_open);
  syncSubmissionState();
  renderWinnerBanner(data);
}

async function loadExistingSubmission() {
  const { data, error } = await supabase
    .from("messages")
    .select("nickname, message")
    .eq("client_id", guestClientId)
    .eq("is_visible", true)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  hasExistingSubmission = Boolean(data);

  if (data) {
    nicknameInput.value = data.nickname ?? "";
    messageInput.value = data.message ?? "";
  }

  syncSubmissionState();
}

async function submitMessage(nickname, message) {
  const { error } = await supabase.rpc("upsert_guest_message", {
    input_client_id: guestClientId,
    input_nickname: nickname,
    input_message: message,
  });

  if (error) {
    console.error(error);

    if (error.code === "23505" && error.message?.includes("messages_nickname_unique")) {
      statusTextElement.textContent = TEXT.duplicateNicknameStatus;
      window.alert(TEXT.duplicateNicknameAlert);
      return false;
    }

    statusTextElement.textContent = TEXT.submitFailedStatus;
    window.alert(TEXT.submitFailedAlert);
    return false;
  }

  return true;
}

function subscribeToChanges() {
  supabase
    .channel("guest-messages")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
      loadMessages();
    })
    .subscribe();

  supabase
    .channel("guest-settings")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "event_settings" }, (payload) => {
      if (payload.new.id !== "main") {
        return;
      }

      isOpen = Boolean(payload.new.is_open);
      syncSubmissionState();
      renderWinnerBanner(payload.new);
    })
    .subscribe();
}

formElement.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isOpen) {
    syncSubmissionState();
    return;
  }

  const nickname = nicknameInput.value.trim();
  const message = messageInput.value.trim();

  if (!nickname || !message) {
    statusTextElement.textContent = TEXT.fillAllFields;
    return;
  }

  if (nickname.length > 12 || message.length > 120) {
    statusTextElement.textContent = TEXT.checkLength;
    window.alert(TEXT.checkLength);
    return;
  }

  statusTextElement.textContent = hasExistingSubmission ? TEXT.savingEdit : TEXT.savingNew;
  const wasEditingExistingMessage = hasExistingSubmission;

  const didSubmit = await submitMessage(nickname, message);
  if (!didSubmit) {
    return;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  shouldScrollToSpotlight = false;
  hasExistingSubmission = true;
  syncSubmissionState();
  statusTextElement.textContent = TEXT.saved;
  window.alert(wasEditingExistingMessage ? TEXT.updatedAlert : TEXT.createdAlert);
});

async function init() {
  syncSubmissionState();
  await Promise.all([loadMessages(), loadSettings(), loadExistingSubmission()]);
  finishInitialLoad();
  subscribeToChanges();
}

init();
