import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Shield, Eye, Lock, RefreshCw, Key, Landmark, Search, Database } from 'lucide-react';

interface PrivacySection {
    id: string;
    title: string;
    icon: any;
    content: ReactNode;
    keywords: string;
}

export default function Privacy() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSection, setActiveSection] = useState('thu-thap');

    const sections: PrivacySection[] = useMemo(() => [
        {
            id: 'thu-thap',
            title: '1. Thông tin chúng tôi thu thập',
            icon: Database,
            keywords: 'thông tin thu thập họ tên số điện thoại tài khoản mật khẩu dữ liệu hoạt động chatbot địa chỉ ip',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        ViettelAI chỉ thu thập thông tin cá nhân tối thiểu và cần thiết để cung cấp cho bạn một dịch vụ cá nhân hóa gói cước tốt nhất và an toàn nhất. Các loại thông tin chúng tôi thu thập bao gồm:
                    </p>
                    <ul className="space-y-3 text-slate-600 list-none pl-0">
                        <li className="flex items-start">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 mt-1.5 shrink-0" />
                            <div>
                                <strong>Thông tin đăng ký tài khoản:</strong> Họ và tên, số điện thoại chính chủ Viettel, địa chỉ email, mật khẩu băm bảo mật (hashed password) phục vụ đăng nhập.
                            </div>
                        </li>
                        <li className="flex items-start">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 mt-1.5 shrink-0" />
                            <div>
                                <strong>Dữ liệu hoạt động & giao dịch:</strong> Số dư ví ảo thử nghiệm, lịch sử nạp ví, danh sách các gói cước đã đăng ký thành công, thời hạn sử dụng gói cước.
                            </div>
                        </li>
                        <li className="flex items-start">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 mt-1.5 shrink-0" />
                            <div>
                                <strong>Lịch sử tư vấn Chatbot:</strong> Nội dung cuộc trò chuyện của bạn với Trợ lý ảo Chatbot AI để tối ưu hóa thuật toán phản hồi tự động.
                            </div>
                        </li>
                        <li className="flex items-start">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 mt-1.5 shrink-0" />
                            <div>
                                <strong>Dữ liệu thiết bị & IP:</strong> Địa chỉ IP truy cập, loại trình duyệt sử dụng, thời gian và tần suất truy cập các trang.
                            </div>
                        </li>
                    </ul>
                </div>
            )
        },
        {
            id: 'su-dung-thong-tin',
            title: '2. Cách chúng tôi sử dụng thông tin',
            icon: Eye,
            keywords: 'sử dụng thông tin vận hành tài khoản đề xuất cá nhân hóa gói cước khảo sát hỗ trợ kỹ thuật nghiên cứu tối ưu ai chatbot',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Các dữ liệu thu thập được chúng tôi sử dụng độc quyền cho các mục đích vận hành, cải thiện và bảo vệ hệ thống:
                    </p>
                    <ul className="space-y-2 text-slate-600 list-disc pl-5">
                        <li><strong>Vận hành hệ thống:</strong> Xác thực danh tính người dùng khi đăng nhập, thực hiện nạp tiền giả định và kích hoạt đăng ký gói cước.</li>
                        <li><strong>Đề xuất cá nhân hóa:</strong> Phân tích thói quen sử dụng, nhu cầu đăng ký thông qua khảo sát (Survey) để đề xuất gói cước Data hoặc Combo phù hợp nhất.</li>
                        <li><strong>Hỗ trợ kỹ thuật:</strong> Xử lý các khiếu nại, phản hồi của người dùng gửi qua trang Liên hệ.</li>
                        <li><strong>Nghiên cứu & Tối ưu AI:</strong> Đào tạo Trợ lý ảo AI hiểu rõ các thắc mắc về gói cước của người dùng, nâng cao khả năng trả lời tự nhiên.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'bao-mat',
            title: '3. Phương thức bảo mật dữ liệu',
            icon: Lock,
            keywords: 'phương thức bảo mật an toàn mã hóa ssl https mật khẩu băm bcrypt máy chủ mongodb',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Chúng tôi coi an toàn dữ liệu khách hàng là ưu tiên hàng đầu. ViettelAI áp dụng nhiều công nghệ bảo mật tiên tiến nhất hiện nay:
                    </p>
                    <ul className="space-y-2 text-slate-600 list-disc pl-5">
                        <li><strong>Mã hóa đầu cuối (Encryption):</strong> Mọi dữ liệu truyền tải giữa máy tính người dùng và máy chủ (API) đều được bảo vệ qua giao thức SSL/HTTPS bảo mật tuyệt đối.</li>
                        <li><strong>Bảo vệ mật khẩu:</strong> Mật khẩu của bạn được mã hóa một chiều qua thuật toán băm bảo mật bcrypt, quản trị viên hệ thống cũng không thể đọc được mật khẩu gốc của bạn.</li>
                        <li><strong>Bảo vệ máy chủ:</strong> Cơ sở dữ liệu MongoDB chạy trong môi trường container riêng biệt, chỉ chấp nhận truy vấn nội bộ từ API Server với mã bảo vệ nghiêm ngặt.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'chia-se',
            title: '4. Chia sẻ thông tin với bên thứ ba',
            icon: Landmark,
            keywords: 'chia sẻ thông tin bên thứ ba thương mại tiết lộ pháp luật việt nam tòa án cơ quan nhà nước',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Chúng tôi cam kết <strong className="text-slate-950">KHÔNG BÁN, KHÔNG CHO THUÊ</strong> hoặc chia sẻ dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại hoặc quảng cáo độc hại.
                    </p>
                    <p className="leading-relaxed text-slate-600">
                        Dữ liệu cá nhân chỉ được tiết lộ trong các trường hợp ngoại lệ sau:
                    </p>
                    <ul className="space-y-2 text-slate-600 list-disc pl-5">
                        <li>Có sự đồng ý rõ ràng bằng văn bản từ chính chủ tài khoản.</li>
                        <li>Theo yêu cầu chính thức bằng văn bản của cơ quan nhà nước, cơ quan điều tra có thẩm quyền theo quy định pháp luật Việt Nam.</li>
                        <li>Để bảo vệ an toàn tính mạng, tài sản của người dùng hoặc ngăn chặn hành vi tấn công mạng có tổ chức nhắm vào máy chủ.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'quyen-nguoi-dung',
            title: '5. Quyền kiểm soát của người dùng',
            icon: Key,
            keywords: 'quyền kiểm soát tự chủ chỉnh sửa cập nhật hồ sơ profile xóa lịch sử chat khóa tài khoản dữ liệu',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Hệ thống tôn trọng hoàn toàn quyền tự chủ về dữ liệu của bạn. Với tư cách là chủ sở hữu tài khoản, bạn có các quyền sau:
                    </p>
                    <ul className="space-y-2 text-slate-600 list-disc pl-5">
                        <li><strong>Quyền xem & chỉnh sửa:</strong> Bạn có thể dễ dàng cập nhật lại thông tin cá nhân, thay đổi mật khẩu trong trang Quản lý hồ sơ (Profile).</li>
                        <li><strong>Quyền xóa lịch sử:</strong> Bạn có quyền yêu cầu xóa sạch lịch sử chat với trợ lý ảo hoặc lịch sử so sánh trong mục cài đặt.</li>
                        <li><strong>Quyền khóa tài khoản:</strong> Bạn có quyền gửi yêu cầu hỗ trợ đến ban quản trị để vô hiệu hóa tài khoản của bạn vĩnh viễn khỏi cơ sở dữ liệu.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'cap-nhat',
            title: '6. Thay đổi Chính sách bảo mật',
            icon: RefreshCw,
            keywords: 'thay đổi chính sách bảo mật cập nhật phản ánh thông báo màn hình chính email đồng ý',
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed text-slate-600">
                        Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian để phản ánh những thay đổi trong cách chúng tôi xử lý dữ liệu hoặc do yêu cầu pháp lý mới.
                    </p>
                    <p className="leading-relaxed text-slate-600">
                        Khi có cập nhật quan trọng, chúng tôi sẽ hiển thị thông báo trực tiếp trên màn hình chính của ứng dụng hoặc gửi email trực tiếp tới địa chỉ đã đăng ký của bạn. Việc tiếp tục sử dụng hệ thống sau thời hạn thông báo đồng nghĩa với sự đồng ý của bạn với các điều khoản chính sách mới.
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
                        <Shield className="w-3.5 h-3.5 text-white" />
                        <span>Quyền riêng tư tuyệt đối</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Chính sách bảo mật ViettelAI</h1>
                    <p className="text-red-100 text-[11px] font-medium leading-relaxed">
                        Chúng tôi cam kết bảo vệ thông tin riêng tư cá nhân và dữ liệu tài khoản của bạn. Đọc thông tin dưới đây để hiểu rõ cách dữ liệu được thu thập, bảo mật và quản lý.
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
                        <label className="text-slate-800 font-bold block">Tìm nội dung chính sách</label>
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
                        <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2">Mục lục chính sách</h3>
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

                    {/* Secure promise card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-850 text-white rounded-xl p-5 space-y-3 shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Shield className="w-20 h-20" />
                        </div>
                        <h4 className="font-bold text-xs text-white flex items-center space-x-1.5">
                            <Shield className="w-4 h-4 text-red-500 shrink-0" />
                            <span>Cam kết 3 KHÔNG</span>
                        </h4>
                        <ul className="text-[11px] text-slate-300 font-medium space-y-2 list-none pl-0">
                            <li>🚫 <strong>KHÔNG</strong> bán thông tin cá nhân.</li>
                            <li>🚫 <strong>KHÔNG</strong> rò rỉ dữ liệu lịch sử chat.</li>
                            <li>🚫 <strong>KHÔNG</strong> tự ý nạp/trừ phí ẩn.</li>
                        </ul>
                    </div>
                </aside>

                {/* Right Column: Policy list */}
                <div className="md:col-span-8 space-y-8">
                    {filteredSections.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 space-y-3 shadow-sm">
                            <Shield className="w-12 h-12 text-slate-300 mx-auto" />
                            <p className="font-bold text-sm text-slate-800">Không tìm thấy kết quả</p>
                            <p className="text-[11px] font-semibold text-slate-400">Vui lòng thử tìm với một từ khóa khác.</p>
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
