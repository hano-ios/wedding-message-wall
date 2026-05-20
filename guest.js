import { supabase } from "./supabase-client.js";

const wallElement = document.querySelector("#message-wall");
const statusPill = document.querySelector("#guest-status-pill");
const formElement = document.querySelector("#message-form");
const statusTextElement = document.querySelector("#form-status-text");
const nicknameInput = document.querySelector("#nickname");
const messageInput = document.querySelector("#message");
const winnerBannerElement = document.querySelector("#winner-banner");
const winnerNameElement = document.querySelector("#winner-banner-name");
const winnerMessageElement = document.querySelector("#winner-banner-message");

let isOpen = true;
let messages = [];

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

function renderMessages(items) {
  if (!items.length) {
    wallElement.innerHTML = `
      <article class="message-card featured">
        <p class="message-text">첫 번째 덕담을 남겨주세요.</p>
        <p class="message-author">- Wedding Message Wall</p>
      </article>
    `;
    return;
  }

  wallElement.innerHTML = items
    .map((entry, index) => {
      const cardClass = index === 0 ? "message-card featured" : "message-card";
      return `
        <article class="${cardClass}">
          <p class="message-text">${escapeFallback(entry.message)}</p>
          <p class="message-author">- ${escapeFallback(entry.nickname)}</p>
        </article>
      `;
    })
    .join("");
}

function syncSubmissionState() {
  statusPill.textContent = isOpen ? "접수 중" : "마감";
  statusPill.classList.toggle("is-open", isOpen);
  statusPill.classList.toggle("is-closed", !isOpen);

  nicknameInput.disabled = !isOpen;
  messageInput.disabled = !isOpen;

  if (!isOpen) {
    statusTextElement.textContent = "현재 사회자가 덕담 접수를 중지했습니다.";
    return;
  }

  statusTextElement.textContent = "신랑 신부에게 따뜻한 한마디를 남겨주세요.";
}

function renderWinnerBanner(settings) {
  const hasWinner = settings?.winner_nickname && settings?.winner_message;
  winnerBannerElement.hidden = !hasWinner;

  if (!hasWinner) {
    winnerNameElement.textContent = "";
    winnerMessageElement.textContent = "";
    return;
  }

  winnerNameElement.textContent = settings.winner_nickname;
  winnerMessageElement.textContent = settings.winner_message;
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

  messages = data ?? [];
  renderMessages(messages);
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

  statusTextElement.textContent = "전송 중입니다...";

  const didSubmit = await submitMessage(nickname, message);
  if (!didSubmit) {
    return;
  }

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
