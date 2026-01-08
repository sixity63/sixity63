import { Lightbulb, Activity, Wifi, Cpu, LayoutDashboard, ToggleRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "switch control", url: "/led-control", icon: ToggleRight },
  { title: "Monitoring Sistem", url: "/monitoring", icon: Activity },
  { title: "Device Management", url: "/devices", icon: Cpu },
  { title: "Pengaturan Koneksi", url: "/settings", icon: Wifi },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold text-primary px-4 py-6">
            {open && (
              <span>
                <span className="text-primary">Six</span>
                <span className="text-muted-foreground">ity</span>
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="hover:bg-sidebar-accent transition-colors">
                    <NavLink 
                      to={item.url} 
                      end
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
