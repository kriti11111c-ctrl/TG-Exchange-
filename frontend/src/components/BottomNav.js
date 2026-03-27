import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../App";
import { 
  House,
  ChartLineUp,
  ArrowsLeftRight,
  ChartBar,
  Wallet
} from "@phosphor-icons/react";

const BottomNav = () => {
  const { isDark } = useTheme();
  const location = useLocation();
  
  const cardBg = isDark ? 'bg-[#1E2329]' : 'bg-white';
  const border = isDark ? 'border-[#2B3139]' : 'border-gray-200';
  const textMuted = isDark ? 'text-[#848E9C]' : 'text-gray-500';

  const navItems = [
    { path: "/dashboard", icon: House, label: "Home" },
    { path: "/trade", icon: ChartLineUp, label: "Markets" },
    { path: "/trade", icon: ArrowsLeftRight, label: "Trade", isCenter: true },
    { path: "/futures", icon: ChartBar, label: "Futures" },
    { path: "/wallet", icon: Wallet, label: "Assets" }
  ];

  const isActive = (path) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path === "/futures" && location.pathname === "/futures") return true;
    if (path === "/wallet" && location.pathname === "/wallet") return true;
    if (path === "/trade" && location.pathname === "/trade") return true;
    return false;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 ${cardBg} border-t ${border} px-2 py-2 flex justify-around items-center z-50`}>
      {navItems.map((item, index) => {
        const active = isActive(item.path);
        
        if (item.isCenter) {
          return (
            <Link key={index} to={item.path} className="flex flex-col items-center py-1">
              <div className="w-12 h-12 rounded-full bg-[#F0B90B] flex items-center justify-center -mt-6 shadow-lg">
                <item.icon size={24} className="text-black" weight="bold" />
              </div>
              <span className={`text-[10px] ${textMuted} mt-0.5`}>{item.label}</span>
            </Link>
          );
        }
        
        return (
          <Link key={index} to={item.path} className="flex flex-col items-center py-1">
            <item.icon 
              size={22} 
              className={active ? "text-[#F0B90B]" : textMuted} 
              weight={active ? "fill" : "regular"} 
            />
            <span className={`text-[10px] mt-0.5 ${active ? "text-[#F0B90B]" : textMuted}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;
