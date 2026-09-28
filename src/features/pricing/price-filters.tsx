"use client";
import { useState } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { Button, Input, Popover, Badge } from "../../components/ui";
export type Filters = { categories: string[]; brands: string[] };
export function PriceFilters({
  value,
  onChange,
  facets,
  disabled,
}: {
  value: Filters;
  onChange: (v: Filters) => void;
  facets: { category: string; brand: string; _count: number }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState<"categories" | "brands">("categories"),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState(value);
  const choices = new Map<string, number>();
  facets.forEach((f) => {
    const key = tab === "categories" ? f.category : f.brand;
    if (key) choices.set(key, (choices.get(key) || 0) + f._count);
  });
  const count = value.categories.length + value.brands.length;
  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setDraft(value);
          setSearch("");
        }
      }}
      trigger={
        <Button disabled={disabled}>
          <SlidersHorizontal size={16} />
          Bộ lọc{count > 0 && <Badge tone="purple">{count}</Badge>}
        </Button>
      }
      className="filter-popover"
    >
      <div className="filter-columns">
        <div className="filter-nav">
          <button
            className={tab === "categories" ? "active" : ""}
            onClick={() => {
              setTab("categories");
              setSearch("");
            }}
          >
            Danh mục
            {draft.categories.length > 0 && ` (${draft.categories.length})`}
          </button>
          <button
            className={tab === "brands" ? "active" : ""}
            onClick={() => {
              setTab("brands");
              setSearch("");
            }}
          >
            Thương hiệu{draft.brands.length > 0 && ` (${draft.brands.length})`}
          </button>
        </div>
        <div className="filter-list">
          <div className="relative">
            <Input
              aria-label="Tìm trong bộ lọc"
              placeholder={
                tab === "categories" ? "Tìm danh mục" : "Tìm thương hiệu"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 text-xs!"
            />
            <Search size={16} className="absolute right-3 top-3.5 text-muted" />
          </div>
          <div className="h-56 overflow-y-auto mt-2">
            {[...choices]
              .filter(([label]) =>
                label.toLowerCase().includes(search.toLowerCase()),
              )
              .map(([label, n]) => (
                <label className="filter-option" key={label}>
                  <input
                    type="checkbox"
                    checked={draft[tab].includes(label)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [tab]: e.target.checked
                          ? [...draft[tab], label]
                          : draft[tab].filter((x) => x !== label),
                      })
                    }
                  />
                  <span>{label}</span>
                  <span>({n})</span>
                </label>
              ))}
            {!choices.size && (
              <p className="text-muted text-xs py-7">Chưa có dữ liệu.</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <Button
          variant="primary"
          onClick={() => {
            onChange(draft);
            setOpen(false);
          }}
        >
          Áp dụng
        </Button>
        <Button
          variant="ghost"
          onClick={() => setDraft({ categories: [], brands: [] })}
        >
          Đặt lại
        </Button>
      </div>
    </Popover>
  );
}
