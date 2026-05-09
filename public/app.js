const API = "/api/todos";

const $ = (sel) => document.querySelector(sel);
const listEl = $("#list");
const emptyEl = $("#empty");
const loadingEl = $("#loading");
const countEl = $("#count");
const toastEl = $("#toast");
const form = $("#add-form");
const titleEl = $("#title");
const detailEl = $("#detail");
const addBtn = $("#add-btn");

const escape = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1800);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).error || "";
    } catch {}
    throw new Error(detail || `요청 실패 (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function todoCard(t) {
  const li = document.createElement("li");
  li.className =
    "fade-in rounded-2xl bg-white border border-toss-line p-4 shadow-card";
  li.dataset.id = t.id;
  li.innerHTML = `
    <div data-view class="flex items-start gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-[16px] font-semibold text-toss-ink break-words">${escape(t.title)}</p>
        ${
          t.detail
            ? `<p class="mt-1 text-[14px] text-toss-sub break-words">${escape(t.detail)}</p>`
            : ""
        }
      </div>
      <div class="flex shrink-0 gap-1.5">
        <button data-act="edit" class="rounded-lg px-3 py-1.5 text-[13px] font-medium text-toss-sub hover:bg-toss-bg transition">수정</button>
        <button data-act="del"  class="rounded-lg px-3 py-1.5 text-[13px] font-medium text-rose-500 hover:bg-rose-50 transition">삭제</button>
      </div>
    </div>
    <div data-edit class="hidden flex-col gap-2">
      <input data-edit-title value="${escape(t.title)}" maxlength="100"
        class="focus-ring w-full rounded-xl border border-toss-line bg-white px-3 py-2.5 text-[15px]" />
      <input data-edit-detail value="${escape(t.detail || "")}" maxlength="200" placeholder="상세 내용 (선택)"
        class="focus-ring w-full rounded-xl border border-toss-line bg-white px-3 py-2.5 text-[15px]" />
      <div class="flex gap-2 justify-end">
        <button data-act="cancel" class="rounded-lg px-3 py-2 text-[13px] font-medium text-toss-sub hover:bg-toss-bg transition">취소</button>
        <button data-act="save"   class="rounded-lg bg-toss-blue px-3 py-2 text-[13px] font-semibold text-white hover:bg-toss-blueHover transition">저장</button>
      </div>
    </div>
  `;
  return li;
}

function setEditing(li, on) {
  li.querySelector("[data-view]").classList.toggle("hidden", on);
  const edit = li.querySelector("[data-edit]");
  edit.classList.toggle("hidden", !on);
  edit.classList.toggle("flex", on);
  if (on) li.querySelector("[data-edit-title]").focus();
}

function updateCount() {
  const n = listEl.children.length;
  countEl.textContent = n ? `${n}개` : "";
  emptyEl.classList.toggle("hidden", n !== 0);
}

async function loadAll() {
  loadingEl.classList.remove("hidden");
  emptyEl.classList.add("hidden");
  listEl.innerHTML = "";
  try {
    const { todos } = await api(API);
    listEl.innerHTML = "";
    for (const t of todos) listEl.appendChild(todoCard(t));
  } catch (e) {
    toast(e.message);
  } finally {
    loadingEl.classList.add("hidden");
    updateCount();
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleEl.value.trim();
  const detail = detailEl.value.trim();
  if (!title) {
    titleEl.focus();
    return;
  }
  addBtn.disabled = true;
  addBtn.textContent = "추가 중...";
  try {
    const { todo } = await api(API, {
      method: "POST",
      body: JSON.stringify({ title, detail }),
    });
    listEl.prepend(todoCard(todo));
    titleEl.value = "";
    detailEl.value = "";
    titleEl.focus();
    updateCount();
    toast("할 일을 추가했어요");
  } catch (err) {
    toast(err.message);
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = "추가";
  }
});

listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const li = btn.closest("li");
  const id = li.dataset.id;
  const act = btn.dataset.act;

  if (act === "edit") return setEditing(li, true);
  if (act === "cancel") return setEditing(li, false);

  if (act === "save") {
    const title = li.querySelector("[data-edit-title]").value.trim();
    const detail = li.querySelector("[data-edit-detail]").value.trim();
    if (!title) {
      toast("제목을 입력해주세요");
      return;
    }
    btn.disabled = true;
    try {
      const { todo } = await api(`${API}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, detail }),
      });
      const fresh = todoCard(todo);
      li.replaceWith(fresh);
      toast("수정되었어요");
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (act === "del") {
    if (!confirm("이 할 일을 삭제할까요?")) return;
    btn.disabled = true;
    try {
      await api(`${API}/${id}`, { method: "DELETE" });
      li.style.transition = "opacity .15s, transform .15s";
      li.style.opacity = "0";
      li.style.transform = "translateY(-2px)";
      setTimeout(() => {
        li.remove();
        updateCount();
      }, 150);
      toast("삭제되었어요");
    } catch (err) {
      btn.disabled = false;
      toast(err.message);
    }
  }
});

loadAll();
