import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./Dashboard";

const SellerDashboard = () => {
  return (
    <ProtectedRoute 
      allowedRoles={['creator', 'admin']}
      fallbackMessage="Cette page est réservée aux vendeurs. Seuls les créateurs peuvent accéder au tableau de bord vendeur."
    >
      <Dashboard />
    </ProtectedRoute>
  );
};

export default SellerDashboard;