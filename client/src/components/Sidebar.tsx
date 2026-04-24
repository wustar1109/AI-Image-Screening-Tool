import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  ImageIcon,
  Library,
  ListOrdered,
  Palette,
  Settings,
  Sparkles,
  Star,
} from 'lucide-react';

const menuItems = [
  { to: '/', icon: Home, label: '我的主页' },
  { to: '/screening', icon: ImageIcon, label: '图片筛选' },
  { to: '/results', icon: ListOrdered, label: '筛选结果' },
  { to: '/gallery', icon: Library, label: '分类图库' },
  { to: '/favorites', icon: Star, label: '我的收藏' },
  { to: '/batch-edit', icon: Palette, label: '批量修图' },
  { to: '/settings', icon: Settings, label: '设置' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-dark-800 flex flex-col relative z-20">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-green to-accent-green-dark flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-dark-950" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">筛图魔方</span>
            <div className="text-[10px] text-gray-500 -mt-0.5 tracking-wider">AI SMART SCREENING</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-4 mb-2 mt-2">
          菜单
        </div>
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden ${
                    isActive
                      ? 'text-accent-green'
                      : 'text-gray-500 hover:text-gray-200'
                  }`}
                >
                  {/* Active background glow */}
                  {isActive && (
                    <div className="absolute inset-0 bg-accent-green/10 rounded-lg" />
                  )}
                  {/* Left accent bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-green rounded-r-full" />
                  )}
                  <item.icon className={`w-[18px] h-[18px] relative z-10 ${isActive ? '' : ''}`} />
                  <span className="text-sm font-medium relative z-10">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom card */}
      <div className="p-4">
        <div className="relative overflow-hidden rounded-xl p-4 bg-dark-800 border border-dark-700">

          <div className="relative">
            <div className="text-xs text-gray-500 mb-1">当前用户</div>
            <div className="font-semibold text-sm">免费用户</div>
            <div className="mt-2 h-1 bg-dark-700 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-accent-green to-accent-green-light rounded-full" />
            </div>
            <div className="text-[10px] text-gray-600 mt-1">已用 33% 额度</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
