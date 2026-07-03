# 部署总结文档

> 部署时间: 2026-06-23
> 服务器: 腾讯云 OpenCloudOS 8.10, 1.7GB RAM, 50GB 磁盘, x86_64
> 域名: wx.fudaom.cn (公众号文章下载工具) + lw.fudaom.cn (论文助手)

---

## 一、部署步骤回顾

### 1. 拉取代码
```bash
cd /opt
git clone --depth 1 https://github.com/ZwqJG/weixinwenzhang.git wechat-article-exporter
```

### 2. 配置环境变量
```bash
cd /opt/wechat-article-exporter
cat > .env.production << 'EOF'
NITRO_KV_DRIVER=fs
NITRO_KV_BASE=.data/kv   # ⚠️ 必须保留！丢失会导致用户数据全部丢失
DEBUG_KEY=wexin
NUXT_AGGRID_LICENSE=
EOF
```

### 3. 构建与启动（最终方案）
由于服务器内存不足 + Docker Hub 网络问题，最终采用：
- **本地 Mac 构建** → SCP 上传 `.output` 到服务器
- **直接 `node .output/server/index.mjs` 运行**（不用 Docker）
- **systemd 管理开机自启**
- **系统 nginx 做反向代理和 SSL**

### 4. 配置 nginx + SSL
```bash
certbot --nginx -d wx.fudaom.cn
# 手动编写 /etc/nginx/nginx.conf 配置反向代理
systemctl enable nginx
```

---

## 二、遇到的问题及解决方案

### 问题 1：GitHub 克隆失败

**现象：** `fatal: unable to access ... Empty reply from server`

**原因：** 国内服务器访问 GitHub 网络不稳定

**解决：**
```bash
# 1. 设置 HTTP 协议版本
git config --global http.version HTTP/1.1

# 2. 使用浅克隆（减少数据量）
git clone --depth 1 https://github.com/.../xxx.git

# 备用方案：使用 ghproxy 代理
git clone --depth 1 https://ghproxy.com/https://github.com/.../xxx.git
```

---

### 问题 2：Docker 构建时 OOM（内存不足）

**现象：** `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`

**原因：** 服务器仅 1.7GB RAM，Nuxt 构建需要 ~2GB+ 内存

**解决：** 放弃在服务器上构建，改为：
1. 本地 Mac 执行 `yarn build`（如本地也 OOM，需加大 `NODE_OPTIONS='--max-old-space-size=8192'`）
2. SCP 上传 `.output/` 到服务器
3. 服务器直接用 `node .output/server/index.mjs` 运行

**教训：** 低配服务器（< 2GB RAM）不适合运行 Node.js 构建，必须用本地构建 + 上传的方式。

---

### 问题 3：Docker Hub 镜像拉取失败

**现象：** `net/http: request canceled while waiting for connection` / `connection refused`

**原因：** 国内服务器和 Mac 都无法稳定访问 Docker Hub

**解决：**
- 放弃 Docker 部署，直接使用系统 `node` 运行
- 如需 Docker 部署，可考虑配置 Docker 镜像加速器（如腾讯云加速、阿里云加速）

---

### 问题 4：Docker 时清理了其他项目的资源

**现象：** 论文助手（lw.fudaom.cn）的容器和镜像被误删

**原因：** 执行了 `docker system prune -a -f`，它会删除所有未被使用的镜像和构建缓存

**解决：**
- 恢复方案：重建镜像 + 启动容器
- 修改 docker-compose.yml，去掉 nginx 服务，改用系统 nginx 统一管理
- 两个域名用同一个 nginx 做反向代理

**教训：** 在生产服务器上永远不要执行 `docker system prune -a -f`，使用 `docker system prune --force`（不加 `-a`）只清理构建缓存。或者使用 `docker builder prune` 只清理构建缓存。

---

### 问题 5：`.dockerignore` 导致构建上下文缺失

**现象：** Docker 构建时 `COPY .output ./` 失败

**原因：** `.dockerignore` 中包含了 `.output`，导致文件被忽略

**解决：** 修改 `.dockerignore` 移除 `.output` 条目

---

### 问题 6：nginx 配置问题

**现象：**
1. 安装后显示 "Welcome to nginx"（未配置反向代理）
2. nginx 启动失败，端口被占用
3. `log_format "main" not found` 错误
4. `lw.fudaom.cn` 配置不被加载

**解决要点：**
1. Certbot 只配置了 SSL 证书，必须手动配置 `proxy_pass`
2. 重启前先 `kill` 旧 nginx 进程释放端口
3. nginx.conf 必须包含 `log_format main` 定义
4. nginx.conf 必须包含 `include /etc/nginx/conf.d/*.conf;` 才能加载站点配置

---

### 问题 7：SSL 证书域名问题

**现象：** `SSL: no alternative certificate subject name matches target host name`

**原因：** nginx 用 wx.fudaom.cn 的证书处理了 lw.fudaom.cn 的请求（因 `server_name` 配置不当）

**解决：** 确保每个域名有独立的 `server` block，且每个 block 引用对应的 SSL 证书。把不同域名的配置拆分到 `conf.d/` 目录下单独管理。

---

## 三、最终架构

```
                        ┌─────────────────────┐
                        │    nginx (80/443)    │
                        │  /etc/nginx/conf.d/  │
                        └──────┬──────────┬────┘
                               │          │
                    wx.fudaom.cn   lw.fudaom.cn
                               │          │
                   ┌───────────▼──┐  ┌────▼───────────┐
                   │  Node App    │  │  Docker Compose │
                   │  port 3000   │  │  frontend:3001  │
                   │  systemd     │  │  backend:8000   │
                   │  /opt/...    │  │  /srv/...       │
                   └──────────────┘  └─────────────────┘
```

### 服务管理命令

```bash
# 微信文章下载工具
systemctl status wechat-app      # 查看状态
systemctl restart wechat-app     # 重启
systemctl start wechat-app       # 启动
systemctl stop wechat-app        # 停止
journalctl -u wechat-app -n 50  # 查看日志

# 论文助手（Docker）
cd /srv/lunwenzhushou && docker compose up -d   # 启动
cd /srv/lunwenzhushou && docker compose down    # 停止
cd /srv/lunwenzhushou && docker compose logs    # 查看日志

# nginx
systemctl status nginx           # 查看状态
systemctl restart nginx          # 重启
nginx -t                         # 测试配置
```

---

## 四、优化建议（下次部署注意）

| 序号 | 问题 | 预防措施 |
|------|------|----------|
| 1 | GitHub 连接慢 | 提前在本地 clone，用 rsync/SCP 上传到服务器 |
| 2 | 构建 OOM | 低配服务器直接用本地构建 + SCP 上传的方式 |
| 3 | Docker Hub 拉取失败 | 配置镜像加速器，或放弃 Docker，直接用 Node 运行 |
| 4 | 误删其他项目 | 永远不用 `docker system prune -a`，用 `docker builder prune` |
| 5 | nginx 配置错误 | 先 `nginx -t` 测试，再 `systemctl restart nginx` |
| 6 | 端口冲突 | `ss -tlnp` 先检查端口占用，`kill` 旧进程后再启动 |
| 7 | 域名 SSL 不匹配 | 每个域名独立 `server` block，引用对应的证书文件 |
| 8 | **`NITRO_KV_BASE` 丢失导致用户数据清空** | `cat .env.production` 确认包含 `NITRO_KV_BASE=.data/kv`，**每次部署前必须检查** |

### 推荐的部署流程（下次）

```bash
# 0. ⚠️ 先确认服务器上的 .env.production 包含 NITRO_KV_BASE=.data/kv
ssh root@server "cat /opt/project/.env.production | grep NITRO_KV_BASE"

# 1. 本地 Mac 构建
cd project
yarn build
tar czf .output.tar.gz .output/

# 2. 上传到服务器
scp .output.tar.gz root@server:/opt/project/

# 3. 服务器上解压启动
ssh root@server
cd /opt/project
tar xzf .output.tar.gz

# 4. ⚠️ 重启前再次确认 .env.production 仍包含 NITRO_KV_BASE=.data/kv
cat .env.production | grep NITRO_KV_BASE

# 5. 重启服务
systemctl restart wechat-app
```
