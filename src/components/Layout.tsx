import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ListChecks, Settings, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-primary" />
              <span className="text-lg font-bold">Eryxon MES</span>
            </div>

            {profile && (
              <div className="flex gap-2">
                {profile.role === "admin" ? (
                  <>
                    <Link to="/dashboard">
                      <Button
                        variant={isActive("/dashboard") ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link to="/queue">
                      <Button
                        variant={isActive("/queue") ? "default" : "ghost"}
                        size="sm"
                        className="gap-2"
                      >
                        <ListChecks className="h-4 w-4" />
                        Work Queue
                      </Button>
                    </Link>
                    <Link to="/config/stages">
                      <Button
                        variant={
                          isActive("/config/stages") || isActive("/config/users")
                            ? "default"
                            : "ghost"
                        }
                        size="sm"
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Config
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link to="/queue">
                    <Button
                      variant={isActive("/queue") ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <ListChecks className="h-4 w-4" />
                      Work Queue
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {profile && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium">{profile.full_name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {profile.role}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
