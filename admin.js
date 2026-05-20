import { supabase } from "./supabase-client.js";

const statusPill = document.querySelector("#admin-status-pill");
const toggleButton = document.querySelector("#toggle-submission-button");
const messageCountElement = document.querySelector("#message-count");
const winnerCountElement = document.querySelector("#winner-count");
const drawButton = document.querySelector("#draw-winner-button");
const winnerNameElement = document.querySelector("#winner-name");
const winnerMessageElement = document.querySelector("#winner-message");
const messageListElement = document.querySelector("#admin-message-list");
const authSectionElement = document.querySelector("#admin-auth-section");
const controlSectionElement = document.querySelector("#admin-control-section");
const authFormElement = document.querySelector("#admin-auth-form");
const authPasswordInput = document.querySelector("#admin-password");
const loginStatusElement = document.querySelector("#admin-login-status");
const controlStatusElement = document.querySelector("#admin-control-status");
const signOutButton = document.querySelector("#sign-out-button");

const state = {
  entries: [],
  isOpen: true,
  winnerCount: 0,
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

function renderEntries() {
  if (!state.entries.length) {
    messageListElement.innerHTML = `
      <article class="admin-message-item">
        <strong>아직 등록된 덕담이 없습니다</strong>
        <p>하객이 덕담을 남기면 이 목록에 바로 나타납니다.</p>
      </article>
    `;
    messageCountElement.textContent = "0";
    return;
  }

  messageListElement.innerHTML = state.entries
    .map(
      (entry) => `
        <article class="admin-message-item">
          <strong>${escapeFallback(entry.nickname)}</strong>
          <p>${escapeFallback(entry.message)}</p>
        </article>
      `
    )
    .join("");

  messageCountElement.textContent = String(state.entries.length);
}

function syncStatusUi() {
  statusPill.textContent = state.isOpen ? "접수 중" : "마감";
  statusPill.classList.toggle("is-open", state.isOpen);
  statusPill.classList.toggle("is-closed", !state.isOpen);
  toggleButton.textContent = state.isOpen
    ? "덕담 접수 중지하기"
    : "덕담 접수 다시 열기";
}

function syncAuthUi() {
  const hasPasscode = Boolean(state.adminPasscode);
  authSectionElement.hidden = hasPasscode;
  controlSectionElement.hidden = !hasPasscode;
  signOutButton.hidden = !hasPasscode;

  if (hasPasscode) {
    controlStatusElement.textContent = "관리자 로그인 상태입니다.";
  }
}

function updateWinnerUi(nickname, message) {
  winnerNameElement.textContent = nickname;
  winnerMessageElement.textContent = message;
}

async function loadEntries() {
  const { data, error } = await supabase
    .from("messages")
    .select("id, nickname, message, created_at")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    controlStatusElement.textContent = "덕담 목록을 불러오지 못했습니다.";
    return;
  }

  state.entries = data ?? [];
  renderEntries();
}

async function loadSettings() {
  const { data, error } = await supabase
    .from("event_settings")
    .select("is_open, winner_nickname, winner_message, winner_count")
    .eq("id", "main")
    .single();

  if (error) {
    console.error(error);
    controlStatusElement.textContent = "행사 설정을 불러오지 못했습니다.";
    return;
  }

  state.isOpen = Boolean(data?.is_open);
  state.winnerCount = Number(data?.winner_count ?? 0);
  syncStatusUi();
  winnerCountElement.textContent = `${state.winnerCount}회`;

  if (data?.winner_nickname && data?.winner_message) {
    updateWinnerUi(data.winner_nickname, data.winner_message);
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
    controlStatusElement.textContent = "접수 상태 변경에 실패했습니다.";
    return;
  }

  controlStatusElement.textContent = isOpen
    ? "덕담 접수를 다시 열었습니다."
    : "덕담 접수를 중지했습니다.";
}

async function persistWinner(entry) {
  const { data, error } = await supabase.rpc("admin_set_winner", {
    input_passcode: state.adminPasscode,
    winner_nickname_input: entry.nickname,
    winner_message_input: entry.message,
  });

  if (error) {
    console.error(error);
    controlStatusElement.textContent = "추첨 결과 저장에 실패했습니다.";
    return false;
  }

  state.winnerCount = Number(data ?? state.winnerCount + 1);
  winnerCountElement.textContent = `${state.winnerCount}회`;
  return true;
}

async function verifyPasscode(passcode) {
  const { data, error } = await supabase.rpc("admin_check_passcode", {
    input_passcode: passcode,
  });

  if (error) {
    console.error(error);
    loginStatusElement.textContent = "로그인에 실패했습니다.";
    return;
  }

  if (!data) {
    loginStatusElement.textContent = "비밀번호가 올바르지 않습니다.";
    return;
  }

  state.adminPasscode = passcode;
  sessionStorage.setItem("adminPasscode", passcode);
  controlStatusElement.textContent = "로그인되었습니다.";
  syncAuthUi();
  await refreshDashboard();
  subscribeToChanges();
}

async function signOut() {
  state.adminPasscode = "";
  sessionStorage.removeItem("adminPasscode");
  syncAuthUi();
  loginStatusElement.textContent = "로그아웃되었습니다.";
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
        winnerCountElement.textContent = `${state.winnerCount}회`;

        if (payload.new.winner_nickname && payload.new.winner_message) {
          updateWinnerUi(payload.new.winner_nickname, payload.new.winner_message);
        }
      }
    )
    .subscribe();
}

authFormElement.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = authPasswordInput.value.trim();

  if (!password) {
    loginStatusElement.textContent = "비밀번호를 입력해 주세요.";
    return;
  }

  loginStatusElement.textContent = "로그인 중입니다...";
  await verifyPasscode(password);
});

signOutButton.addEventListener("click", () => {
  signOut();
});

toggleButton.addEventListener("click", async () => {
  await setSubmissionOpen(!state.isOpen);
});

drawButton.addEventListener("click", async () => {
  if (!state.entries.length) {
    controlStatusElement.textContent = "등록된 덕담이 없습니다.";
    return;
  }

  const selected = state.entries[Math.floor(Math.random() * state.entries.length)];
  updateWinnerUi(selected.nickname, selected.message);

  const didPersist = await persistWinner(selected);
  if (didPersist) {
    controlStatusElement.textContent = "추첨 결과를 저장했습니다.";
  }
});

async function init() {
  syncAuthUi();

  if (state.adminPasscode) {
    await refreshDashboard();
    subscribeToChanges();
  } else {
    renderEntries();
    syncStatusUi();
    winnerCountElement.textContent = "0회";
  }

}

init();
