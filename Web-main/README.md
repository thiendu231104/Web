# Website Cung Cấp Gói Cước Di Động Viettel Tích Hợp Chatbot AI

> 📢 **BẢN TUYÊN BỐ NGUỒN SỰ THẬT DUY NHẤT (SINGLE SOURCE OF TRUTH - SSOT):**
> Tài liệu này được tổng hợp và đối chiếu trực tiếp từ **Source Code hiện tại** và **CSDL MongoDB thực tế đang chạy**. Mọi trường dữ liệu (fields), tên collection, cấu hình môi trường và tính năng nghiệp vụ đều tuân thủ chính xác 100% theo thực tế hệ thống.

---

## A. Cấu Hình Hệ Thống (Configuration)

Hệ thống được cấu hình và vận hành dựa trên các biến môi trường và tệp cấu hình thực tế sau:

### 1. File Cấu Hình Dự Án
- **Root (`package.json`)**: Quản lý npm workspace liên kết giữa hai gói `client` và `server`.
- **Frontend Client (`client/`)**:
  - `package.json`: Khai báo các thư viện chính gồm React 18, Vite, Tailwind CSS, Lucide React, Zustand, React Hook Form, Zod, Ethers.js.
  - `vite.config.ts`: Cấu hình trình đóng gói Vite.
  - `tsconfig.json`: Cấu hình TypeScript compiler.
  - `.env`: Chứa các tham số cấu hình API Endpoint và kết nối Web3 Sepolia Blockchain client-side.
- **Backend Server (`server/`)**:
  - `package.json`: Khai báo các thư viện Express, Mongoose 8+, bcryptjs, jsonwebtoken, cors, dotenv, ethers, @google/generative-ai, nodemailer.
  - `.env`: Chứa tham số kết nối MongoDB, Secret Key JWT, RPC Web3, Groq/Gemini API Provider và SMTP Mailtrap Server.
  - `src/services/chatbot/scoring_config.json`: Ma trận hệ số tính điểm lọc gói cước cho Chatbot AI.

### 2. Các Biến Môi Trường Thực Tế (Environment Variables)

#### 🔹 Cấu hình Backend (`server/.env`)
- `MONGODB_URI`: Chuỗi URI kết nối tới CSDL MongoDB (Mongo Atlas Cluster).
- `PORT`: Cổng dịch vụ HTTP Server Express (`5000`).
- `JWT_SECRET`: Chuỗi khóa mật băm và xác thực JSON Web Token.
- `RECEIVER_WALLET`: Địa chỉ ví MetaMask của quản trị viên nhận giao dịch ETH Sepolia.
- `ETH_EXCHANGE_RATE`: Tỷ giá quy đổi cố định VND / ETH Sepolia (`75000000` VND/ETH).
- `RPC_URL`: Endpoint RPC kết nối mạng thử nghiệm Ethereum Sepolia (`https://sepolia.drpc.org`).
- `AI_PROVIDER`: Nhà cung cấp mô hình AI (`groq`, `gemini`, `ollama`).
- `GROQ_API_KEY`: API Key kết nối dịch vụ Groq Cloud.
- `GROQ_MODEL`: Mô hình ngôn ngữ mặc định của Groq (`llama-3.1-8b-instant`).
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`: Cấu hình SMTP Server (Mailtrap) phục vụ gửi email chứa mã OTP khôi phục mật khẩu.

#### 🔹 Cấu hình Frontend (`client/.env`)
- `VITE_API_URL`: URL Backend REST API Client kết nối (`http://localhost:5000`).
- `VITE_NETWORK_NAME`: Tên mạng thử nghiệm Blockchain (`Sepolia`).
- `VITE_CHAIN_ID`: Chain ID của mạng Sepolia (`11155111`).
- `VITE_RPC_URL`: Endpoint RPC Web3 Client-side.
- `VITE_BLOCK_EXPLORER`: Trình tra cứu giao dịch Blockchain (`https://sepolia.etherscan.io`).
- `VITE_RECEIVER_WALLET`: Địa chỉ ví nhận tiền Sepolia ETH.
- `VITE_ETH_EXCHANGE_RATE`: Tỷ giá quy đổi VND/ETH client-side.

---

## B. Chức Năng Hệ Thống (Features)

Tất cả các chức năng dưới đây đều được xác minh trực tiếp từ mã nguồn thực tế và kết nối CSDL MongoDB:

### 1. Xác Thực & Phân Quyền Tài Khoản (Authentication & Authorization)
- **Đăng ký & Đăng nhập**: Xác thực số điện thoại và mật khẩu mã hóa bcrypt. Cấp JWT Token lưu tại `localStorage`.
- **Khôi phục mật khẩu qua Email OTP**: Tạo mã OTP 6 số ngẫu nhiên gửi qua SMTP Email, lưu trữ tại collection `otp_codes` có cơ chế tự hủy TTL Index sau 300 giây.
- **Phân quyền vai trò (Role-Based Access Control)**: Phân chia 2 quyền chính `user` (người dùng thuê bao) và `admin` (quản trị viên hệ thống).
- **Session Merge trên Login**: Khi Guest đăng nhập tài khoản, hệ thống tự động đồng bộ tất cả lịch sử hoạt động `user_activities` từ `session_id` sang `user_id`.

### 2. Duyệt, Tìm Kiếm & Lọc Gói Cước Nâng Cao
- **Tìm kiếm Từ khóa Debounced**: Tìm kiếm theo mã gói, tên gói, ưu đãi data với cơ chế hoãn phát tín hiệu (debounce 400ms).
- **Bộ lọc đa tiêu chí (AdvancedFilter)**: Lọc theo phân loại (`Data`, `Combo`), mức giá, chu kỳ sử dụng (1 ngày, 7 ngày, 30 ngày, 90 ngày, 360 ngày) và đối tượng thuê bao (`trả trước`, `trả sau`).
- **Personalized Recently Viewed (Gói cước quan tâm gần đây)**: API `/api/packages/recently-viewed` tự động lọc danh sách gói cước vừa tìm kiếm/xem chi tiết độc nhất của người dùng/khách vãng lai hiển thị tại Trang Chủ.

### 3. Kiểm Tra Xung Đột & Đăng Ký Gói Cước (Subscription Conflict Engine)
- **Thuật toán kiểm tra xung đột 5 bước**:
  1. *Kiểm tra gói trùng*: Trùng gói ngắn hạn $\rightarrow$ cho phép gia hạn (`RENEW_SHORT`), trùng gói dài hạn đang hoạt động $\rightarrow$ từ chối đăng ký (`REJECT`).
  2. *Gói nền bắt buộc (`requires_base_package`)*: Từ chối nếu gói yêu cầu gói nền mà thuê bao chưa có gói `DATA_BASE` hoặc `COMBO` hoạt động.
  3. *Gói bổ trợ (`is_addon`)*: Cho phép đăng ký song song không bị xung đột.
  4. *Nhóm ưu đãi (`benefit_group`)*: Kiểm tra trùng nhóm ưu đãi chính (`DATA_MAIN`, `APP_META`).
  5. *Chính sách đăng ký (`registration_policy`)*: Thực thi chính sách `ALLOW` (chạy song song) hoặc `REPLACE` (tự động ghi đè gói cũ).
- **Dev Virtual Time Tua Thời Gian**: Tool tua mốc thời gian ảo kiểm tra tự động gia hạn (`autoRenew`) và chuyển trạng thái gói cước `EXPIRED`.

### 4. Gộp Nhật Ký Hoạt Động Theo Phiên (Session-Scoped Activity Aggregation)
- **Helper `logOrMergeActivity`**: Thuật toán gộp log theo phiên trong `user_activities`: mỗi gói cước chỉ tồn tại tối đa 1 bản ghi duy nhất trong cùng 1 phiên (`user_id` hoặc `session_id`).
- **Tiến hóa trạng thái luồng (`flow_type`)**:
  - `SEARCH_VIEW`: Tìm kiếm $\rightarrow$ xem chi tiết.
  - `SEARCH_VIEW_SUBSCRIBE`: Tìm kiếm $\rightarrow$ xem chi tiết $\rightarrow$ đăng ký thành công.
  - `SEARCH_SUBSCRIBE_DIRECT`: Tìm kiếm $\rightarrow$ đăng ký trực tiếp từ Card.
  - `VIEW_ONLY`: Chỉ xem chi tiết gói cước.
  - `VIEW_SUBSCRIBE`: Xem chi tiết $\rightarrow$ đăng ký thành công.
  - `COMPARE_SUBSCRIBE`: So sánh $\rightarrow$ đăng ký thành công.
- **Frontend Guest Session Reset**: `guest_session_id` được lưu độc quyền tại `sessionStorage` và tự động sinh mới mỗi khi F5 reload trang.

### 5. So Sánh Gói Cước & AI Summarization
- **Khay So Sánh Tạm (CompareDrawer)**: Cho phép chọn từ 2 đến 3 gói cước đưa vào so sánh đối chiếu.
- **Bảng So Sánh Chi Tiết (Compare.tsx)**: So sánh dung lượng data, giá cước, số phút gọi nội/ngoại mạng, cú pháp SMS và tiện ích đi kèm.
- **Phân tích so sánh AI (CompareAI.tsx)**: Gọi mô hình AI Groq/Gemini sinh câu đánh giá tư vấn ưu/nhược điểm ngắn gọn giữa các gói cước đang so sánh.
- **Lưu phiên so sánh (`compare_histories`)**: Lưu vết quá trình so sánh, thời gian so sánh và lựa chọn cuối cùng.

### 6. Nạp Tiền Ví Di Động Qua MetaMask Blockchain (Web3 Sepolia)
- **Tích hợp Ethers.js Web3**: Kết nối ví MetaMask trên trình duyệt, ký giao dịch chuyển tiền ETH Sepolia tới địa chỉ ví `RECEIVER_WALLET`.
- **Tự động quy đổi VND/ETH**: Quy đổi giá trị VND sang ETH theo tỷ giá `ETH_EXCHANGE_RATE`.
- **Lưu lịch sử nạp tiền (`deposits`)**: Ghi nhận mã `txHash`, số tiền `amountVND`, `amountETH`, trạng thái `status: 'success'` và tự động cộng số dư vào `Account.balance`.

### 7. AI Chatbot Tư Vấn & Thuật Toán RAG Matcher
- **Cửa sổ Chatbot Bong bóng & Trang Chat riêng**: Giao diện hội thoại tương tác với trợ lý AI Viettel.
- **Thuật toán RAG Hybrid Matching**: Kết hợp khớp từ khóa nhu cầu (`trainingKeywords`), bài học kinh nghiệm (`learnedLessons`) và ma trận tính điểm `scoring_config.json` với dữ liệu đặc trưng gói `package_features`.
- **Lưu trữ lịch sử hội thoại (`chat_histories`)**: Hỗ trợ xóa lịch sử hội thoại dạng soft-delete.

### 8. Khảo Sát Đề Xuất Gói Cước Decision Tree (Survey)
- **Wizard Khảo Sát Động (`Survey.tsx`)**: Lần lượt trả lời các câu hỏi nhu cầu chính, ngân sách, chu kỳ và ứng dụng yêu thích tải từ `survey_configs`.
- **Trả về đề xuất phù hợp**: Thuật toán khớp đáp án lọc và trả về danh sách gói cước tối ưu lưu tại `survey_histories`.

### 9. Quản Lý Yêu Cầu Liên Hệ CSKH (Contact)
- **Gửi Yêu Cầu CSKH (`Contact.tsx`)**: Người dùng và Guest gửi thắc mắc/sự cố theo chủ đề.
- **Phản hồi chính thức từ Admin**: Admin nhập `admin_note` và đánh dấu `status: 'DONE'`. Người dùng theo dõi phản hồi trong Tab Lịch sử liên hệ.

### 10. Trang Quản Trị Quản Lý (Admin Panel)
- **Dashboard.tsx**: Thống kê tổng quan số dư, doanh thu, số gói cước, số thuê bao và lượt tương tác.
- **Packages.tsx**: Quản lý CRUD danh mục gói cước, hỗ trợ thanh tìm kiếm cục bộ tối giản và modal chỉnh sửa 3 tab.
- **Users.tsx**: Quản lý danh sách tài khoản thuê bao, cộng tiền số dư thủ công và khóa/mở khóa tài khoản.
- **Deposits.tsx**: Xem danh sách giao dịch nạp tiền ví MetaMask Sepolia.
- **ChatHistory.tsx**: Xem lịch sử hội thoại giữa người dùng và Chatbot AI.
- **Contacts.tsx**: Tiếp nhận và nhập câu trả lời hỗ trợ khách hàng.
- **Surveys.tsx**: Theo dõi thống kê lịch sử khảo sát.

---

## C. Giao Diện Người Dùng (User Interface)

Hệ thống được thiết kế theo phong cách hiện đại (Vibrant Dark/Light Mode, Tailwind CSS, Lucide Icons) bao gồm các trang và component hiển thị thực tế:

### 1. Danh Sách Màn Hình Thực Tế (Pages)
- **Trang chủ (`client/src/pages/Home.tsx`)**: Banner Hero tích hợp video YouTube 16:9, khối danh mục gói cước động, Bento Promo Chatbot/Survey, khối Gói cước quan tâm gần đây (Personalized) và Accordion FAQ.
- **Trang Danh mục gói cước (`client/src/pages/Packages.tsx`)**: Danh sách gói cước phân trang client/server, kết hợp bộ lọc `AdvancedFilter` và công cụ tìm kiếm `PackageSearch`.
- **Trang Chi tiết gói cước (`client/src/pages/PackageDetail.tsx`)**: Chi tiết thông số data, gọi thoại, cú pháp SMS đăng ký/hủy và gợi ý các gói cước tương tự.
- **Trang So sánh gói cước (`client/src/pages/Compare.tsx`)**: Bảng đối chiếu 2-3 gói cước kèm nhận xét đánh giá tự động từ `CompareAI`.
- **Trang Khảo sát (`client/src/pages/Survey.tsx`)**: Giao diện wizard hỏi đáp 4 bước tìm gói cước tối ưu.
- **Trang Hồ sơ cá nhân (`client/src/pages/Profile.tsx`)**: Cấu trúc Sidebar Tabbed (Thông tin cá nhân, Nạp tiền ví MetaMask, Lịch sử gói cước đang dùng, Lịch sử nạp tiền, Đổi mật khẩu).
- **Trang Liên hệ CSKH (`client/src/pages/Contact.tsx`)**: Form gửi yêu cầu hỗ trợ và Tab lịch sử theo dõi phản hồi `admin_note`.
- **Trang Chatbot riêng (`client/src/pages/ChatbotPage.tsx`)**: Màn hình trò chuyện toàn trang với Chatbot AI.
- **Trang Xác thực (`client/src/pages/Auth/`)**: `Login.tsx` (Đăng nhập), `Register.tsx` (Đăng ký), `ForgotPassword.tsx` (Quên mật khẩu nhập OTP).
- **Trang Điều khoản & Quyền riêng tư**: `Privacy.tsx`, `Terms.tsx`.
- **Trang Admin (`client/src/pages/Admin/`)**: `Dashboard.tsx`, `Packages.tsx`, `Users.tsx`, `Deposits.tsx`, `ChatHistory.tsx`, `Contacts.tsx`, `Surveys.tsx`.

### 2. Các Thành Phần Giao Diện Chính (Components)
- `PackageCard`: Card hiển thị gói cước chuẩn hóa. Tên gói (`pkg.ten`) nằm ở góc trên bên trái, Badge **🔥 HOT** nằm góc trên bên phải nếu `dohot === 'Hot'`. Tự động phân tách dòng Data đa dụng (Wifi 📶) và dòng Data Meta (Globe 🌐).
- `PackageSearch`: Thanh tìm kiếm từ khóa kèm nút xóa "X" hỗ trợ debounce.
- `AdvancedFilter`: Drawer/Panel lọc đa điều kiện theo loại gói, giá cước và chu kỳ.
- `CompareDrawer`: Khay nổi gắn cố định góc dưới màn hình hiển thị danh sách gói chờ so sánh.
- `CompareAI`: Khối nhận xét đánh giá ưu nhược điểm bằng AI trên trang so sánh.
- `Chatbot`: Bong bóng chat AI nổi góc dưới bên phải màn hình.
- `RegisterModal`: Popup xác nhận đăng ký gói cước kèm thông báo xử lý xung đột gói.
- `DevTimeWidget`: Widget tua thời gian ảo dành cho quá trình kiểm thử gia hạn gói cước.
- `Navbar`, `Footer`, `Breadcrumb`, `Pagination`, `SEO`, `LoadingSkeleton`, `EmptyState`, `Skeleton`.

---

## D. Kiểm Tra Dữ Liệu MongoDB Thực Tế (Database Audit)

> ⚠️ **LƯU Ý:** Danh sách bên dưới liệt kê CHÍNH XÁC các trường dữ liệu (fields) **thực sự xuất hiện trong các Document lưu trữ thực tế tại MongoDB**. Không bổ sung các field suy đoán hoặc field khai báo ở Schema nhưng không có dữ liệu thực tế.

### 1. Collection `goi_cuoc`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `package_id` (Number)
- `ma_goi` (String)
- `ten` (String)
- `dohot` (String)
- `phan_loai_goi` (String)
- `gia` (Number)
- `data_theo_ngay` (String)
- `free_ngoai_mang` (Number)
- `free_noi_mang` (Number)
- `sms` (Number)
- `doi_tuong_ap_dung` (String)
- `tien_ich_free` (String / null)
- `uudaitrong` (String)
- `chu_ky_ngay` (Number)
- `cycle_type` (String)
- `dangky` (String)
- `huygiahan` (String)
- `huygoicuoc` (String)
- `is_auto_renew` (Boolean)
- `service_group` (String)
- `registration_policy` (String)
- `allow_parallel_with` (Array)
- `system_type` (String)
- `is_addon` (Boolean)
- `requires_base_package` (Boolean)
- `benefit_group` (String)
- `updatedAt` (String / Date)

### 2. Collection `user_activities`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `activity_id` (Number / null)
- `user_id` (Number / null)
- `session_id` (String)
- `flow_type` (String: `SEARCH_SUBSCRIBE_DIRECT`, `SEARCH_VIEW_SUBSCRIBE`, `SEARCH_VIEW`, `COMPARE_SUBSCRIBE`, `VIEW_SUBSCRIBE`, `VIEW_ONLY`)
- `source` (String: `search`, `detail`, `compare`)
- `action_type` (String: `VIEW_PACKAGE`, `SEARCH`, `COMPARE`, `SUBSCRIBE`, `RENEW`, `CANCEL`, `COMPARE_AND_SUBSCRIBE`)
- `package_id` (Number)
- `search_keyword` (String / null)
- `created_at` (String / Date)
- `__v` (Number)

### 3. Collection `accounts`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `user_id` (Number)
- `fullname` (String)
- `phone_number` (String)
- `password` (String)
- `balance` (Number)
- `role` (String: `user`, `admin`)
- `subscription_type` (String: `tra_truoc`, `tra_sau`)
- `is_loyal_customer` (Boolean)
- `status` (String: `active`, `blocked`, `pending`)
- `created_at` (String / Date)
- `wallet_address` (String / null)
- `email` (String)

### 4. Collection `user_subscriptions`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `userId` (Number)
- `packageId` (Number)
- `registeredAt` (String / Date)
- `activatedAt` (String / Date)
- `startedAt` (String / Date)
- `expiresAt` (String / Date)
- `status` (String: `ACTIVE`, `EXPIRED`, `CANCELLED`, `REPLACED`)
- `autoRenew` (Boolean)
- `cycle` (String: `DAY`, `MONTH`, `YEAR`)
- `duration` (Number)
- `cycleType` (String)
- `cancelledAt` (String / Date / null)
- `cancelReason` (String)
- `replacedAt` (String / Date / null)
- `replacedBySubscriptionId` (ObjectId / null)
- `createdAt` (String / Date)
- `updatedAt` (String / Date)
- `isDeleted` (Boolean)
- `deletedAt` (String / Date / null)
- `__v` (Number)

### 5. Collection `compare_histories`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `session_id` (String)
- `user_id` (Number / null)
- `guest_id` (String / null)
- `is_guest` (Boolean)
- `packages_compared` (Array of String)
- `final_packages` (Array of String)
- `selected_package` (String / null)
- `compare_count` (Number)
- `compare_duration` (Number)
- `completed` (Boolean)
- `cleared_by_user` (Boolean)
- `status` (String: `ACTIVE`, `COMPLETED`, `CLEARED`, `ABANDONED`)
- `cleared_at` (String / Date / null)
- `source` (String)
- `created_at` (String / Date)
- `updated_at` (String / Date)
- `__v` (Number)

### 6. Collection `contacts`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `contact_id` (String)
- `user_id` (Number / null)
- `full_name` (String)
- `phone` (String)
- `topic` (String)
- `message` (String)
- `status` (String: `NEW`, `DONE`)
- `source` (String: `guest`, `user`)
- `admin_note` (String)
- `handled_at` (String / Date / null)
- `handled_by` (Number / null)
- `is_deleted_by_user` (Boolean)
- `deleted_at_by_user` (String / Date / null)
- `created_at` (String / Date)
- `updated_at` (String / Date)
- `__v` (Number)

### 7. Collection `deposits`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `deposit_id` (Number)
- `user_id` (Number)
- `amountVND` (Number)
- `amountETH` (String)
- `exchangeRate` (Number)
- `txHash` (String)
- `network` (String)
- `status` (String: `success`, `pending`, `cancelled`, `failed`)
- `walletAddress` (String)
- `isDeleted` (Boolean)
- `deletedAt` (String / Date / null)
- `created_at` (String / Date)
- `__v` (Number)

### 8. Collection `notifications`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `userId` (Number)
- `title` (String)
- `content` (String)
- `type` (String: `TRANSACTION`, `SUBSCRIPTION`, `SYSTEM`, `SUPPORT`)
- `status` (String: `UNREAD`, `READ`)
- `link` (String)
- `subscriptionId` (ObjectId / null)
- `isDeleted` (Boolean)
- `createdAt` (String / Date)
- `__v` (Number)

### 9. Collection `chat_histories`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `userId` (ObjectId / String / null)
- `sender` (String: `user`, `bot`)
- `text` (String)
- `suggestedAction` (Mixed / null)
- `matchedPackages` (Array)
- `packages` (Array)
- `sessionId` (String / null)
- `guestInfo` (Object: `{ phone, fullName }`)
- `source` (String: `user`, `guest`)
- `isDeleted` (Boolean)
- `deletedAt` (String / Date / null)
- `createdAt` (String / Date)
- `updatedAt` (String / Date)
- `__v` (Number)

### 10. Collection `chatbot_configs`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `systemPrompt` (String)
- `trainingKeywords` (Array of Objects: `{ keyword, response, suggestedPackageId, _id }`)
- `learnedLessons` (Array of Objects: `{ lessonId, pattern, userIntent, correctionRule, sourceChatIds, status, isBlacklisted, createdAt }`)
- `createdAt` (String / Date)
- `updatedAt` (String / Date)
- `__v` (Number)

### 11. Collection `survey_configs`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `title` (String)
- `description` (String)
- `field` (String)
- `component` (String: `single-choice`, `multi-choice`)
- `order` (Number)
- `multiple` (Boolean)
- `options` (Array of Objects: `{ label, value, detail }`)
- `createdAt` (String / Date)
- `updatedAt` (String / Date)
- `__v` (Number)

### 12. Collection `survey_histories`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `userId` (Number / null)
- `answers` (Object)
- `filters` (Object: `{ isCompleted, remainingCount }`)
- `recommendedPackages` (Array of Package Objects)
- `deleted` (Boolean)
- `deletedAt` (String / Date / null)
- `isEarlyTerminated` (Boolean)
- `createdAt` (String / Date)
- `updatedAt` (String / Date)
- `__v` (Number)

### 13. Collection `package_features`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `package_id` (Number)
- `ma_goi` (String)
- `cycle_days` (Number)
- `price` (Number)
- `price_level` (String)
- `data_level` (String)
- `voice_level` (String)
- `sms_level` (String)
- `has_5g` (Boolean)
- `has_data` (Boolean)
- `has_facebook` (Boolean)
- `has_movie` (Boolean)
- `has_sms` (Boolean)
- `has_social` (Boolean)
- `has_tiktok` (Boolean)
- `has_tv360` (Boolean)
- `has_voice` (Boolean)
- `has_youtube` (Boolean)
- `is_addon` (Boolean)
- `is_combo` (Boolean)
- `is_data_only` (Boolean)
- `is_social` (Boolean)
- `searchable_tags` (Array of String)
- `createdAt` (String / Date)
- `updatedAt` (String / Date)
- `__v` (Number)

### 14. Collection `otp_codes`
Danh sách các field thực tế trong Document:
- `_id` (ObjectId)
- `phone_number` (String / null)
- `email` (String)
- `code` (String)
- `created_at` (Date / TTL Index tự xóa sau 300 giây)
