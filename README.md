# S3 Uploader

基于 Next.js 的 S3 兼容对象存储上传器。

服务端读取环境变量并生成 SigV4 预签名 `PUT` URL，文件内容由浏览器直接上传到对象存储；上传成功后会把素材记录写入本地 `DATA_DIR`，并可在 `/view` 查看。

## 环境变量

复制 `.env.example` 并填写：

```bash
S3_PROFILE_NAME=Default
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_FORCE_PATH_STYLE=false
S3_KEY_PREFIX=uploads/
ROOT_DIR=/uploads/{{today}}
SIGNED_URL_TTL_SECONDS=900
DATA_DIR=/app/data
```

`ROOT_DIR` 设置后会作为上传目录，并覆盖 `S3_KEY_PREFIX`。例如
`ROOT_DIR=/xxx` 会上传到 `/xxx/<name>.<file>`，`ROOT_DIR=/xxx/{{today}}`
会上传到 `/xxx/yyyymmdd/<name>.<file>`。

## 上传记录和 `/view`

上传流程会在浏览器完成 S3 `PUT` 后，调用服务端接口把素材记录追加写入
`DATA_DIR/uploads.jsonl`。记录内容包括：

- `objectKey`：S3 返回的真实 object key。
- `fileName`：自动记录用户选择的原始文件名。
- `uploadBy`：上传前必填的上传者。
- `relativeInfo`：上传前必填的相关信息。
- `size`：文件大小。
- `contentType`：浏览器提供的 MIME 类型。
- `uploadedAt`：上传完成时间。

访问 `/view` 可以查看已上传素材列表。

### 需要挂载的 data 目录

容器部署时请挂载 `DATA_DIR`。推荐使用：

```bash
-v /your/host/data:/app/data
```

并设置：

```bash
DATA_DIR=/app/data
```

如果不设置 `DATA_DIR`，默认使用项目内的 `data` 目录。

## 开发

```bash
pnpm install
pnpm dev
```

## 验证

```bash
pnpm lint
pnpm build
```
