const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const trim = (v, max) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const parseId = (raw) => {
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const onRequestPut = async ({ request, env, params }) => {
  const id = parseId(params.id);
  if (!id) return json({ error: "잘못된 ID입니다." }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "잘못된 요청 형식입니다." }, 400);
  }

  const title = trim(body.title, 100);
  const detail = trim(body.detail, 200);

  if (!title) return json({ error: "제목을 입력해주세요." }, 400);

  try {
    const { meta } = await env.DB.prepare(
      "UPDATE todos SET title = ?, detail = ? WHERE id = ?"
    )
      .bind(title, detail || null, id)
      .run();

    if (!meta.changes) return json({ error: "할 일을 찾을 수 없습니다." }, 404);

    const todo = await env.DB.prepare(
      "SELECT id, title, detail, created_at FROM todos WHERE id = ?"
    )
      .bind(id)
      .first();

    return json({ todo });
  } catch (e) {
    return json({ error: `DB 수정 실패: ${e.message}` }, 500);
  }
};

export const onRequestDelete = async ({ env, params }) => {
  const id = parseId(params.id);
  if (!id) return json({ error: "잘못된 ID입니다." }, 400);

  try {
    const { meta } = await env.DB.prepare("DELETE FROM todos WHERE id = ?")
      .bind(id)
      .run();

    if (!meta.changes) return json({ error: "할 일을 찾을 수 없습니다." }, 404);

    return new Response(null, { status: 204 });
  } catch (e) {
    return json({ error: `DB 삭제 실패: ${e.message}` }, 500);
  }
};
