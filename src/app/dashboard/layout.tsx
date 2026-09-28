import { Workspace } from "@/features/stores/workspace";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Workspace>{children}</Workspace>;
}
