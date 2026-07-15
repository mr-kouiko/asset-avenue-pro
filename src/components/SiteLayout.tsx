import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

/**
 * SiteLayout — global public-page shell.
 * Renders the shared Header and Footer around the routed page content.
 * Wrap public routes with this via `<Route element={<SiteLayout />}>`.
 * Pages that provide their own chrome (Studio AI via StudioPage, auth flows,
 * admin dashboard) should be routed OUTSIDE this layout.
 */
export const SiteLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default SiteLayout;
