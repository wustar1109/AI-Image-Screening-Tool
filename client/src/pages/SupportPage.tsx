import { useState } from 'react';
import { HeadphonesIcon, MessageCircle, Mail, ChevronDown } from 'lucide-react';

export function SupportPage() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const faqs = [
    {
      q: '如何使用AI筛选功能？',
      a: '在"图片筛选"页面，上传您想要筛选的图片，然后点击"开始AI筛选"按钮。系统会自动分析每张图片的质量，并将其分类为精选或淘汰。',
    },
    {
      q: '免费用户每天有多少次筛选机会？',
      a: '免费用户每天可以筛选10张图片。如果您需要更多筛选次数，可以考虑升级到专业版或企业版。',
    },
    {
      q: '支持的图片格式有哪些？',
      a: '目前支持 JPG、JPEG、PNG、GIF 和 WebP 格式的图片。单张图片大小不能超过 10MB。',
    },
    {
      q: '筛选结果可以导出吗？',
      a: '是的，您可以在"筛选结果"页面查看所有筛选记录，并可以将精选图片打包下载。',
    },
    {
      q: '如何升级到付费会员？',
      a: '您可以在"会员中心"页面选择适合您的会员方案进行升级。我们提供专业版和企业版两种付费方案。',
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold mb-2">客服支持</h1>
        <p className="text-gray-400">我们随时为你提供帮助</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="font-semibold mb-2">在线客服</h3>
          <p className="text-sm text-gray-400 mb-4">工作日 9:00-18:00</p>
          <button className="w-full py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">
            立即咨询
          </button>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="font-semibold mb-2">电子邮件</h3>
          <p className="text-sm text-gray-400 mb-4">24小时内回复</p>
          <button className="w-full py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors">
            发送邮件
          </button>
        </div>

        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <HeadphonesIcon className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="font-semibold mb-2">电话支持</h3>
          <p className="text-sm text-gray-400 mb-4">仅限企业用户</p>
          <button className="w-full py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors">
            预约通话
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">常见问题</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === index ? null : index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-dark-700/50 transition-colors"
              >
                <span className="font-medium">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expanded === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expanded === index && (
                <div className="px-6 pb-4 text-gray-400 text-sm">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <h3 className="font-semibold mb-4">联系我们</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="请描述您的问题或建议..."
          rows={4}
          className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 mb-4 resize-none focus:outline-none focus:border-accent-green"
        />
        <button className="px-6 py-2 bg-gradient-to-r from-accent-green to-emerald-600 rounded-lg font-medium hover:opacity-90 transition-opacity">
          提交反馈
        </button>
      </div>
    </div>
  );
}
