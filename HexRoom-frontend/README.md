# HexRoom Frontend - Modern Emerald Green Design

Dự án Frontend cho nền tảng tìm phòng trọ và ghép bạn cùng phòng thông minh **HexRoom**, được chuyển đổi và nâng cấp thiết kế từ `ez-room-fe` với tone màu chủ đạo **Xanh Lá Emerald** hiện đại, sang trọng và chuẩn trải nghiệm người dùng (UX/UI).

---

## 1. Điểm nổi bật về thiết kế mới (Redesign & Green Theme)

- **Màu sắc chủ đạo (Primary Green):** Tone màu xanh lá ngọc lục bảo (**Emerald `#10B981`** và **Deep Emerald `#059669`**) kết hợp với nền sáng dịu mắt (`#F8FAF9`) và các điểm nhấn xanh lá nhạt (`#ECFDF5`).
- **Typography hiện đại:** Tích hợp bộ font chuẩn quốc tế **Plus Jakarta Sans** (cho tiêu đề mạnh mẽ, sắc nét) kết hợp với **Inter** (cho nội dung dễ đọc).
- **Hiệu ứng thị giác (Visual Polish):**
  - Hiệu ứng đổ bóng mềm mại có ánh xanh nhẹ (`hover-lift`, `card-hover-green`).
  - Lớp phủ mờ thủy tinh (**Glassmorphism**) trên Header và Thanh tìm kiếm.
  - Thẻ phòng (`RoomCard`, `ListingCard`, `SearchResultCard`) được bo tròn mềm mại (18px) với huy hiệu trạng thái xanh mát mắt.
- **Đồng bộ Ant Design 6:** Toàn bộ thành phần UI như Button, Input, Select, Drawer, Modal, Tabs, Tag... đều được tùy biến tự động theo bảng màu xanh lá trong `antd-theme.ts`.
- **Kết nối Backend:** Tự động kết nối tới Spring Boot Backend tại cổng `8080` (hoặc cấu hình qua biến môi trường `VITE_API_URL`).

---

## 2. Công nghệ sử dụng

- **React 19 + TypeScript 5.9**
- **Vite 7**
- **Tailwind CSS 4**
- **Ant Design 6**
- **Lucide React & Ant Design Icons**
- **React Router DOM 7**
- **i18next (Đa ngôn ngữ Tiếng Việt & English)**
- **Axios & Socket.io-client**

---

## 3. Cài đặt và Chạy thử

Mở terminal trong thư mục `c:\Users\PC\Documents\HexRoom\frontend`:

```powershell
# 1. Cài đặt thư viện (nếu chưa cài)
npm.cmd install

# 2. Khởi chạy server phát triển (Development)
npm.cmd run dev
```

Server sẽ khởi chạy tại: **`http://localhost:5173`**.

Để build đóng gói bản production:
```powershell
npm.cmd run build
```

---

## 4. Cấu trúc thư mục

```text
c:\Users\PC\Documents\HexRoom\frontend\
├── src/
│   ├── app/
│   │   ├── components/        # Các thành phần dùng chung (Header, Footer, FloatingChat, ImageUpload...)
│   │   ├── context/           # React Context (Auth, Language, Favorites, ChatBox...)
│   │   ├── features/          # Các trang chức năng (home, search, rooms, room-detail, rental-detail, profile, auth, moderator...)
│   │   └── layouts/           # Bố cục trang quản trị và người dùng
│   ├── lib/
│   │   ├── antd-theme.ts      # Bảng mã màu xanh lá cho Ant Design tokens
│   │   ├── api-config.ts      # Cấu hình URL kết nối Backend (mặc định http://localhost:8080)
│   │   └── api.ts             # Các hàm gọi API REST
│   ├── index.css              # Theme Tailwind CSS 4 & Utility Classes (Emerald Green)
│   └── main.tsx               # Entry point
├── index.html                 # Tệp HTML chính
└── vite.config.ts             # Cấu hình Vite
```