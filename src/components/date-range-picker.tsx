"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Popover } from "./ui";
import { DateRange, formatDay, formatRange, moscowToday, rangeDays, recentRange, shiftDay } from "@/lib/date-range";

function monthOffset(month: string, offset: number) {
  const d = new Date(month + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 10);
}
const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Draft selection stays local; only Save changes report queries. */
export function DateRangePicker({ label, value, onChange, maxDate = moscowToday(), requiredDays, resetValue }: {
  label: string; value: DateRange; onChange: (range: DateRange) => void;
  maxDate?: string; requiredDays?: number; resetValue: DateRange;
}) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(value.to.slice(0, 7) + "-01");
  const [anchor, setAnchor] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null), id = useId();
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const months = grid.current?.querySelector<HTMLDivElement>(".date-range-months");
      if (months) months.scrollTop = months.scrollHeight - months.clientHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, month]);
  const days = rangeDays(draft);
  const valid = !!draft.from && !!draft.to && Number.isFinite(days) && days >= 1 && days <= 45 && draft.to <= maxDate && (!requiredDays || days === requiredDays);
  const error = !draft.from || !draft.to ? "Chọn đủ ngày bắt đầu và kết thúc." : draft.to > maxDate ? `Chọn ngày không muộn hơn ${formatDay(maxDate)}.` : requiredDays && days !== requiredDays ? `Chọn đúng ${requiredDays} ngày như kỳ báo cáo.` : !valid ? "Chọn khoảng từ 1 đến 45 ngày." : "";
  function select(day: string) {
    if (!anchor) { setAnchor(day); setDraft({ from: day, to: day }); }
    else { setDraft({ from: day < anchor ? day : anchor, to: day < anchor ? anchor : day }); setAnchor(null); }
  }
  function setRange(range: DateRange) { setDraft(range); setAnchor(null); setMonth(range.to.slice(0, 7) + "-01"); }
  return <Popover open={open} onOpenChange={next => { if (next) setRange(value); setOpen(next); }} className="date-range-popover"
    trigger={<button type="button" className="date-range-trigger" aria-label={label}><span>{formatRange(value)}</span><CalendarDays size={19} aria-hidden="true" /></button>}>
    <div className="date-range-layout" aria-label={label}>
      <div className="date-range-calendar" ref={grid}>
        <div className="date-range-heading"><Button aria-label="Tháng trước" onClick={() => setMonth(monthOffset(month, -1))}><ChevronLeft size={20} /></Button><strong>{month.slice(0, 4)}</strong><Button aria-label="Tháng sau" disabled={monthOffset(month, 1) > maxDate} onClick={() => setMonth(monthOffset(month, 1))}><ChevronRight size={20} /></Button></div>
        <div className="date-range-months">
          {[-1, 0].map(offset => {
            const first = monthOffset(month, offset), d = new Date(first + "T00:00:00Z");
            const empty = (d.getUTCDay() + 6) % 7;
            const count = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
            return <section key={first} className="date-range-month"><h3>Tháng {d.getUTCMonth() + 1} · {d.getUTCFullYear()}</h3><div className="date-range-grid">
              {weekdays.map((day, i) => <span className={i > 4 ? "weekend" : ""} key={day}>{day}</span>)}
              {Array.from({ length: empty }, (_, i) => <span aria-hidden="true" key={`empty-${i}`} />)}
              {Array.from({ length: count }, (_, i) => {
                const day = shiftDay(first, i), selected = day >= draft.from && day <= draft.to, edge = day === draft.from || day === draft.to;
                return <button key={day} type="button" data-day={day} aria-label={formatDay(day)} aria-pressed={selected} disabled={day > maxDate}
                  className={[selected ? "in-range" : "", edge ? "range-edge" : "", day === moscowToday() ? "is-today" : ""].join(" ")}
                  onClick={() => select(day)} onKeyDown={e => {
                    const jump = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
                    if (jump) { e.preventDefault(); const target = shiftDay(day, jump); if (target > maxDate) return;
                      const focus = () => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus();
                      if (!grid.current?.querySelector(`[data-day="${target}"]`)) { setMonth(target.slice(0, 7) + "-01"); requestAnimationFrame(focus); } else focus();
                    }
                  }}>{i + 1}</button>;
              })}
            </div></section>;
          })}
        </div>
      </div>
      <div className="date-range-options">
        <div className="date-range-presets">{requiredDays ? <Button onClick={() => setRange(resetValue)}>Kỳ liền trước</Button> : [7, 14, 30].map(n => <Button key={n} onClick={() => setRange(recentRange(n))}>{n === 7 ? "1 tuần" : n === 14 ? "2 tuần" : "30 ngày"}</Button>)}</div>
        <label htmlFor={`${id}-from`}>Ngày bắt đầu</label><Input id={`${id}-from`} type="date" max={maxDate} value={draft.from} onChange={e => { setAnchor(null); setDraft({ ...draft, from: e.target.value }); }} />
        <label htmlFor={`${id}-to`}>Ngày kết thúc</label><Input id={`${id}-to`} type="date" max={maxDate} value={draft.to} onChange={e => { setAnchor(null); setDraft({ ...draft, to: e.target.value }); }} />
        <p className="date-range-hint" aria-live="polite">{error || (requiredDays ? `${requiredDays} ngày · Cùng độ dài kỳ báo cáo` : `${days} ngày đã chọn · Tối đa 45 ngày`)}</p>
        <div className="date-range-actions"><Button onClick={() => setRange(resetValue)}>Đặt lại</Button><Button variant="primary" disabled={!valid} onClick={() => { onChange(draft); setOpen(false); }}>Lưu</Button></div>
      </div>
    </div>
  </Popover>;
}
