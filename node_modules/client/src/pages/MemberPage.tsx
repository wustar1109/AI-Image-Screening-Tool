import { Crown, Zap, Star, Check } from 'lucide-react';

const plans = [
  {
    name: '免费版',
    price: '0',
    features: [
      '每天 10 张图片筛选',
      '基础 AI 筛选功能',
      '720p 图片输出',
      '电子邮件支持',
    ],
    notIncluded: [
      '批量处理',
      '高清图片输出',
      '优先处理',
      '专属客服',
    ],
  },
  {
    name: '专业版',
    price: '29',
    features: [
      '每天 100 张图片筛选',
      '高级 AI 筛选功能',
      '4K 图片输出',
      '批量处理',
      '优先处理',
      '专属客服',
    ],
    notIncluded: [],
    recommended: true,
  },
  {
    name: '企业版',
    price: '99',
    features: [
      '无限图片筛选',
      '企业级 AI 筛选',
      '4K 图片输出',
      '无限批量处理',
      '最高优先处理',
      '7x24 专属客服',
      'API 接口调用',
      '自定义模型',
    ],
    notIncluded: [],
  },
];

export function MemberPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">会员中心</h1>
        <p className="text-gray-400">选择适合你的会员方案，解锁更多功能</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative bg-dark-800 rounded-2xl p-6 border ${
              plan.recommended
                ? 'border-accent-green ring-2 ring-accent-green/20'
                : 'border-dark-700'
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent-green rounded-full text-sm font-medium">
                推荐
              </div>
            )}

            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                {plan.recommended ? (
                  <Crown className="w-6 h-6 text-accent-yellow" />
                ) : (
                  <Star className="w-6 h-6 text-gray-400" />
                )}
                <span className="text-xl font-bold">{plan.name}</span>
              </div>
              <div className="text-4xl font-bold">
                <span className="text-2xl">¥</span>
                {plan.price}
                <span className="text-base text-gray-400 font-normal">/月</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent-green flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
              {plan.notIncluded.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-gray-500"
                >
                  <span className="w-4 h-4 flex items-center justify-center">-</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                plan.recommended
                  ? 'bg-gradient-to-r from-accent-green to-emerald-600 hover:opacity-90'
                  : 'bg-dark-700 hover:bg-dark-600'
              }`}
            >
              {plan.price === '0' ? '当前方案' : '立即升级'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-accent-yellow/10 to-orange-500/10 rounded-2xl p-6 border border-accent-yellow/20">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-6 h-6 text-accent-yellow" />
          <span className="font-semibold text-accent-yellow">限时优惠</span>
        </div>
        <p className="text-gray-300">
          开通年费会员，立享 <span className="text-accent-yellow font-bold">5 折</span> 优惠！
          每月仅需 ¥49.9，即可享受所有专业版功能。
        </p>
        <button className="mt-4 px-6 py-2 bg-accent-yellow text-dark-900 rounded-lg font-medium hover:bg-accent-yellow/90 transition-colors">
          了解详情
        </button>
      </div>
    </div>
  );
}
