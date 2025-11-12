// This component now uses Material UI for a modern, cohesive design
import { MuiLayout } from "@/components/mui/MuiLayout";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <MuiLayout>{children}</MuiLayout>;
}
