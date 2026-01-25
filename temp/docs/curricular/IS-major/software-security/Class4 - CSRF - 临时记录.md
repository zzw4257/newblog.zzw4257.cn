
# 第一章：解剖 Web 通信 —— CSRF 的“作案现场”

## 1. 什么是 CSRF？（用人话讲）

在进入代码之前，我们先通过一个生活化的例子来理解 CSRF。

*   **场景**：你刚去银行取了钱，银行柜员认识你（因为你出示了身份证），并且给你发了一个**VIP手环**（代表你的身份）。
*   **正常情况**：你戴着手环去柜台说“转账100给小明”，柜员看到手环，确认是你，操作转账。
*   **CSRF 攻击**：
    1.  坏人（攻击者）无法拿到你的手环（他没法直接登录你的账户）。
    2.  坏人做了一个假的“抽奖箱”（恶意网站），里面藏了一张纸条，写着“转账100给坏人”。
    3.  坏人诱骗你去摸抽奖箱。
    4.  **关键点**：当你摸抽奖箱时，你的手（浏览器）实际上是拿着那张纸条递给了银行柜员。
    5.  因为你手上还戴着**VIP手环**，柜员看到手环，以为是你自愿的，于是把钱转走了。

**核心概念**：攻击者盗用了你的**身份凭证（Cookie/Session）**，以你的名义发送了你并不知情的请求。

---

## 2. 实验环境中的“角色” (这也是考试常考的拓扑结构)

在 SEED 实验中，我们需要理清三个 IP 和域名的关系：

1.  **受害者 (Alice)**：坐在浏览器前的用户。
    *   **状态**：已经登录了社交网站，浏览器里存着有效的 Cookie。
2.  **受信任的服务器 (Trusted Server)**：`www.seed-server.com` (IP: 10.9.0.5)
    *   **运行软件**：Elgg (类似 Facebook 的社交软件)。
    *   **角色**：负责处理请求，看到 Cookie 就认为是本人在操作。
3.  **恶意服务器 (Attacker Server)**：`www.attacker32.com` (IP: 10.9.0.105)
    *   **运行软件**：Apache。
    *   **角色**：存放恶意网页（包含攻击代码），诱骗受害者访问。

---

## 3. 硬核基础知识：HTTP 协议解剖

要完成 **Task 1 (观察 HTTP 请求)**，你必须看懂 HTTP 报文。这是 Web 安全的原子层面。

### 3.1 HTTP 请求的“骨架”

Web 就像寄信。浏览器给服务器写信，服务器回信。
一封标准的“请求信”（HTTP Request）长这样（请务必记住这三个部分的名称）：

```http
POST /action/profile/edit HTTP/1.1      <-- 1. 请求行 (Request Line)
Host: www.seed-server.com               <-- 2. 请求头 (Headers)
User-Agent: Mozilla/5.0 ...
Cookie: Elgg=p0dci8baqrl4i2ipv2mio3po05 <-- 重点！
Content-Type: application/x-www-form-urlencoded
Content-Length: 45

name=Alice&description=HackerWasHere    <-- 3. 请求体 (Body) - 仅限 POST
```

#### **考试/实验重点细节：**

*   **GET 请求 vs POST 请求**：
    *   **GET**：通常用于**获取**数据（如看图片、读新闻）。参数直接写在 URL 里（例如 `?id=123`）。**没有请求体（Body）**。
        *   *CSRF 难度*：非常容易，一个 `<img>` 标签就能触发。
    *   **POST**：通常用于**提交/修改**数据（如登录、发帖、改密码）。参数写在 **请求体（Body）** 里。
        *   *CSRF 难度*：稍难，需要用 JavaScript 构建表单自动提交。

### 3.2 身份的证明：Cookie 与 Session

这是 CSRF 能够成功的**根本原因**。

#### **Q: 服务器怎么知道“你是你”？**
HTTP 协议是**无状态**的。意思是服务器记性很差，你刚才登录了，刷新一下页面，它就不认识你了。

#### **解决方案：Cookie + Session 机制**
1.  **登录时**：你输入账号密码 -> 服务器验证通过 -> 服务器在内存/数据库生成一个 `Session ID` (比如 `p0dci...`) -> 服务器在**响应头**里命令浏览器：`Set-Cookie: Elgg=p0dci...`。
2.  **之后每次请求**：浏览器极其“听话”且“老实”。只要是你访问 `www.seed-server.com`，浏览器**自动**在请求头里带上 `Cookie: Elgg=p0dci...`。
3.  **服务器端验证**：服务器收到请求，提取 Cookie 里的 ID，去查数据库：“哦，这个 ID 对应的是 Alice，准许通过。”

#### **具体到系统信息（Elgg 环境）：**
*   **Cookie 名**：`Elgg`
*   **Cookie 值**：一串随机字符串（Session ID）。
*   **存储位置**：
    *   *浏览器端*：存储在本地 SQLite 文件或内存中。
    *   *服务器端*：Elgg 的数据库或 `/var/lib/php/sessions` 目录下的文件。

---

## 4. 浏览器的“背叛”：CSRF 的技术原理

为什么说浏览器背叛了用户？

假设你正在使用 Firefox 访问 `www.seed-server.com` (Elgg)，你已经登录了。
此时，你手贱点开了一个新标签页，访问了 `www.attacker32.com`。

在这个恶意页面里，有一行代码：
```html
<img src="http://www.seed-server.com/action/addfriend?friend=123">
```

**发生了什么？（具体的执行流）**

1.  **解析 HTML**：浏览器解析攻击者的页面，看到 `<img>` 标签。
2.  **加载资源**：浏览器认为这是一张图片，必须去下载它。
3.  **构建请求**：浏览器自动向 `src` 中的地址发起一个 HTTP **GET** 请求。
4.  **自动附加 Cookie**：**（最关键的一步）** 浏览器检查目标域名是 `www.seed-server.com`。它发现：“咦？我有这个域名的 Cookie 哎！” 于是，浏览器**自动**把 Alice 的 `Cookie: Elgg=...` 贴到了这个请求里。
5.  **服务器接收**：Elgg 服务器收到请求，看到合法的 Cookie，以为是 Alice 自己想加好友。
6.  **执行操作**：好友添加成功。Alice 毫不知情，因为 `<img>` 标签通常是隐藏的或者只是加载失败（因为返回的不是图片）。

---

## 5. 初学者必备工具：HTTP Header Live

文档中提到了 `HTTP Header Live`。在实验中，你不能靠猜，必须“看见”请求。

*   **为什么要用它？**
    *   你需要知道 Elgg 的“加好友”接口具体 URL 是什么？
    *   参数名叫什么？是 `friend_id` 还是 `guid`？
    *   这是 GET 还是 POST？
*   **怎么看？**
    1.  打开 Firefox，开启插件。
    2.  在 Elgg 里正常操作一次（比如手动加一个好友）。
    3.  暂停插件，查看刚才抓到的包。
    4.  **复制**那个请求的结构，这就成了攻击代码的模板。

---

## 第一章总结（复习清单）

如果你能回答以下问题，就可以进入下一章（开始写攻击代码）：

1.  **什么是 Origin (源)？** `attacker32.com` 和 `seed-server.com` 是同一个源吗？（答案：不是，这正是**跨站**的含义）。
2.  **Cookie 是谁存的？谁发的？** （答案：服务器让存的，浏览器在每次请求时自动发的）。
3.  **在 CSRF 中，攻击者能拿到受害者的 Cookie 吗？**
    *   **非常重要**：不能！攻击者只是让浏览器**带上** Cookie 发请求，攻击者自己看不到 Cookie 的内容（除非配合 XSS 攻击，那是后话）。
4.  **GET 和 POST 的本质区别对攻击脚本有什么影响？** （GET 可以用 HTML 标签触发，POST 通常需要 JavaScript 构造表单）。


# 第二章：GET 请求攻击 —— 欺骗浏览器的本能

## 1. 侦察阶段：解剖“加好友”请求 (Task 1)

在写攻击代码前，我们必须先知道“正确的请求”长什么样。这就好比你想伪造一张支票，你得先看过真支票的格式。

### 1.1 操作步骤
1.  登录 Alice 的账号 (`www.seed-server.com`)。
2.  打开 Firefox 的 **HTTP Header Live** 插件。
3.  找到另一个用户（比如 Samy），点击“Add Friend”（加好友）按钮。
4.  **立刻暂停**插件，在抓到的列表中找到那个关键的请求。

### 1.2 关键数据解剖（考试考点）
你会看到类似下面这样的请求（请在实验中核对具体参数）：

```http
GET http://www.seed-server.com/action/friends/add?friend=59&__elgg_ts=...&__elgg_token=... HTTP/1.1
Host: www.seed-server.com
Cookie: Elgg=p0dci8baqrl4i2ipv2mio3po05...
...
```

**我们从中提取出的“攻击配方”：**
*   **URL**: `http://www.seed-server.com/action/friends/add`
*   **HTTP 方法**: `GET` (这意味着参数直接写在 URL 里)。
*   **关键参数**: `friend=59`。
    *   这里的 `59` 是 Samy（攻击者）在数据库里的 ID (GUID)。
    *   *含义*：谁发出这个请求，谁就添加 ID 为 59 的人为好友。
*   **安全令牌**: `__elgg_ts` 和 `__elgg_token`。
    *   *注意*：实验手册明确说了，**为了做实验，我们暂时把这两项检查关掉了**。所以在攻击时，我们不需要关心这两个随机乱码，直接删掉即可。

---

## 2. 武器化：利用 `<img>` 标签发动攻击 (Task 2)

现在我们（扮演 Samy）知道了：只要 Alice 的浏览器向 `http://www.seed-server.com/action/friends/add?friend=59` 发送一个 GET 请求，Alice 就会自动加上 Samy。

如何让 Alice 的浏览器“不由自主”地发出这个请求？

### 2.1 核心原理：浏览器的“贪吃”本性
HTML 标准规定，当浏览器遇到 `<img>` 标签时，它**必须**尝试加载 `src` 属性里的链接，以显示图片。

浏览器**不会**预先检查：
1.  这链接是不是真图片？（也许是 `.php`）
2.  这链接是不是去往别的网站？（跨站）
3.  这链接会不会产生副作用？（修改数据）

它只会傻傻地发送 GET 请求，并带上目标网站的 Cookie。

### 2.2 编写攻击代码
我们需要在攻击者的服务器 (`www.attacker32.com`) 上创建一个 HTML 文件（例如 `add_friend.html`）。

**代码非常简单，甚至不需要 JavaScript：**

```html
<!-- 这是一个陷阱页面 -->
<html>
<body>
  <h1>恭喜！你中奖了！</h1>
  <p>查看下方图片领取奖品...</p>

  <!-- 攻击载荷 (Payload) -->
  <!-- 注意：src 指向的是 seed-server (受害目标)，而不是 attacker (当前网站) -->
  <img src="http://www.seed-server.com/action/friends/add?friend=59" 
       alt="本来应该是一张图" 
       width="1" height="1" 
       style="display:none;">

</body>
</html>
```

### 2.3 攻击流程推演（系统级细节）

1.  **诱骗**：Samy 给 Alice 发私信：“快看这个网站 `www.attacker32.com/add_friend.html`”。
2.  **访问**：Alice 点击链接。她的浏览器向 `attacker32.com` 请求页面。
3.  **解析**：Alice 的浏览器收到 HTML，开始渲染。
4.  **触发**：浏览器读到 `<img src="http://www.seed-server.com/...">`。
5.  **发送请求（关键时刻）**：
    *   浏览器构建一个指向 `seed-server.com` 的 **GET** 请求。
    *   浏览器检查 Cookie 存储：发现有 `seed-server.com` 的 Cookie（因为 Alice 刚登录过）。
    *   **浏览器自动附加 Cookie**。
    *   请求发出。
6.  **执行**：`seed-server` 收到请求，验证 Cookie 属于 Alice，参数是要加 ID 59。操作成功。
7.  **反馈**：服务器返回一段 HTML 或 JSON（不是图片数据）。浏览器发现这不是图片，就在页面上显示一个破裂的图标（如果没隐藏的话）。但此时，**攻击已经完成了**。

---

## 3. 常见问题与“坑” (Troubleshooting)

### 3.1 为什么我的攻击没成功？（Firefox 版本问题）
实验文档里特别提到了一个红色的 **Important Note**。

*   **现象**：如果你用的不是 SEED 提供的旧版虚拟机，而是较新的 Firefox，攻击可能会失败。
*   **原因**：现代浏览器引入了 **SameSite Cookie** 策略或**跟踪保护**功能。浏览器认为：“你在 `attacker32.com` 的页面里去请求 `seed-server.com` 的资源，还想带上 Cookie？这通常是广告追踪，我不发 Cookie 了。”
*   **解决**：
    1.  如果没有 Cookie，服务器会认为 Alice 没登录，请求跳转到登录页，攻击失败。
    2.  实验推荐：如果遇到这个问题，不要用 `<img>`，改用 JavaScript 构造请求（这将在下一章 Task 3 详细讲）。

### 3.2 怎么知道 Samy 的 ID (GUID) 是 59？
在现实攻击中，你需要先搞到这个 ID。
*   **方法**：Samy 登录自己的号，把鼠标悬停在自己的头像上，或者查看自己主页的 URL，通常会包含 `guid=59` 或者 `/profile/59`。这是一个公开信息，不是秘密。

---

## 4. 深度思考：GET 和 POST 的界限

为什么这个任务里用 GET 就能攻击成功？

*   **RESTful 规范**：按照规范，GET 请求应该是**只读的**（比如获取文章、搜索）。它不应该改变服务器上的数据（如转账、加好友）。
*   **Elgg 的设计缺陷**：在这个实验版本的 Elgg 中，开发者为了方便，让 `action/friends/add` 接口既接受 GET 也接受 POST。这违反了安全设计原则。
    *   如果开发者严格限制**只允许 POST**，那么 `<img>` 标签攻击就会立刻失效（因为 `img` 只能发 GET）。

这也是为什么下一章我们要学习 **Task 3：POST 类型的 CSRF 攻击**，因为那才是更通用、更难防御的场景。

---

## 第二章总结

1.  **GET CSRF** 的本质是利用浏览器自动加载资源（如图片、脚本）的机制。
2.  **攻击者** 不需要知道受害者的密码，也不需要看到受害者的 Cookie，他只需要利用浏览器“自动发送 Cookie”的特性。
3.  **防御启示**：永远不要用 GET 请求来执行修改数据的操作（写操作）。

好的，第一章讲了基础，第二章讲了利用浏览器本能（GET请求）的简单攻击。

现在我们进入**第三章**。这是本实验最核心、也是考试最喜欢考察代码编写的部分：**Task 3（利用 POST 请求进行 CSRF 攻击）**。

---

# 第三章：POST 请求攻击 —— JavaScript 的“隐形手”

## 1. 为什么 `<img>` 标签不管用了？

在 Task 3 中，我们的目标是修改受害者（Alice）的个人简介（Profile），把她的自我介绍改成“Samy is my Hero”。

如果你试图用第二章的方法：
```html
<img src="http://www.seed-server.com/action/profile/edit?description=SamyIsHero...">
```
**这会失败。** 为什么？

1.  **Elgg 的限制**：虽然老版本的 Elgg 代码写得不严谨，但通常修改数据（Edit）的操作是设计为只接受 **POST** 请求的。
2.  **数据位置不同**：GET 请求把参数放在 URL 里（像明信片写在背面）；POST 请求把参数放在 HTTP 消息体（Body）里（像信封装在信封里）。`<img>` 标签根本没有能力把数据放进“信封”里。

**结论**：我们需要更强大的武器 —— **JavaScript**。

---

## 2. 侦察阶段：解剖 POST 请求 (Task 3)

还是老规矩，先看合法的请求长什么样。
1.  登录 Alice 的账号。
2.  开启 HTTP Header Live。
3.  点击“Edit Profile”，随便改个简介，点击保存。
4.  **捕获请求**（重点看 Body 部分）。

你会看到类似这样的结构（数据位于 Header 下方）：

```http
POST /action/profile/edit HTTP/1.1
Host: www.seed-server.com
Cookie: Elgg=...

__elgg_token=...&__elgg_ts=...&name=Alice&description=SamyIsHero&accesslevel[description]=2&guid=42
```

**关键参数清单（攻击脚本需要填写的）：**
*   `name`: 名字（必填，否则名字会被改空）。
*   `description`: 简介（这是我们要篡改的目标）。
*   `accesslevel[description]`: **这是个大坑！**
    *   如果不填或填错，简介虽然改了，但默认是“私有（Private）”，别人看不到，攻击效果大打折扣。
    *   实验中通常设置为 `2` (代表 Public，公开)。
*   `guid`: 用户 ID。服务器需要知道你在改谁的资料。

---

## 3. 武器化：构建“隐形表单” (The Invisible Form)

既然我们不能让用户去点“提交”按钮，我们就用 JavaScript 创建一个**隐形的表单**，并在用户打开页面的瞬间，让 JavaScript 自动点击提交。

这个过程就像：Alice 走进一个房间（打开恶意网页），房间里有个隐形人（JS），迅速填好一张单子（Form），并模仿 Alice 的笔迹（Cookie），趁 Alice 没注意直接递给了窗口（服务器）。

### 3.1 代码深度解析（实验手册代码详解）

这是你需要写入 `attacker32.com` 上的 HTML 文件的核心代码。

```html
<html>
<body>
<h1>正在加载有趣的页面...请稍候...</h1>

<script type="text/javascript">
function forge_post()
{
    var fields;

    // 1. 准备表单数据
    // 注意：这里要把 'Alice' 改成你想要的名字，guid 也要填对
    fields += "<input type='hidden' name='name' value='Alice'>";
    fields += "<input type='hidden' name='description' value='Samy is my Hero'>";
    fields += "<input type='hidden' name='accesslevel[description]' value='2'>"; 
    fields += "<input type='hidden' name='guid' value='42'>"; // 假设 Alice 的 ID 是 42

    // 2. 创建一个看不见的 <form> 标签
    var p = document.createElement("form");

    // 3. 设置表单属性（目标地址和方法）
    // 这里的 action 就是你在侦察阶段抓到的 URL
    p.action = "http://www.seed-server.com/action/profile/edit";
    p.innerHTML = fields;
    p.method = "post";

    // 4. 将表单加入到当前网页的 DOM 树中
    // 浏览器规定：表单必须存在于页面上才能被提交
    document.body.appendChild(p);

    // 5. 自动提交！
    // 这一步之后，浏览器会带着 Cookie 发送 POST 请求
    p.submit();
}

// 页面加载完毕后立即执行
window.onload = function() { forge_post(); }
</script>
</body>
</html>
```

### 3.2 攻击流程推演

1.  Samy 诱骗 Alice 访问 `www.attacker32.com/csrf_post.html`。
2.  Alice 的浏览器下载该页面，并执行 `window.onload`。
3.  JavaScript 在内存中迅速构建了一个包含恶意数据的 `<form>`。
4.  JavaScript 调用 `p.submit()`。
5.  浏览器一看：“哦，用户（其实是脚本）要提交表单到 `seed-server.com`。”
6.  浏览器检查 Cookie：“我有 `seed-server` 的 Cookie，带上！”
7.  **POST 请求发出**。
8.  Elgg 服务器收到请求，修改了 Alice 的资料。
9.  浏览器通常会跳转到 Elgg 的页面（因为表单提交会导致页面刷新/跳转）。

---

## 4. 实验思考题解答指南 (Crucial for Report)

实验手册里提到了两个非常刁钻的问题，这直接关系到你对 CSRF 理解的深度。

### 问题 1：GUID 的难题
**问**：为了让攻击生效，你在代码里写了 `guid=42`（Alice 的 ID）。但如果 Samy 想攻击 Bob，还得先把代码改成 Bob 的 ID。如果 Samy 不知道受害者的 ID 怎么办？或者如何获取 GUID？

**答题思路**：
1.  **GUID 是公开的**：GUID 不是密码，它是公开信息。Samy 只需要访问 Alice 的主页，查看 URL（如 `.../profile/alice` 或查看源代码），就能找到 GUID。
2.  **社会工程学**：攻击是定向的。Samy 是先锁定了 Alice，查好了她的 GUID，然后专门制作了这个针对她的网页。

### 问题 2：能否发起“无差别攻击”？
**问**：如果 Samy 想做一个网页，谁点谁中招（修改访问者自己的资料），但他事先不知道谁会来访问。这能做到吗？

**答题思路**：
*   **在这个特定的 Elgg 实验中：很难**。
    *   因为 Elgg 的 `edit.php` 接口**强制要求** POST 请求中包含 `guid` 参数。如果你不填 `guid`，服务器可能会报错或不知道该改谁的资料。
    *   由于同源策略（SOP），Samy 的恶意网页（`attacker32.com`）**无法读取** Alice 在 `seed-server.com` 上的 Cookie 或页面内容，所以 JS 脚本没法自动“偷”到当前访问者的 GUID 填进表单里。
*   **在其他脆弱系统中：可能可以**。
    *   如果服务器的设计是：“不看参数里的 ID，只看 Cookie 里的 Session ID 来决定改谁的资料”，那么攻击者就不需要在表单里填 GUID，这样就能实现无差别攻击。

---

## 5. 常见错误（Troubleshooting）

在做 Task 3 时，学生常犯的错误：

1.  **单引号/双引号混乱**：JS 拼接 HTML 字符串时，`fields += "<input ...>"`，如果你在 value 里又用了双引号，字符串就断了。
2.  **参数遗漏**：只填了 `description`，没填 `name`。结果 Alice 的名字被改没了（变成空），或者变成了 undefined。务必把所有必填项都带上。
3.  **无限循环**：这是**Task 4**开启防御后会出现的现象，但有时候写错跳转地址也会导致。一旦提交表单，页面会跳转到 Elgg，如果 Elgg 又跳回来，或者你设置了 iframe 自动刷新，浏览器会卡死。

---

## 第三章总结

1.  **POST CSRF** 需要 JavaScript 的介入来模拟表单提交。
2.  我们构建了一个“看不见的表单”，这证明了**用户在页面上没做任何点击操作，也可以被攻击**（`window.onload` 是关键）。
3.  **同源策略（SOP）** 虽然阻止了我们读取数据（不能偷 Cookie，不能偷 GUID），但**没有阻止我们发送写请求**（CSRF 依然成立）。
太棒了，我们已经成功模拟了攻击。现在的比分是：**攻击者 2 : 0 防御者**
---

# 第四章：防御的艺术 —— 令牌与 Cookie 的战争

## 1. 秘密令牌 (Secret Token) 防御 (Task 4)

### 1.1 核心原理：只有“自家人”才知道的暗号

回顾一下 Task 3 的攻击，我们的 JavaScript 表单里填了 `name`, `description`, `guid`。这些都是**静态信息**或者是**公开信息**。攻击者只要提前查好，就能伪造出来。

为了防御，Elgg（以及大多数现代 Web 框架）引入了一个动态的、随机的**秘密令牌 (CSRF Token)**。

*   **机制**：
    1.  当 Alice 访问“修改资料”页面时，服务器生成一个随机字符串（例如 `8x7z9a...`），并把它埋在 HTML 表单的隐藏字段里。
    2.  当 Alice 点击“保存”时，浏览器把这个随机字符串连同其他数据一起发回给服务器。
    3.  服务器检查：请求里带没带这个字符串？和我在 Session 里存的一样吗？
    4.  **关键点**：如果请求里没有这个令牌，或者令牌不对，服务器直接拒绝请求。

### 1.2 为什么攻击者无法伪造这个令牌？

这是一个经常把学生绕晕的问题：**“Samy 也可以访问 Elgg 啊，他不能去查看源代码拿到令牌吗？”**

**答案（必须背诵的考点）：**
1.  令牌是**针对每个用户、甚至每个会话（Session）随机生成**的。Samy 自己的令牌和 Alice 的令牌完全不同。Samy 拿自己的令牌去帮 Alice 发请求是没用的。
2.  **同源策略 (Same-Origin Policy, SOP)** 救了命。
    *   当 Alice 访问 `attacker32.com` 时，该页面上的恶意 JavaScript **没有任何权限**去读取 `seed-server.com` 页面的内容。
    *   JS 就像在隔壁房间（跨域），它能往 Alice 的房间扔纸条（发送 POST 请求），但它看不见 Alice 房间桌子上放的密码本（无法读取 Token）。

### 1.3 实验操作：开启防御

我们需要去 Elgg 服务器的源代码里把之前故意关掉的防御开关打开。

1.  **进入容器**：`docker exec -it <elgg-container-id> /bin/bash`
2.  **找到文件**：`/var/www/elgg/vendor/elgg/elgg/engine/classes/Elgg/Security/Csrf.php`
3.  **编辑代码**：找到 `validate` 函数。
    ```php
    public function validate(Request $request) {
       // return;  <--- 删掉或注释掉这一行！
       
       $token = $request->getParam('__elgg_token');
       ...
    }
    ```
4.  **验证效果**：
    *   回到浏览器，重新刷新那个恶意网页（Task 3 的攻击页面）。
    *   **观察**：攻击失败了！你可能会看到一个错误页面，或者被重定向到首页。
    *   **HTTP Header Live**：你会发现请求发出去了，但是服务器返回了错误，因为请求体里缺少了 `__elgg_token` 和 `__elgg_ts`。

---

“用户 ↔ Facebook”的通信协议，可以抽象成：

1. **注册 / 绑定阶段**
    - 用户生成密钥对 (sk, pk)；
    - 把 pk 注册到 Facebook，并与账号绑定。

2. **每次请求时**
    - Facebook 先发一个 nonce（随机数）给客户端；
    - 客户端构造待签名数据：data = nonce || timestamp || message || other_fields；
    - 客户端用 sk 生成 signature = Sign(sk, data)；
    - 发送 {message, nonce, timestamp, signature} 给 Facebook。
    
3. **Facebook 验证**
    - 确保 nonce 没被重复使用（维护一个已使用 nonce 集合或时间窗内去重）；
    - 用绑定的 pk 验证签名
    - 验证通过则认为：
        - 身份 = 该公钥对应的用户 ⇒ **唯一性**
        - 消息内容没被修改 ⇒ **完整性**
        - nonce/timestamp 合理 ⇒ **不可重放**

## 2. 浏览器的自我修养：SameSite Cookie (Task 5)

Token 防御虽然好，但需要服务器写大量代码去生成和验证 Token。能不能让浏览器自己解决这个问题？

这就是 **Task 5** 要演示的 **SameSite Cookie** 机制。这是一种较新的防御方案，现在已被主流浏览器默认开启。

### 2.1 什么是 SameSite？

给 Cookie 打上一个标签，告诉浏览器：“这个 Cookie 只能在同一个网站内部使用，跨站请求别带它！”

实验网站 `http://www.example32.com` 给我们演示了三种标签：

1.  **Cookie-Normal (没有 SameSite 属性)**：
    *   *旧行为*：跨站请求（比如从攻击者网站发来的 POST）**会**带上它。
    *   *后果*：容易受 CSRF 攻击。
2.  **Cookie-Lax (宽松模式)**：
    *   *行为*：
        *   点击链接 (`<a>` 标签) 跳转过去时：**会带上**（保证用户体验，不用重新登录）。
        *   跨站的子请求（图片加载、`<iframe>`、AJAX、**POST 表单提交**）：**不会带上**。
    *   *防御力*：完美防御 CSRF（因为 CSRF 依赖 POST 表单或隐藏请求），同时不影响用户正常点击链接访问。这是现代浏览器的**默认设置**。
3.  **Cookie-Strict (严格模式)**：
    *   *行为*：任何跨站来源的请求都不带 Cookie。哪怕是你朋友在微信里发给你一个淘宝链接，你点开后发现是未登录状态。
    *   *防御力*：最强，但用户体验较差。

### 2.2 实验观察 (Task 5)

你需要点击 `http://www.attacker32.com` 上的两个链接，分别指向 `example32.com` 的测试页面。

*   **Link A (同源)**：你就在 `example32.com` 点链接。
    *   *结果*：三个 Cookie (Normal, Lax, Strict) 都会被发送。
*   **Link B (跨站)**：你在 `attacker32.com` 点链接去 `example32.com`。
    *   *结果*：
        *   `Strict` Cookie：**丢失**。
        *   `Lax` Cookie：**发送**（因为点击链接属于顶级导航）。
    *   **关键测试**：如果是通过 `forge_post()` (JavaScript 表单自动提交) 发起的请求呢？
        *   *结果*：`Lax` Cookie 也会**丢失**。这直接掐断了 CSRF 的命脉。

---

## 3. 防御总结与考试要点

在写实验报告或回答问题时，请务必清晰区分这两种防御：

| 特性 | Secret Token (CSRF Token) | SameSite Cookie |
| :--- | :--- | :--- |
| **原理** | **服务器端验证**。检查请求体中是否包含正确的随机字符串。 | **浏览器端拦截**。浏览器根据策略决定是否发送 Cookie。 |
| **防御核心** | 利用**同源策略 (SOP)**，攻击者无法读取 Token。 | 阻止 Cookie 随跨站请求发送，使身份验证失效。 |
| **优点** | 兼容性极好，所有浏览器都支持。 | 部署极其简单（只需一行配置），不需要改业务代码。 |
| **缺点** | 开发成本高，每个表单都要改。 | 旧版浏览器可能不支持；需要仔细权衡 Lax 和 Strict。 |

---

## 4. 实验报告的“加分项”提示

如果你想在报告中脱颖而出，可以在 Task 4 的部分加上这段思考：

**“关于无限循环 (The Infinite Loop) 的观察”**
*   **现象**：在开启 Task 4 防御后，如果我继续运行 Task 3 的攻击代码，可能会发现浏览器陷入疯狂刷新。
*   **原因**：
    1.  JS 提交表单 -> 2. 请求发送（没 Token） -> 3. Elgg 服务器验证失败 -> 4. Elgg 返回重定向（302 Redirect）到某个页面（可能是当前页或首页） -> 5. 浏览器加载新页面 -> 6. 页面里的恶意 JS (`window.onload`) 再次触发 -> 7. 回到第一步。
*   **结论**：这不仅是一次失败的 CSRF，如果不加控制，甚至可能演变成针对客户端的**拒绝服务攻击 (DoS)**。
