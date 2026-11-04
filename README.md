# 举手课堂 Demo

一个无题库的四选一课堂反馈桌面演示：教师可选填题干和选项，通过摄像头识别 1–4 根手指统计 A–D，也可以用演示模式添加模拟票。定格统计后选择并公布正确答案；新一轮清空统计。数据不持久化。

Windows x64 安装包：[举手课堂 1.0.1](release/举手课堂_1.0.1_x64-setup.exe)。

## 运行与打包

需要 Node.js 18+、Rust、Windows C++ 构建工具和 WebView2。安装依赖后执行：

```powershell
npm install
npm run dev
npm test
npm run tauri build
```

Windows 安装包位于 `src-tauri/target/<目标平台>/release/bundle/nsis/`，未指定目标平台时位于 `src-tauri/target/release/bundle/nsis/`。模型与 WASM 位于 `public/`，应用使用时不需要网络；首次安装如果系统没有 WebView2 Runtime，安装程序可能需要联网安装该运行环境。浏览器预览请使用 localhost，摄像头需授权；桌面程序也需在 Windows 隐私设置中允许桌面应用访问摄像头。

## 使用和限制

“教师设置”可选填题目和选项，应用设置会清空本轮结果；题干和选项也可以通过 PPT 展示。“演示模式”按钮添加的是模拟票。学生作答后，先定格统计，再点击“公布答案”选择正确选项，确认后显示答案和正确率；取消选择会保留定格结果，继续统计会隐藏已公布结果。

使用 MediaPipe Hand Landmarker；仅统计食指、中指、无名指、小指，手掌应正对镜头。每只有效手计一票，不能区分学生身份或一人多手；遮挡、距离、光照和手势朝向都会影响识别，不宜视为准确考勤或成绩。配置最多检测 20 只手，并不保证实际课堂可识别到该数量。正确率的分母是当前有效票数，零票不计算正确率。摄像头视频只在本机处理，应用不提供视频上传或数据保存功能。

识别库为 [MediaPipe Tasks Vision](https://www.npmjs.com/package/@mediapipe/tasks-vision)，模型来自 [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)。
