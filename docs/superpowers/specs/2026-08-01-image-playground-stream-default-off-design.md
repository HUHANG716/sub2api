# Hahacode 生图工作台默认关闭流式传输

## 目标

Hahacode 嵌入式生图工作台首次打开、且对应配置没有已保存的流式偏好时，Images 与 Agent 两个 API 配置的“流式传输”均默认关闭。

## 范围

- 将宿主写入 `hahacode.imagePlayground.settings` 的 `hahacode-images` 与 `hahacode-agent` 两个配置的 `streamImages` 默认值从 `true` 改为 `false`。
- 保留现有按配置 ID 恢复用户偏好的逻辑；用户已手动开启或关闭时，不被宿主默认值覆盖。
- 不修改独立版 `gpt_image_playground` 的全局默认值，也不改变其他 API 字段的只读规则。

## 验证

- 宿主单元测试断言两个嵌入配置均写入 `streamImages: false`。
- 运行生图工作台宿主聚焦测试、嵌入产物构建和主前端生产构建。
- 推送 `main` 后等待 CI 与 `Deploy Main` 成功，并用生产 `/.deploy-sha` 核对提交。
