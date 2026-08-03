# Website Cung Cấp Gói Cước Di Động Viettel Tích Hợp Chatbot

## 1. Cấu Trúc Cây Thư Mục (Directory Tree)

```text
WebViettel/
├── client/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdvancedFilter.tsx
│   │   │   ├── Breadcrumb.tsx
│   │   │   ├── Chatbot.tsx
│   │   │   ├── CompareAI.tsx
│   │   │   ├── CompareDrawer.tsx
│   │   │   ├── ContactHistoryTab.tsx
│   │   │   ├── DevTimeWidget.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── LoadingSkeleton.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── PackageCard.tsx
│   │   │   ├── PackageGrid.tsx
│   │   │   ├── PackageSearch.tsx
│   │   │   ├── PackageToolbar.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── QuickFilter.tsx
│   │   │   ├── RegisterModal.tsx
│   │   │   ├── SEO.tsx
│   │   │   ├── ScrollToTop.tsx
│   │   │   └── Skeleton.tsx
│   │   ├── hooks/
│   │   │   └── useWeb3.ts
│   │   ├── image/
│   │   │   └── AI.png
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── ClientLayout.tsx
│   │   ├── pages/
│   │   │   ├── Admin/
│   │   │   │   ├── ChatHistory.tsx
│   │   │   │   ├── Contacts.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Deposits.tsx
│   │   │   │   ├── Packages.tsx
│   │   │   │   ├── Surveys.tsx
│   │   │   │   └── Users.tsx
│   │   │   ├── Auth/
│   │   │   │   ├── ForgotPassword.tsx
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── ChatbotPage.tsx
│   │   │   ├── Compare.tsx
│   │   │   ├── Contact.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── PackageDetail.tsx
│   │   │   ├── Packages.tsx
│   │   │   ├── Privacy.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Survey.tsx
│   │   │   └── Terms.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── axiosInstance.ts
│   │   │   └── web3Service.ts
│   │   ├── store/
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   └── web3.ts
│   │   ├── utils/
│   │   │   ├── filterHelper.ts
│   │   │   ├── guestContactTracker.ts
│   │   │   ├── permission.ts
│   │   │   └── similarity.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env
│   ├── .gitignore
│   ├── .oxlintrc.json
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── server/
│   ├── docs/
│   │   ├── chatbot-requirements.md
│   │   ├── package-schema.md
│   │   ├── project-context.md
│   │   ├── subscription-rules.md
│   │   └── subscription-schema.md
│   ├── scripts/
│   │   ├── migrate_benefit_group.js
│   │   └── seed_benefit_group.js
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── chatHistoryController.js
│   │   │   ├── chatbotController.js
│   │   │   ├── compareController.js
│   │   │   ├── contactController.js
│   │   │   ├── notificationController.js
│   │   │   ├── packageController.js
│   │   │   ├── subscriptionController.js
│   │   │   ├── surveyController.js
│   │   │   ├── transactionController.js
│   │   │   └── userController.js
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorMiddleware.js
│   │   ├── models/
│   │   │   ├── Account.js
│   │   │   ├── ChatHistory.js
│   │   │   ├── ChatbotConfig.js
│   │   │   ├── CompareHistory.js
│   │   │   ├── Contact.js
│   │   │   ├── Deposit.js
│   │   │   ├── Notification.js
│   │   │   ├── OtpCode.js
│   │   │   ├── Package.js
│   │   │   ├── PackageFeature.js
│   │   │   ├── SurveyConfig.js
│   │   │   ├── SurveyHistory.js
│   │   │   └── UserSubscription.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── chatbotRoutes.js
│   │   │   ├── compareRoutes.js
│   │   │   ├── contactRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   ├── packageRoutes.js
│   │   │   ├── subscriptionRoutes.js
│   │   │   ├── surveyRoutes.js
│   │   │   ├── transactionRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── ai.service.js
│   │   │   │   ├── gemini.provider.js
│   │   │   │   ├── groq.provider.js
│   │   │   │   └── ollama.provider.js
│   │   │   ├── chatbot/
│   │   │   │   ├── intentParser.js
│   │   │   │   ├── packageContext.js
│   │   │   │   ├── packageMatcher.js
│   │   │   │   ├── packageSanitizer.js
│   │   │   │   ├── promptBuilder.js
│   │   │   │   └── scoring_config.json
│   │   │   ├── authService.js
│   │   │   ├── chatbotService.js
│   │   │   ├── notificationService.js
│   │   │   ├── subscriptionService.js
│   │   │   ├── surveyService.js
│   │   │   ├── transactionService.js
│   │   │   └── userService.js
│   │   ├── utils/
│   │   │   ├── permission.js
│   │   │   └── virtualTime.js
│   │   ├── index.js
│   │   └── seed.js
│   ├── .env
│   └── package.json
├── .gitignore
├── package-lock.json
└── package.json
```

---

## 2. Cấu Hình Hệ Thống (Configurations)

Hệ thống sử dụng các file cấu hình và các biến môi trường sau đây:

### Danh sách các file cấu hình hiện có:

- **Thư mục gốc (Root)**:
  - `package.json` và `package-lock.json`: Định nghĩa và quản lý các package phụ thuộc của dự án.
  - `.gitignore`: Cấu hình các tệp tin và thư mục không được Git theo dõi.
- **Thư mục Frontend (`client/`)**:
  - `package.json`: Danh sách phụ thuộc và script chạy của frontend (React + Vite + Tailwind CSS).
  - `vite.config.ts`: Cấu hình công cụ build Vite.
  - `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: Cấu hình trình biên dịch TypeScript.
  - `.gitignore`: Cấu hình Git bỏ qua cho frontend.
  - `.env`: Chứa các biến môi trường cấu hình kết nối API và Blockchain của frontend.
  - `.oxlintrc.json`: Cấu hình linter Oxlint cho kiểm tra mã nguồn nhanh.
- **Thư mục Backend (`server/`)**:
  - `package.json`: Danh sách phụ thuộc và script khởi chạy server Node/Express. Gồm: `express`, `mongoose`, `bcryptjs`, `cors`, `dotenv`, `ethers`, `@google/generative-ai`, `csv-parser`, `nodemailer`.
  - `.env`: Chứa cấu hình cổng chạy, DB MongoDB, xác thực JWT, địa chỉ ví nhận, tỷ giá quy đổi ETH/VND, RPC URL, API key của AI chatbot và cấu hình Mailtrap SMTP gửi email OTP.
  - `src/services/chatbot/scoring_config.json`: Cấu hình hệ số điểm khớp gói cước của chatbot.

### Chi tiết cấu hình biến môi trường (`.env`):

- **Cấu hình Backend (`server/.env`)**:
  - `MONGODB_URI`: Địa chỉ kết nối đến cơ sở dữ liệu MongoDB.
  - `PORT`: Cổng khởi chạy dịch vụ backend (mặc định `5000`).
  - `JWT_SECRET`: Chuỗi khóa bảo mật dùng để ký và xác thực JSON Web Token (JWT).
  - `RECEIVER_WALLET`: Địa chỉ ví MetaMask nhận ETH Sepolia cho giao dịch nạp tiền.
  - `ETH_EXCHANGE_RATE`: Tỷ giá quy đổi giả lập giữa tiền VND và ETH Sepolia (mặc định `75000000` VND/ETH).
  - `RPC_URL`: RPC URL kết nối mạng blockchain thử nghiệm Sepolia.
  - `AI_PROVIDER`: Nhà cung cấp dịch vụ AI (VD: `groq`). Nếu không đặt, mặc định là `groq`.
  - `GROQ_API_KEY`: API Key đăng ký của dịch vụ Groq Cloud.
  - `GROQ_MODEL`: Mô hình ngôn ngữ lớn Groq sử dụng (mặc định `llama-3.1-8b-instant`).
  - `GEMINI_API_KEY`: API Key đăng ký của dịch vụ Google Gemini (dùng cho failover sang Gemini `gemini-1.5-flash`).
  - `OLLAMA_MODEL`: Mô hình ngôn ngữ lớn Ollama dùng khi fallback (mặc định `qwen2.5:3b`).
  - `OLLAMA_HOST`: URL host của dịch vụ Ollama (mặc định `http://127.0.0.1:11434`).
  - `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`: Cấu hình dịch vụ gửi email SMTP (Mailtrap Sandbox) phục vụ gửi mã OTP khôi phục mật khẩu.
- **Cấu hình Frontend (`client/.env`)**:
  - `VITE_API_URL`: URL API Backend (mặc định `http://localhost:5000`).
  - `VITE_NETWORK_NAME`: Tên mạng blockchain thử nghiệm (mặc định `Sepolia`).
  - `VITE_CHAIN_ID`: ID mạng blockchain Sepolia dạng thập phân (mặc định `11155111`).
  - `VITE_RPC_URL`: RPC URL kết nối mạng Sepolia tương ứng với backend.
  - `VITE_BLOCK_EXPLORER`: URL trang tra cứu blockchain Explorer Sepolia (mặc định `https://sepolia.etherscan.io`).
  - `VITE_RECEIVER_WALLET`: Địa chỉ ví nhận ETH quy đổi nạp tiền tương ứng với backend.
  - `VITE_ETH_EXCHANGE_RATE`: Tỷ giá quy đổi VND/ETH tương ứng với backend.

---

## 3. Giao Diện & Thành Phần UI (Frontend & Components)

### Danh sách các trang (Pages/Screens) đã dựng:

- **Trang chủ (Home.tsx)**: Hiển thị banner lớn giới thiệu, danh sách phân loại nhu cầu sử dụng, danh sách thẻ các gói cước nổi bật (hot), và các CTA điều hướng đến Chatbot và Khảo sát.
- **Trang Danh mục gói cước (Packages.tsx)**: Nơi hiển thị tất cả các gói cước với bộ lọc tìm kiếm nâng cao ở phần đầu trang.
- **Trang Chi tiết gói cước (PackageDetail.tsx)**: Hiển thị đầy đủ thông số ưu đãi của gói cước, điều kiện đăng ký, cú pháp soạn tin nhắn SMS, các gói cước tương tự và nút Đăng ký gói cước trực tiếp.
- **Trang So sánh gói cước (Compare.tsx)**: Giao diện so sánh trực quan dưới dạng bảng cho các gói cước di động chọn so sánh. Hiển thị các thông số data (gồm `data_theo_ngay` hoặc `data_meta`), giá cước, chu kỳ và ưu đãi tiện ích đi kèm. Bảng được giữ phẳng, loại bỏ nhãn "TỐT NHẤT" và dòng "Đối tượng áp dụng" để thông tin minh bạch, trung lập. Tự động ghi nhận phiên so sánh (`CompareHistory`) và gửi lên backend API.
- **Trang Khảo sát chọn gói (Survey.tsx)**: Giao diện khảo sát wizard giúp thu thập thông tin thói quen tiêu dùng và đề xuất gói cước phù hợp nhất. Câu hỏi hiển thị động theo thuật toán Decision Tree từ backend.
- **Hồ sơ cá nhân & Quản lý giao dịch (Profile.tsx)**: Khu vực quản lý tài khoản của người dùng, được tổ chức thành các tab sidebar:
  - **Hồ sơ cá nhân**: Chỉnh sửa thông tin tài khoản di động.
  - **Nạp tiền tài khoản**: Cổng kết nối MetaMask, nạp số dư ví ảo và quản lý ô nhập số tiền phân cách hàng nghìn chuẩn.
  - **Lịch sử đăng ký gói cước**: Quản lý gói cước đang sử dụng (bật/tắt tự động gia hạn, hủy gói cước, công cụ Dev Test tua mốc hết hạn) và bảng lịch sử giao dịch gói cước kèm nút xóa mềm lịch sử.
  - **Lịch sử giao dịch**: Bảng tổng hợp các giao dịch nạp/trừ tiền, hỗ trợ bộ lọc chip, xem chi tiết và hủy lệnh nạp PENDING.
  - **Đổi mật khẩu**: Thay đổi mật khẩu tài khoản trực tiếp.
- **Trang Liên hệ hỗ trợ (Contact.tsx)**: Giao diện 2 tab ("Yêu cầu mới" và "Lịch sử phản hồi") gửi thông tin hỗ trợ đến CSKH Viettel và tra cứu kết quả xử lý.
- **Hệ thống xác thực tài khoản (Auth)**:
  - Đăng nhập (Login.tsx)
  - Đăng ký tài khoản (Register.tsx)
  - Quên mật khẩu (ForgotPassword.tsx): Quy trình 3 bước khôi phục mật khẩu bằng OTP email.
- **Điều khoản Dịch vụ (Terms.tsx) & Chính sách Bảo mật (Privacy.tsx)**: Các trang điều khoản và chính sách bảo mật chi tiết của hệ thống ViettelAI.
- **Trang Quản trị (Admin Pages)**:
  - Báo cáo thống kê (Dashboard.tsx): Biểu thị số liệu tổng quan hệ thống, doanh thu thực tế và biểu đồ xu hướng.
  - Quản lý gói cước (Packages.tsx): Giao diện CRUD gói cước di động.
  - Quản lý người dùng di động (Users.tsx): Xem danh sách, cập nhật số dư qua modal nạp tiền an toàn, phân loại thuê bao và khóa/mở khóa tài khoản.
  - Quản lý Lịch sử Chatbot AI (ChatHistory.tsx): Theo dõi danh sách lịch sử trò chuyện của người dùng/khách vãng lai với chatbot AI.
  - Yêu cầu Liên hệ & Hỗ trợ (Contacts.tsx): Tiếp nhận và cập nhật phản hồi chính thức (`admin_note`) cho người dùng.
  - Lịch sử nạp tiền thuê bao (Deposits.tsx): Đối soát giao dịch nạp tiền ví di động qua MetaMask Blockchain Sepolia hoặc VietQR.
  - Lịch sử khảo sát người dùng (Surveys.tsx): Theo dõi các lượt thực hiện khảo sát chọn gói cước di động.

### Các thành phần giao diện chính (Components):

- `Navbar`: Thanh điều hướng đầu trang, hiển thị logo Viettel, các liên kết trang chính và Popover thông báo thời gian thực.
- `Footer`: Chứa các thông tin liên hệ, liên kết nhanh bản quyền dự án.
- `DevTimeWidget`: Widget nổi góc màn hình (Global Virtual Time Controller) tua thời gian hệ thống và thực hiện tiến trình gia hạn/nhắc nhở 2 giai đoạn.
- `PackageCard`: Thẻ hiển thị tóm tắt thông tin gói cước (tên, giá, dung lượng data tốc độ cao hoặc data Meta, cuộc gọi, nút đăng ký nhanh, nút so sánh).
- `AdvancedFilter`: Bộ lọc nâng cao trên trang duyệt gói cước (lọc theo từ khóa, loại gói cước, phân khúc giá, chu kỳ sử dụng và sắp xếp).
- `Chatbot`: Hộp thoại bong bóng chat nhỏ cố định góc màn hình phục vụ tư vấn nhanh với AI từ mọi trang.
- `CompareAI`: Panel gợi ý tư vấn ngắn gọn (2-4 câu văn tự nhiên) từ Trợ lý ViettelAI trên trang so sánh gói cước. Phân tích chi phí quy đổi theo tháng `(gia / chu_ky_ngay) * 30`, so sánh phạm vi sử dụng (Data đa dụng lướt mọi web/app vs Data chuyên ứng dụng Meta) và khuyến nghị theo nhu cầu mà không lặp lại tiêu đề hay khẳng định gói cước "tốt hơn tuyệt đối".
- `CompareDrawer`: Khay trượt danh sách gói cước chọn so sánh ở góc dưới màn hình. Tự động ẩn khi người dùng truy cập trực tiếp vào trang `/compare`.
- `RegisterModal`: Modal xác nhận đăng ký gói cước di động, hỗ trợ đóng băng trạng thái số dư (Freeze UI State) và hiển thị thông báo kết quả trực quan.
- `SEO`: Thành phần cấu hình thẻ tiêu đề, mô tả và cấu trúc Schema JSON-LD hỗ trợ chuẩn hóa SEO.
- `Breadcrumb`, `ScrollToTop`, `ContactHistoryTab`, `Skeleton`, `LoadingSkeleton`, `EmptyState`, `QuickFilter`, `PackageGrid`, `PackageSearch`, `PackageToolbar`, `Pagination`.

---

## 4. Chức Năng Hiện Có (Current Features & Functionalities)

### 🟢 Các chức năng đã hoạt động ổn định với Backend / Database thật:

1. **Duyệt và Lọc tìm kiếm gói cước di động**:
   - Hiển thị danh sách gói cước động tải trực tiếp từ MongoDB (`goi_cuoc`).
   - Lọc theo loại gói (`Data`, `Combo`, `Social`, `Thoại`), phân khúc giá, chu kỳ sử dụng và tìm kiếm từ khóa.
2. **Chi tiết gói cước & Đồng bộ dữ liệu Meta**:
   - Hiển thị đầy đủ thông số ưu đãi của gói cước di động bao gồm dung lượng Data tốc độ cao đa dụng (`data_theo_ngay`) và Data dành riêng ứng dụng Meta/Social (`data_meta`).
   - Sao chép nhanh cú pháp SMS (Đăng ký soạn 191, Hủy gia hạn, Hủy gói cước).
3. **Đăng nhập, Đăng ký & Xác thực JWT**:
   - Đăng ký tài khoản (nhập SĐT, email, họ tên, mật khẩu, loại thuê bao).
   - Đăng nhập bảo mật JWT, lưu token ở LocalStorage.
   - Thay đổi thông tin cá nhân và mật khẩu xác thực mật khẩu cũ.
4. **Nạp tiền ví ảo qua ví MetaMask (Web3 Blockchain Sepolia)**:
   - Tự động liên kết ví MetaMask vào tài khoản DB.
   - Kiểm tra mạng và chuyển đổi mạng Sepolia Testnet.
   - Nạp các mệnh giá quy đổi ra ETH Sepolia, tự động cập nhật số dư vào `Account.balance`.
   - Quản lý trạng thái giao dịch (`pending`, `success`, `cancelled`) trên duy nhất 1 bản ghi `Deposit`.
5. **Đăng ký và Hủy gói cước di động (Conflict Engine)**:
   - Đăng ký gói cước trực tiếp bằng số dư ví ảo.
   - Xử lý xung đột gói cước (Conflict Engine) backend qua 5 bước:
     1. *Chính gói cước*: Nếu trùng gói ngắn hạn thì gia hạn chu kỳ (`RENEW_SHORT`), trùng gói dài hạn đang chạy thì từ chối.
     2. *Gói nền bắt buộc*: Reject nếu gói yêu cầu nền (`requires_base_package=true`) nhưng thuê bao chưa có gói `DATA_BASE` hoặc `COMBO` hoạt động.
     3. *Gói Add-on*: Bỏ qua xung đột nếu `is_addon=true`.
     4. *Nhóm ưu đãi (`benefit_group`)*: Kiểm tra nếu cùng nhóm ưu đãi chính (như `APP_META`, `DATA_MAIN`) và cả hai đều dài hạn thì xử lý thay thế/từ chối.
     5. *Registration Policy*: Áp dụng chính sách `ALLOW` (chạy song song) hoặc `REPLACE` (thay thế).
6. **Hệ thống thông báo tự động (Notification System)**:
   - Nhắc nhở gia hạn trước 24h-48h (Bước 1): Cảnh báo đủ số dư hoặc số dư không đủ.
   - Trừ tiền và gia hạn tự động hoặc thông báo hết hạn tại thời điểm kết thúc chu kỳ (Bước 2).
   - Thông báo thao tác Bật/Tắt gia hạn tự động từ người dùng (Bước 3).
7. **Cơ chế Xóa Mềm (Soft Delete)**:
   - Áp dụng `isDeleted: true` và `deletedAt` cho các thao tác xóa lịch sử gói cước, giao dịch nạp tiền, thông báo và yêu cầu liên hệ.
8. **Trình Điều Khiển Thời Gian Hệ Thống Toàn Cục (Global Virtual Time Controller)**:
   - Điều khiển thời gian ảo toàn hệ thống qua `server/src/utils/virtualTime.js`.
   - Widget `DevTimeWidget` giúp tua thời gian và thực hiện tiến trình quét nhắc nhở/gia hạn 2 giai đoạn.
9. **AI Chatbot tư vấn gói cước di động**:
   - Tự động phản hồi thời gian thực qua API backend kết nối Groq (`llama-3.1-8b-instant`), Gemini (`gemini-1.5-flash`) và Ollama (`qwen2.5:3b`) với cơ chế failover 3 cấp.
   - Luồng RAG + NLP: Parse intent người dùng, lọc gói cước (Hard Filters + Scoring), biên dịch XML gói cước và gửi prompt cho AI sinh câu trả lời.
10. **Khảo sát chọn gói cước AI (Survey.tsx)**:
    - Thuật toán Decision Tree hiển thị câu hỏi khảo sát động và đề xuất gói cước tối ưu.
11. **Trang Liên hệ hỗ trợ & Tra cứu phản hồi CSKH (Contact.tsx & ContactHistoryTab.tsx)**:
    - Gửi yêu cầu hỗ trợ và tra cứu lịch sử phản hồi chính thức từ Admin CSKH.
12. **Trang Quản trị Admin Panel**:
    - Thống kê Dashboard, Quản lý Gói cước, Quản lý Người dùng, Lịch sử Chatbot, Tiếp nhận Liên hệ, Lịch sử Nạp tiền Deposits và Lịch sử Khảo sát.
13. **Tư vấn So sánh Gói cước AI (CompareAI)**:
    - Gợi ý nhận xét 2-4 câu tự nhiên từ AI trên trang so sánh gói cước. Phân tích chi phí quy đổi/tháng, đối chiếu gói Data đa dụng vs gói chuyên ứng dụng Meta và đưa ra tư vấn theo nhu cầu thực tế.
14. **Khôi phục mật khẩu bằng OTP Email (ForgotPassword.tsx)**:
    - Gửi mã OTP 6 chữ số qua SMTP Mailtrap đến email liên kết tài khoản, lưu trong collection `otp_codes` tự xóa sau 5 phút (TTL Index).

---

## 5. Cơ Sở Dữ Liệu Hiện Có (Database Schema & Collections)

Cơ sở dữ liệu thực tế trên MongoDB bao gồm 14 collection:

1. **`accounts` (Thông tin tài khoản)**:

   - `_id` (ObjectId): ID định danh MongoDB.
   - `user_id` (Number, required, unique index): ID định danh số thứ tự người dùng.
   - `fullname` (String, required): Họ và tên đầy đủ.
   - `phone_number` (String, required, unique index): Số điện thoại đăng nhập.
   - `email` (String, lowercase, trim): Email liên kết.
   - `password` (String, required): Mật khẩu đã mã hóa.
   - `balance` (Number, default: `0`): Số dư ví ảo VND.
   - `role` (String, enum: `['user', 'admin']`, default: `'user'`): Vai trò tài khoản.
   - `subscription_type` (String, enum: `['tra_truoc', 'tra_sau']`, default: `'tra_truoc'`): Loại hình thuê bao.
   - `is_loyal_customer` (Boolean, default: `false`): Khách hàng thân thiết.
   - `status` (String, enum: `['active', 'blocked', 'pending']`, default: `'active'`): Trạng thái hoạt động.
   - `wallet_address` (String, default: `null`): Địa chỉ ví MetaMask.
   - `created_at` (String, default: `ISO String`): Ngày tạo tài khoản.
2. **`goi_cuoc` (Danh mục gói cước)**:

   - `_id` (ObjectId): ID định danh MongoDB.
   - `package_id` (Number, required, unique index, alias: `'id'`): ID định danh số của gói cước.
   - `ma_goi` (String, required, index): Mã gói cước (VD: `SD135`, `FB50K`, `6FB30`).
   - `ten` (String, required, index): Tên hiển thị gói cước.
   - `dohot` (String, default: `'normal'`): Mức độ nổi bật (`'Hot'` hoặc `'normal'`).
   - `phan_loai_goi` (String, default: `'Data'`, index): Nhóm phân loại gói (`'Data'`, `'Combo'`, `'Social'`, `'Thoại'`).
   - `gia` (Number, required): Giá tiền đăng ký gói cước (VND).
   - `phan_khuc_gia` (String, default: `'Trung_binh'`): Phân khúc giá.
   - `data_theo_ngay` (String): Dung lượng data tốc độ cao đa dụng (VD: `'1.5GB/ngày'`, `'2GB/ngày'`).
   - `data_meta` (String, default: `null`): Dung lượng data dành riêng cho các ứng dụng Mạng xã hội / Meta (VD: `'50GB/30 ngày'`, `'150GB/180 ngày'`).
   - `free_ngoai_mang` (Number): Số phút gọi ngoại mạng miễn phí.
   - `free_noi_mang` (Number): Số phút gọi nội mạng miễn phí.
   - `sms` (Number): Số lượng tin nhắn SMS miễn phí.
   - `doi_tuong_ap_dung` (String): Đối tượng thuê bao áp dụng.
   - `noi_dung_ngoai` (String): Ưu đãi mở rộng khác.
   - `tien_ich_free` (String): Ứng dụng được miễn phí data (VD: `'TikTok'`, `'Facebook'`, `'YouTube'`, `'TV360'`).
   - `uudaitrong` (String): Chi tiết mô tả ưu đãi.
   - `chu_ky_ngay` (Number, default: `30`): Số ngày của chu kỳ gói cước (1, 3, 7, 15, 30, 90, 180, 360).
   - `dangky` (String): Cú pháp SMS đăng ký (gửi 191).
   - `huygiahan` (String): Cú pháp SMS hủy gia hạn (gửi 191).
   - `huygoicuoc` (String): Cú pháp SMS hủy gói cước (gửi 191).
   - `is_auto_renew` (Boolean, default: `true`): Cho phép tự động gia hạn.
   - `service_group` (String, default: `'daily_data'`): Nhóm dịch vụ (`'combo'`, `'app_data'`, `'daily_data'`, `'monthly_data'`).
   - `registration_policy` (String, default: `'ALLOW'`): Chính sách đăng ký song song (`'ALLOW'`, `'REPLACE'`).
   - `allow_parallel_with` (Array): Danh sách `system_type` được phép chạy song song.
   - `system_type` (String, default: `'DATA_BASE'`, index): Phân hệ gói cước (`DATA_BASE`, `COMBO`).
   - `is_addon` (Boolean, default: `false`): Đánh dấu gói cước bổ trợ add-on.
   - `requires_base_package` (Boolean, default: `false`): Đòi hỏi phải có gói data nền đang hoạt động.
   - `benefit_group` (String, default: `'DATA_MAIN'`): Nhóm ưu đãi chính (`'COMBO'`, `'APP_TV360'`, `'DATA_MAIN'`, `'APP_TIKTOK'`, `'APP_META'`, `'APP_YOUTUBE'`).
3. **`user_subscriptions` (Đăng ký gói cước người dùng)**:

   - `_id` (ObjectId): ID định danh MongoDB.
   - `userId` (Number, required, index): ID người dùng (kết nối `Account.user_id`).
   - `packageId` (Number, required, index): ID gói cước (kết nối `Package.package_id`).
   - `registeredAt`, `activatedAt`, `startedAt`, `expiresAt` (Date): Các mốc thời gian đăng ký, kích hoạt, bắt đầu và hết hạn gói.
   - `status` (String, enum: `['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'CANCELLED', 'REPLACED']`): Trạng thái gói.
   - `autoRenew` (Boolean): Trạng thái tự động gia hạn.
   - `cycle` (String, enum: `['DAY', 'MONTH', 'YEAR']`), `duration` (Number), `cycleType` (String): Chu kỳ sử dụng.
   - `cancelledAt` (Date), `cancelReason` (String), `replacedAt` (Date), `replacedBySubscriptionId` (ObjectId): Lịch sử hủy/thay thế.
   - `isDeleted` (Boolean, default: `false`), `deletedAt` (Date): Đánh dấu xóa mềm.
4. **`chat_histories` (Lịch sử hội thoại chatbot)**:

   - `_id` (ObjectId), `userId` (ObjectId, ref: `'Account'`), `sender` (`'user'`/`'bot'`), `text` (String), `suggestedAction` (Mixed), `matchedPackages` (Array), `packages` (Array), `isContextSwitch` (Boolean), `isSessionDead` (Boolean), `isDeleted` (Boolean), `sessionId` (String), `guestInfo` (Object), `source` (`'user'`/`'guest'`).
5. **`chatbot_configs` (Cấu hình chatbot AI)**:

   - `_id` (ObjectId), `systemPrompt` (String), `trainingKeywords` (Array), `learnedLessons` (Array).
6. **`deposits` (Lịch sử nạp tiền ví di động)**:

   - `_id` (ObjectId), `deposit_id` (Number, unique), `user_id` (Number), `amountVND` (Number), `amountETH` (String), `exchangeRate` (Number), `txHash` (String, unique), `network` (String), `status` (`'success'`, `'pending'`, `'cancelled'`, `'failed'`), `walletAddress` (String), `created_at` (String), `isDeleted` (Boolean), `deletedAt` (Date).
7. **`compare_histories` (Lịch sử phiên so sánh gói cước)**:

   - `_id` (ObjectId), `session_id` (String, unique), `user_id` (Number), `guest_id` (String), `is_guest` (Boolean), `packages_compared` (Array), `final_packages` (Array), `selected_package` (String), `compare_count` (Number), `compare_duration` (Number), `completed` (Boolean), `cleared_by_user` (Boolean), `status` (String), `cleared_at` (Date), `source` (String).
8. **`contacts` (Yêu cầu liên hệ & hỗ trợ CSKH)**:

   - `_id` (ObjectId), `contact_id` (String, unique), `user_id` (Number), `full_name` (String), `phone` (String), `topic` (String), `message` (String), `status` (`'NEW'`/`'DONE'`), `source` (`'guest'`/`'user'`), `admin_note` (String), `handled_at` (Date), `handled_by` (Number), `is_deleted_by_user` (Boolean), `deleted_at_by_user` (Date).
9. **`package_features` (Đặc trưng gói cước cho khảo sát AI)**:

   - `_id` (ObjectId), `package_id` (Number, unique), `ma_goi` (String), cờ boolean đặc trưng (`has_data`, `has_voice`, `is_combo`, `is_social`...), `cycle_days` (Number), `price` (Number), `price_level`, `data_level`, `voice_level`, `sms_level`, `searchable_tags` (Array).
10. **`survey_configs` (Cấu hình câu hỏi khảo sát Decision Tree)**:

    - `_id` (ObjectId), `title` (String), `description` (String), `field` (String, unique), `component` (`'single-choice'`/`'multi-choice'`), `order` (Number), `multiple` (Boolean), `options` (Array).
11. **`survey_histories` (Lịch sử khảo sát người dùng)**:

    - `_id` (ObjectId), `userId` (Number), `user_id` (Number), `phone` (String), `full_name` (String), `source` (`'user'`/`'guest'`), `answers` (Object), `filters` (Object), `recommendedPackages` (Array), `deleted` (Boolean), `deletedAt` (Date), `isEarlyTerminated` (Boolean).
12. **`notifications` (Thông báo người dùng)**:

    - `_id` (ObjectId), `userId` (Number), `title` (String), `content` (String), `type` (`'SUBSCRIPTION'`, `'TRANSACTION'`, `'SYSTEM'`, `'SUPPORT'`), `status` (`'UNREAD'`/`'READ'`), `link` (String), `subscriptionId` (ObjectId), `isDeleted` (Boolean), `createdAt` (Date).
13. **`otp_codes` (Mã OTP xác thực khôi phục mật khẩu)**:

    - `_id` (ObjectId), `phone_number` (String), `email` (String), `code` (String), `created_at` (Date, TTL index expireAfterSeconds: 300).
14. **`user_activities` (Nhật ký hoạt động người dùng)**:

    - `_id` (ObjectId), `activity_id` (Number), `user_id` (Number), `action_type` (`'view'`, `'compare'`, `'search'`), `search_keyword` (String), `package_id` (Number), `created_at` (Date).

---

## 6. Hướng Dẫn Cài Đặt & Khởi Chạy (Installation & Setup)

### 6.1 Yêu Cầu Tiền Trạm (Prerequisites)

- **Node.js**: Phiên bản 18.x trở lên.
- **npm** hoặc **yarn**: Trình quản lý gói phụ thuộc.
- **MongoDB**: Cơ sở dữ liệu MongoDB Local (port 27017) hoặc kết nối MongoDB Atlas Cloud.
- **Trình duyệt Web**: Chrome / Brave / Edge hỗ trợ tiện ích ví **MetaMask** (đối với trải nghiệm nạp tiền Web3 Sepolia Testnet).

---

### 6.2 Các Bước Cài Đặt

#### 1. Khởi tạo mã nguồn từ Repository

```bash
git clone <repository_url>
cd WebViettel
```

#### 2. Cài đặt các gói phụ thuộc Backend

```bash
cd server
npm install
```

#### 3. Cài đặt các gói phụ thuộc Frontend

```bash
cd ../client
npm install
```

---

### 6.3 Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục `server/` với nội dung mẫu sau:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/webviettel
PORT=5000
JWT_SECRET=viettel_secret_key_2026

# Cấu hình nạp tiền Web3 Sepolia
RECEIVER_WALLET=0xYourReceiverWalletAddressHere
ETH_EXCHANGE_RATE=75000000
RPC_URL=https://rpc.sepolia.org

# Cấu hình AI Provider (Groq / Gemini / Ollama)
AI_PROVIDER=groq
GROQ_API_KEY=gsk_YourGroqApiKeyHere
GROQ_MODEL=llama-3.1-8b-instant
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_HOST=http://127.0.0.1:11434

# Cấu hình Mailtrap SMTP gửi Email OTP
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=YourMailtrapUser
MAIL_PASS=YourMailtrapPass
MAIL_FROM="Viettel Telecommunications" <no-reply@viettel.com.vn>
```

Tạo file `.env` tại thư mục `client/` với nội dung mẫu sau:

```env
VITE_API_URL=http://localhost:5000
VITE_NETWORK_NAME=Sepolia
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://rpc.sepolia.org
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
VITE_RECEIVER_WALLET=0xYourReceiverWalletAddressHere
VITE_ETH_EXCHANGE_RATE=75000000
```

---

### 6.4 Khởi Tạo Dữ Liệu Mẫu (Database Seeding)

Khởi chạy script nạp dữ liệu gói cước và tài khoản quản trị ban đầu vào MongoDB:

```bash
cd server
node src/seed.js
```

---

### 6.5 Khởi Chạy Ứng Dụng Chế Độ Development

#### Khởi chạy Backend Server (Cổng 5000):

```bash
cd server
npm start
# Hoặc chạy nodemon tự động reload:
npm run dev
```

#### Khởi chạy Frontend Vite Client (Cổng 5173):

```bash
cd client
npm run dev
```

Sau khi chạy thành công:

- Truy cập Giao diện Web Client: `http://localhost:5173`
- API Backend Endpoint: `http://localhost:5000/api`
