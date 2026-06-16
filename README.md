# S3 Uploader

基于 Next.js 的 S3 兼容对象存储上传器。

服务端只读取环境变量并生成 SigV4 预签名 `PUT` URL，文件内容由浏览器直接上传到对象存储；应用本身不保存文件、上传记录或数据库状态。

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
SIGNED_URL_TTL_SECONDS=900
```

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
