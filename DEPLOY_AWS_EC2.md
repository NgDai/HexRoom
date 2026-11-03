# 🟧 HƯỚNG DẪN DEPLOY HEXROOM LÊN AWS EC2

Tài liệu này hướng dẫn chi tiết từng bước triển khai hệ thống **HexRoom** (Frontend React Vite, Backend Spring Boot 3 + Java 21, Database PostgreSQL) lên máy ảo **Amazon Web Services (AWS) EC2** bằng Docker Compose.

---

## 📋 Mục lục
1. [Khuyến nghị cấu hình & Chuẩn bị](#1-khuyến-nghị-cấu-hình--chuẩn-bị)
2. [Bước 1: Khởi tạo EC2 Instance trên AWS Console](#bước-1-khởi-tạo-ec2-instance-trên-aws-console)
3. [Bước 2: Cấu hình Tường lửa (Security Group)](#bước-2-cấu-hình-tường-lửa-security-group)
4. [Bước 3: Gán Elastic IP (Cố định địa chỉ IP công khai)](#bước-3-gán-elastic-ip-cố-định-địa-chỉ-ip-công-khai)
5. [Bước 4: Đăng nhập SSH vào máy ảo EC2](#bước-4-đăng-nhập-ssh-vào-máy-ảo-ec2)
6. [Bước 5: Tạo Swap Memory (Bắt buộc nếu dùng gói Free Tier 1GB RAM)](#bước-5-tạo-swap-memory-bắt-buộc-nếu-dùng-gói-free-tier-1gb-ram)
7. [Bước 6: Cài đặt Docker & Docker Compose](#bước-6-cài-đặt-docker--docker-compose)
8. [Bước 7: Kéo mã nguồn và cấu hình biến môi trường](#bước-7-kéo-mã-nguồn-và-cấu-hình-biến-môi-trường)
9. [Bước 8: Khởi chạy toàn bộ hệ thống](#bước-8-khởi-chạy-toàn-bộ-hệ-thống)
10. [Bước 9: Gắn tên miền và cài chứng chỉ SSL HTTPS miễn phí](#bước-9-gắn-tên-miền-và-cài-chứng-chỉ-ssl-https-miễn-phí)
11. [Lệnh quản lý, xem log và cập nhật code](#11-lệnh-quản-lý-xem-log-và-cập-nhật-code)

---

## 1. Khuyến nghị cấu hình & Chuẩn bị

| Thông số | Gói Khuyến nghị (Production / Demo mượt) | Gói Miễn phí (AWS Free Tier) |
| :--- | :--- | :--- |
| **Instance Type** | `t3.medium` (2 vCPU, 4 GiB RAM) hoặc `t3.small` (2 vCPU, 2 GiB RAM) | `t2.micro` hoặc `t3.micro` (1 vCPU, 1 GiB RAM) |
| **Hệ điều hành** | Ubuntu Server 22.04 LTS hoặc 24.04 LTS (64-bit x86) | Ubuntu Server 22.04 LTS (64-bit x86) |
| **Ổ cứng (EBS)** | 30 GB gp3 | 30 GB gp3 (Miễn phí tối đa 30GB trong Free Tier) |
| **Region** | `ap-southeast-1` (Singapore) - Gần Việt Nam nhất (~30-40ms) | `ap-southeast-1` (Singapore) |

> [!WARNING]
> **Lưu ý quan trọng khi dùng gói Free Tier (1GB RAM):**
> Spring Boot 3 và tiến trình build Maven / Node.js có thể làm cạn 1GB RAM và gây treo máy (Out-Of-Memory Killer). Bạn **bắt buộc phải bật Swap Memory (tối thiểu 3GB - 4GB)** theo [Bước 5](#bước-5-tạo-swap-memory-bắt-buộc-nếu-dùng-gói-free-tier-1gb-ram) trước khi chạy Docker!

---

## Bước 1: Khởi tạo EC2 Instance trên AWS Console

1. Đăng nhập vào [AWS Management Console](https://console.aws.amazon.com/).
2. Chọn Region ở góc trên cùng bên phải: **Singapore (`ap-southeast-1`)**.
3. Vào dịch vụ **EC2** > Bấm **Launch Instance**:
   - **Name:** `hexroom-server`
   - **Application and OS Images (Amazon Machine Image):**
     - Chọn tab **Ubuntu**
     - AMI: `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type`
     - Architecture: `64-bit (x86)`
   - **Instance type:**
     - Chọn `t3.small` (khuyến nghị) hoặc `t2.micro` / `t3.micro` (Free Tier eligible).
   - **Key pair (login):**
     - Bấm **Create new key pair**.
     - Tên key: `hexroom-key`.
     - Key pair type: `RSA`.
     - Private key file format:
       - `.pem` (dùng cho OpenSSH, Windows PowerShell, Terminal macOS/Linux).
       - `.ppk` (nếu bạn quen dùng PuTTY).
     - Bấm **Create key pair** -> Trình duyệt sẽ tải về file `hexroom-key.pem`. Hãy lưu kỹ file này vào thư mục an toàn!
   - **Configure storage:**
     - Đổi kích thước từ 8 GiB thành `30` GiB (loại `gp3`).

---

## Bước 2: Cấu hình Tường lửa (Security Group)

Trong phần **Network settings** khi Launch Instance (hoặc vào menu **Security Groups**):
Tạo mới Security Group tên `hexroom-sg` với các **Inbound Security Group Rules**:

| Type | Protocol | Port Range | Source | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `My IP` hoặc `0.0.0.0/0` | Đăng nhập SSH vào server |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Truy cập website giao diện người dùng |
| **HTTPS** | TCP | `443` | `0.0.0.0/0` | Bảo mật SSL/HTTPS |
| **Custom TCP** | TCP | `8080` | `0.0.0.0/0` | Backend API / Swagger Docs trực tiếp |

Bấm **Launch instance** và chờ 1-2 phút cho instance chuyển sang trạng thái `Running`.

---

## Bước 3: Gán Elastic IP (Cố định địa chỉ IP công khai)

Mặc định khi bạn Stop/Start EC2, địa chỉ Public IPv4 sẽ bị thay đổi. Cố định IP giúp việc cấu hình và trỏ tên miền ổn định:

1. Tại menu bên trái EC2, vào mục **Network & Security** > **Elastic IPs**.
2. Bấm **Allocate Elastic IP address** > bấm tiếp **Allocate**.
3. Chọn Elastic IP vừa tạo > Bấm **Actions** > **Associate Elastic IP address**:
   - **Instance:** Chọn máy ảo `hexroom-server` của bạn.
   - Bấm **Associate**.
4. Lúc này máy ảo của bạn đã có một địa chỉ IP cố định mãi mãi (ví dụ `13.250.xxx.xxx`).

---

## Bước 4: Đăng nhập SSH vào máy ảo EC2

Mở terminal (PowerShell trên Windows, hoặc Terminal trên macOS/Linux):

1. Di chuyển vào thư mục chứa file `hexroom-key.pem`:
   ```bash
   cd C:\duong-dan-toi-thu-muc-chua-key
   ```

2. *(Dành riêng cho Linux / macOS)* Phân quyền bảo mật cho file key:
   ```bash
   chmod 400 hexroom-key.pem
   ```

3. Đăng nhập SSH vào EC2:
   ```bash
   ssh -i hexroom-key.pem ubuntu@<ELASTIC_IP_CUA_BAN>
   ```
   *(Nhập `yes` nếu terminal hỏi xác nhận fingerprint).*

---

## Bước 5: Tạo Swap Memory (Bắt buộc nếu dùng gói Free Tier 1GB RAM)

Chạy các lệnh sau để tạo 4GB RAM ảo từ ổ cứng (ngăn chặn hoàn toàn lỗi treo/đơ máy khi build):

```bash
# 1. Tạo file swap 4GB
sudo fallocate -l 4G /swapfile

# 2. Phân quyền an toàn
sudo chmod 600 /swapfile

# 3. Kích hoạt swap
sudo mkswap /swapfile
sudo swapon /swapfile

# 4. Giữ swap tồn tại sau mỗi lần reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Kiểm tra kết quả
free -h
```
*Bạn sẽ thấy dòng `Swap: 4.0Gi` xuất hiện.*

---

## Bước 6: Cài đặt Docker & Docker Compose

Chạy script cài đặt Docker chính thức từ Docker Hub:

```bash
# 1. Cập nhật hệ điều hành
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Cấp quyền chạy Docker không cần sudo
sudo usermod -aG docker $USER
newgrp docker

# 4. Cài đặt Git
sudo apt install -y git

# 5. Kiểm tra phiên bản
docker --version
docker compose version
```

---

## Bước 7: Kéo mã nguồn và cấu hình biến môi trường

1. Clone mã nguồn dự án từ GitHub:
   ```bash
   git clone https://github.com/NgDai/HexRoom.git hexroom
   cd hexroom
   ```

2. Tạo file biến môi trường từ template `.env.example`:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. **Cấu hình trong file `.env`:**
   - **Trường hợp A: Dùng Database PostgreSQL trên Docker (Mặc định)**
     - Giữ nguyên `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/hexroom`.
     - Đặt mật khẩu an toàn cho `POSTGRES_PASSWORD` và `SPRING_DATASOURCE_PASSWORD`.
   - **Trường hợp B: Dùng Database đám mây (Supabase / AWS RDS)**
     - Thay `SPRING_DATASOURCE_URL` thành chuỗi kết nối của Supabase/RDS kèm username và password.
   - Nhấn `Ctrl + O` -> `Enter` để lưu, sau đó `Ctrl + X` để thoát `nano`.

---

## Bước 8: Khởi chạy toàn bộ hệ thống

Chạy lệnh Docker Compose để build và chạy ngầm:

```bash
docker compose up -d --build
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```

Nếu cả 3 container `hexroom-frontend`, `hexroom-backend`, `hexroom-postgres` đều hiển thị trạng thái `Up` (healthy), hệ thống đã hoạt động!

### 🌐 Kiểm tra truy cập:
- **Giao diện Website:** `http://<ELASTIC_IP_CỦA_BẠN>` (cổng 80)
- **Backend API Swagger:** `http://<ELASTIC_IP_CỦA_BẠN>:8080/swagger-ui/index.html`

---

## Bước 9: Gắn tên miền và cài chứng chỉ SSL HTTPS miễn phí

Nếu bạn sở hữu tên miền (ví dụ: `hexroom.com`):

1. **Trỏ DNS tên miền:**
   - Tạo bản ghi `A`: `@` -> `<ELASTIC_IP>`
   - Tạo bản ghi `A`: `www` -> `<ELASTIC_IP>`

2. **Cài đặt Nginx Host & Certbot cấp chứng chỉ Let's Encrypt:**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d hexroom.com -d www.hexroom.com
   ```
   Certbot sẽ tự động cấp phát SSL và gia hạn tự động mỗi 90 ngày.

---

## 11. Lệnh quản lý, xem log và cập nhật code

### Xem log theo thời gian thực:
```bash
# Xem log backend
docker compose logs -f backend

# Xem log frontend
docker compose logs -f frontend

# Xem log database
docker compose logs -f postgres
```

### Cập nhật mã nguồn khi có commit mới trên GitHub:
```bash
# 1. Kéo code mới nhất
git pull origin main

# 2. Build lại và khởi động lại dịch vụ
docker compose up -d --build
```

### Dừng hoặc khởi động lại:
```bash
# Dừng toàn bộ hệ thống
docker compose down

# Khởi động lại
docker compose restart
```
