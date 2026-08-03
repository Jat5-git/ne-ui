import React from "react";
import Sidebar from "./Sidebar";
import { Toaster } from "sonner";

export default function Layout({ children }) {
  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
