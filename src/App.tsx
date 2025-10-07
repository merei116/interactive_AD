import React, { useEffect, useMemo, useRef, useState } from "react";

export default function ComplianceDiffGame() {
  type Page = "intro" | "game" | "summary" | "ai";
  const [page, setPage] = useState<Page>("intro");

  // --- Вымышленные договоры с важными, но малозаметными расхождениями ---
  const docA = `
ДОГОВОР № 15/2025

г. Алматы, 01 сентября 2025 г.

ООО "Альфа" в лице директора Ивана Иванова, действующего на основании Устава, именуемое в дальнейшем "Заказчик", с одной стороны, и ТОО "Бета" в лице директора Сергея Сергеева, действующего на основании Устава, именуемое в дальнейшем "Исполнитель", с другой стороны, совместно именуемые "Стороны", заключили настоящий Договор о нижеследующем:

1. Предмет договора
1.1. Исполнитель обязуется оказать услуги по консультированию в сфере compliance.
1.2. Срок оказания услуг — с 01.09.2025 по 30.09.2025.

2. Стоимость и порядок расчетов
2.1. Стоимость услуг составляет 5 000 000 (Пять миллионов) тенге.
2.2. Оплата производится в течение 10 (десяти) банковских дней после подписания акта.

3. Ответственность сторон
3.1. За просрочку оплаты Заказчик уплачивает пеню в размере 0,1% за каждый день.

4. Прочие условия
4.1. Договор вступает в силу с момента подписания.
4.2. Споры разрешаются в Арбитражном суде г. Алматы.

Подписи сторон:
Заказчик ____________ Иванов И.И.
Исполнитель _________ Сергеев С.С.
`;

  const docB = `
ДОГОВОР № 15/2025

г. Алматы, 02 сентября 2025 г.

ООО "Альфа" в лице директора Ивана Иванова, действующего на основании Устава, именуемое в дальнейшем "Заказчик", с одной стороны, и ТОО "Бета" в лице директора Сергея Сергеевича, действующего на основании Устава, именуемое в дальнейшем "Исполнитель", с другой стороны, совместно именуемые "Стороны", заключили настоящий Договор о нижеследующем:

1. Предмет договора
1.1. Исполнитель обязуется оказать услуги по консультированию в сфере compliance и внутреннего аудита.
1.2. Срок оказания услуг — с 02.09.2025 по 30.09.2025.

2. Стоимость и порядок расчетов
2.1. Стоимость услуг составляет 5 000 000 (Пять миллионов) тенге без учета НДС.
2.2. Оплата производится в течение 15 (пятнадцати) банковских дней после подписания акта.

3. Ответственность сторон
3.1. За просрочку оплаты Заказчик уплачивает пеню в размере 0,2% за каждый день.

4. Прочие условия
4.1. Договор вступает в силу после подписания и регистрации.
4.2. Споры разрешаются в Судебной коллегии по гражданским делам г. Алматы.

Подписи сторон:
Заказчик ____________ Иванов И.И.
Исполнитель _________ Сергеев С.С.
`;

  // === Токенизация, сохраняющая пробелы (для точечного хайлайта и корректного переноса) ===
  // Токен = пробелы | слово (буквы) | число с символами ,.% | прочий одиночный символ
  const tokenize = (s: string) => s.match(/\s+|\p{L}+|\d+[\d.,%]*|\S/gu) ?? [];

  const linesA = useMemo(() => docA.split("\n"), [docA]);
  const linesB = useMemo(() => docB.split("\n"), [docB]);
  const tokensA = useMemo(() => linesA.map(tokenize), [linesA]);
  const tokensB = useMemo(() => linesB.map(tokenize), [linesB]);

  // Находим строки с расхождениями и маски токенов, которые отличаются (сравнение по индексам)
  type DiffLine = { r: number; maskA: boolean[]; maskB: boolean[] };
  const diffByLine: DiffLine[] = useMemo(() => {
    const out: DiffLine[] = [];
    const max = Math.max(tokensA.length, tokensB.length);
    for (let r = 0; r < max; r++) {
      const a = tokensA[r] ?? [];
      const b = tokensB[r] ?? [];
      const len = Math.max(a.length, b.length);
      const maskA = new Array(len).fill(false);
      const maskB = new Array(len).fill(false);
      let any = false;
      for (let i = 0; i < len; i++) {
        const ta = a[i];
        const tb = b[i];
        if (ta !== tb) {
          any = true;
          if (i < a.length) maskA[i] = !!ta && !/^\s+$/.test(ta); // не выделяем чистые пробелы
          if (i < b.length) maskB[i] = !!tb && !/^\s+$/.test(tb);
        }
      }
      if (any) out.push({ r, maskA, maskB });
    }
    return out;
  }, [tokensA, tokensB]);

  const diffRows = useMemo(() => new Set(diffByLine.map(d => d.r)), [diffByLine]);
  const totalDiffs = diffRows.size;

  // Состояние игры
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const MIN_MS = 10_000; // без обратного таймера — просто блокируем кнопку «Закончить» до минимума

  useEffect(() => {
    if (page === "game") {
      setRevealed(new Set());
      const start = Date.now();
      setElapsedMs(0);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      const tick = () => {
        setElapsedMs(Date.now() - start);
        timerRef.current = requestAnimationFrame(tick);
      };
      timerRef.current = requestAnimationFrame(tick);
      return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
    }
  }, [page]);

  const onLineClick = (r: number) => {
    if (!diffRows.has(r)) return;
    if (revealed.has(r)) return;
    const next = new Set(revealed);
    next.add(r);
    setRevealed(next);
  };

  const canFinish = elapsedMs >= MIN_MS;

  const onFinish = () => {
    if (!canFinish) return;
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setPage("summary");
  };

  const aiFoundCount = totalDiffs;
  const aiTimeMs = Math.max(1800, Math.round((elapsedMs || 12000) * 0.2));

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-5xl">
        {page === "intro" && <Intro onStart={() => setPage("game")} />}
        {page === "game" && (
          <Game
            linesA={linesA}
            linesB={linesB}
            tokensA={tokensA}
            tokensB={tokensB}
            diffByLine={diffByLine}
            revealed={revealed}
            onLineClick={onLineClick}
            foundCount={revealed.size}
            totalDiffs={totalDiffs}
            elapsedMs={elapsedMs}
            onFinish={onFinish}
            canFinish={canFinish}
          />
        )}
        {page === "summary" && (
          <Summary
            userFound={revealed.size}
            userTimeMs={elapsedMs}
            onAiStart={() => setPage("ai")}
            onReplay={() => setPage("intro")}
          />
        )}
        {page === "ai" && (
          <AiResult
            linesA={linesA}
            linesB={linesB}
            diffByLine={diffByLine}
            revealed={revealed}
            aiFoundCount={aiFoundCount}
            aiTimeMs={aiTimeMs}
            onReplay={() => setPage("intro")}
          />
        )}
      </div>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid gap-4 sm:gap-6 text-center">
      <h1 className="text-2xl sm:text-3xl font-bold">Compliance: Найди отличия</h1>
      <p className="text-neutral-600 text-sm sm:text-base">Сравните два договора и отметьте изменения. Подсветится только конкретное слово после клика.</p>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
        <button onClick={onStart} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-black text-white hover:opacity-90">Начать</button>
      </div>
    </div>
  );
}

function Game({ linesA, linesB, tokensA, tokensB, diffByLine, revealed, onLineClick, foundCount, totalDiffs, elapsedMs, onFinish, canFinish }: any) {
  return (
    <div className="grid gap-3 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Сравните договоры</h2>
        <div className="flex flex-col xs:flex-row sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
          <Badge>Найдено: {foundCount}/{totalDiffs}</Badge>
          <Timer ms={elapsedMs} />
          <button
            onClick={onFinish}
            disabled={!canFinish}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white ${canFinish?"bg-black":"bg-gray-400 cursor-not-allowed"}`}
          >
            Закончить
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <DocView title="Документ A" lines={linesA} tokens={tokensA} diffByLine={diffByLine} revealed={revealed} onLineClick={onLineClick} side="A" />
        <DocView title="Документ B" lines={linesB} tokens={tokensB} diffByLine={diffByLine} revealed={revealed} onLineClick={onLineClick} side="B" />
      </div>
    </div>
  );
}

function Summary({ userFound, userTimeMs, onAiStart, onReplay }: any) {
  return (
    <div className="text-center grid gap-3 sm:gap-4">
      <h2 className="text-xl sm:text-2xl font-bold">Готово!</h2>
      <p className="text-sm sm:text-base">Вы нашли {userFound} отличий за {fmtTime(userTimeMs)}.</p>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
        <button onClick={onAiStart} className="w-full sm:w-auto px-5 py-3 bg-black text-white rounded-xl">Проверить ИИ</button>
        <button onClick={onReplay} className="w-full sm:w-auto px-5 py-3 bg-white border rounded-xl">Сыграть ещё раз</button>
      </div>
    </div>
  );
}

function AiResult({ linesA, linesB, diffByLine, revealed, aiFoundCount, aiTimeMs, onReplay }: any) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const missed = diffByLine.filter((d: any) => !revealed.has(d.r));

  return (
    <div className="grid gap-3 sm:gap-4 text-center">
      <h2 className="text-xl sm:text-2xl font-bold">Результат ИИ-агента</h2>
      {loading ? (
        <div className="mx-auto w-full sm:w-2/3 lg:w-1/2 text-left">
          <div className="h-4 rounded bg-neutral-200 animate-pulse mb-2" />
          <div className="h-4 rounded bg-neutral-200 animate-pulse mb-2" />
          <div className="h-4 rounded bg-neutral-200 animate-pulse" />
          <div className="mt-2 text-neutral-500 text-sm">ИИ анализирует договор…</div>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label="Найдено отличий" value={String(aiFoundCount)} />
            <Stat label="Время" value={fmtTime(aiTimeMs)} />
            <Stat label="Пропущено вами" value={String(missed.length)} />
          </div>

          <div className="bg-white rounded-xl shadow p-3 sm:p-4 text-left">
            <h3 className="font-semibold mb-2 text-base sm:text-lg">
              Пропущенные расхождения (точечно)
            </h3>
            {missed.length === 0 ? (
              <p className="text-sm text-neutral-500">Вы ничего не пропустили!</p>
            ) : (
              <ul className="list-disc pl-5 text-sm grid gap-2">
                {missed.map((m: any) => (
                  <li key={m.r}>
                    <b>Строка {m.r + 1}</b>: {linesB[m.r]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={onReplay}
              className="w-full sm:w-auto px-5 py-3 bg-black text-white rounded-xl"
            >
              На главный экран
            </button>
          </div>

          {/* CTA блок */}
          <div className="mt-6 sm:mt-8 text-center bg-gradient-to-r from-emerald-100 via-white to-emerald-100 rounded-2xl p-6 border">
            <h3 className="text-xl sm:text-2xl font-semibold mb-3">
              Хотите, чтобы такие проверки работали и в вашей компании?
            </h3>
            <p className="text-neutral-700 mb-5 text-sm sm:text-base">
              Наш ИИ-агент помогает сравнивать документы, выявлять риски и экономить часы работы юристов.
            </p>
            <a
              href="https://wa.me/7717001150?text=Здравствуйте!%20Хочу%20узнать%20больше%2о%20вашем%20продукте."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
            >
              💬 Написать в WhatsApp
            </a>
          </div>
        </>
      )}
    </div>
  );
}


function DocView({ title, lines, tokens, diffByLine, revealed, onLineClick, side }: any) {
  const diffMap = useMemo(() => {
    const map = new Map<number, { maskA: boolean[]; maskB: boolean[] }>();
    for (const d of diffByLine) map.set(d.r, { maskA: d.maskA, maskB: d.maskB });
    return map;
  }, [diffByLine]);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-3 sm:px-4 py-2 border-b font-semibold text-sm sm:text-base sticky top-0 bg-white">{title}</div>
      <div className="p-2 sm:p-3 text-[13px] sm:text-sm leading-relaxed font-mono overflow-auto max-h-[60vh] break-words">
        {tokens.map((toks: string[], r: number) => {
          const diffInfo = diffMap.get(r);
          const show = revealed.has(r);
          return (
            <div key={r} className="cursor-pointer px-1 sm:px-2 py-0.5" onClick={()=>onLineClick(r)}>
              {diffInfo ? (
                toks.map((tok, i) => {
                  const mask = side === "A" ? diffInfo.maskA : diffInfo.maskB;
                  const highlighted = show && mask[i];
                  return (
                    <span
                      key={i}
                      className={highlighted ? "bg-emerald-200 rounded-sm px-0.5" : undefined}
                    >
                      {tok}
                    </span>
                  );
                })
              ) : (
                <span>{toks.join("")}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timer({ ms }: { ms: number }) {
  return <span className="px-3 py-1 bg-white border rounded-lg text-sm">⏱ {fmtTime(ms)}</span>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="px-3 py-1 bg-white border rounded-lg text-sm text-center">{children}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 border rounded-xl bg-neutral-50">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-lg sm:text-xl font-semibold">{value}</div>
    </div>
  );
}

function fmtTime(ms: number) {
  const s = Math.floor(ms/1000);
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}
