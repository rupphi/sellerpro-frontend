"use client";
import * as Dialog from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { X, Loader2, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    loading?: boolean;
  }
>(
  (
    { className, variant = "secondary", loading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn("btn", `btn-${variant}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
      {...props}
    >
      <span className="btn-content">{children}</span>
      {loading && (
        <span className="btn-loader" aria-hidden="true">
          <Loader2 size={18} className="animate-spin" />
        </span>
      )}
    </button>
  ),
);
Button.displayName = "Button";
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("input", className)} {...props} />
));
Input.displayName = "Input";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "purple" | "green" | "amber" | "red";
}) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>;
}
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <SwitchPrimitive.Root
      className="switch"
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      disabled={disabled}
    >
      <SwitchPrimitive.Thumb className="switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={cn("modal", wide && "modal-wide")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold tracking-tight">
                {title}
              </Dialog.Title>
              <Dialog.Description
                className={cn(
                  "mt-2 text-sm text-muted leading-relaxed",
                  !description && "sr-only",
                )}
              >
                {description || title}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" className="icon-btn" aria-label="Đóng">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-7">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  className,
  align = "start",
}: {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  className?: string;
  align?: "start" | "end" | "center";
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn("popover", className)}
          sideOffset={10}
          align={align}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <PackageOpen size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
export function FormError({ message, id }: { message: string; id?: string }) {
  return (
    <div className="form-error-slot">
      <p
        id={id}
        role="alert"
        aria-atomic="true"
        className="form-error"
        data-visible={!!message}
      >
        {message}
      </p>
    </div>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(3, value)}%` }} />
    </div>
  );
}
export function MarketplaceLogo({
  platform,
  size = "sm",
}: {
  platform: "wb" | "ozon";
  size?: "sm" | "lg";
}) {
  return (
    <span
      aria-label={platform === "wb" ? "Wildberries" : "Ozon"}
      className={cn(
        "marketplace-logo",
        `logo-${platform}`,
        size === "lg" && "logo-lg",
      )}
    >
      {platform === "wb" ? "wb" : "ozon"}
    </span>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      sellerpro<span className="brand-dot">.</span>
    </span>
  );
}
