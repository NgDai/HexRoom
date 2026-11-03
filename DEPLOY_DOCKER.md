# 🐳 Hướng dẫn Triển khai HexRoom với Docker & Docker Compose

Tài liệu này hướng dẫn cách build và chạy toàn bộ hệ thống **HexRoom** (Frontend + Backend + Database PostgreSQL) bằng Docker và Docker Compose.

---

## 📁 Cấu trúc các file Docker đã tạo

```text
hexroom/
├── docker-compose.yml              # Quản lý 3 dịch vụ: frontend, backend, postgres
├── .env.example                    # Mẫu biến môi trường cho Docker Compose
├── .dockerignore                   # Loại trừ file rác khi build ở root
├── DEPLOY_DOCKER.md                # Tài liệu hướng dẫn này
│
├── HexRoom-backend/
│   ├── Dockerfile                  # Multi-stage build (Maven 3.9 + Java 21 JRE Alpine)
│   └── .dockerignore               # Loại trừ target/, .git/, .idea/
│
└── HexRoom-frontend/
    ├── Dockerfile                  # Multi-stage build (Node 22 + Nginx 1.27 Alpine)
    ├── nginx.conf                  # Nginx proxy (SPA routing, /api, /socket.io, cache)
    └── .dockerignore               # Loại trừ node_modules/, dist/
```

---

## 🚀 1. Khởi chạy nhanh (Quick Start)

### Bước 1: Sao chép file cấu hình môi trường
Tại thư mục gốc dự án (`hexroom/`), chạy lệnh:

```bash
# Trên Linux / macOS / Git Bash:
cp .env.example .env

# Trên Windows PowerShell:
Copy-Item .env.example .env
```

### Bước 2: Build và khởi động các container

```bash
docker compose up -d --build
```

Lệnh này sẽ tự động:
1. Kéo image `postgres:16-alpine` và khởi tạo database.
2. Build `HexRoom-backend` thành file JAR bằng Java 21 và chạy trên JRE Alpine siêu nhẹ.
3. Build `HexRoom-frontend` thành static assets và cấu hình Nginx để phục vụ giao diện & reverse proxy.

### Bước 3: Truy cập ứng dụng
- **Giao diện người dùng (Frontend):** [http://localhost](http://localhost) (cổng 80)
- **Tài liệu API (Swagger UI):** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) hoặc [http://localhost/swagger-ui.html](http://localhost/swagger-ui.html)
- **OpenAPI Schema:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## ⚙️ 2. Tùy chọn cấu hình Database

### Lựa chọn A: Dùng PostgreSQL nội bộ trong Docker (Mặc định)
Không cần cài đặt thêm gì, Docker Compose sẽ tự tạo container `hexroom-postgres` và lưu dữ liệu an toàn vào Docker Volume `postgres_data`.

### Lựa chọn B: Dùng Database trên Cloud (Supabase, Neon, AWS RDS...)
Nếu bạn đã có database sẵn trên Supabase hoặc Cloud, mở file `.env` ở thư mục gốc và cấu hình:

```env
# Điền URL kết nối và thông tin cloud database của bạn:
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require
POSTGRES_USER=postgres.your_project_id
POSTGRES_PASSWORD=your_secure_password
```

Sau đó trong `docker-compose.yml`, bạn có thể bỏ service `postgres` hoặc giữ nguyên mà không bị xung đột.

---

## 🛠️ 3. Các lệnh quản lý Docker thường dùng

| Thao tác | Câu lệnh |
| :--- | :--- |
| **Xem trạng thái các container** | `docker compose ps` |
| **Xem log trực tiếp toàn hệ thống** | `docker compose logs -f` |
| **Xem log riêng của Backend** | `docker compose logs -f backend` |
| **Xem log riêng của Frontend** | `docker compose logs -f frontend` |
| **Khởi động lại một dịch vụ** | `docker compose restart backend` |
| **Dừng hệ thống** | `docker compose stop` |
| **Dừng và xóa containers, networks** | `docker compose down` |
| **Dừng và xóa sạch cả dữ liệu database** | `docker compose down -v` |
| **Rebuild lại toàn bộ khi có thay đổi code** | `docker compose up -d --build` |

---

## 🏗️ 4. Build và Chạy Độc lập từng Container

Nếu bạn muốn build hoặc đẩy (push) từng image lên Docker Hub / GitHub Container Registry (GHCR):

### Build & Chạy Backend riêng lẻ:
```bash
cd HexRoom-backend
docker build -t hexroom-backend:latest .
docker run -d -p 8080:8080 --name hexroom-backend \
  -e SPRING_DATASOURCE_URL="jdbc:postgresql://host.docker.internal:5432/hexroom_db?sslmode=disable" \
  -e SPRING_DATASOURCE_USERNAME="postgres" \
  -e SPRING_DATASOURCE_PASSWORD="your_password" \
  hexroom-backend:latest
```

### Build & Chạy Frontend riêng lẻ:
```bash
cd HexRoom-frontend
docker build -t hexroom-frontend:latest .
docker run -d -p 80:80 --name hexroom-frontend hexroom-frontend:latest
```

---

## 🔒 5. Các điểm tối ưu đã được tích hợp

1. **Multi-stage Build:**
   - Backend chỉ giữ lại Java 21 JRE runtime (giảm dung lượng image từ ~800MB xuống còn ~150MB).
   - Frontend chỉ giữ lại Nginx Alpine và thư mục `dist` tĩnh (dung lượng ~25MB).
2. **Bảo mật (Non-root User):**
   - Backend chạy dưới user `spring:spring`, tuân thủ chuẩn bảo mật container production.
3. **Nginx Reverse Proxy thông minh:**
   - Hỗ trợ SPA routing (`try_files $uri $uri/ /index.html;`) không bị lỗi 404 khi người dùng F5 tại các trang con (`/rooms`, `/roommate`, `/profile`...).
   - Tự động chuyển tiếp yêu cầu `/api/`, `/socket.io/` và `/.data/uploads/` sang Backend mà **không gặp lỗi CORS**.
   - Bật nén Gzip tối ưu tốc độ tải trang và áp dụng Cache 1 năm cho static assets.
4. **Healthcheck:**
   - Cả 3 container đều có cơ chế healthcheck tự động giám sát trạng thái dịch vụ.

---

## ☁️ 6. Triển khai lên Google Cloud (GCP)

Xem tài liệu chi tiết tại [DEPLOY_GCP.md](./DEPLOY_GCP.md) với hướng dẫn từng bước:
- **Phương án 1 (Khuyên dùng):** Chạy trọn gói qua Google Compute Engine (VM với Docker Compose).
- **Phương án 2:** Triển khai độc lập qua Google Cloud Run (Serverless Container).

---

## 🟧 7. Triển khai lên AWS EC2

Xem tài liệu chi tiết tại [DEPLOY_AWS_EC2.md](./DEPLOY_AWS_EC2.md) với hướng dẫn từng bước:
- Khởi tạo EC2 Ubuntu trên vùng Singapore (`ap-southeast-1`).
- Mẹo kích hoạt **Swap Memory** để chạy mượt mà ngay cả trên gói AWS Free Tier (1GB RAM).
- Cố định Elastic IP, mở cổng tường lửa Security Group và chạy Docker Compose.


