import PoolSimulator from "@/components/simulator/PoolSimulator";
import { useNavigate } from "react-router-dom";

const MobileApp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PoolSimulator onBack={() => navigate("/login/app")} />
    </div>
  );
};

export default MobileApp;
