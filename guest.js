import { loadMessageEntries } from "./messages-data.js";

const wallElement = document.querySelector("#message-wall");
const guestStageElement = document.querySelector("#guest-stage");
const guestLoadingScreenElement = document.querySelector("#guest-loading-screen");
const formElement = document.querySelector("#message-form");
const statusTextElement = document.querySelector("#form-status-text");
const nicknameInput = document.querySelector("#nickname");
const messageInput = document.querySelector("#message");
const submitButton = document.querySelector("#submit-button");

const BASE_LANE_COUNT = 6;
const SLOTS_PER_LANE = 8;
const FEATURED_MESSAGES = [
  { laneIndex: 2, desktopSlotIndex: 3, mobileSlotIndex: 1, themeClass: "avatar-green", nickname: "신부 한은지", message: "참석해주셔서 정말 감사합니다! 좋은 하루 되세요~" },
  { laneIndex: 3, desktopSlotIndex: 3, mobileSlotIndex: 1, themeClass: "avatar-blue", nickname: "신랑 강영록", message: "덕담은 평생 간직하겠습니다. 감사합니다!" },
];

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function getFeaturedSlotIndex(entry) {
  return window.matchMedia("(max-width: 640px)").matches ? entry.mobileSlotIndex : entry.desktopSlotIndex;
}

function buildShuffledIndices(count, seed) {
  const items = Array.from({ length: count }, (_unused, index) => index);
  let nextSeed = seed;
  for (let index = items.length - 1; index > 0; index -= 1) {
    nextSeed = (nextSeed * 1664525 + 1013904223) % 4294967296;
    const swapIndex = nextSeed % (index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function getMessageTheme(index) {
  return ["avatar-blue", "avatar-yellow", "avatar-green"][index % 3];
}

function renderSlot(slot, slotIndex) {
  if (slot.kind === "empty") {
    const shape = slot.slotIndex % 3 === 0 ? "is-circle" : "is-capsule";
    const theme = ["theme-blue", "theme-yellow", "theme-green"][slot.slotIndex % 3];
    return `<div class="message-slot is-empty ${shape} ${theme}" data-slot-index="${slotIndex}"></div>`;
  }

  const { entry, messageIndex } = slot;
  const theme = entry.themeClass ?? getMessageTheme(messageIndex);
  const initials = escapeHtml(entry.nickname.trim().charAt(0).toUpperCase() || "?");
  const expanded = entry.message.trim().length > 10 ? "is-expanded" : "";
  return `<article class="message-slot is-message ${theme} ${expanded}" data-slot-index="${slotIndex}"><span class="message-avatar">${initials}</span><div class="message-pill-copy"><p class="message-pill-author">${escapeHtml(entry.nickname)}</p><p class="message-pill-text">${escapeHtml(entry.message)}</p></div></article>`;
}

function renderMessages(entries) {
  const laneCount = Math.max(BASE_LANE_COUNT, Math.ceil(entries.length / SLOTS_PER_LANE));
  const slotCount = laneCount * SLOTS_PER_LANE;
  const slotOrder = buildShuffledIndices(slotCount, 20260522);
  const board = Array.from({ length: slotCount }, (_unused, slotIndex) => ({ kind: "empty", slotIndex }));
  entries.slice(0, slotCount).forEach((entry, index) => {
    board[slotOrder[index]] = { kind: "message", slotIndex: slotOrder[index], entry, messageIndex: index };
  });

  const lanes = Array.from({ length: laneCount }, (_unused, laneIndex) => board.slice(laneIndex * SLOTS_PER_LANE, (laneIndex + 1) * SLOTS_PER_LANE));
  FEATURED_MESSAGES.forEach((entry, index) => {
    if (lanes[entry.laneIndex]) {
      const slotIndex = getFeaturedSlotIndex(entry);
      lanes[entry.laneIndex][slotIndex] = { kind: "message", slotIndex, entry, messageIndex: slotCount + index };
    }
  });

  wallElement.innerHTML = lanes.map((lane, laneIndex) => {
    const reverse = laneIndex % 2 ? "is-reverse" : "";
    const duration = 48 + laneIndex * 4;
    return `<div class="message-lane ${reverse}" style="--lane-duration:${duration}s"><div class="message-track">${[...lane, ...lane].map(renderSlot).join("")}</div></div>`;
  }).join("");
}

function disableSubmission() {
  nicknameInput.disabled = true;
  messageInput.disabled = true;
  submitButton.disabled = true;
  submitButton.textContent = "메시지 접수가 마감되었습니다.";
  statusTextElement.textContent = "이 페이지는 CSV에 저장된 덕담을 보여주는 읽기 전용 페이지입니다.";
}

async function init() {
  disableSubmission();
  try {
    renderMessages(await loadMessageEntries());
  } catch (error) {
    console.error(error);
    statusTextElement.textContent = "덕담 목록을 불러오지 못했습니다.";
  } finally {
    guestLoadingScreenElement.hidden = true;
    guestStageElement.hidden = false;
  }
}

formElement.addEventListener("submit", (event) => event.preventDefault());
init();
