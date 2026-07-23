import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./Dashboard";
import { useSEO } from "@/hooks/useSEO";

const SellerDashboard = () => {
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