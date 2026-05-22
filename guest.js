import { supabase } from "./supabase-client.js";

const wallElement = document.querySelector("#message-wall");
const formElement = document.querySelector("#message-form");
const statusTextElement = document.querySelector("#form-status-text");
const nicknameInput = document.querySelector("#nickname");
const messageInput = document.querySelector("#message");
const submitButton = document.querySelector("#submit-button");
const winnerBannerElement = document.querySelector("#winner-banner");
const winnerBannerBubbleElement = document.querySelector("#winner-banner-bubble");
const spotlightElement = document.querySelector("#message-spotlight");
const spotlightNameElement = document.querySelector("#spotlight-name");
const spotlightMessageElement = document.querySelector("#spotlight-message");

const knownMessageIds = new Set();
const BASE_LANE_COUNT = 6;
const SLOTS_PER_LANE = 8;

let isOpen = true;
let messages = [];
let hasLoadedMessages = false;
let spotlightTimerId = null;
let shouldScrollToSpotlight = false;

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

  wallElement.innerHTML = lanes
    .map((lane, laneIndex) => renderLane(lane, laneIndex))
    .join("");
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
  const themeClass = getMessageTheme(messageIndex);
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

function syncSubmissionState() {
  nicknameInput.disabled = !isOpen;
  messageInput.disabled = !isOpen;
  submitButton.disabled = !isOpen;
  submitButton.textContent = isOpen ? "보내기" : "메시지 접수가 마감되었습니다";
  statusTextElement.textContent = "";
}

function renderWinnerBanner(settings) {
  const hasWinner = settings?.winner_nickname && settings?.winner_message;
  winnerBannerElement.hidden = !hasWinner || isOpen;

  if (!hasWinner || isOpen) {
    winnerBannerBubbleElement.innerHTML = "";
    return;
  }

  const winnerEntry = {
    nickname: settings.winner_nickname,
    message: settings.winner_message,
  };

  winnerBannerBubbleElement.innerHTML = renderWinnerBubble(winnerEntry);
}

function renderWinnerBubble(entry) {
  const avatarThemeClass = getMessageTheme(1);
  const lengthClass = entry.message.trim().length > 10 ? "is-expanded" : "";
  const initials = escapeFallback(entry.nickname.trim().charAt(0).toUpperCase() || "?");

  return `
    <article class="message-slot is-message winner-bubble ${avatarThemeClass} ${lengthClass}">
      <span class="message-avatar">${initials}</span>
      <div class="message-pill-copy">
        <p class="message-pill-author">${escapeFallback(entry.nickname)}</p>
        <p class="message-pill-text">${escapeFallback(entry.message)}</p>
      </div>
    </article>
  `;
}

async function loadMessages() {
  const { data, error } = await supabase
    .from("messages")
    .select("id, nickname, message, created_at")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    statusTextElement.textContent = "메시지 목록을 불러오지 못했습니다.";
    return;
  }

  const nextMessages = data ?? [];
  const incomingMessages = hasLoadedMessages
    ? nextMessages.filter((entry) => !knownMessageIds.has(entry.id))
    : [];

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
    .select("is_open, winner_nickname, winner_message")
    .eq("id", "main")
    .single();

  if (error) {
    console.error(error);
    statusTextElement.textContent = "행사 설정을 불러오지 못했습니다.";
    return;
  }

  isOpen = Boolean(data?.is_open);
  syncSubmissionState();
  renderWinnerBanner(data);
}

async function submitMessage(nickname, message) {
  const { error } = await supabase.from("messages").insert({
    nickname,
    message,
  });

  if (error) {
    console.error(error);
    statusTextElement.textContent = "메시지 전송에 실패했습니다.";
    return false;
  }

  return true;
}

function subscribeToChanges() {
  supabase
    .channel("guest-messages")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => {
        loadMessages();
      }
    )
    .subscribe();

  supabase
    .channel("guest-settings")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "event_settings" },
      (payload) => {
        if (payload.new.id !== "main") {
          return;
        }

        isOpen = Boolean(payload.new.is_open);
        syncSubmissionState();
        renderWinnerBanner(payload.new);
      }
    )
    .subscribe();
}

formElement.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isOpen) {
    return;
  }

  const nickname = nicknameInput.value.trim();
  const message = messageInput.value.trim();

  if (!nickname || !message) {
    statusTextElement.textContent = "닉네임과 덕담을 모두 입력해 주세요.";
    return;
  }

  if (nickname.length > 12 || message.length > 120) {
    statusTextElement.textContent = "입력 길이를 다시 확인해 주세요.";
    return;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

  statusTextElement.textContent = "전송 중입니다...";

  const didSubmit = await submitMessage(nickname, message);
  if (!didSubmit) {
    return;
  }

  shouldScrollToSpotlight = false;
  formElement.reset();
  statusTextElement.textContent = "덕담이 등록되었습니다.";
});

async function init() {
  syncSubmissionState();
  renderMessages(messages);
  await Promise.all([loadMessages(), loadSettings()]);
  subscribeToChanges();
}

init();
