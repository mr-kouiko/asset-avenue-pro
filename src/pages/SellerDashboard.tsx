import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./Dashboard";
import { useSEO } from "@/hooks/useSEO";

const SellerDashboard = () => {
  useSEO({
    title: "Seller Dashboard",
    description: "Manage your VisuStock creator store: upload assets, track sales, review earnings and request payouts from your seller dashboard.",
    noindex: true,
  });
  return (
    <ProtectedRoute 
      allowedRoles={['creator', 'admin']}
      fallbackMessage="This page is reserved for sellers. Only creators can access the seller dashboard."
    >
      <Dashboard />
    </ProtectedRoute>
  );
};

export default SellerDashboard;