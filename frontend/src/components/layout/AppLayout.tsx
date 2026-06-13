import { Outlet } from "react-router-dom";

import { VoiceAssistantFAB } from "@/components/common/VoiceAssistantFAB";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

/** Authenticated application shell: fixed sidebar + top bar + routed content. */
export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {/* Floating voice assistant — present on every authenticated page */}
      <VoiceAssistantFAB />
    </div>
  );
}
