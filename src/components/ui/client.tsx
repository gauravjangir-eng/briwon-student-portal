"use client";
import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "./button";
import { Field } from "./input";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/result";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

const FormStateContext = React.createContext<ActionResult | null>(null);
const DialogCloseContext = React.createContext<(() => void) | null>(null);

export function ActionForm({
  action, children, className, resetOnSuccess = false, redirectTo, onSuccessClose = true, successToast = true,
}: { action: Action; children: React.ReactNode; className?: string; resetOnSuccess?: boolean; redirectTo?: string; onSuccessClose?: boolean; successToast?: boolean }) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const close = React.useContext(DialogCloseContext);
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (successToast && state.message) toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
      if (onSuccessClose) close?.();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <FormStateContext.Provider value={state}>
      <form ref={ref} action={formAction} className={cn("space-y-4", className)} noValidate>
        {children}
      </form>
    </FormStateContext.Provider>
  );
}

/** Field that shows server-side validation errors from the surrounding ActionForm. */
export function FormField(props: Omit<React.ComponentProps<typeof Field>, "error">) {
  const state = React.useContext(FormStateContext);
  return <Field {...props} error={props.name ? state?.errors?.[props.name] : undefined} />;
}

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}

export function Dialog({ trigger, title, description, children, wide }: { trigger: React.ReactNode; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-brand-950/40 backdrop-blur-[2px] data-[state=open]:animate-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-white p-6 shadow-2xl",
            wide ? "max-w-2xl" : "max-w-lg",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-ink">{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description>
                : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="rounded-lg p-1 text-muted hover:bg-slate-100" aria-label="Close"><X className="size-5" /></DialogPrimitive.Close>
          </div>
          <DialogCloseContext.Provider value={() => setOpen(false)}>{children}</DialogCloseContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** A button that asks for confirmation, then runs a server action with hidden fields. */
export function ConfirmAction({
  action, fields, label, title, description, confirmLabel = "Confirm", variant = "outline", size = "sm", confirmVariant = "primary", reasonField,
}: {
  action: Action; fields: Record<string, string>; label: React.ReactNode; title: string; description?: string; confirmLabel?: string;
  variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; confirmVariant?: ButtonProps["variant"]; reasonField?: { name: string; label: string };
}) {
  return (
    <Dialog trigger={<Button variant={variant} size={size} type="button">{label}</Button>} title={title} description={description}>
      <ActionForm action={action}>
        {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {reasonField && (
          <FormField label={reasonField.label} name={reasonField.name} required>
            <textarea id={reasonField.name} name={reasonField.name} required minLength={5}
              className="min-h-20 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-3 focus:ring-brand-100" />
          </FormField>
        )}
        <div className="flex justify-end gap-2">
          <DialogPrimitive.Close asChild><Button type="button" variant="outline">Cancel</Button></DialogPrimitive.Close>
          <SubmitButton variant={confirmVariant}>{confirmLabel}</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}
