import {
  Award, BarChart3, BookOpen, Briefcase, CalendarDays, CalendarCheck, ClipboardCheck, ClipboardList, FileText, FolderKanban,
  GraduationCap, History, LayoutDashboard, Megaphone, Settings, ShieldCheck, UserPlus, Users, UserSquare2, UserRoundSearch, Wallet, Layers, Plane, IdCard, Building2,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/auth";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { title?: string; items: NavItem[] };

export const NAV: Record<Role, NavSection[]> = {
  admin: [
    { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
    { title: "People", items: [
      { href: "/students", label: "Students", icon: Users },
      { href: "/admin/leads", label: "Enquiries", icon: UserRoundSearch },
      { href: "/admin/students/new", label: "New admission", icon: UserPlus },
      { href: "/admin/trainers", label: "Trainers & mentors", icon: UserSquare2 },
    ] },
    { title: "Academics", items: [
      { href: "/admin/courses", label: "Courses & modules", icon: BookOpen },
      { href: "/admin/batches", label: "Batches", icon: Layers },
      { href: "/academics/sessions", label: "Sessions & attendance", icon: CalendarCheck },
      { href: "/admin/attendance", label: "Corrections & leave", icon: ClipboardCheck },
      { href: "/academics/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/academics/projects", label: "Projects", icon: FolderKanban },
      { href: "/academics/assessments", label: "Assessments", icon: FileText },
    ] },
    { title: "Outcomes", items: [
      { href: "/admin/fees", label: "Fees", icon: Wallet },
      { href: "/admin/certificates", label: "Certificates", icon: Award },
      { href: "/academics/internships", label: "Internships", icon: Plane },
      { href: "/admin/placements", label: "Placements", icon: Briefcase },
    ] },
    { title: "Academy", items: [
      { href: "/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/reports", label: "Reports & exports", icon: BarChart3 },
      { href: "/admin/audit", label: "Audit log", icon: History },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ] },
  ],
  trainer: [
    { items: [{ href: "/trainer", label: "Dashboard", icon: LayoutDashboard }] },
    { title: "Teaching", items: [
      { href: "/students", label: "My students", icon: Users },
      { href: "/academics/sessions", label: "Sessions & attendance", icon: CalendarCheck },
      { href: "/academics/leave", label: "Leave & corrections", icon: ClipboardCheck },
      { href: "/academics/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/academics/projects", label: "Projects", icon: FolderKanban },
      { href: "/academics/assessments", label: "Assessments", icon: FileText },
    ] },
    { title: "Careers", items: [
      { href: "/academics/internships", label: "Internships", icon: Plane },
      { href: "/trainer/placements", label: "Placements", icon: Briefcase },
    ] },
    { items: [{ href: "/announcements", label: "Announcements", icon: Megaphone }] },
  ],
  student: [
    { items: [{ href: "/student", label: "Dashboard", icon: LayoutDashboard }] },
    { title: "Learning", items: [
      { href: "/student/timetable", label: "Timetable & check-in", icon: CalendarDays },
      { href: "/student/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/student/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/student/projects", label: "Projects", icon: FolderKanban },
      { href: "/student/assessments", label: "Assessments", icon: FileText },
      { href: "/student/certificate", label: "Certificate", icon: GraduationCap },
    ] },
    { title: "My records", items: [
      { href: "/student/fees", label: "Fees", icon: Wallet },
      { href: "/student/internship", label: "Internship", icon: Plane },
      { href: "/student/placement", label: "Placement", icon: Building2 },
      { href: "/student/documents", label: "Documents", icon: ShieldCheck },
      { href: "/student/profile", label: "Profile & ID", icon: IdCard },
    ] },
    { items: [{ href: "/announcements", label: "Announcements", icon: Megaphone }] },
  ],
};
