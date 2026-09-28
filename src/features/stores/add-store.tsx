"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Modal, Button, Input, MarketplaceLogo, FormError } from "../../components/ui";
import { api, type Store } from "@/lib/api";
export function AddStore({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (store: Store) => void;
}) {
  const [platform, setPlatform] = useState<"wb" | "ozon">("wb"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const client = useQueryClient();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const store = await api<Store>("/stores", {
        method: "POST",
        body: JSON.stringify({ ...Object.fromEntries(form), platform }),
      });
      await client.invalidateQueries({ queryKey: ["stores"] });
      onCreated(store);
      onOpenChange(false);
      toast.success("Đã kết nối cửa hàng. Sản phẩm của bạn đang được đồng bộ.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
      title="Kết nối cửa hàng"
      description="Chọn sàn thương mại điện tử và nhập thông tin kết nối của bạn."
    >
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(["wb", "ozon"] as const).map((p) => (
              <button
                type="button"
                key={p}
                className={`store-choice ${platform === p ? "selected" : ""}`}
                onClick={() => setPlatform(p)}
              >
                <MarketplaceLogo platform={p} />
                <strong className="text-sm">
                  {p === "wb" ? "Wildberries" : "Ozon"}
                </strong>
                {platform === p && (
                  <Check size={15} className="ml-auto text-brand" />
                )}
              </button>
            ))}
          </div>
          <div className="field">
            <label className="label" htmlFor="store-name">
              Tên cửa hàng
            </label>
            <Input
              name="name"
              id="store-name"
              placeholder="Ví dụ: FASHION 67"
              minLength={2}
              maxLength={80}
              required
            />
          </div>
          {
            <>
              {platform === "ozon" && (
                <div className="field">
                  <label className="label" htmlFor="client-id">
                    Ozon Client ID
                  </label>
                  <Input
                    name="clientId"
                    id="client-id"
                    placeholder="Client ID"
                    required
                    pattern="[0-9]+"
                  />
                </div>
              )}
              <div className="field">
                <label className="label" htmlFor="api-key">
                  {platform === "ozon"
                    ? "Ozon Access Key"
                    : "Wildberries API Key"}
                </label>
                <Input
                  name="apiKey"
                  id="api-key"
                  type="password"
                  placeholder="Dán khóa API tại đây"
                  autoComplete="off"
                  required
                />
              </div>
            </>
          }
          <div className="notice">
            <ShieldCheck size={18} className="shrink-0 mt-0.5" />
            <span>Dữ liệu của bạn được bảo vệ an toàn.</span>
          </div>
        </fieldset>
        <FormError message={error} />
        <div className="flex justify-end gap-3 mt-7">
          <Button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button variant="primary" type="submit" loading={busy}>
            Kết nối cửa hàng
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
