const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

const trim = (v, max) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export const onRequestGet = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, title, detail, created_at FROM todos ORDER BY id DESC"
    ).all();
    return json({ todos: results ?? [] });
  } catch (e) {
    return json({ error: `DB 조회 실패: ${e.message}` }, 500);
  }
};

export const onRequestPost = async ({ request, env }) => {
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
      "INSERT INTO todos (title, detail) VALUES (?, ?)"
    )
      .bind(title, detail || null)
      .run();

    const todo = await env.DB.prepare(
      "SELECT id, title, detail, created_at FROM todos WHERE id = ?"
    )
      .bind(meta.last_row_id)
      .first();

    return json({ todo }, 201);
  } catch (e) {
    return json({ error: `DB 저장 실패: ${e.message}` }, 500);
  }
};
