import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ShieldCheck, FileText, UserCheck, AlertCircle, HelpCircle, Scale, Search, ArrowRight, Bookmark } from 'lucide-react';

interface TermSection {
    id: string;
    title: string;
    icon: any;
    content: ReactNode;
    keywords: string;
}

export default function Terms() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSection, setActiveSection] = useState('tong-quan');

    const sections: TermSection[] = useMemo(() => [
        {
            id: 'tong-quan',
            title: '1. Điều khoản tổng quan',
            icon: Scale,
            keywords: 'chào mừng viettelai hệ thống quản lý đăng ký gói cước di động thông tin tư vấn điều khoản quy định cập nhật thay đổi',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Chào mừng bạn đến với <strong className="text-slate-950">ViettelAI</strong> – Hệ thống Quản lý Đăng ký Gói cước Viettel tích hợp Trợ lý ảo tư vấn thông minh. Bằng cách đăng ký tài khoản, truy cập hoặc sử dụng bất kỳ phần nào của ứng dụng này, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý bị ràng buộc bởi các điều khoản sử dụng này.
                    </p>
                    <p className="leading-relaxed text-slate-600">
                        Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng ngừng sử dụng dịch vụ ngay lập tức. Chúng tôi có quyền cập nhật hoặc thay đổi các điều khoản này bất kỳ lúc nào mà không cần thông báo trước. Việc bạn tiếp tục sử dụng hệ thống sau khi các thay đổi được đăng tải đồng nghĩa với việc chấp nhận những thay đổi đó.
                    </p>
                    <div className="bg-slate-50 border-l-4 border-red-500 p-4 rounded-r-lg mt-4">
                        <div className="flex items-start">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mr-3 mt-0.5" />
                            <p className="text-[11px] text-slate-600 font-medium">
                                <strong>Lưu ý quan trọng:</strong> Hệ thống này cung cấp dịch vụ quản lý đăng ký gói cước di động và mô phỏng giao dịch thanh toán để phục vụ mục đích tiện ích trực tuyến của khách hàng Viettel.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'tai-khoan',
            title: '2. Đăng ký và Bảo mật tài khoản',
            icon: UserCheck,
            keywords: 'đăng ký tài khoản mật khẩu bảo mật số điện thoại thông tin cá nhân hành vi nghiêm cấm gian lận',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Để trải nghiệm đầy đủ các tính năng như đăng ký gói cước, nạp tiền mô phỏng, xem lịch sử giao dịch và lưu trữ cấu hình chatbot, bạn cần đăng ký một tài khoản thành viên trên hệ thống ViettelAI.
                    </p>
                    <ul className="space-y-2 text-slate-600 list-disc pl-5">
                        <li><strong>Chính xác thông tin:</strong> Bạn cam kết cung cấp thông tin số điện thoại, họ tên và địa chỉ email chính xác khi đăng ký tài khoản.</li>
                        <li><strong>Bảo mật mật khẩu:</strong> Bạn hoàn toàn chịu trách nhiệm về việc bảo mật mật khẩu của mình và tất cả các hoạt động xảy ra dưới tài khoản của bạn.</li>
                        <li><strong>Hành vi nghiêm cấm:</strong> Không được sử dụng tài khoản của người khác mà không có sự đồng ý bằng văn bản, hoặc tạo nhiều tài khoản giả mạo nhằm mục đích trục lợi từ hệ thống.</li>
                    </ul>
                    <p className="leading-relaxed text-slate-600">
                        Chúng tôi có quyền tạm ngừng hoạt động hoặc xóa vĩnh viễn tài khoản của bạn nếu phát hiện bất kỳ hành vi vi phạm điều khoản nào hoặc có dấu hiệu gian lận bảo mật.
                    </p>
                </div>
            )
        },
        {
            id: 'su-dung-dich-vu',
            title: '3. Quy định sử dụng Gói cước & Đăng ký',
            icon: FileText,
            keywords: 'gói cước đăng ký data combo mạng xã hội thoại số dư ví ảo thanh toán giao dịch web3 nạp tiền',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        ViettelAI cung cấp danh sách đầy đủ các gói cước viễn thông chính chủ của Viettel bao gồm gói Data, gói Combo Thoại + Data, gói Mạng xã hội và các gói ngắn ngày.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                        <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                            <h5 className="font-bold text-slate-900 text-xs flex items-center">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                                Đăng ký gói cước
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Hệ thống hỗ trợ nạp số dư giả định và đăng ký gói cước trực tuyến trực tiếp. Thời gian sử dụng gói cước được tính từ thời điểm kích hoạt thành công trên hệ thống.
                            </p>
                        </div>
                        <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                            <h5 className="font-bold text-slate-900 text-xs flex items-center">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                                Giao dịch số dư và Web3
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Tất cả các khoản nạp ví, số dư tiền mặt hoặc giao dịch liên quan đến Web3 trên nền tảng thử nghiệm được lưu vết rõ ràng trên cơ sở dữ liệu để phục vụ việc kích hoạt dịch vụ tự động.
                            </p>
                        </div>
                    </div>
                    <p className="leading-relaxed text-slate-600">
                        Người dùng tuyệt đối không sử dụng bất kỳ lỗ hổng bảo mật nào của hệ thống để điều chỉnh số dư tài khoản trái phép. Bất kỳ giao dịch gian lận nào sẽ bị hệ thống tự động hủy và khóa tài khoản vĩnh viễn.
                    </p>
                </div>
            )
        },
        {
            id: 'chatbot-ai',
            title: '4. Điều khoản sử dụng Trợ lý ảo Chatbot AI',
            icon: ShieldCheck,
            keywords: 'trợ lý ảo chatbot ai tin nhắn thô tục spam lịch sử chat đề xuất tư vấn',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Trợ lý ảo ViettelAI được xây dựng bằng công nghệ trí tuệ nhân tạo hiện đại kết hợp dữ liệu gói cước thực tế để giúp khách hàng nhanh chóng chọn lựa gói cước di động phù hợp nhất với nhu cầu sử dụng cá nhân.
                    </p>
                    <ul className="space-y-2 text-slate-600 list-disc pl-5">
                        <li><strong>Chất lượng phản hồi:</strong> Trợ lý ảo phản hồi tự động dựa trên thông số giá, ưu đãi data, phút gọi của từng gói cước. Mặc dù chúng tôi liên tục tối ưu hóa, thông tin phản hồi có tính chất tư vấn tham khảo tốt nhất.</li>
                        <li><strong>Hành vi sử dụng:</strong> Người dùng cam kết không gửi các tin nhắn có nội dung thô tục, quấy rối, ngôn từ thù hận, mã độc, spam hoặc tấn công từ chối dịch vụ (DDoS) vào máy chủ Trợ lý ảo.</li>
                        <li><strong>Lưu trữ lịch sử:</strong> Để cải thiện chất lượng phục vụ và khả năng đề xuất thông minh, các cuộc hội thoại được lưu trữ an toàn trong lịch sử chat cá nhân và bạn có quyền xóa chúng bất kỳ lúc nào trong phần cài đặt tài khoản.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'mien-tru-trach-nhiem',
            title: '5. Miễn trừ trách nhiệm & Giới hạn',
            icon: AlertCircle,
            keywords: 'miễn trừ trách nhiệm giới hạn sự cố mạng gián đoạn kỹ thuật thiệt hại rủi ro',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Chúng tôi luôn nỗ lực duy trì hệ thống hoạt động thông suốt 24/7 với hiệu suất cao nhất. Tuy nhiên, ViettelAI không bảo đảm rằng dịch vụ sẽ hoàn toàn không bị ngắt quãng, không có lỗi kỹ thuật phát sinh do sự cố mạng viễn thông quốc tế hoặc do nhà cung cấp đám mây bên thứ ba.
                    </p>
                    <p className="leading-relaxed text-slate-600">
                        Trong phạm vi tối đa được pháp luật cho phép, ViettelAI và các đơn vị liên kết sẽ không chịu trách nhiệm đối với bất kỳ thiệt hại trực tiếp, gián tiếp, vô ý hay cố ý nào phát sinh từ việc sử dụng hoặc không thể sử dụng dịch vụ của hệ thống.
                    </p>
                </div>
            )
        },
        {
            id: 'giai-quyet-tranh-chap',
            title: '6. Luật áp dụng và Giải quyết tranh chấp',
            icon: HelpCircle,
            keywords: 'luật áp dụng tranh chấp khiếu nại tòa án thương lượng hoà giải thành phố cần thơ pháp luật việt nam',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Các điều khoản sử dụng này được điều chỉnh và giải thích theo các quy định của pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.
                    </p>
                    <p className="leading-relaxed text-slate-600">
                        Mọi tranh chấp, khiếu nại phát sinh từ hoặc liên quan đến việc sử dụng dịch vụ ViettelAI trước tiên sẽ được giải quyết thông qua thương lượng, hòa giải thiện chí giữa hai bên. Trong trường hợp không đạt được sự thống nhất trong vòng 30 ngày kể từ ngày phát sinh tranh chấp, vụ việc sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền tại Thành phố Cần Thơ.
                    </p>
                </div>
            )
        }
    ], []);

    const filteredSections = useMemo(() => {
        if (!searchTerm.trim()) return sections;
        const term = searchTerm.toLowerCase();
        return sections.filter(sec =>
            sec.title.toLowerCase().includes(term) ||
            sec.keywords.toLowerCase().includes(term)
        );
    }, [searchTerm, sections]);

    return (
        <div className="max-w-5xl mx-auto space-y-10 py-6 animate-fade-in text-xs font-semibold">
            {/* Decorative Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-8 md:p-12 text-white shadow-md">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full -translate-x-10 translate-y-10 pointer-events-none" />

                <div className="relative max-w-2xl space-y-3">
                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase text-white">
                        <Bookmark className="w-3.5 h-3.5 text-white fill-white" />
                        <span>Chính sách & Quy định</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Điều khoản dịch vụ ViettelAI</h1>
                    <p className="text-red-100 text-[11px] font-medium leading-relaxed">
                        Vui lòng đọc kỹ các điều khoản và quy định sử dụng dưới đây để đảm bảo quyền lợi hợp pháp của bạn và hiểu rõ cách vận hành hệ thống đăng ký dịch vụ của chúng tôi.
                    </p>
                    <div className="pt-2 text-[10px] text-red-200">
                        Cập nhật lần cuối: Ngày 21 tháng 07 năm 2026 • Phiên bản 1.2
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Left Column: TOC / Quick links */}
                <aside className="md:col-span-4 space-y-6 md:sticky md:top-6">
                    {/* Search Box */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
                        <label className="text-slate-800 font-bold block">Tìm kiếm điều khoản</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Nhập từ khóa tìm kiếm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-red-500 transition-colors"
                            />
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                    </div>

                    {/* Quick Nav Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2">Mục lục điều khoản</h3>
                        <nav className="space-y-1">
                            {sections.map((sec) => {
                                const IconComponent = sec.icon;
                                return (
                                    <button
                                        key={sec.id}
                                        onClick={() => {
                                            setActiveSection(sec.id);
                                            document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold transition-all ${activeSection === sec.id
                                                ? 'bg-red-50 text-red-600 border-l-2 border-red-500 pl-4'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        <IconComponent className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{sec.title.replace(/^\d+\.\s*/, '')}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Customer support shortcut */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
                        <h4 className="font-bold text-slate-900">Bạn cần hỗ trợ thêm?</h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            Nếu bạn có bất kỳ câu hỏi hoặc thắc mắc nào liên quan đến điều khoản sử dụng này, vui lòng liên hệ trực tiếp với chúng tôi.
                        </p>
                        <a
                            href="/contact"
                            className="inline-flex items-center text-[11px] font-bold text-red-600 hover:text-red-500 transition-colors space-x-1"
                        >
                            <span>Gửi yêu cầu hỗ trợ</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </aside>

                {/* Right Column: Terms list */}
                <div className="md:col-span-8 space-y-8">
                    {filteredSections.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 space-y-3 shadow-sm">
                            <Scale className="w-12 h-12 text-slate-300 mx-auto" />
                            <p className="font-bold text-sm text-slate-800">Không tìm thấy kết quả phù hợp</p>
                            <p className="text-[11px] font-semibold text-slate-400">Vui lòng thử lại với một từ khóa khác.</p>
                        </div>
                    ) : (
                        filteredSections.map((sec) => {
                            const IconComponent = sec.icon;
                            return (
                                <div
                                    id={sec.id}
                                    key={sec.id}
                                    className={`bg-white border rounded-xl p-6 md:p-8 transition-all shadow-sm ${activeSection === sec.id ? 'border-red-200 ring-2 ring-red-500/5' : 'border-slate-200'
                                        }`}
                                    onMouseEnter={() => setActiveSection(sec.id)}
                                >
                                    <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-4">
                                        <div className={`p-2 rounded-lg ${activeSection === sec.id ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <IconComponent className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">{sec.title}</h2>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-slate-600 font-medium">
                                        {sec.content}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
