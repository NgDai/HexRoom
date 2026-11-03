# ☁️ HƯỚNG DẪN DEPLOY HEXROOM LÊN GOOGLE CLOUD PLATFORM (GCP)

Tài liệu này hướng dẫn chi tiết 2 phương án triển khai dự án HexRoom (Backend Spring Boot 3 + Java 21, Frontend React Vite, Database PostgreSQL) lên nền tảng Google Cloud.

---

## 🎯 Bảng so sánh 2 phương án

| Tiêu chí | Phương án 1: Google Compute Engine (VM) ⭐ **Khuyên Dùng** | Phương án 2: Google Cloud Run (Serverless) |
| :--- | :--- | :--- |
| **Đặc điểm** | Thuê 1 máy ảo Ubuntu, chạy trọn gói bằng `docker-compose.yml` có sẵn. | Triển khai từng container độc lập, tự động scale 0 - N instances. |
| **Độ phức tạp** | **Rất dễ**, thao tác quen thuộc như VPS / máy tính cá nhân. | Trung bình, cần quản lý URL độc lập, cấu hình CORS và Cloud SQL / Supabase. |
| **Tận dụng Docker** | Tận dụng 100% file `docker-compose.yml` vừa tạo. | Sử dụng từng `Dockerfile` của Backend & Frontend riêng biệt. |
| **Chi phí** | Cố định (~$10 - $25/tháng cho `e2-small` hoặc `e2-medium`). Miễn phí trong gói $300 Credit dùng thử của GCP. | Tính theo lượt truy cập thực tế (Free Tier 2 triệu lượt gọi/tháng). Database cần Cloud SQL hoặc Supabase ngoài. |
| **Phù hợp với** | Đồ án tốt nghiệp, demo, startup giai đoạn đầu cần setup nhanh chóng, ổn định. | Ứng dụng chịu tải lớn, biến động lượng truy cập cao. |

---

## 🚀 PHƯƠNG ÁN 1: GOOGLE COMPUTE ENGINE (VM VỚI DOCKER COMPOSE)

Phương án này nhanh nhất: bạn chỉ cần tạo 1 máy ảo Ubuntu, cài Docker và gõ lệnh chạy `docker compose` như trên máy local.

### Bước 1: Tạo máy ảo (VM Instance) trên Google Cloud Console

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Chọn menu **Navigation menu (☰)** > **Compute Engine** > **VM instances**.
3. Bấm nút **Create Instance** và cấu hình như sau:
   - **Name:** `hexroom-server`
   - **Region:** `asia-southeast1` (Singapore - độ trễ về Việt Nam thấp nhất: ~30-40ms).
   - **Zone:** `asia-southeast1-a` (hoặc b, c tùy ý).
   - **Machine configuration:**
     - Series: `E2`
     - Machine type: `e2-small` (2 vCPU, 2 GB RAM - tiết kiệm) hoặc `e2-medium` (2 vCPU, 4 GB RAM - khuyến nghị để build Maven mượt mà).
   - **Boot disk:**
     - Bấm **Change**, chọn Operating system: `Ubuntu`.
     - Version: `Ubuntu 22.04 LTS` hoặc `Ubuntu 24.04 LTS`.
     - Size: `30 GB` (Standard persistent disk).
   - **Firewall:**
     - ✅ Tích chọn **Allow HTTP traffic**
     - ✅ Tích chọn **Allow HTTPS traffic**
4. Bấm **Create** và chờ 1-2 phút để máy ảo khởi động.

---

### Bước 2: Cố định địa chỉ IP máy ảo (Static External IP)

Mặc định IP public của VM sẽ thay đổi khi khởi động lại. Cố định IP giúp việc truy cập và trỏ tên miền không bị lỗi:

1. Vào menu **VPC network** > **IP addresses**.
2. Tìm dòng IP tương ứng với máy ảo `hexroom-server`.
3. Tại cột **Type**, chuyển từ `Ephemeral` sang `Static`, đặt tên `hexroom-ip` rồi bấm **Reserve**.

---

### Bước 3: Mở cổng tường lửa (Firewall)

Để kiểm tra API Swagger và Backend nếu cần truy cập trực tiếp qua cổng `8080`:

1. Vào **VPC network** > **Firewall**.
2. Bấm **Create Firewall Rule**:
   - **Name:** `allow-hexroom-ports`
   - **Targets:** `All instances in the network`
   - **Source IPv4 ranges:** `0.0.0.0/0`
   - **Protocols and ports:** Tích chọn `TCP`, điền: `80, 443, 8080`.
3. Bấm **Create**.

---

### Bước 4: Đăng nhập vào máy ảo và cài đặt Docker

1. Quay lại trang **Compute Engine** > **VM instances**.
2. Tại dòng máy ảo `hexroom-server`, bấm vào nút **SSH** ở cột Connect. Một cửa sổ terminal web sẽ mở ra.
3. Chạy lệnh cập nhật hệ thống và cài đặt Docker + Docker Compose tự động:

```bash
# 1. Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Docker bằng script chính thức
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Cho phép user hiện tại chạy docker không cần sudo
sudo usermod -aG docker $USER
newgrp docker

# 4. Cài đặt Git
sudo apt install -y git

# 5. Kiểm tra phiên bản
docker --version
docker compose version
```

---

### Bước 5: Đưa mã nguồn lên máy ảo và khởi chạy

1. Clone repository mã nguồn của bạn về VM:
```bash
git clone https://github.com/<tai-khoan>/<ten-repo>.git hexroom
cd hexroom
```
*(Hoặc dùng tính năng Upload file của cửa sổ SSH trên GCP Console để tải code lên).*

2. Tạo và cấu hình file `.env`:
```bash
cp .env.example .env
nano .env
```
> [!NOTE]
> - Nếu dùng PostgreSQL local trên Docker, giữ nguyên `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/hexroom`.
> - Nếu dùng Supabase hoặc Cloud Database bên ngoài, thay URL kết nối tương ứng và có thể chạy mà không cần bật service `postgres`.

3. Khởi động toàn bộ dịch vụ:
```bash
# Build và chạy ngầm
docker compose up -d --build
```

4. Kiểm tra trạng thái các container:
```bash
docker compose ps
```

---

### Bước 6: Kiểm tra thành quả

- **Giao diện người dùng:** `http://<IP-CỦA-VM>`
- **API Swagger / Docs:** `http://<IP-CỦA-VM>:8080/swagger-ui/index.html`

---

### Bước 7 (Khuyến nghị): Cài chứng chỉ SSL HTTPS miễn phí với Certbot

Nếu bạn có tên miền riêng (ví dụ `hexroom.vn`), trỏ bản ghi `A` về IP máy ảo và chạy:

```bash
sudo apt install -y certbot python3-certbot-nginx
```
Hoặc dùng Let's Encrypt qua container Nginx để bật HTTPS tự động.

---

## ⚡ PHƯƠNG ÁN 2: GOOGLE CLOUD RUN (SERVERLESS CONTAINER)

Cloud Run cho phép chạy container mà không cần quản trị máy ảo. Miễn phí 2 triệu requests đầu mỗi tháng, có sẵn chứng chỉ HTTPS `*.a.run.app`.

### Chuẩn bị trước khi deploy Cloud Run:
- Cơ sở dữ liệu: Dùng **Supabase PostgreSQL** (miễn phí) hoặc **Google Cloud SQL for PostgreSQL**.

### Bước 1: Mở Google Cloud Shell
Bấm vào biểu tượng **Cloud Shell (>_)** ở góc trên cùng bên phải giao diện Google Cloud Console.

### Bước 2: Kích hoạt các dịch vụ GCP cần thiết
```bash
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### Bước 3: Deploy Backend lên Cloud Run

1. Di chuyển vào thư mục code backend:
```bash
cd hexroom/HexRoom-backend
```

2. Deploy trực tiếp từ mã nguồn (Cloud Run sẽ tự build image theo `Dockerfile`):
```bash
gcloud run deploy hexroom-backend \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars "SPRING_DATASOURCE_URL=jdbc:postgresql://<SUPABASE_HOST>:5432/postgres?sslmode=require" \
  --set-env-vars "SPRING_DATASOURCE_USERNAME=<USER>" \
  --set-env-vars "SPRING_DATASOURCE_PASSWORD=<PASSWORD>" \
  --set-env-vars "JWT_SECRET=hexroom_very_secret_jwt_key_that_is_at_least_32_characters_long_1234567890" \
  --set-env-vars "CORS_ORIGIN=*"
```

3. Sau khi lệnh hoàn tất, GCP sẽ in ra URL của backend, ví dụ:
   `https://hexroom-backend-xxxxxx-as.a.run.app`

---

### Bước 4: Deploy Frontend lên Cloud Run

1. Di chuyển sang thư mục frontend:
```bash
cd ../HexRoom-frontend
```

2. Deploy Frontend và truyền URL của backend vào tham số build:
```bash
gcloud run deploy hexroom-frontend \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 80 \
  --memory 512Mi \
  --cpu 1 \
  --set-build-env-vars "VITE_API_URL=https://hexroom-backend-xxxxxx-as.a.run.app"
```

3. Cloud Run sẽ trả về URL của Frontend, ví dụ:
   `https://hexroom-frontend-xxxxxx-as.a.run.app`

4. Cập nhật lại `CORS_ORIGIN` ở backend để bảo mật:
```bash
gcloud run services update hexroom-backend \
  --region asia-southeast1 \
  --update-env-vars "CORS_ORIGIN=https://hexroom-frontend-xxxxxx-as.a.run.app"
```

---

## 💡 MẸO QUẢN LÝ VÀ TIẾT KIỆM CHI PHÍ TRÊN GOOGLE CLOUD

1. **Thiết lập Budget Alert:**
   - Vào **Billing** > **Budgets & alerts** > Tạo ngân sách (ví dụ $10 hoặc $50) và đặt cảnh báo khi đạt 50%, 90%, 100% để tránh bị tính tiền ngoài dự kiến.
2. **Xem Logs lỗi thời gian thực:**
   - Trên GCE: `docker compose logs -f backend`
   - Trên Cloud Run: Vào **Cloud Run** > chọn service > bấm tab **Logs** hoặc gõ `gcloud logging read "resource.type=cloud_run_revision" --limit 50`.
3. **Tắt VM khi không sử dụng (Nếu dùng GCE test):**
   - Bấm **Stop** máy ảo trên GCP Console khi không cần chạy để tiết kiệm chi phí CPU/RAM (chỉ mất chi phí lưu trữ đĩa ổ cứng ~$1-$2/tháng).
