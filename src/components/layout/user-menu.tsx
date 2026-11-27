"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { initials } from "@/lib/utils";

export function UserMenu({ name, email, role, signOut }: { name: string; email: string; role: string; signOut: () => Promise<void> }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-xl border border-line bg-white py-1 pl-1 pr-2 hover:bg-brand-50" aria-label="Account menu">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-700 text-xs font-bold text-white">{initials(name)}</span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-ink">{name}</span>
          <span className="block text-[11px] capitalize leading-tight text-muted">{role === "trainer" ? "Trainer / mentor" : role}</span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-60 rounded-xl border border-line bg-white p-1.5 shadow-xl">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {role === "student" && (
            <DropdownMenu.Item asChild>
              <Link href="/student/profile" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-brand-50"><UserRound className="size-4" /> My profile</Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link href="/account" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-brand-50"><KeyRound className="size-4" /> Change password</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => void signOut()} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-600 outline-none data-[highlighted]:bg-red-50">
            <LogOut className="size-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
