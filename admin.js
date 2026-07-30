import { loadMessageEntries } from "./messages-data.js";

const statusPill = document.querySelector("#admin-status-pill");
const toggleButton = document.querySelector("#toggle-submission-button");
const messageCountElement = document.querySelector("#message-count");
const panelCurrentTimeElement = document.querySelector("#panel-current-time");
const panelTimeDiffElement = document.querySelector("#panel-time-diff");
const drawButton = document.querySelector("#draw-winner-button");
const redrawButton = document.querySelector("#reroll-winner-button");
const resetWinnersButton = document.querySelector("#reset-winners-button");
const drawPrizeTierSelect = document.querySelector("#draw-prize-tier");
const winnerTierBadgeElement = document.querySelector("#winner-tier-badge");
const winnerNameElement = document.querySelector("#winner-name");
const winnerMessageElement = document.querySelector("#winner-message");
const messageListElement = document.querySelector("#admin-message-list");
const winnerHistoryListElement = document.querySelector("#winner-history-list");
const authSectionElement = document.querySelector("#admin-auth-section");
const controlSectionElement = document.querySelector("#admin-control-section");
const controlStatusElement = document.querySelector("#admin-control-status");

const LABELS = { "1st": "1등", "2nd": "2등", "3rd": "3등" };
const state = { entries: [], isOpen: false, selectedPrizeTier: drawPrizeTierSelect.value, lastWinner: null };

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function formatPrizeTier(tier) {
  return LABELS[tier] ?? LABELS["1st"];
}

function updateClock() {
  const now = new Date();
  panelCurrentTimeElement.textContent = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  const hour = now.getHours();
  if (hour < 13 || hour >= 15) {
    panelTimeDiffElement.textContent = "-";
    return;
  }
  const target = new Date(now);
  target.setHours(13, 40, 0, 0);
  const diff = Math.floor((now - target) / 60000);
  panelTimeDiffElement.textContent = diff === 0 ? "0분" : `${Math.abs(diff)}분${diff < 0 ? "전" : "후"}`;
}

function getWinnerHistory() {
  return state.entries.filter((entry) => entry.is_winner).sort((left, right) => new Date(right.winner_selected_at ?? 0) - new Date(left.winner_selected_at ?? 0));
}

function getEligibleEntries() {
  return state.entries.filter((entry) => !entry.is_winner && entry.message.trim().length > 2);
}

function pickWeightedEntry(entries) {
  const total = entries.reduce((sum, entry) => sum + (entry.message.trim().length >= 5 ? 1.35 : 1), 0);
  let cursor = Math.random() * total;
  return entries.find((entry) => {
    cursor -= entry.message.trim().length >= 5 ? 1.35 : 1;
    return cursor <= 0;
  }) ?? entries.at(-1);
}

function renderEntries() {
  messageCountElement.textContent = String(state.entries.length);
  messageListElement.innerHTML = state.entries.length
    ? state.entries.map((entry) => `<article class="admin-message-item"><div class="admin-message-head"><strong>${escapeHtml(entry.nickname)}</strong>${entry.is_winner ? `<span class="admin-message-badge">${formatPrizeTier(entry.winner_prize_tier)} 선정 완료</span>` : ""}</div><p>${escapeHtml(entry.message)}</p></article>`).join("")
    : "<article class=\"admin-message-item\"><strong>등록된 덕담이 없습니다.</strong></article>";
}

function renderWinnerHistory() {
  const history = getWinnerHistory();
  winnerHistoryListElement.innerHTML = history.length
    ? history.map((entry) => `<article class="winner-history-item"><div class="winner-history-row"><span class="winner-history-tier">${formatPrizeTier(entry.winner_prize_tier)}</span><strong>${escapeHtml(entry.nickname)}</strong></div><p>${escapeHtml(entry.message)}</p></article>`).join("")
    : "<article class=\"winner-history-item is-empty\"><strong>아직 선정된 하객이 없습니다.</strong></article>";
}

function resetWinnerUi() {
  winnerTierBadgeElement.textContent = "당첨자 발표";
  winnerNameElement.textContent = "아직 추첨 전입니다";
  winnerMessageElement.textContent = "버튼을 누르면 CSV 덕담 중 한 명이 여기에 표시됩니다.";
}

function updateWinnerUi(winner) {
  winnerTierBadgeElement.textContent = `${formatPrizeTier(winner.prizeTier)} 당첨자 발표`;
  winnerNameElement.textContent = winner.nickname;
  winnerMessageElement.textContent = winner.message;
}

function syncStatusUi() {
  statusPill.textContent = state.isOpen ? "접수 중" : "마감";
  statusPill.classList.toggle("is-open", state.isOpen);
  statusPill.classList.toggle("is-closed", !state.isOpen);
  toggleButton.textContent = state.isOpen ? "덕담 접수 중지하기" : "덕담 접수 다시 열기";
  drawButton.disabled = state.isOpen;
  redrawButton.disabled = state.isOpen || !state.lastWinner;
  redrawButton.hidden = !state.lastWinner;
  drawPrizeTierSelect.disabled = state.isOpen;
}

function drawWinner(prizeTier) {
  const selected = pickWeightedEntry(getEligibleEntries());
  if (!selected) {
    controlStatusElement.textContent = "추첨 가능한 덕담이 없습니다.";
    return;
  }
  selected.is_winner = true;
  selected.winner_prize_tier = prizeTier;
  selected.winner_selected_at = new Date().toISOString();
  state.lastWinner = { id: selected.id, nickname: selected.nickname, message: selected.message, prizeTier };
  updateWinnerUi(state.lastWinner);
  renderEntries();
  renderWinnerHistory();
  syncStatusUi();
  controlStatusElement.textContent = `${formatPrizeTier(prizeTier)} 당첨자를 이 브라우저에서 선택했습니다. 새로고침하면 CSV 원본으로 돌아갑니다.`;
}

toggleButton.addEventListener("click", () => {
  state.isOpen = !state.isOpen;
  syncStatusUi();
  controlStatusElement.textContent = "CSV 읽기 전용 버전에서는 접수 상태가 화면에만 적용됩니다.";
});

drawPrizeTierSelect.addEventListener("change", () => { state.selectedPrizeTier = drawPrizeTierSelect.value; });
drawButton.addEventListener("click", () => drawWinner(state.selectedPrizeTier));
redrawButton.addEventListener("click", () => {
  if (!state.lastWinner) return;
  const previous = state.entries.find((entry) => entry.id === state.lastWinner.id);
  if (previous) {
    previous.is_winner = false;
    previous.winner_prize_tier = null;
    previous.winner_selected_at = null;
  }
  drawWinner(state.lastWinner.prizeTier);
});
resetWinnersButton.addEventListener("click", () => {
  if (!window.confirm("현재 브라우저에서 선택한 당첨 정보를 초기화할까요?")) return;
  state.entries.forEach((entry) => { entry.is_winner = false; entry.winner_prize_tier = null; entry.winner_selected_at = null; });
  state.lastWinner = null;
  resetWinnerUi();
  renderEntries();
  renderWinnerHistory();
  syncStatusUi();
  controlStatusElement.textContent = "당첨 정보를 초기화했습니다. 새로고침하면 CSV 원본의 당첨 정보가 다시 표시됩니다.";
});

async function init() {
  authSectionElement.hidden = true;
  controlSectionElement.hidden = false;
  updateClock();
  window.setInterval(updateClock, 1000);
  try {
    state.entries = await loadMessageEntries();
    const latestWinner = getWinnerHistory()[0];
    if (latestWinner) {
      state.lastWinner = { id: latestWinner.id, nickname: latestWinner.nickname, message: latestWinner.message, prizeTier: latestWinner.winner_prize_tier };
      updateWinnerUi(state.lastWinner);
    } else {
      resetWinnerUi();
    }
    controlStatusElement.textContent = "CSV 덕담 목록을 불러왔습니다. 서버에는 연결하지 않습니다.";
  } catch (error) {
    console.error(error);
    resetWinnerUi();
    controlStatusElement.textContent = "CSV 덕담 목록을 불러오지 못했습니다.";
  }
  renderEntries();
  renderWinnerHistory();
  syncStatusUi();
}

init();
